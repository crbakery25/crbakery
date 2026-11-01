/* CR Bakery: renders the menu, order form, and contact links from
   js/menu-data.js and js/site-config.js. */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  if (SITE.bookingApi) SITE.bookingApi = String(SITE.bookingApi).replace(/\/+$/, "");

  /* Test version: on any address other than the live site (such as the Cloudflare Pages test site),
     orders are never sent and times are never held, and a banner says so. */
  var LIVE_HOSTS = ["crbakery25.com", "www.crbakery25.com"];
  var TEST_MODE = LIVE_HOSTS.indexOf(window.location.hostname) === -1;
  function showTestBanner() {
    if (!TEST_MODE) return;
    var bar = document.createElement("div");
    bar.className = "test-banner";
    bar.setAttribute("role", "note");
    bar.textContent = "Test version: orders are not sent and times are not held.";
    // Inside the sticky header, so it stays at the top of the screen while scrolling
    var header = $(".site-header");
    if (header) header.insertBefore(bar, header.firstChild);
    else document.body.insertBefore(bar, document.body.firstChild);
    // Let the page make room for it (jump links and the sticky payment box)
    function setBannerHeight() { document.documentElement.style.setProperty("--test-banner-h", bar.offsetHeight + "px"); }
    setBannerHeight();
    window.addEventListener("resize", setBannerHeight);
    var robots = document.createElement("meta");
    robots.name = "robots"; robots.content = "noindex";
    document.head.appendChild(robots);
  }
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
    return (item.orderPage || "contact.html") + "?add=" + encodeURIComponent(item.id) + "#order";
  }

  /* An item sold in several sizes (e.g. half dozen / dozen) lists each size and price under its photo */
  function sizesHTML(item) {
    return '<ul class="card-sizes">' + item.sizes.map(function (s) {
      return '<li><span>' + esc(s.label) + '</span><span class="row-leader" aria-hidden="true"></span><span class="price">' + money(s.price) + "</span></li>";
    }).join("") + "</ul>";
  }

  /* An item with more than one photo (images: [...]) gets a photo strip customers can swipe,
     or step through with the arrows. The name and price below still link to the order form. */
  function galleryHTML(item) {
    var imgs = item.images;
    return '<div class="card-photo gallery" data-gallery>' +
      '<div class="gallery-track" tabindex="0" aria-label="Photos of ' + esc(item.name) + '">' + imgs.map(function (im, i) {
        return '<img src="' + esc(im.src) + '" alt="' + esc(im.alt || item.name) + '"' + (i ? ' loading="lazy"' : "") + ">";
      }).join("") + "</div>" +
      '<button type="button" class="gallery-btn gallery-prev" data-dir="-1" aria-label="Previous photo">\u2039</button>' +
      '<button type="button" class="gallery-btn gallery-next" data-dir="1" aria-label="Next photo">\u203A</button>' +
      '<div class="gallery-dots" aria-hidden="true">' + imgs.map(function (im, i) {
        return '<span' + (i ? "" : ' class="is-on"') + "></span>";
      }).join("") + "</div></div>";
  }

  /* Allergy warning (allergy: "...") shown on the card, in the pop-up and in the order form */
  function allergyBadge(item) {
    return item.allergy ? '<p class="allergy-badge"><span aria-hidden="true">\u26A0\uFE0E</span> ' + esc(item.allergyShort || "Allergy warning") + "</p>" : "";
  }

  function cardHTML(item) {
    if (item.images && item.images.length > 1) {
      return '<div class="card" data-item="' + esc(item.id) + '">' + galleryHTML(item) +
        '<a class="card-body card-link" href="' + orderHref(item) + '"><h3>' + esc(item.name) + "</h3>" +
        (item.sizes ? sizesHTML(item) : '<span class="price">' + money(item.price) + "</span>") +
        allergyBadge(item) +
        (item.fillings ? '<p class="card-fillings">' + item.fillings.map(function (f) { return esc(f.name); }).join(" \u00B7 ") + "</p>" : "") +
        (item.mixAndMatch ? '<p class="card-fillings card-mix">Mix &amp; match fillings in any box</p>' : "") +
        "</a></div>";
    }
    return '<a class="card" data-item="' + esc(item.id) + '" href="' + orderHref(item) + '">' +
      '<div class="card-photo">' + photo(item) + "</div>" +
      '<div class="card-body"><h3>' + esc(item.name) + "</h3>" +
      (item.sizes ? sizesHTML(item) : '<span class="price">' + money(item.price) + "</span>") +
      allergyBadge(item) +
      (item.fillings ? '<p class="card-fillings">' + item.fillings.map(function (f) { return esc(f.name); }).join(" \u00B7 ") + "</p>" : "") +
      (item.mixAndMatch ? '<p class="card-fillings card-mix">Mix &amp; match fillings in any box</p>' : "") +
      "</div></a>";
  }

  function rowHTML(item, thumbs) {
    var thumb = "";
    if (thumbs) {
      thumb = '<span class="row-thumb">' + (item.image
        ? '<img src="' + esc(item.image) + '" alt="" loading="lazy">'
        : '<span class="ph" aria-hidden="true">' + CAKE_ICON + "</span>") + "</span>";
    }
    return '<a class="row" data-item="' + esc(item.id) + '" href="' + orderHref(item) + '">' + thumb +
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

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Sections currently on offer: a limited-time section with an
     availableUntil date in the past is dropped everywhere. */
  function activeSections() {
    var today = todayISO();
    return MENU.sections.filter(function (s) {
      return !s.availableUntil || s.availableUntil >= today;
    });
  }

  function findSection(id) {
    var list = activeSections();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /* Menu page: every section with its heading */
  function renderMenuPage() {
    var root = $("#menu-root");
    if (!root) return;
    root.innerHTML = activeSections().map(function (s) {
      return '<section class="menu-section' + (s.availableUntil ? " menu-section--special" : "") + '" id="' + esc(s.id) + '">' +
        '<div class="section-head"><h2>' + esc(s.title) + "</h2>" +
        (s.description ? "<p>" + esc(s.description) + "</p>" : "") +
        (s.note ? '<p class="section-note">' + esc(s.note) + "</p>" : "") + "</div>" +
        '<div class="' + (s.layout === "rows" ? "rows" : "cards") + '">' + itemsHTML(s) + "</div></section>";
    }).join("");
  }

  /* Photo strips: arrows step one photo; dots follow the photo in view */
  function initGalleries(root) {
    $all("[data-gallery]", root).forEach(initGallery);
  }
  function initGallery(g) {
    {
      var track = $(".gallery-track", g), dots = $all(".gallery-dots span", g);
      function current() { return Math.round(track.scrollLeft / track.clientWidth); }
      function show() {
        var i = current();
        dots.forEach(function (d, j) { d.classList.toggle("is-on", j === i); });
        $(".gallery-prev", g).disabled = i === 0;
        $(".gallery-next", g).disabled = i >= dots.length - 1;
      }
      $all(".gallery-btn", g).forEach(function (b) {
        b.addEventListener("click", function () {
          track.scrollTo({ left: (current() + Number(b.getAttribute("data-dir"))) * track.clientWidth, behavior: "smooth" });
        });
      });
      track.addEventListener("scroll", function () { window.requestAnimationFrame(show); });
      show();
    }
  }

  /* Item pop-up: clicking a menu item's photo or name shows a larger photo (or photos), the
     description and an "Add to order" button. Without JavaScript the links still go to the order form. */
  function findItem(id) {
    var found = null;
    activeSections().concat(window.HOT_FOOD ? [window.HOT_FOOD] : []).forEach(function (s) {
      s.items.forEach(function (it) { if (it.id === id) found = it; });
    });
    return found;
  }

  function popPhotoHTML(item) {
    if (item.images && item.images.length > 1) return galleryHTML(item).replace(/ loading="lazy"/g, "");
    var src = item.image || (item.images && item.images[0] && item.images[0].src);
    var alt = item.alt || (item.images && item.images[0] && item.images[0].alt) || item.name;
    return '<div class="card-photo">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(alt) + '">' : photo(item)) + "</div>";
  }

  var pop = null;
  function openItem(item) {
    if (!pop) {
      pop = document.createElement("dialog");
      pop.className = "item-pop";
      pop.setAttribute("aria-labelledby", "pop-title");
      pop.innerHTML = '<button type="button" class="pop-close" aria-label="Close">\u00D7</button><div class="pop-inner"></div>';
      document.body.appendChild(pop);
      $(".pop-close", pop).addEventListener("click", function () { pop.close(); });
      pop.addEventListener("click", function (e) { if (e.target === pop) pop.close(); });   // click outside the box
      pop.addEventListener("close", function () { document.documentElement.classList.remove("pop-open"); });
    }
    $(".pop-inner", pop).innerHTML =
      '<div class="pop-photo">' + popPhotoHTML(item) + "</div>" +
      '<div class="pop-text">' +
      '<h2 id="pop-title">' + esc(item.name) + "</h2>" +
      (item.sizes ? sizesHTML(item) : '<p class="pop-price price">' + money(item.price) + "</p>") +
      (item.description ? '<p class="pop-desc">' + esc(item.description) + "</p>" : "") +
      (item.allergy ? '<p class="allergy-note" role="note"><strong>Allergy warning:</strong> ' + esc(item.allergy) + "</p>" : "") +
      '<a class="btn btn-solid pop-order" href="' + orderHref(item) + '">' + (item.sizes ? "Choose a size and order" : "Add to order") + "</a>" +
      "</div>";
    document.documentElement.classList.add("pop-open");
    if (pop.showModal) pop.showModal(); else pop.setAttribute("open", "");
    initGalleries(pop);
    $(".pop-close", pop).focus();
  }

  function initItemPopups() {
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-item]");
      if (!el || e.target.closest(".gallery-btn") || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var item = findItem(el.getAttribute("data-item"));
      if (!item) return;
      e.preventDefault();
      openItem(item);
    });
  }

  /* Home page: just the cards for one section */
  function renderCardBlocks() {
    $all("[data-menu-cards]").forEach(function (el) {
      var s = findSection(el.getAttribute("data-menu-cards"));
      if (s) el.innerHTML = itemsHTML(s);
    });
    /* A home page section for a limited-time menu section disappears once that section ends */
    $all("[data-hide-if-empty]").forEach(function (el) {
      var s = findSection(el.getAttribute("data-hide-if-empty"));
      el.hidden = !s;
      var note = s && $("[data-section-note]", el);
      if (note && s.note) note.textContent = (s.description ? s.description + " " : "") + s.note;
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

  function showPickupNotice(spot) {
    var d = document.createElement("dialog");
    d.className = "item-pop pickup-pop";
    d.setAttribute("aria-labelledby", "pickup-pop-title");
    d.innerHTML = '<div class="pop-text">' +
      '<h2 id="pickup-pop-title">Hot food pickup location</h2>' +
      "<p>Your hot food order will be picked up <strong>" + esc(spot) + "</strong>.</p>" +
      "<p>This is a different spot from our cheesecakes and other treats" + (SITE.pickupArea ? " (" + esc(SITE.pickupArea) + ")" : "") + ".</p>" +
      '<button type="button" class="btn btn-solid pop-order">Got it</button></div>';
    document.body.appendChild(d);
    $("button", d).addEventListener("click", function () { d.close(); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
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

    if (o.prepay && lede) lede.textContent = "Your preorder was sent. Pay with Venmo to confirm it - details below.";
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
    if (o.pickupSpot) details.push(["Pickup location", o.pickupSpot]);
    else if (!isDelivery && SITE.pickupArea) details.push(["Pickup area", SITE.pickupArea]);
    if (o.payment) details.push(["Payment", o.payment]);
    if (o.notes) details.push(["Notes", o.notes]);

    var isCash = o.payment === "Cash";
    var payHtml = o.prepay
      ? "<p><strong>Prepayment is required.</strong> Your order is confirmed once CR Bakery receives your Venmo payment.</p>" +
        "<p>Amount to pay: <strong>" + esc(o.total) + "</strong></p>" +
        "<p>Add your name and pickup date to the payment note.</p>" +
        '<a class="btn btn-solid" href="' + esc(SITE.venmoUrl || "#") + '" target="_blank" rel="noopener">Pay with Venmo</a>'
      : isCash
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
          '<div class="order-total"><span>' + (o.prepay ? "Total to prepay" : "Estimated total") + '</span><span>' + esc(o.total) + "</span></div>" +
          '<p class="confirm-note">' + (o.prepay ? "Your order is confirmed once your Venmo payment is received." : "CR Bakery will confirm your order and final total.") + "</p></section>" +
        '<section class="confirm-card" aria-labelledby="c-contact"><h2 id="c-contact">Your details</h2>' +
          '<dl class="confirm-list">' + list + "</dl></section>" +
        '<section class="confirm-card confirm-pay no-print" aria-labelledby="c-pay"><h2 id="c-pay">How to pay</h2>' +
          payHtml + "</section>" +
      "</div>" +
      '<div class="actions confirm-actions no-print">' +
        '<button type="button" class="btn btn-line" id="confirm-print">Print order details</button>' +
        '<a class="btn btn-line" href="menu.html">Back to the menu</a></div>';

    /* Hot food is picked up somewhere else than cakes: make sure the customer sees it */
    if (o.pickupSpot) showPickupNotice(o.pickupSpot);

    var printBtn = $("#confirm-print", root);
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  /* ---------- Weekend hot food: preorder page, pickup only, prepay with Venmo ---------- */
  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* Today's date and time in the bakery's time zone, whatever the visitor's own clock is set to */
  function bakeryNow() {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, time: p.hour + ":" + p.minute };
  }
  function addDaysISO(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function weekdayOf(iso) { return new Date(iso + "T12:00:00Z").getUTCDay(); }
  function clockLabel(hhmm) {
    var h = Number(hhmm.slice(0, 2)), m = hhmm.slice(3, 5);
    return ((h + 11) % 12 + 1) + ":" + m + (h < 12 ? " AM" : " PM");
  }
  function hotCutoffText(HF) { return HF.orderByDay + " " + clockLabel(HF.orderByTime); }

  /* Pickup dates still open for preorders: every pickup day in the next daysAhead days whose
     order-by cutoff (the order-by day and time before that weekend) hasn't passed yet */
  function hotPickupDates(HF) {
    var now = bakeryNow(), nowKey = now.date + " " + now.time;
    var days = HF.pickupDays.map(function (d) { return DAY_NAMES.indexOf(d); });
    var orderDay = DAY_NAMES.indexOf(HF.orderByDay);
    var ahead = HF.daysAhead || 31, out = [];
    for (var i = 0; i <= ahead; i++) {
      var iso = addDaysISO(now.date, i), dow = weekdayOf(iso);
      if (days.indexOf(dow) === -1) continue;
      var back = (dow - orderDay + 7) % 7 || 7;
      var cutoff = addDaysISO(iso, -back);
      if (nowKey >= cutoff + " " + HF.orderByTime || closedRangeFor(iso)) continue;
      out.push({ iso: iso, cutoff: cutoff, cutoffTime: HF.orderByTime, start: HF.pickupStart, end: HF.pickupEnd });
    }
    /* Holidays: their own pickup hours and order deadline */
    (HF.holidays || []).forEach(function (h) {
      var by = h.orderBy || (addDaysISO(h.date, -1) + " " + HF.orderByTime);
      if (h.date < now.date || h.date > addDaysISO(now.date, ahead) || nowKey >= by || closedRangeFor(h.date)) return;
      out = out.filter(function (d) { return d.iso !== h.date; });
      out.push({ iso: h.date, cutoff: by.slice(0, 10), cutoffTime: by.slice(11, 16), start: h.pickupStart || HF.pickupStart,
        end: h.pickupEnd || HF.pickupEnd, holiday: h.name });
    });
    return out.sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });
  }

  /* Upcoming holiday notes, e.g. "Thanksgiving: pickup Thu, Nov 26, 9:00 AM to 4:00 PM. Order by Wed, Nov 25, 5:00 PM." */
  function hotHolidayNotes(HF) {
    var now = bakeryNow(), nowKey = now.date + " " + now.time;
    return (HF.holidays || []).filter(function (h) {
      var by = h.orderBy || (addDaysISO(h.date, -1) + " " + HF.orderByTime);
      return nowKey < by;
    }).map(function (h) {
      var by = h.orderBy || (addDaysISO(h.date, -1) + " " + HF.orderByTime);
      return h.name + ": pickup " + shortDate(fromISO(h.date), true) + ", " + clockLabel(h.pickupStart || HF.pickupStart) + " to " +
        clockLabel(h.pickupEnd || HF.pickupEnd) + ". Order by " + shortDate(fromISO(by.slice(0, 10)), true) + ", " + clockLabel(by.slice(11, 16)) + ".";
    });
  }

  function initHotFood() {
    var HF = window.HOT_FOOD;
    if (!HF) return;
    $all("[data-hot-cutoff]").forEach(function (el) { el.textContent = hotCutoffText(HF); });
    if (HF.pickupLocation) $all("[data-hot-location]").forEach(function (el) { el.textContent = HF.pickupLocation; });
    if (SITE.pickupArea) $all("[data-pickup-area]").forEach(function (el) { el.textContent = SITE.pickupArea; });
    $all("[data-hot-pickup]").forEach(function (el) {
      el.textContent = HF.pickupDays.join(" or ") + ", " + clockLabel(HF.pickupStart) + " to " + clockLabel(HF.pickupEnd);
    });
    $all("[data-hot-pickup-hours]").forEach(function (el) { el.textContent = clockLabel(HF.pickupStart) + " and " + clockLabel(HF.pickupEnd); });
    $all("[data-hot-cards]").forEach(function (el) { el.innerHTML = HF.items.map(cardHTML).join(""); });
    $all("[data-hot-holidays]").forEach(function (el) {
      var notes = hotHolidayNotes(HF);
      el.hidden = !notes.length;
      el.innerHTML = notes.map(function (n) { return "<p>" + esc(n) + "</p>"; }).join("");
    });

    var form = $("#hot-order");
    if (!form) return;
    var host = $("#hot-items", form), totalEl = $("#hot-total", form), statusEl = $("#hot-status", form);
    var breakdownEl = $("#hot-breakdown", form), dateSel = $("#h-date", form), timeSel = $("#h-time", form);
    var byId = {};

    /* One order line per filling and size */
    host.innerHTML = HF.items.map(function (it) {
      var rows = [];
      (it.fillings || [{ id: "", name: "" }]).forEach(function (f) {
        (it.sizes || [{ id: "", label: "", price: it.price }]).forEach(function (z) {
          var name = (f.name ? f.name + " " : "") + it.name + (z.label ? ", " + z.label : "");
          rows.push({ id: [it.id, f.id, z.id].filter(Boolean).join("-"), name: name, price: z.price, parent: it.id });
        });
      });
      return '<div class="order-group"><h3>' + esc(it.name) + "</h3>" + rows.map(function (r) {
        byId[r.id] = r;
        return '<div class="order-row" data-id="' + esc(r.id) + '" data-parent="' + esc(r.parent) + '">' +
          '<div class="order-name">' + esc(r.name) + '<span class="order-price">' + money(r.price) + "</span></div>" +
          '<div class="stepper">' +
          '<button type="button" data-step="-1" aria-label="Remove one ' + esc(r.name) + '">\u2212</button>' +
          '<input type="number" min="0" max="20" value="0" inputmode="numeric" data-qty aria-label="Quantity of ' + esc(r.name) + '">' +
          '<button type="button" data-step="1" aria-label="Add one ' + esc(r.name) + '">+</button>' +
          "</div></div>";
      }).join("") + (it.mixAndMatch && it.fillings && it.sizes ? mixHTML(it) : "") + "</div>";
    }).join("");

    /* Mix & match: pick a box size, then how many of each filling; the box is added once it's full */
    function mixHTML(it) {
      return '<div class="mix" data-mix="' + esc(it.id) + '">' +
        '<h4>Mix &amp; match a box</h4>' +
        '<p class="mix-lede">Choose a box size, then how many of each filling.</p>' +
        '<div class="choices mix-sizes">' + it.sizes.map(function (z, i) {
          return '<label class="choice' + (i ? "" : " is-selected") + '"><input type="radio" name="mix-size-' + esc(it.id) + '" value="' + esc(z.id) + '"' +
            (i ? "" : " checked") + "><span>" + esc(z.label) + " &middot; " + money(z.price) + "</span></label>";
        }).join("") + "</div>" +
        it.fillings.map(function (f) {
          return '<div class="mix-row" data-fill="' + esc(f.id) + '"><span class="mix-name">' + esc(f.name) + "</span>" +
            '<div class="stepper">' +
            '<button type="button" data-mstep="-1" aria-label="One less ' + esc(f.name) + '">\u2212</button>' +
            '<output class="mix-count" aria-live="polite">0</output>' +
            '<button type="button" data-mstep="1" aria-label="One more ' + esc(f.name) + '">+</button>' +
            "</div></div>";
        }).join("") +
        '<div class="mix-foot"><span class="mix-status" aria-live="polite"></span>' +
        '<button type="button" class="btn btn-gold btn-sm mix-add" disabled>Add mixed box</button></div>' +
        '<div class="mix-boxes"></div>' +
        "</div>";
    }
    var mixedBoxes = [];   // { item, qty: 1 } for each finished mixed box
    $all("[data-mix]", host).forEach(function (box) {
      var it = HF.items.filter(function (x) { return x.id === box.getAttribute("data-mix"); })[0];
      var counts = {};
      function size() {
        var v = ($('input[type=radio]:checked', box) || {}).value;
        return it.sizes.filter(function (z) { return z.id === v; })[0] || it.sizes[0];
      }
      function need() { return parseInt(size().id, 10) || 0; }
      function chosen() { return Object.keys(counts).reduce(function (s, k) { return s + counts[k]; }, 0); }
      function draw() {
        $all(".mix-sizes .choice", box).forEach(function (c) { c.classList.toggle("is-selected", $("input", c).checked); });
        $all(".mix-row", box).forEach(function (r) {
          var n = counts[r.getAttribute("data-fill")] || 0;
          $(".mix-count", r).textContent = n;
          r.classList.toggle("is-selected", n > 0);
          $('[data-mstep="1"]', r).disabled = chosen() >= need();
          $('[data-mstep="-1"]', r).disabled = n === 0;
        });
        var left = need() - chosen();
        $(".mix-status", box).textContent = left > 0
          ? chosen() + " of " + need() + " chosen - pick " + left + " more"
          : "Box full: " + need() + " of " + need();
        $(".mix-add", box).disabled = left !== 0;
        $(".mix-boxes", box).innerHTML = mixedBoxes.filter(function (m) { return m.parent === it.id; }).map(function (m, i) {
          return '<div class="mix-box"><span><strong>' + esc(m.label) + "</strong> " + money(m.item.price) + '<br><span class="mix-detail">' + esc(m.detail) + "</span></span>" +
            '<button type="button" class="mix-remove" data-remove="' + mixedBoxes.indexOf(m) + '">Remove</button></div>';
        }).join("");
      }
      box.addEventListener("change", function (e) {
        if (e.target.type !== "radio") return;
        /* Shrinking the box trims the last fillings picked so the count still fits */
        var over = chosen() - need();
        it.fillings.slice().reverse().forEach(function (f) {
          while (over > 0 && counts[f.id] > 0) { counts[f.id]--; over--; }
        });
        draw();
      });
      box.addEventListener("click", function (e) {
        var s = e.target.closest("[data-mstep]");
        if (s) {
          var id = s.closest(".mix-row").getAttribute("data-fill");
          var step = parseInt(s.getAttribute("data-mstep"), 10);
          if (step > 0 && chosen() >= need()) return;
          counts[id] = Math.max(0, (counts[id] || 0) + step);
          draw(); return;
        }
        if (e.target.closest(".mix-add")) {
          if (chosen() !== need()) return;
          var z = size();
          var detail = it.fillings.filter(function (f) { return counts[f.id]; })
            .map(function (f) { return counts[f.id] + " " + f.name; }).join(", ");
          var label = "Mixed " + it.name + ", " + z.label;
          mixedBoxes.push({ parent: it.id, label: label, detail: detail, item: { name: label + " (" + detail + ")", price: z.price }, qty: 1 });
          counts = {};
          draw(); refresh(); return;
        }
        var r = e.target.closest("[data-remove]");
        if (r) { mixedBoxes.splice(Number(r.getAttribute("data-remove")), 1); draw(); refresh(); }
      });
      draw();
    });

    function qty(row) { var n = parseInt($("[data-qty]", row).value, 10); return isNaN(n) || n < 0 ? 0 : Math.min(n, 20); }
    function lines() {
      return $all(".order-row", host).map(function (row) { return { item: byId[row.getAttribute("data-id")], qty: qty(row) }; })
        .filter(function (l) { return l.qty > 0; })
        .concat(mixedBoxes.map(function (m) { return { item: m.item, qty: 1 }; }));
    }
    function total() { return lines().reduce(function (s, l) { return s + l.qty * l.item.price; }, 0); }
    function refresh() {
      $all(".order-row", host).forEach(function (row) { row.classList.toggle("is-selected", qty(row) > 0); });
      var ls = lines();
      breakdownEl.hidden = !ls.length;
      breakdownEl.innerHTML = ls.map(function (l) {
        return '<div class="breakdown-row"><span>' + l.qty + "&nbsp;&times;&nbsp;" + esc(l.item.name) + "</span><span>" + money(l.qty * l.item.price) + "</span></div>";
      }).join("");
      totalEl.textContent = money(total());
      var boxEl = $("#hot-boxes", form);
      if (boxEl) {
        var n = boxCount(), l = left[dateSel.value];
        boxEl.hidden = !n;
        boxEl.className = "box-count" + (typeof l === "number" && n > l ? " is-over" : "");
        boxEl.textContent = "This preorder uses " + n + " box" + (n === 1 ? "" : "es") + " (each half dozen or dozen is one box)." +
          (typeof l === "number" && dateSel.value ? " " + l + " of " + LIMIT + " left for that day." : "") +
          (typeof l === "number" && n > l ? " Please remove some or choose another date." : "");
      }
    }
    function boxCount() { return lines().reduce(function (s, l) { return s + l.qty; }, 0); }
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-step]");
      if (!b || !b.closest(".order-row")) return;
      var row = b.closest(".order-row");
      $("[data-qty]", row).value = Math.max(0, Math.min(20, qty(row) + parseInt(b.getAttribute("data-step"), 10)));
      refresh();
    });
    host.addEventListener("input", refresh);

    /* Pickup dates (open weekends only) and times (several orders can share a time) */
    var dates = hotPickupDates(HF);
    var LIMIT = HF.boxLimit || 30;
    var left = {};   // boxes still available per date, from the booking service (empty if it can't be reached)
    function dateLabel(d) {
      var n = left[d.iso];
      return shortDate(fromISO(d.iso), true) + (d.holiday ? " - " + d.holiday : "") +
        (n === 0 ? " (sold out)" : typeof n === "number" && n <= 10 ? " (" + n + " box" + (n === 1 ? "" : "es") + " left)" : "");
    }
    function drawDates() {
      var keep = dateSel.value;
      dateSel.innerHTML = '<option value="">Choose a date</option>' + dates.map(function (d) {
        return '<option value="' + d.iso + '"' + (left[d.iso] === 0 ? " disabled" : "") + (d.iso === keep && left[d.iso] !== 0 ? " selected" : "") + ">" +
          esc(dateLabel(d)) + "</option>";
      }).join("");
    }
    function loadLeft() {
      if (!SITE.bookingApi || !dates.length) return Promise.resolve();
      return fetch(SITE.bookingApi + "/hot-capacity?dates=" + dates.map(function (d) { return d.iso; }).join(","), { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("no capacity"); return r.json(); })
        .then(function (d) { left = d.left || {}; drawDates(); refresh(); })
        .catch(function () {});
    }
    drawDates();
    loadLeft();
    var dateHint = $("#h-date-hint", form);
    if (dateHint) {
      dateHint.textContent = dates.length
        ? "Order by " + hotCutoffText(HF) + " for that weekend. Next pickups: " + shortDate(fromISO(dates[0].iso), true) +
          (dates[1] && dates[1].cutoff === dates[0].cutoff ? " and " + shortDate(fromISO(dates[1].iso), true) : "") +
          " (order by " + shortDate(fromISO(dates[0].cutoff), true) + ", " + clockLabel(dates[0].cutoffTime || HF.orderByTime) + ")." +
          " Up to " + (HF.boxLimit || 30) + " boxes per pickup day."
        : "Preorders aren't open right now. Please check back soon.";
    }
    /* Pickup times follow the chosen date (holidays can have their own hours) */
    var toMin = function (s) { return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)); };
    var hoursHint = $("[data-hot-pickup-hours]", form);
    function drawTimes() {
      var d = dates.filter(function (x) { return x.iso === dateSel.value; })[0];
      var start = d ? d.start : HF.pickupStart, end = d ? d.end : HF.pickupEnd, keep = timeSel.value;
      var opts = '<option value="">Choose a time</option>';
      for (var m = toMin(start); m <= toMin(end); m += 30) {
        var key = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
        opts += '<option value="' + clockLabel(key) + '"' + (clockLabel(key) === keep ? " selected" : "") + ">" + clockLabel(key) + "</option>";
      }
      timeSel.innerHTML = opts;
      if (hoursHint) hoursHint.textContent = clockLabel(start) + " and " + clockLabel(end);
      refresh();
    }
    dateSel.addEventListener("change", drawTimes);
    drawTimes();

    var add = new URLSearchParams(window.location.search).get("add");
    if (add) {
      var first = $('.order-row[data-parent="' + add + '"]', host);
      $all('.order-row[data-parent="' + add + '"]', host).forEach(function (r) { r.classList.add("is-highlight"); });
      if (first) setTimeout(function () { first.scrollIntoView({ block: "center" }); }, 50);
    }

    function say(msg, kind) { statusEl.textContent = msg; statusEl.className = "form-status" + (kind ? " is-" + kind : ""); }
    function postPlain(url, fields) {
      var f = document.createElement("form");
      f.method = "POST"; f.action = url; f.style.display = "none";
      Object.keys(fields).forEach(function (k) {
        var i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = fields[k]; f.appendChild(i);
      });
      document.body.appendChild(f); f.submit();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ls = lines();
      if (!ls.length) { say("Add at least one item to send your preorder.", "error"); host.scrollIntoView({ block: "center" }); return; }
      /* The weekend may have closed while the page was open */
      var still = hotPickupDates(HF).some(function (d) { return d.iso === dateSel.value; });
      if (!still) { say("Orders for that date just closed. Please choose another date.", "error"); return; }
      var boxes = boxCount(), have = left[dateSel.value];
      if (typeof have === "number" && boxes > have) {
        say(have ? "Only " + have + " box" + (have === 1 ? "" : "es") + " left for that day. Please remove some or choose another date." : "That day is sold out. Please choose another date.", "error");
        return;
      }
      var chosenDay = dates.filter(function (d) { return d.iso === dateSel.value; })[0] || {};
      var fd = new FormData(form);
      var name = (fd.get("first_name") + " " + fd.get("last_name")).trim();
      var text = ls.map(function (l) { return l.qty + " x " + l.item.name + " (" + money(l.item.price) + " each)"; }).join("\n");
      var record = {
        name: name, phone: fd.get("phone"), email: fd.get("email") || "", fulfillment: "Pickup", prepay: true,
        date: fd.get("date"), time: fd.get("time"), payment: "Venmo (prepayment required)", notes: fd.get("notes") || "",
        items: ls.map(function (l) { return { name: l.item.name, qty: l.qty, price: l.item.price }; }),
        fee: 0, total: money(total()), sentAt: Date.now(), pickupSpot: HF.pickupLocation || ""
      };
      var payload = {
        _subject: "New CR Bakery weekend hot food preorder from " + name,
        order_type: "Weekend hot food preorder - pickup only, confirm once Venmo payment is received",
        name: name, email: record.email, phone: record.phone, pickup_date: record.date, pickup_time: record.time,
        pickup_location: "Hot food pickup " + (HF.pickupLocation || ""),
        order: text, boxes: boxes, total: record.total, payment: record.payment, notes: record.notes
      };
      if (chosenDay.holiday) payload.holiday = chosenDay.holiday;
      if (TEST_MODE || !SITE.formEndpoint) {
        if (TEST_MODE && saveConfirmation(record)) { window.location.href = "order-confirmed.html?sent=" + record.sentAt; return; }
        say(TEST_MODE ? "Test version: your preorder was not sent." : "Online preorders aren't open yet.", TEST_MODE ? "ok" : "error");
        return;
      }
      function finishBoxes(hold) {
        if (!hold || !SITE.bookingApi) return;
        fetch(SITE.bookingApi + "/hot-finalize", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: hold.token }), keepalive: true }).catch(function () {});
      }
      function send(hold) {
        say("Sending your preorder...", "");
        fetch(SITE.formEndpoint, {
          method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("bad response");
          finishBoxes(hold);
          if (saveConfirmation(record)) { window.location.href = "order-confirmed.html?sent=" + record.sentAt; return; }
          say("Thanks, " + name + ". Your preorder was sent. Pay with Venmo to confirm it.", "ok");
        }).catch(function () { finishBoxes(hold); postPlain(SITE.formEndpoint, payload); });
      }
      if (!SITE.bookingApi) { send(null); return; }
      /* Hold the boxes first so the day can't go over its limit */
      say("Checking availability...", "");
      fetch(SITE.bookingApi + "/hot-reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: record.date, boxes: boxes, name: name })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { status: res.status, body: body }; });
      }).then(function (r) {
        if (r.status === 200 && r.body.token) { send(r.body); return; }
        if (r.status === 409) {
          var l = typeof r.body.left === "number" ? r.body.left : 0;
          left[record.date] = l; drawDates(); refresh();
          say(l ? "Sorry, only " + l + " box" + (l === 1 ? " is" : "es are") + " left for that day. Please remove some or choose another date." : "Sorry, that day just sold out. Please choose another date.", "error");
          return;
        }
        if (r.status === 429) { say("Too many attempts. Please try again in a little while.", "error"); return; }
        if (r.status === 404) { send(null); return; }   // booking service not updated yet: send without the box limit
        say("We couldn't check availability. Please try again.", "error");
      }).catch(function () { say("We couldn't check availability. Please check your connection and try again.", "error"); });
    });
    refresh();
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

    host.innerHTML = activeSections().map(function (s) {
      /* An item with sizes becomes one order line per size, e.g. "Pumpkin Cookies, Half dozen" */
      var rows = [];
      s.items.forEach(function (it) {
        if (it.sizes) {
          it.sizes.forEach(function (z) { rows.push({ id: z.id, name: it.name + ", " + z.label, price: z.price, parent: it.id, allergy: it.allergy, allergyShort: it.allergyShort }); });
        } else {
          rows.push(it);
        }
      });
      return '<div class="order-group"><h3>' + esc(s.title) + "</h3>" + rows.map(function (it) {
        byId[it.id] = it;
        return '<div class="order-row" data-id="' + esc(it.id) + '"' + (it.parent ? ' data-parent="' + esc(it.parent) + '"' : "") + ">" +
          '<div class="order-name">' + esc(it.name) + '<span class="order-price">' + money(it.price) + "</span>" +
          (it.allergy ? '<span class="order-allergy">\u26A0\uFE0E ' + esc(it.allergyShort || "Allergy warning") + "</span>" : "") + "</div>" +
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
    /* Times from 10:00 AM to 7:00 PM (the last time offered), every 30 minutes */
    var STEP = 30, OPEN = 10 * 60, CLOSE = 19 * 60;
    var timeSlots = [];
    for (var m = OPEN; m <= CLOSE; m += STEP) {
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
      /* An older order on a quarter hour (10:15) takes the half hour it falls in (10:00) */
      return listed.concat(takenByDate[iso] || []).map(function (k) {
        var t = Number(k.slice(0, 2)) * 60 + Number(k.slice(3, 5));
        t -= t % STEP;
        return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
      });
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
    /* A delivery holds the time around it (1 hour before to 1 hour after by default), so a delivery
       time is only offered when that whole window is free. The booking service makes the final check. */
    var block = SITE.deliveryBlock || { before: 60, after: 60 };
    function windowKeys(slotIndex) {
      var m = OPEN + slotIndex * STEP, keys = [];
      for (var t = Math.max(m - block.before, OPEN); t < m + block.after && t <= CLOSE; t += STEP) {
        keys.push(String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"));
      }
      return keys;
    }
    function buildTimes() {
      if (!timeSelect) return;
      var keep = timeSelect.value;
      var taken = takenKeys(dateInput ? dateInput.value : "");
      var forDelivery = fulfillment() === "delivery";
      timeSelect.innerHTML = '<option value="">Choose a time</option>';
      timeSlots.forEach(function (slot, i) {
        var isTaken = taken.indexOf(slot.key) !== -1;
        var blocked = !isTaken && forDelivery && windowKeys(i).some(function (k) { return taken.indexOf(k) !== -1; });
        var opt = document.createElement("option");
        opt.value = slot.label;
        opt.setAttribute("data-key", slot.key);
        if (blocked) isTaken = true;
        opt.textContent = blocked ? slot.label + " (unavailable)" : isTaken ? slot.label + " (taken)" : slot.label;
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
    function reserveSlot(date, key, name, kind) {
      return fetch(SITE.bookingApi + "/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date, time: key, name: name, kind: kind })
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
        say("Add at least one item to send your order.", "error");
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
        say("Sending your order...", "");
        fetch(SITE.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("bad response");
          finishSlot(booking);
          if (saveConfirmation(record)) {
            // A unique address each time, so the browser never shows an older cached copy of the page
            window.location.href = "order-confirmed.html?sent=" + record.sentAt;
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

      if (TEST_MODE) {
        /* Test version: skip the booking hold and the order email, but show the confirmation page */
        if (saveConfirmation(record)) {
          window.location.href = "order-confirmed.html?sent=" + record.sentAt;
        } else {
          say("Test version: your order was not sent.", "ok");
        }
        return;
      }

      if (SITE.formEndpoint && SITE.bookingApi) {
        /* Hold the chosen time first so two customers can't take the same one */
        var chosen = timeSelect.options[timeSelect.selectedIndex];
        say("Checking your time...", "");
        reserveSlot(data.date, chosen ? chosen.getAttribute("data-key") : "", data.name, mode).then(function (r) {
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
        /* For an item with sizes, show its size lines so the customer picks one */
        var first = !row && $('.order-row[data-parent="' + id + '"]', host);
        if (first) {
          $all('.order-row[data-parent="' + id + '"]', host).forEach(function (r) { r.classList.add("is-highlight"); });
          setTimeout(function () { first.scrollIntoView({ block: "center" }); }, 50);
        }
      }
    };

    var add = new URLSearchParams(window.location.search).get("add");
    if (add) orderApi.addItem(add);
    applyFulfillment();
  }

  document.addEventListener("DOMContentLoaded", function () {
    showTestBanner();
    renderMenuPage();
    renderCardBlocks();
    initGalleries(document);
    initItemPopups();
    initHotFood();
    fillContactLinks();
    showClosureNotice();
    initOrderForm();
    renderConfirmation();
  });

  window.CRB = { addItem: function (id) { if (orderApi) orderApi.addItem(id); } };
})();
