/* CR Bakery booking service: one order per date and 30-minute time (a delivery holds the
   2 hours around its time - see DELIVERY_BEFORE_MIN / DELIVERY_AFTER_MIN), plus a delivery fee calculator that never reveals the pickup address.
   Runs as a Cloudflare Worker with a D1 database bound as DB.
   Settings (Worker > Settings > Variables and Secrets):
     ALLOWED_ORIGINS  comma-separated site addresses allowed to call this service
     ADMIN_KEY        secret used to open the /admin page
     PICKUP_LAT       secret: pickup latitude (a plain number, e.g. 38.xxxxx) - never logged or returned
     PICKUP_LNG       secret: pickup longitude (a plain number, e.g. -121.xxxxx) - never logged or returned
     ORS_API_KEY      secret: free API key from openrouteservice.org, used to look up driving distance
   The site calls /slots, /reserve, /finalize and /delivery-quote. Booked times are freed from /admin.
   /delivery-quote never receives, stores or returns the pickup address or coordinates - only the
   resulting miles and fee. See README.md for setup, including how to find your own coordinates
   without sharing them with anyone. */

const HOLD_MINUTES = 5; // a time held while an order is being sent frees itself after this long
const MAX_PER_HOUR = 5;    // most times one visitor (IP address) can hold or book in an hour
const OPEN_MIN = 10 * 60;  // 10:00 AM, the first pickup or delivery time
const CLOSE_MIN = 19 * 60; // 7:00 PM, the last pickup or delivery time
const SLOT_MIN = 30;       // pickup and delivery times are offered every 30 minutes (10:00, 10:30, 11:00, ...)
const MAX_DELIVERY_MILES = 20; // addresses farther than this by driving distance are declined for delivery
/* A delivery blocks the time around it so no pickup or other delivery is booked while you're out.
   A 2:00 PM delivery with 60 / 60 holds 1:00 PM up to (not including) 3:00 PM. Keep these in step
   with deliveryBlock in js/site-config.js, which only decides what the order form shows. */
const DELIVERY_BEFORE_MIN = 60;
const DELIVERY_AFTER_MIN = 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const path = url.pathname;
      if (request.method === "GET" && path === "/slots") return await getSlots(url, env, cors);
      if (request.method === "POST" && path === "/reserve") return await reserve(request, env, cors, url);
      if (request.method === "POST" && path === "/finalize") return await finalize(request, env, cors);
      if (request.method === "GET" && path === "/delivery-quote") return await deliveryQuote(url, env, cors);
      if (path === "/release") return await release(request, env, url);
      if (path === "/admin") return await admin(request, env, url);
      return json({ error: "Not found" }, 404, cors);
    } catch (err) {
      return json({ error: "Server error" }, 500, cors);
    }
  },
};

/* ---------- Site-facing calls ---------- */

async function getSlots(url, env, cors) {
  const date = url.searchParams.get("date") || "";
  if (!validDate(date)) return json({ error: "Bad date" }, 400, cors);
  await cleanup(env);
  const rows = await env.DB.prepare("SELECT time FROM bookings WHERE date = ?").bind(date).all();
  return json({ taken: rows.results.map((r) => r.time) }, 200, cors);
}

async function reserve(request, env, cors, url) {
  const body = await readJson(request);
  if (!body) return json({ error: "Bad request" }, 400, cors);
  const date = String(body.date || "");
  const time = String(body.time || "");
  const name = String(body.name || "").slice(0, 100);
  const isDelivery = body.kind === "delivery";
  if (!validDate(date) || !validTime(time) || !name) return json({ error: "Bad request" }, 400, cors);
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (date < yesterday) return json({ error: "Date is in the past" }, 400, cors);

  await cleanup(env);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  // Counts orders, not the extra rows a delivery uses to block its window (their tokens contain "-")
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE ip = ? AND created_at > ? AND token NOT LIKE '%-%'")
    .bind(ip, Date.now() - 3600 * 1000).first();
  if (recent && recent.n >= MAX_PER_HOUR) return json({ error: "Too many requests" }, 429, cors);

  const token = randomToken();
  const now = Date.now();
  /* The chosen time is saved under the token. A delivery also saves every other 30-minute time in
     its window under token-1, token-2, ... All rows go in together or not at all, so if any time in
     the window is already taken, nothing is held and the customer is asked to pick another time. */
  const times = isDelivery ? deliveryWindow(time) : [time];
  /* Older orders may sit on a quarter hour (10:15, 10:45) from before times went to every 30 minutes.
     Treat one of those as taking the half hour it falls in. */
  const span = [toMin(times[0]), toMin(times[times.length - 1]) + SLOT_MIN - 1];
  const clash = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM bookings WHERE date = ? AND (CAST(substr(time, 1, 2) AS INTEGER) * 60 + CAST(substr(time, 4, 2) AS INTEGER)) BETWEEN ? AND ?"
  ).bind(date, span[0], span[1]).first();
  if (clash && clash.n > 0) return json({ error: "That time is taken" }, 409, cors);
  const insert = "INSERT INTO bookings (date, time, name, status, token, ip, created_at, expires_at) VALUES (?, ?, ?, 'hold', ?, ?, ?, ?)";
  let extra = 0;
  const statements = times.map((t) => env.DB.prepare(insert)
    .bind(date, t, name, t === time ? token : token + "-" + (++extra), ip, now, now + HOLD_MINUTES * 60000));
  try {
    await env.DB.batch(statements);
  } catch (err) {
    if (String((err && err.message) || err).includes("UNIQUE")) return json({ error: "That time is taken" }, 409, cors);
    throw err;
  }
  return json({ ok: true, token: token, releaseUrl: url.origin + "/release?token=" + token }, 200, cors);
}

async function finalize(request, env, cors) {
  const body = await readJson(request);
  const token = body ? String(body.token || "") : "";
  if (!token) return json({ error: "Bad request" }, 400, cors);
  if (!validToken(token)) return json({ error: "Bad request" }, 400, cors);
  const result = await env.DB.prepare(
    "UPDATE bookings SET status = 'booked', expires_at = NULL WHERE (token = ? OR token LIKE ?) AND (status = 'booked' OR expires_at >= ?)"
  ).bind(token, token + "-%", Date.now()).run();
  return json({ ok: result.meta.changes > 0 }, 200, cors);
}

/* Calculates a driving-distance delivery fee without ever revealing the pickup point.
   address, baseFee, baseMiles and perMile come from the customer's browser (baseFee/baseMiles/perMile
   just mirror the site's own public pricing - nothing financial depends on this quote; a real order
   is always confirmed by the owner). PICKUP_LAT/PICKUP_LNG/ORS_API_KEY are secrets set in Cloudflare
   and are never included in the response. Addresses farther than MAX_DELIVERY_MILES are declined
   (reason "too_far") before any fee is calculated. */
async function deliveryQuote(url, env, cors) {
  const address = (url.searchParams.get("address") || "").trim().slice(0, 200);
  const baseFeeRaw = url.searchParams.get("baseFee"), baseMilesRaw = url.searchParams.get("baseMiles"), perMileRaw = url.searchParams.get("perMile");
  if (address.length < 8) return json({ ok: false, reason: "address" }, 200, cors);
  if (baseFeeRaw === null || baseMilesRaw === null || perMileRaw === null) return json({ ok: false, reason: "pricing" }, 200, cors);
  const baseFee = Number(baseFeeRaw), baseMiles = Number(baseMilesRaw), perMile = Number(perMileRaw);
  if (!isFinite(baseFee) || !isFinite(baseMiles) || !isFinite(perMile)) return json({ ok: false, reason: "pricing" }, 200, cors);
  if (!env.ORS_API_KEY || !env.PICKUP_LAT || !env.PICKUP_LNG) return json({ ok: false, reason: "not_configured" }, 200, cors);

  try {
    const geoRes = await fetch("https://api.openrouteservice.org/geocode/search?" + new URLSearchParams({
      api_key: env.ORS_API_KEY, text: address, size: "1", "boundary.country": "US"
    }));
    if (!geoRes.ok) return json({ ok: false, reason: "geocode" }, 200, cors);
    const geo = await geoRes.json();
    const feature = geo.features && geo.features[0];
    if (!feature) return json({ ok: false, reason: "not_found" }, 200, cors);
    const [lon, lat] = feature.geometry.coordinates;

    const dirRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car?" + new URLSearchParams({
      api_key: env.ORS_API_KEY,
      start: env.PICKUP_LNG + "," + env.PICKUP_LAT,
      end: lon + "," + lat
    }));
    if (!dirRes.ok) return json({ ok: false, reason: "route" }, 200, cors);
    const dir = await dirRes.json();
    const summary = dir.features && dir.features[0] && dir.features[0].properties && dir.features[0].properties.summary;
    if (!summary) return json({ ok: false, reason: "route" }, 200, cors);

    const miles = summary.distance / 1609.344;
    if (miles > MAX_DELIVERY_MILES) return json({ ok: false, reason: "too_far", maxMiles: MAX_DELIVERY_MILES }, 200, cors);
    const fee = baseFee + Math.max(0, miles - baseMiles) * perMile;
    return json({ ok: true, miles: Math.round(miles * 10) / 10, fee: Math.round(fee * 100) / 100 }, 200, cors);
  } catch (err) {
    return json({ ok: false, reason: "error" }, 200, cors);
  }
}

/* ---------- Owner pages (opened from the order email or /admin) ---------- */

async function release(request, env, url) {
  let token = url.searchParams.get("token") || "";
  if (request.method === "POST") {
    const form = await request.formData();
    token = String(form.get("token") || token);
    if (!validToken(token)) return page("Already released", "<p>That time is already open, or the link is not valid.</p>");
    const result = await deleteOrder(env, token);
    return page("Time released", result.meta.changes > 0
      ? "<p>That time is open again for other customers.</p>"
      : "<p>That time was already released.</p>");
  }
  if (!validToken(token)) return page("Already released", "<p>That time is already open, or the link is not valid.</p>");
  const row = await env.DB.prepare("SELECT date, time, name FROM bookings WHERE token = ?").bind(token).first();
  if (!row) return page("Already released", "<p>That time is already open, or the link is not valid.</p>");
  const blocks = await env.DB.prepare("SELECT time FROM bookings WHERE token LIKE ? ORDER BY time").bind(token + "-%").all();
  return page("Release this time?",
    "<p><strong>" + esc(row.name) + "</strong><br>" + esc(row.date) + " at " + esc(prettyTime(row.time)) +
    esc(windowNote(row.time, blocks.results.map((b) => b.time))) + "</p>" +
    '<form method="POST" action="/release"><input type="hidden" name="token" value="' + esc(token) + '">' +
    "<button>Release this time</button></form>");
}

async function admin(request, env, url) {
  const key = url.searchParams.get("key") || "";
  if (!env.ADMIN_KEY || key.length !== env.ADMIN_KEY.length || key !== env.ADMIN_KEY) {
    return page("Not allowed", "<p>Not allowed.</p>", 403);
  }
  if (request.method === "POST") {
    const form = await request.formData();
    const picked = await env.DB.prepare("SELECT token FROM bookings WHERE id = ?").bind(Number(form.get("id"))).first();
    if (picked) await deleteOrder(env, picked.token.split("-")[0]);
  }
  await cleanup(env);
  const today = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const all = await env.DB.prepare(
    "SELECT id, date, time, name, status, token FROM bookings WHERE date >= ? ORDER BY date, time"
  ).bind(today).all();
  // One line per order: a delivery's extra rows (token-1, token-2, ...) are folded into its own line
  const blocksFor = {};
  all.results.forEach((r) => {
    const i = r.token.indexOf("-");
    if (i > 0) (blocksFor[r.token.slice(0, i)] = blocksFor[r.token.slice(0, i)] || []).push(r.time);
  });
  const rows = { results: all.results.filter((r) => r.token.indexOf("-") === -1) };
  const action = "/admin?key=" + encodeURIComponent(key);
  const list = rows.results.length
    ? rows.results.map((r) =>
        "<tr><td>" + esc(r.date) + "</td><td>" + esc(prettyTime(r.time) + windowNote(r.time, blocksFor[r.token] || [])) +
        "</td><td>" + esc(r.name) + "</td><td>" +
        (r.status === "hold" ? "waiting" : "booked") + "</td><td>" +
        '<form method="POST" action="' + esc(action) + '"><input type="hidden" name="id" value="' + r.id + '">' +
        "<button>Release</button></form></td></tr>").join("")
    : '<tr><td colspan="5">No booked times.</td></tr>';
  return page("Booked times",
    "<table><tr><th>Date</th><th>Time</th><th>Name</th><th>Status</th><th></th></tr>" + list + "</table>");
}

/* ---------- Helpers ---------- */

/* Removes holds that ran out and bookings for dates that have passed */
async function cleanup(env) {
  const now = Date.now();
  const cutoff = new Date(now - 24 * 3600 * 1000).toISOString().slice(0, 10);
  await env.DB.prepare("DELETE FROM bookings WHERE (status = 'hold' AND expires_at < ?) OR date < ?").bind(now, cutoff).run();
}

/* Every 30-minute time a delivery at `time` holds, within opening hours */
function deliveryWindow(time) {
  const start = toMin(time) - DELIVERY_BEFORE_MIN, end = toMin(time) + DELIVERY_AFTER_MIN;
  const out = [];
  for (let t = Math.max(start, OPEN_MIN); t < end && t <= CLOSE_MIN; t += SLOT_MIN) out.push(fromMin(t));
  return out;
}

/* " (delivery, holds 1:00 PM - 3:00 PM)" for a delivery; "" for a pickup */
function windowNote(time, blockTimes) {
  if (!blockTimes.length) return "";
  const all = blockTimes.concat([time]).map(toMin).sort((a, b) => a - b);
  return " (delivery, holds " + prettyTime(fromMin(all[0])) + " - " + prettyTime(fromMin(all[all.length - 1] + SLOT_MIN)) + ")";
}

/* Frees an order's time, plus the rest of the window if it was a delivery */
async function deleteOrder(env, token) {
  return env.DB.prepare("DELETE FROM bookings WHERE token = ? OR token LIKE ?").bind(token, token + "-%").run();
}

function validToken(s) {
  return /^[0-9a-f]{64}$/.test(s);
}

function toMin(s) {
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}

function fromMin(m) {
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

async function readJson(request) {
  try { return await request.json(); } catch (err) { return null; }
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validTime(s) {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const t = Number(m[1]) * 60 + Number(m[2]);
  return t >= OPEN_MIN && t <= CLOSE_MIN && t % SLOT_MIN === 0;
}

function prettyTime(s) {
  const h = Number(s.slice(0, 2)), m = s.slice(3, 5);
  return ((h + 11) % 12 + 1) + ":" + m + (h < 12 ? " AM" : " PM");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({}, cors, { "Content-Type": "application/json", "Cache-Control": "no-store" }),
  });
}

function page(title, body, status) {
  const doc = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + " | CR Bakery</title>" +
    "<style>body{font:17px/1.5 system-ui,sans-serif;color:#1c2140;max-width:34rem;margin:2.5rem auto;padding:0 1.25rem}" +
    "h1{font-weight:400;color:#202b5e}button{font:inherit;padding:.6rem 1.1rem;background:#202b5e;color:#fff;border:0;border-radius:3px;cursor:pointer}" +
    "table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid #dcdfea}form{margin:0}</style></head><body>" +
    "<h1>" + esc(title) + "</h1>" + body + "</body></html>";
  return new Response(doc, { status: status || 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
