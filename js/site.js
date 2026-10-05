/* CR Bakery: renders the menu, order form, and contact links from
   js/menu-data.js and js/site-config.js. */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  if (SITE.bookingApi) SITE.bookingApi = String(SITE.bookingApi).replace(/\/+$/, "");
  var MENU = window.MENU || { sections: [] };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function money(n) {
    var v = Math.round(n * 100) / 100;
    return "$" + (v % 1 === 0 ? String(v) : v.toFixed(2));
  }

  function moneyFull(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }

  function delivery() {
    var d = SITE.delivery || {};
    return { baseFee: Number(d.baseFee) || 0, baseMiles: Number(d.baseMiles) || 0, perMile: Number(d.perMileFee) || 0 };
  }
  /* Delivery is a flat fee for now; CR Bakery charges more by hand if needed. */
  function deliveryText() {
    return moneyFull(delivery().baseFee) + " added to your order (farther addresses may cost more)";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var CAKE_ICON =
    '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="17"/><path d="M32 32V8M32 32l21 12"/></svg>';

  function photo(item) {
    if (item.image) {
      return '<img src="' + esc(item.image) + '" alt="' + esc(item.alt || item.name) + '" loading="lazy">';
    }
    return '<div class="ph" role="img" aria-label="Photo of ' + esc(item.name) + ' coming soon">' +
      CAKE_ICON + "<span>Photo coming soon</span></div>";
  }

  function orderHref(item) {
    return "contact.html?add=" + encodeURIComponent(item.id) + "#order";
  }

  function cardHTML(item) {
    return '<a class="card" href="' + orderHref(item) + '">' +
      '<div class="card-photo">' + photo(item) + "</div>" +
      '<div class="card-body"><h3>' + esc(item.name) + '</h3><span class="price">' + money(item.price) + "</span>" +
      (item.description ? '<p class="card-desc">' + esc(item.description) + "</p>" : "") +
      "</div></a>";
  }

  function rowHTML(item, thumbs) {
    var thumb = "";
    if (thumbs) {
      thumb = '<span class="row-thumb">' + (item.image
        ? '<img src="' + esc(item.image) + '" alt="" loading="lazy">'
        : '<span class="ph" aria-hidden="true">' + CAKE_ICON + "</span>") + "</span>";
    }
    return '<a class="row" href="' + orderHref(item) + '">' + thumb +
      '<span class="row-name">' + esc(item.name) + "</span>" +
      '<span class="row-leader" aria-hidden="true"></span>' +
      '<span class="price">' + money(item.price) + "</span></a>";
  }

  function itemsHTML(section) {
    if (section.layout === "rows") {
      var thumbs = section.items.some(function (i) { return i.image; });
      return section.items.map(function (i) { return rowHTML(i, thumbs); }).join("");
    }
    return section.items.map(cardHTML).join("");
  }

  function findSection(id) {
    for (var i = 0; i < MENU.sections.length; i++) {
      if (MENU.sections[i].id === id) return MENU.sections[i];
    }
    return null;
  }

  /* Menu page: every section with its heading */
  function renderMenuPage() {
    var root = $("#menu-root");
    if (!root) return;
    root.innerHTML = MENU.sections.map(function (s) {
      return '<section class="menu-section" id="' + esc(s.id) + '">' +
        '<div class="section-head"><h2>' + esc(s.title) + "</h2>" +
        (s.description ? "<p>" + esc(s.description) + "</p>" : "") + "</div>" +
        '<div class="' + (s.layout === "rows" ? "rows" : "cards") + '">' + itemsHTML(s) + "</div></section>";
    }).join("");
  }

  /* Home page: just the cards for one section */
  function renderCardBlocks() {
    $all("[data-menu-cards]").forEach(function (el) {
      var s = findSection(el.getAttribute("data-menu-cards"));
      if (s) el.innerHTML = itemsHTML(s);
    });
    $all("[data-min-price]").forEach(function (el) {
      var s = findSection(el.getAttribute("data-min-price"));
      if (s && s.items.length) {
        el.textContent = money(Math.min.apply(null, s.items.map(function (i) { return i.price; })));
      }
    });
  }

  /* Closed dates (vacations) */
  function isoOf(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fromISO(str) { var p = str.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function shortDate(d, weekday) {
    return d.toLocaleDateString(undefined, weekday ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" });
  }
  function closedRanges() { return (SITE.closedRanges || []).filter(function (r) { return r && r.start && r.end; }); }
  function closedRangeFor(iso) {
    var rs = closedRanges();
    for (var i = 0; i < rs.length; i++) { if (iso >= rs[i].start && iso <= rs[i].end) return rs[i]; }
    return null;
  }
  function rangeLabel(r) { return shortDate(fromISO(r.start)) + " to " + shortDate(fromISO(r.end)); }
  function firstOpenDay(iso) {
    var r = closedRangeFor(iso);
    while (r) {
      var d = fromISO(r.end); d.setDate(d.getDate() + 1);
      iso = isoOf(d); r = closedRangeFor(iso);
    }
    return iso;
  }

  /* Notice bar while a closure is upcoming or under way */
  function showClosureNotice() {
    var today = isoOf(new Date());
    var upcoming = closedRanges().filter(function (r) { return r.end >= today; })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; })[0];
    $all("[data-closure-notice]").forEach(function (el) {
      if (!upcoming) return;
      el.querySelector(".wrap").textContent = "CR Bakery is away " + rangeLabel(upcoming) + ". Pickups and deliveries aren't available on those dates.";
      el.hidden = false;
    });
  }

  /* Contact, payment, and social links */
  function fillContactLinks() {
    $all("[data-venmo-link]").forEach(function (a) { a.href = SITE.venmoUrl || "#"; });
    $all("[data-facebook-link]").forEach(function (a) { a.href = SITE.facebookUrl || "#"; });
    $all("[data-linktree-link]").forEach(function (a) { a.href = SITE.linktreeUrl || "#"; });
    if (SITE.email) {
      $all("[data-email-link]").forEach(function (a) { a.href = "mailto:" + SITE.email; a.textContent = SITE.email; });
    } else {
      $all("[data-email-item]").forEach(function (el) { el.parentNode.removeChild(el); });
    }
    $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    $all("[data-delivery-text]").forEach(function (el) { el.textContent = deliveryText(); });
    $all("[data-lead-time]").forEach(function (el) { if (SITE.leadTimeHours) el.textContent = SITE.leadTimeHours + " hours"; });
  }

  /* Order confirmation: the sent order is kept in this browser tab only (sessionStorage) */
  var CONFIRM_KEY = "crbLastOrder";
  function saveConfirmation(record) {
    try { sessionStorage.setItem(CONFIRM_KEY, JSON.stringify(record)); return true; } catch (e) { return false; }
  }

  function renderConfirmation() {
    var root = $("#confirm-root");
    if (!root) return;
    var o = null;
    try { o = JSON.parse(sessionStorage.getItem(CONFIRM_KEY) || "null"); } catch (e) { o = null; }
    var heading = $(".page-head h1");
    var lede = $("#confirm-lede");
    if (!o || !o.items || !o.items.length) {
      if (heading) heading.textContent = "No recent order";
      if (lede) lede.textContent = "We couldn't find a recent order in this browser.";
      root.innerHTML = '<div class="actions"><a class="btn btn-solid" href="contact.html#order">Place an order</a>' +
        '<a class="btn btn-line" href="menu.html">See the menu</a></div>';
      return;
    }

    var first = String(o.name || "").split(" ")[0];
    if (heading && first) heading.textContent = "Thank you, " + first;
    var isDelivery = o.fulfillment === "Delivery";
    var word = isDelivery ? "Delivery" : "Pickup";

    var rows = o.items.map(function (l) {
      return '<div class="breakdown-row"><span>' + l.qty + "&nbsp;&times;&nbsp;" + esc(l.name) +
        "</span><span>" + money(l.qty * l.price) + "</span></div>";
    }).join("");
    if (isDelivery && o.fee > 0) {
      rows += '<div class="breakdown-row is-delivery"><span>Delivery' + (o.miles ? " (about " + esc(o.miles) + " miles)" : "") +
        "</span><span>" + money(o.fee) + "</span></div>";
    }

    var details = [
      ["Name", o.name], ["Phone", o.phone], ["Email", o.email],
      [word + " date", o.date ? shortDate(fromISO(o.date), true) : ""], [word + " time", o.time]
    ];
    if (isDelivery) details.push(["Address", o.address]);
    if (o.payment) details.push(["Payment", o.payment]);
    if (o.notes) details.push(["Notes", o.notes]);

    var isCash = o.payment === "Cash";
    var payHtml = isCash
      ? "<p>You chose to pay with cash. Please have it ready at " + word.toLowerCase() + ".</p>" +
        "<p>Estimated total: <strong>" + esc(o.total) + "</strong></p>"
      : "<p>You chose to pay with Venmo. Add your name to the payment note.</p>" +
        "<p>Estimated total: <strong>" + esc(o.total) + "</strong></p>" +
        '<a class="btn btn-solid" href="' + esc(SITE.venmoUrl || "#") + '" target="_blank" rel="noopener">Open Venmo</a>';
    var list = details.filter(function (d) { return d[1]; }).map(function (d) {
      return "<dt>" + esc(d[0]) + "</dt><dd>" + esc(d[1]) + "</dd>";
    }).join("");

    var sent = new Date(o.sentAt || Date.now());
    root.innerHTML =
      '<div class="print-only print-title"><p class="print-brand">CR Bakery</p>' +
        "<p>Order sent " + esc(sent.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })) + "</p></div>" +
      '<div class="confirm-grid">' +
        '<section class="confirm-card" aria-labelledby="c-order"><h2 id="c-order">Order details</h2>' + rows +
          '<div class="order-total"><span>Estimated total</span><span>' + esc(o.total) + "</span></div>" +
          '<p class="confirm-note">CR Bakery will confirm your order and final total.</p></section>' +
        '<section class="confirm-card" aria-labelledby="c-contact"><h2 id="c-contact">Your details</h2>' +
          '<dl class="confirm-list">' + list + "</dl></section>" +
        '<section class="confirm-card confirm-pay no-print" aria-labelledby="c-pay"><h2 id="c-pay">How to pay</h2>' +
          payHtml + "</section>" +
      "</div>" +
      '<div class="actions confirm-actions no-print">' +
        '<button type="button" class="btn btn-line" id="confirm-print">Print order details</button>' +
        '<a class="btn btn-line" href="menu.html">Back to the menu</a></div>';

    var printBtn = $("#confirm-print", root);
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  /* Order form */
  var orderApi = null;

  function initOrderForm() {
    var form = $("#order");
    if (!form) return;

    var host = $("#order-items");
    var totalEl = $("#order-total");
    var breakdownEl = $("#order-breakdown");
    var breakdownHeadEl = $("#breakdown-head");
    var noteEl = $("#total-note");
    var statusEl = $("#form-status");
    var byId = {};
    var dv = delivery();

    host.innerHTML = MENU.sections.map(function (s) {
      return '<div class="order-group"><h3>' + esc(s.title) + "</h3>" + s.items.map(function (it) {
        byId[it.id] = it;
        return '<div class="order-row" data-id="' + esc(it.id) + '">' +
          '<div class="order-name">' + esc(it.name) + '<span class="order-price">' + money(it.price) + "</span></div>" +
          '<div class="stepper">' +
          '<button type="button" data-step="-1" aria-label="Remove one ' + esc(it.name) + '">\u2212</button>' +
          '<input type="number" min="0" max="20" value="0" inputmode="numeric" data-qty aria-label="Quantity of ' + esc(it.name) + '">' +
          '<button type="button" data-step="1" aria-label="Add one ' + esc(it.name) + '">+</button>' +
          "</div></div>";
      }).join("") + "</div>";
    }).join("");

    function fulfillment() {
      var r = $('input[name="fulfillment"]:checked', form);
      return r ? r.value : "pickup";
    }

    function rowQty(row) {
      var n = parseInt($("[data-qty]", row).value, 10);
      return isNaN(n) || n < 0 ? 0 : Math.min(n, 20);
    }

    function lines() {
      return $all(".order-row", host).map(function (row) {
        return { item: byId[row.getAttribute("data-id")], qty: rowQty(row) };
      }).filter(function (l) { return l.qty > 0; });
    }

    function subtotal() {
      return lines().reduce(function (sum, l) { return sum + l.qty * l.item.price; }, 0);
    }

    function refresh() {
      $all(".order-row", host).forEach(function (row) {
        row.classList.toggle("is-selected", rowQty(row) > 0);
      });
      var ls = lines();
      var sub = subtotal();
      var isDelivery = fulfillment() === "delivery";
      var fee = tooFar ? 0 : (quote ? quote.fee : dv.baseFee);
      var total = sub + (isDelivery && sub > 0 ? fee : 0);
      totalEl.textContent = money(total);
      if (breakdownEl) {
        if (ls.length) {
          var rows = ls.map(function (l) {
            return '<div class="breakdown-row"><span>' + l.qty + "&nbsp;&times;&nbsp;" + esc(l.item.name) +
              "</span><span>" + money(l.qty * l.item.price) + "</span></div>";
          }).join("");
          if (isDelivery && sub > 0 && !tooFar) {
            rows += '<div class="breakdown-row is-delivery"><span>Delivery</span><span>' + money(fee) + "</span></div>";
          }
          breakdownEl.innerHTML = rows;
          breakdownEl.hidden = false;
          if (breakdownHeadEl) breakdownHeadEl.hidden = false;
        } else {
          breakdownEl.innerHTML = "";
          breakdownEl.hidden = true;
          if (breakdownHeadEl) breakdownHeadEl.hidden = true;
        }
      }
      if (isDelivery && sub > 0) {
        if (tooFar) {
          noteEl.textContent = "Sorry, that address is outside CR Bakery's " + tooFar + "-mile delivery area. Please choose pickup, or message CR Bakery about other options.";
        } else if (quote) {
          noteEl.textContent = "Includes an estimated delivery fee of " + moneyFull(quote.fee) +
            " (about " + quote.miles + (quote.miles === 1 ? " mile" : " miles") + "). CR Bakery will confirm your final total.";
        } else if (quotePending) {
          noteEl.textContent = "Calculating your delivery fee...";
        } else {
          noteEl.textContent = "Includes a " + moneyFull(dv.baseFee) + " delivery fee. If your address needs a higher fee, CR Bakery will let you know before confirming your total.";
        }
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
      }
    }

    function setQty(id, qty) {
      var row = $('.order-row[data-id="' + id + '"]', host);
      if (!row) return;
      $("[data-qty]", row).value = qty;
      refresh();
    }

    host.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-step]");
      if (!btn) return;
      var row = btn.closest(".order-row");
      var next = Math.max(0, Math.min(20, rowQty(row) + parseInt(btn.getAttribute("data-step"), 10)));
      $("[data-qty]", row).value = next;
      refresh();
    });
    host.addEventListener("input", refresh);

    /* Pickup date: minimum notice and away dates */
    var dateInput = $("[name=date]", form);
    var dateLabel = $("label[for=f-date]", form);
    var timeLabel = $("label[for=f-time]", form);
    var timeSelect = $("#f-time", form);
    /* Times from 9:00 AM to 7:00 PM in 15 minute steps */
    var timeSlots = [];
    for (var m = 9 * 60; m <= 19 * 60; m += 15) {
      var h24 = Math.floor(m / 60), min = m % 60;
      timeSlots.push({
        key: String(h24).padStart(2, "0") + ":" + String(min).padStart(2, "0"),
        label: ((h24 + 11) % 12 + 1) + ":" + String(min).padStart(2, "0") + (h24 < 12 ? " AM" : " PM")
      });
    }
    /* One order per time: times taken (from the booking service, plus any listed in SITE.bookedSlots) are not offered */
    var takenByDate = {};
    function takenKeys(iso) {
      var listed = (SITE.bookedSlots || []).filter(function (b) { return b && b.date === iso; })
        .map(function (b) { return b.time; });
      return listed.concat(takenByDate[iso] || []);
    }
    function loadTaken(iso) {
      if (!SITE.bookingApi || !iso) return Promise.resolve();
      return fetch(SITE.bookingApi + "/slots?date=" + encodeURIComponent(iso), { cache: "no-store" })
        .then(function (res) { if (!res.ok) throw new Error("bad response"); return res.json(); })
        .then(function (d) { takenByDate[iso] = d.taken || []; })
        .catch(function () {});
    }
    function refreshTimes() {
      buildTimes();
      loadTaken(dateInput ? dateInput.value : "").then(buildTimes);
    }
    function buildTimes() {
      if (!timeSelect) return;
      var keep = timeSelect.value;
      var taken = takenKeys(dateInput ? dateInput.value : "");
      timeSelect.innerHTML = '<option value="">Choose a time</option>';
      timeSlots.forEach(function (slot) {
        var isTaken = taken.indexOf(slot.key) !== -1;
        var opt = document.createElement("option");
        opt.value = slot.label;
        opt.setAttribute("data-key", slot.key);
        opt.textContent = isTaken ? slot.label + " (taken)" : slot.label;
        opt.disabled = isTaken;
        if (slot.label === keep && !isTaken) opt.selected = true;
        timeSelect.appendChild(opt);
      });
    }
    buildTimes();
    var addressBox = $("#address-fields", form);
    var addressInputs = $all("input", addressBox);
    var streetInput = $("#f-street", form), cityInput = $("#f-city", form), stateInput = $("#f-state", form), zipInput = $("#f-zip", form);

    /* Live delivery fee: calculated from driving distance by the booking service, which keeps the
       pickup address private. Falls back to the flat fee if the service isn't set up or can't answer. */
    var quote = null, quotePending = false, quoteTimer = null, quoteSeq = 0, tooFar = null;
    function addressReady() {
      return streetInput && streetInput.value.trim().length > 3 &&
        cityInput && cityInput.value.trim() &&
        stateInput && /^[A-Za-z]{2}$/.test(stateInput.value.trim()) &&
        zipInput && /^\d{5}$/.test(zipInput.value.trim());
    }
    function requestQuote() {
      if (!SITE.bookingApi || !addressReady()) { quotePending = false; refresh(); return; }
      var address = [streetInput.value, cityInput.value, stateInput.value.toUpperCase() + " " + zipInput.value].join(", ");
      var params = new URLSearchParams({ address: address, baseFee: dv.baseFee, baseMiles: dv.baseMiles, perMile: dv.perMile });
      var at = ++quoteSeq;
      fetch(SITE.bookingApi + "/delivery-quote?" + params, { cache: "no-store" })
        .then(function (res) { return res.json(); })
        .then(function (d) {
          if (at !== quoteSeq) return;
          quotePending = false;
          if (d && d.ok) { quote = { miles: d.miles, fee: d.fee }; tooFar = null; }
          else if (d && d.reason === "too_far") { quote = null; tooFar = d.maxMiles || null; }
          else { quote = null; tooFar = null; }
          refresh();
        })
        .catch(function () {
          if (at !== quoteSeq) return;
          quotePending = false; quote = null; tooFar = null; refresh();
        });
    }
    function scheduleQuote() {
      quote = null; tooFar = null;
      clearTimeout(quoteTimer);
      if (!addressReady()) { quotePending = false; refresh(); return; }
      quotePending = true;
      quoteTimer = setTimeout(requestQuote, 700);
      refresh();
    }
    addressInputs.forEach(function (i) { i.addEventListener("input", scheduleQuote); });
    var dateHint = $("#date-hint");
    var lead = Number(SITE.leadTimeHours) || 0;
    var minStr = firstOpenDay(isoOf(new Date(Date.now() + lead * 3600 * 1000)));
    var minLabel = shortDate(fromISO(minStr), true);
    if (dateInput) dateInput.min = minStr;

    function checkDate() {
      if (!dateInput) return;
      var v = dateInput.value, msg = "";
      if (v && v < minStr) {
        msg = "Please choose " + minLabel + " or later. Orders need at least " + lead + " hours of notice.";
      } else if (v && closedRangeFor(v)) {
        var r = closedRangeFor(v);
        msg = "CR Bakery is away " + rangeLabel(r) + ". Please choose " + shortDate(fromISO(firstOpenDay(v)), true) + " or later.";
      }
      dateInput.setCustomValidity(msg);
    }
    if (dateInput) {
      dateInput.addEventListener("input", checkDate);
      dateInput.addEventListener("change", checkDate);
      dateInput.addEventListener("input", refreshTimes);
      dateInput.addEventListener("change", refreshTimes);
    }

    /* Highlights the chosen option in each group of choices (pickup or delivery, payment) */
    function markChoices() {
      $all(".choice", form).forEach(function (c) {
        c.classList.toggle("is-selected", $("input", c).checked);
      });
    }
    $all('input[name="payment"]', form).forEach(function (r) { r.addEventListener("change", markChoices); });

    /* Pickup or delivery */
    var fulfillHint = $("#fulfillment-hint");
    function applyFulfillment() {
      buildTimes();
      var mode = fulfillment();
      var word = mode === "delivery" ? "delivery" : "pickup";
      markChoices();
      var cap = word.charAt(0).toUpperCase() + word.slice(1);
      if (dateLabel) dateLabel.textContent = cap + " date";
      if (timeLabel) timeLabel.textContent = cap + " time";
      addressBox.hidden = mode !== "delivery";
      addressInputs.forEach(function (i) { i.required = mode === "delivery"; });
      if (dateHint) {
        var soon = closedRanges().filter(function (r) { return r.end >= isoOf(new Date()); })[0];
        dateHint.textContent = "Orders need at least " + lead + " hours of notice. Earliest " + word + " date: " + minLabel + "." +
          (soon ? " CR Bakery is away " + rangeLabel(soon) + "." : "");
      }
      if (fulfillHint) {
        fulfillHint.textContent = mode === "delivery"
          ? "Delivery adds " + moneyFull(dv.baseFee) + " to your total. If your address needs a higher fee, CR Bakery will let you know."
          : "Delivery is also available: " + deliveryText() + ".";
      }
      if (mode === "delivery") {
        scheduleQuote();
      } else {
        quote = null; quotePending = false; tooFar = null; clearTimeout(quoteTimer);
      }
      refresh();
    }
    $all('input[name="fulfillment"]', form).forEach(function (r) { r.addEventListener("change", applyFulfillment); });

    function say(msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = "form-status" + (kind ? " is-" + kind : "");
    }

    function summary(ls) {
      var sub = ls.reduce(function (sum, l) { return sum + l.qty * l.item.price; }, 0);
      var text = ls.map(function (l) { return l.qty + " x " + l.item.name + " (" + money(l.item.price) + " each)"; }).join("\n");
      var total = sub, fee = 0;
      if (fulfillment() === "delivery" && !tooFar) {
        fee = quote ? quote.fee : dv.baseFee; total += fee;
        text += quote
          ? "\nDelivery: " + moneyFull(fee) + " (about " + quote.miles + " miles; final fee to be confirmed)"
          : "\nDelivery: " + moneyFull(fee) + " (final fee to be confirmed if the address is farther)";
      }
      return { text: text, total: money(total), fee: fee };
    }

    function postPlain(url, fields) {
      var f = document.createElement("form");
      f.method = "POST"; f.action = url; f.style.display = "none";
      Object.keys(fields).forEach(function (k) {
        var i = document.createElement("input");
        i.type = "hidden"; i.name = k; i.value = fields[k]; f.appendChild(i);
      });
      document.body.appendChild(f);
      f.submit();
    }

    /* Booking service: hold a time, then confirm it once the order is sent */
    function reserveSlot(date, key, name) {
      return fetch(SITE.bookingApi + "/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date, time: key, name: name })
      }).then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body }; });
      });
    }
    function finishSlot(booking) {
      if (!booking || !SITE.bookingApi) return;
      fetch(SITE.bookingApi + "/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: booking.token }),
        keepalive: true
      }).catch(function () {});
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ls = lines();
      if (!ls.length) {
        say("Add at least one cake to send your order.", "error");
        host.scrollIntoView({ block: "center" });
        return;
      }
      var fd = new FormData(form);
      var mode = fulfillment();
      if (mode === "delivery" && tooFar) {
        say("Sorry, that address is outside CR Bakery's " + tooFar + "-mile delivery area. Please choose pickup, or message CR Bakery about other options.", "error");
        return;
      }
      var word = mode === "delivery" ? "Delivery" : "Pickup";
      var data = {
        name: (fd.get("first_name") + " " + fd.get("last_name")).trim(), email: fd.get("email") || "", phone: fd.get("phone"),
        address: mode === "delivery"
          ? [fd.get("street"), fd.get("city"), String(fd.get("state")).toUpperCase() + " " + fd.get("zip")].join(", ")
          : "",
        date: fd.get("date"), time: fd.get("time"), payment: fd.get("payment") || "", notes: fd.get("notes") || ""
      };
      var s = summary(ls);
      /* Kept in this browser tab only, for the order-confirmed page */
      var record = {
        name: data.name, phone: data.phone, email: data.email,
        fulfillment: word, date: data.date, time: data.time, address: data.address, payment: data.payment, notes: data.notes,
        items: ls.map(function (l) { return { name: l.item.name, qty: l.qty, price: l.item.price }; }),
        fee: s.fee, miles: mode === "delivery" && quote ? quote.miles : null, total: s.total, sentAt: Date.now()
      };

      function sendOrder(booking) {
        var payload = {
          _subject: "New CR Bakery " + word.toLowerCase() + " order from " + data.name,
          name: data.name, email: data.email, phone: data.phone,
          fulfillment: word, address: data.address, payment: data.payment,
          order: s.text, estimated_total: s.total, notes: data.notes
        };
        payload[word.toLowerCase() + "_date"] = data.date;
        payload[word.toLowerCase() + "_time"] = data.time;
        if (booking) payload.release_link = booking.releaseUrl;
        say("Sending your order...", "");
        fetch(SITE.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("bad response");
          finishSlot(booking);
          if (saveConfirmation(record)) {
            window.location.href = "order-confirmed.html";
            return;
          }
          form.reset();
          $all("[data-qty]", host).forEach(function (i) { i.value = 0; });
          applyFulfillment();
          say("Thanks, " + data.name + ". Your order was sent and CR Bakery will follow up by email.", "ok");
        }).catch(function () {
          // If the in-page send is blocked, send it as a regular form post instead.
          finishSlot(booking);
          postPlain(SITE.formEndpoint, payload);
        });
      }

      if (SITE.formEndpoint && SITE.bookingApi) {
        /* Hold the chosen time first so two customers can't take the same one */
        var chosen = timeSelect.options[timeSelect.selectedIndex];
        say("Checking your time...", "");
        reserveSlot(data.date, chosen ? chosen.getAttribute("data-key") : "", data.name).then(function (r) {
          if (r.status === 200 && r.body && r.body.token) {
            sendOrder(r.body);
          } else if (r.status === 409) {
            say("Sorry, that time was just taken. Please choose another time.", "error");
            refreshTimes();
          } else if (r.status === 429) {
            say("Too many attempts. Please try again in a little while.", "error");
          } else {
            say("We couldn't check that time. Please try again.", "error");
          }
        }).catch(function () {
          say("We couldn't check that time. Please check your connection and try again.", "error");
        });
      } else if (SITE.formEndpoint) {
        sendOrder(null);
      } else if (SITE.email) {
        var body = "Name: " + data.name + "\nEmail: " + data.email + "\nPhone: " + data.phone +
          (data.address ? "\nAddress: " + data.address : "") + "\n" + word + " date: " + data.date + "\n" + word + " time: " + data.time + "\n\nOrder:\n" + s.text +
          "\n\nEstimated total: " + s.total + "\nPayment: " + data.payment + "\n\nNotes: " + data.notes;
        window.location.href = "mailto:" + (SITE.email || "") +
          "?subject=" + encodeURIComponent("New " + word.toLowerCase() + " order from " + data.name) + "&body=" + encodeURIComponent(body);
        say("Your email app should open with your order ready to send.", "ok");
      } else {
        statusEl.className = "form-status";
        statusEl.innerHTML = "Online orders aren't open yet. " +
          '<a href="' + esc(SITE.facebookUrl || "#") + '" target="_blank" rel="noopener">Message CR Bakery on Facebook</a> to place your order.';
      }
    });

    orderApi = {
      addItem: function (id) {
        var row = $('.order-row[data-id="' + id + '"]', host);
        if (row && rowQty(row) < 1) setQty(id, 1);
      }
    };

    var add = new URLSearchParams(window.location.search).get("add");
    if (add) orderApi.addItem(add);
    applyFulfillment();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderMenuPage();
    renderCardBlocks();
    fillContactLinks();
    showClosureNotice();
    initOrderForm();
    renderConfirmation();
  });

  window.CRB = { addItem: function (id) { if (orderApi) orderApi.addItem(id); } };
})();
