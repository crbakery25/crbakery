/* CR Bakery booking service: one order per date and 15-minute time.
   Runs as a Cloudflare Worker with a D1 database bound as DB.
   Settings (Worker > Settings > Variables and Secrets):
     ALLOWED_ORIGINS  comma-separated site addresses allowed to call this service
     ADMIN_KEY        secret used to open the /admin page
   The site calls /slots, /reserve and /finalize. The order email carries a /release link. */

const HOLD_MINUTES = 5; // a time held while an order is being sent frees itself after this long
const MAX_PER_HOUR = 5;    // most times one visitor (IP address) can hold or book in an hour
const OPEN_MIN = 9 * 60;   // 9:00 AM
const CLOSE_MIN = 19 * 60; // 7:00 PM

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
  if (!validDate(date) || !validTime(time) || !name) return json({ error: "Bad request" }, 400, cors);
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (date < yesterday) return json({ error: "Date is in the past" }, 400, cors);

  await cleanup(env);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE ip = ? AND created_at > ?")
    .bind(ip, Date.now() - 3600 * 1000).first();
  if (recent && recent.n >= MAX_PER_HOUR) return json({ error: "Too many requests" }, 429, cors);

  const token = randomToken();
  const now = Date.now();
  try {
    await env.DB.prepare(
      "INSERT INTO bookings (date, time, name, status, token, ip, created_at, expires_at) VALUES (?, ?, ?, 'hold', ?, ?, ?, ?)"
    ).bind(date, time, name, token, ip, now, now + HOLD_MINUTES * 60000).run();
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
  const result = await env.DB.prepare(
    "UPDATE bookings SET status = 'booked', expires_at = NULL WHERE token = ? AND (status = 'booked' OR expires_at >= ?)"
  ).bind(token, Date.now()).run();
  return json({ ok: result.meta.changes > 0 }, 200, cors);
}

/* ---------- Owner pages (opened from the order email or /admin) ---------- */

async function release(request, env, url) {
  let token = url.searchParams.get("token") || "";
  if (request.method === "POST") {
    const form = await request.formData();
    token = String(form.get("token") || token);
    const result = await env.DB.prepare("DELETE FROM bookings WHERE token = ?").bind(token).run();
    return page("Time released", result.meta.changes > 0
      ? "<p>That time is open again for other customers.</p>"
      : "<p>That time was already released.</p>");
  }
  const row = await env.DB.prepare("SELECT date, time, name FROM bookings WHERE token = ?").bind(token).first();
  if (!row) return page("Already released", "<p>That time is already open, or the link is not valid.</p>");
  return page("Release this time?",
    "<p><strong>" + esc(row.name) + "</strong><br>" + esc(row.date) + " at " + esc(prettyTime(row.time)) + "</p>" +
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
    await env.DB.prepare("DELETE FROM bookings WHERE id = ?").bind(Number(form.get("id"))).run();
  }
  await cleanup(env);
  const today = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const rows = await env.DB.prepare(
    "SELECT id, date, time, name, status FROM bookings WHERE date >= ? ORDER BY date, time"
  ).bind(today).all();
  const action = "/admin?key=" + encodeURIComponent(key);
  const list = rows.results.length
    ? rows.results.map((r) =>
        "<tr><td>" + esc(r.date) + "</td><td>" + esc(prettyTime(r.time)) + "</td><td>" + esc(r.name) + "</td><td>" +
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
  return t >= OPEN_MIN && t <= CLOSE_MIN && t % 15 === 0;
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
