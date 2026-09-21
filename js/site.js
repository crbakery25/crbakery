/* CR Bakery: renders the menu, order form, and contact links from
   js/menu-data.js and js/site-config.js. */
(function () {
  "use strict";

  var SITE = window.SITE || {};
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

  /* Order form */
  var orderApi = null;

  function initOrderForm() {
    var form = $("#order");
    if (!form) return;

    var host = $("#order-items");
    var totalEl = $("#order-total");
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
      var sub = subtotal();
      var isDelivery = fulfillment() === "delivery";
      var total = sub + (isDelivery && sub > 0 ? dv.baseFee : 0);
      totalEl.textContent = money(total);
      if (isDelivery && sub > 0) {
        noteEl.textContent = "Includes a " + moneyFull(dv.baseFee) + " delivery fee. If your address needs a higher fee, CR Bakery will let you know before confirming your total.";
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
    }

    /* Pickup or delivery */
    var fulfillHint = $("#fulfillment-hint");
    function applyFulfillment() {
      var mode = fulfillment();
      var word = mode === "delivery" ? "delivery" : "pickup";
      $all(".choice", form).forEach(function (c) {
        c.classList.toggle("is-selected", $("input", c).checked);
      });
      if (dateLabel) dateLabel.textContent = word.charAt(0).toUpperCase() + word.slice(1) + " date";
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
      if (fulfillment() === "delivery") {
        fee = dv.baseFee; total += fee;
        text += "\nDelivery: " + moneyFull(fee) + " (final fee to be confirmed if the address is farther)";
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
      var word = mode === "delivery" ? "Delivery" : "Pickup";
      var data = {
        name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"),
        address: fd.get("address"), date: fd.get("date"), notes: fd.get("notes") || ""
      };
      var s = summary(ls);

      if (SITE.formEndpoint) {
        var payload = {
          _subject: "New CR Bakery " + word.toLowerCase() + " order from " + data.name,
          name: data.name, email: data.email, phone: data.phone,
          fulfillment: word, address: data.address,
          order: s.text, estimated_total: s.total, notes: data.notes
        };
        payload[word.toLowerCase() + "_date"] = data.date;
        say("Sending your order...", "");
        fetch(SITE.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("bad response");
          form.reset();
          $all("[data-qty]", host).forEach(function (i) { i.value = 0; });
          applyFulfillment();
          say("Thanks, " + data.name + ". Your order was sent and CR Bakery will follow up by email.", "ok");
        }).catch(function () {
          // If the in-page send is blocked, send it as a regular form post instead.
          postPlain(SITE.formEndpoint, payload);
        });
      } else if (SITE.email) {
        var body = "Name: " + data.name + "\nEmail: " + data.email + "\nPhone: " + data.phone +
          "\nAddress: " + data.address + "\n" + word + " date: " + data.date + "\n\nOrder:\n" + s.text +
          "\n\nEstimated total: " + s.total + "\n\nNotes: " + data.notes;
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
  });

  window.CRB = { addItem: function (id) { if (orderApi) orderApi.addItem(id); } };
})();
