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
  }

  /* Order form */
  var orderApi = null;

  function initOrderForm() {
    var form = $("#order");
    if (!form) return;

    var host = $("#order-items");
    var totalEl = $("#order-total");
    var statusEl = $("#form-status");
    var byId = {};

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

    function rowQty(row) {
      var n = parseInt($("[data-qty]", row).value, 10);
      return isNaN(n) || n < 0 ? 0 : Math.min(n, 20);
    }

    function lines() {
      return $all(".order-row", host).map(function (row) {
        return { item: byId[row.getAttribute("data-id")], qty: rowQty(row) };
      }).filter(function (l) { return l.qty > 0; });
    }

    function refresh() {
      var total = 0;
      $all(".order-row", host).forEach(function (row) {
        var q = rowQty(row);
        row.classList.toggle("is-selected", q > 0);
        total += q * byId[row.getAttribute("data-id")].price;
      });
      totalEl.textContent = money(total);
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

    var dateInput = $("[name=date]", form);
    if (dateInput) {
      var t = new Date();
      dateInput.min = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    }

    function say(msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = "form-status" + (kind ? " is-" + kind : "");
    }

    function summary(data, ls) {
      var total = ls.reduce(function (s, l) { return s + l.qty * l.item.price; }, 0);
      var text = ls.map(function (l) { return l.qty + " x " + l.item.name + " (" + money(l.item.price) + " each)"; }).join("\n");
      return { text: text, total: money(total) };
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
      var data = { name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone") || "", date: fd.get("date"), notes: fd.get("notes") || "" };
      var s = summary(data, ls);

      if (SITE.formEndpoint) {
        var payload = {
          _subject: "New CR Bakery order from " + data.name,
          name: data.name, email: data.email, phone: data.phone,
          date_needed: data.date, order: s.text, estimated_total: s.total, notes: data.notes
        };
        say("Sending your order...", "");
        fetch(SITE.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("bad response");
          form.reset();
          $all("[data-qty]", host).forEach(function (i) { i.value = 0; });
          refresh();
          say("Thanks, " + data.name + ". Your order was sent and CR Bakery will follow up by email.", "ok");
        }).catch(function () {
          // If the in-page send is blocked, send it as a regular form post instead.
          postPlain(SITE.formEndpoint, payload);
        });
      } else if (SITE.email) {
        var body = "Name: " + data.name + "\nEmail: " + data.email + "\nPhone: " + data.phone +
          "\nDate needed: " + data.date + "\n\nOrder:\n" + s.text + "\n\nEstimated total: " + s.total +
          "\n\nNotes: " + data.notes;
        window.location.href = "mailto:" + (SITE.email || "") +
          "?subject=" + encodeURIComponent("New order from " + data.name) + "&body=" + encodeURIComponent(body);
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
    refresh();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderMenuPage();
    renderCardBlocks();
    fillContactLinks();
    initOrderForm();
  });

  window.CRB = { addItem: function (id) { if (orderApi) orderApi.addItem(id); } };
})();
