/* Navigation explorations for tomdegay.com -- EXPERIMENT, branch `nav-options`.

   Four less intrusive alternatives to the sticky top bar, applied on top of
   the site's real nav markup (nothing in the pages changes). A small switcher
   at the bottom right flips between them and the current bar; the choice is
   remembered, so it carries from page to page. Also settable with ?nav=NAME.

     sidebar   a quiet fixed rail down the left, sections expanding in place
     autohide  the bar tucks away as you scroll down, returns as you scroll up
     menu      just a "Menu" pill; the links open as a full-screen index
     dock      a small floating pill at the bottom, menus open upwards

   Not for production: delete this file and its script tags to drop it. */
(function () {
  var NAMES = ["current", "sidebar", "autohide", "menu", "dock"];
  var LABELS = { current: "Current", sidebar: "Sidebar", autohide: "Auto-hide", menu: "Menu", dock: "Dock" };
  var root = document.documentElement;

  var FONT = '"Fakt Blond SemiBold", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  var CSS = '' +
  /* ---------- sidebar ---------- */
  '@media (min-width: 1100px) {' +
  '  html[data-nav="sidebar"] body { padding-left: 216px; }' +
  '  html[data-nav="sidebar"] .site-nav { position: fixed; top: 0; left: 0; bottom: 0; width: 216px; overflow-y: auto; }' +
  '  html[data-nav="sidebar"] .site-nav::before { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; border-right: 1px solid rgba(255,255,255,0.08); }' +
  '  html[data-nav="sidebar"] .site-nav-inner { flex-direction: column; align-items: flex-start; justify-content: flex-start; flex-wrap: nowrap; max-width: none; margin: 0; padding: 30px 26px; gap: 34px; min-height: 0; }' +
  '  html[data-nav="sidebar"] .site-nav-brand { font-size: 21px; }' +
  '  html[data-nav="sidebar"] .nav-toggle { display: none; }' +
  '  html[data-nav="sidebar"] .site-nav-links { flex-direction: column; align-items: flex-start; flex-wrap: nowrap; gap: 4px; width: 100%; }' +
  '  html[data-nav="sidebar"] .site-nav-links a { font-size: 16px; }' +
  '  html[data-nav="sidebar"] .site-nav-links > a, html[data-nav="sidebar"] .nav-item > a { display: block; padding: 5px 0; }' +
  '  html[data-nav="sidebar"] .nav-item { width: 100%; }' +
  '  html[data-nav="sidebar"] .nav-dropdown { position: static; opacity: 1; visibility: visible; transform: none; transition: max-height .28s ease; padding: 0; min-width: 0; max-height: 0; overflow: hidden; }' +
  '  html[data-nav="sidebar"] .nav-item:hover .nav-dropdown, html[data-nav="sidebar"] .nav-item:focus-within .nav-dropdown, html[data-nav="sidebar"] .nav-item.is-open .nav-dropdown, html[data-nav="sidebar"] .nav-item:has(> a.is-current) .nav-dropdown { opacity: 1; visibility: visible; transform: none; max-height: 560px; transition-delay: 0s; }' +
  '  html[data-nav="sidebar"] .nav-item.is-dismissed .nav-dropdown { max-height: 0; }' +
  '  html[data-nav="sidebar"] .nav-dropdown-panel { gap: 0; padding: 2px 0 10px 12px; background: none; box-shadow: none; border-left: 1px solid rgba(255,255,255,0.12); margin-left: 2px; }' +
  '  html[data-nav="sidebar"] .nav-dropdown-card { padding: 5px 0 5px 12px; background: none; }' +
  '  html[data-nav="sidebar"] .nav-dropdown-card-kicker, html[data-nav="sidebar"] .nav-dropdown-divider { display: none; }' +
  '  html[data-nav="sidebar"] .nav-dropdown-card-title { font-size: 13px; line-height: 1.35; color: rgba(255,255,255,0.55); white-space: normal; }' +
  '  html[data-nav="sidebar"] .nav-dropdown-card:hover .nav-dropdown-card-title, html[data-nav="sidebar"] .nav-dropdown-card:focus-visible .nav-dropdown-card-title { color: #fff; }' +
  '}' +

  /* ---------- auto-hide ---------- */
  'html[data-nav="autohide"] .site-nav { transition: transform .32s ease; }' +
  'html[data-nav="autohide"] .site-nav.nav-hidden { transform: translateY(-110%); }' +
  'html[data-nav="autohide"] .site-nav::before { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; transition: background .3s ease; }' +
  'html[data-nav="autohide"] .site-nav.nav-scrolled::before { background: rgba(19,19,19,0.86); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }' +
  'html[data-nav="autohide"] .site-nav-inner { min-height: 44px; padding-top: 8px; padding-bottom: 8px; }' +
  'html[data-nav="autohide"] .site-nav-brand { font-size: 18px; }' +
  '@media (min-width: 641px) { html[data-nav="autohide"] .site-nav-links a { font-size: 15px; } }' +

  /* ---------- menu pill + full-screen index ---------- */
  'html[data-nav="menu"] .site-nav { position: absolute; top: 0; left: 0; right: 0; }' +
  'html[data-nav="menu"] .site-nav::before { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; }' +
  'html[data-nav="menu"] .nav-toggle { display: flex; position: fixed; top: 14px; right: clamp(16px, 3vw, 32px); z-index: 90; flex-direction: row; width: auto; height: 36px; margin: 0; padding: 0 16px; border-radius: 18px; background: rgba(24,24,24,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.16); }' +
  'html[data-nav="menu"] .nav-toggle-bar { display: none; }' +
  'html[data-nav="menu"] .nav-toggle::before { content: "Menu"; font: 600 14px/1 ' + FONT + '; color: #fff; }' +
  'html[data-nav="menu"] .site-nav.is-open .nav-toggle::before { content: "Close"; }' +
  'html[data-nav="menu"] .site-nav.is-open .site-nav-brand { position: relative; z-index: 85; }' +
  'html[data-nav="menu"] .site-nav-links { position: fixed; inset: 0; z-index: 80; display: none; flex-direction: column; flex-wrap: nowrap; align-items: flex-start; justify-content: center; gap: 4px; max-height: none; overflow-y: auto; padding: 90px clamp(28px, 8vw, 140px) 60px; background: rgba(19,19,19,0.97); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 0; }' +
  'html[data-nav="menu"] .site-nav.is-open .site-nav-links { display: flex; }' +
  'html[data-nav="menu"] .site-nav-links > a, html[data-nav="menu"] .nav-item > a { display: block; padding: 4px 0; border: 0; font-size: clamp(32px, 5.4vw, 68px); line-height: 1.1; color: #fff; }' +
  'html[data-nav="menu"] .site-nav-links > a + a, html[data-nav="menu"] .nav-item { border: 0; }' +
  'html[data-nav="menu"] .nav-dropdown { position: static; opacity: 1; visibility: visible; transform: none; transition: none; padding: 2px 0 14px; min-width: 0; }' +
  'html[data-nav="menu"] .nav-item:hover .nav-dropdown, html[data-nav="menu"] .nav-item:focus-within .nav-dropdown, html[data-nav="menu"] .nav-item.is-open .nav-dropdown { transform: none; opacity: 1; visibility: visible; }' +
  'html[data-nav="menu"] .nav-dropdown-panel { flex-direction: row; flex-wrap: wrap; gap: 4px 22px; padding: 0; background: none; box-shadow: none; }' +
  'html[data-nav="menu"] .nav-dropdown-card { padding: 4px 0; background: none; }' +
  'html[data-nav="menu"] .nav-dropdown-card-kicker, html[data-nav="menu"] .nav-dropdown-divider { display: none; }' +
  'html[data-nav="menu"] .nav-dropdown-card-title { font-size: 16px; color: rgba(255,255,255,0.55); white-space: nowrap; }' +
  'html[data-nav="menu"] .nav-dropdown-card:hover .nav-dropdown-card-title { color: #fff; }' +

  /* ---------- dock ---------- */
  '@media (min-width: 641px) {' +
  '  html[data-nav="dock"] .site-nav { position: fixed; top: auto; bottom: 18px; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100vw - 32px); }' +
  '  html[data-nav="dock"] .site-nav::before { border-radius: 999px; background: rgba(24,24,24,0.84); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 10px 34px rgba(0,0,0,0.45); }' +
  '  html[data-nav="dock"] .site-nav-inner { max-width: none; margin: 0; padding: 9px 26px; min-height: 0; gap: 30px; flex-wrap: nowrap; }' +
  '  html[data-nav="dock"] .site-nav-brand { font-size: 16px; }' +
  '  html[data-nav="dock"] .site-nav-links { gap: 24px; flex-wrap: nowrap; }' +
  '  html[data-nav="dock"] .site-nav-links a { font-size: 15px; }' +
  '  html[data-nav="dock"] .nav-dropdown { top: auto; bottom: 100%; padding-top: 0; padding-bottom: 16px; transform: translate(-50%, 6px); }' +
  '  html[data-nav="dock"] .nav-item:hover .nav-dropdown, html[data-nav="dock"] .nav-item:focus-within .nav-dropdown, html[data-nav="dock"] .nav-item.is-open .nav-dropdown { transform: translate(-50%, 0); }' +
  '}' +

  /* ---------- the switcher ---------- */
  '.nx-switch { position: fixed; right: 14px; bottom: 14px; z-index: 999; display: flex; gap: 2px; padding: 4px; border-radius: 10px; background: rgba(0,0,0,0.78); border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font: 500 11px/1 "IBM Plex Mono", monospace; }' +
  '.nx-switch span { padding: 7px 8px; color: rgba(255,255,255,0.45); letter-spacing: 1px; text-transform: uppercase; }' +
  '.nx-switch button { appearance: none; border: 0; background: none; cursor: pointer; padding: 7px 9px; border-radius: 7px; font: inherit; color: rgba(255,255,255,0.7); letter-spacing: 0.5px; }' +
  '.nx-switch button:hover { color: #fff; background: rgba(255,255,255,0.1); }' +
  '.nx-switch button[aria-pressed="true"] { color: #000; background: #00d8aa; }' +
  '@media (max-width: 560px) { .nx-switch span { display: none; } .nx-switch button { padding: 7px 6px; } }';

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  function stored() { try { return localStorage.getItem("nav-explore"); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem("nav-explore", v); } catch (e) {} }

  var q = /[?&]nav=([a-z]+)/.exec(location.search);
  var current = (q && NAMES.indexOf(q[1]) > -1) ? q[1] : (stored() || "current");
  if (NAMES.indexOf(current) < 0) current = "current";

  function apply(name) {
    current = name;
    if (name === "current") root.removeAttribute("data-nav"); else root.setAttribute("data-nav", name);
    save(name);
    var nav = document.querySelector(".site-nav");
    if (nav) { nav.classList.remove("nav-hidden", "is-open"); }
    Array.prototype.forEach.call(document.querySelectorAll(".nx-switch button"), function (b) {
      b.setAttribute("aria-pressed", b.dataset.name === name ? "true" : "false");
    });
    onScroll();
  }

  /* auto-hide behaviour */
  var lastY = window.pageYOffset || 0;
  function onScroll() {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;
    var y = window.pageYOffset || 0;
    if (current === "autohide") {
      nav.classList.toggle("nav-scrolled", y > 8);
      var busy = nav.matches(":hover") || nav.contains(document.activeElement) || nav.classList.contains("is-open");
      if (y > lastY && y > 90 && !busy) nav.classList.add("nav-hidden");
      else if (y < lastY || y <= 90) nav.classList.remove("nav-hidden");
    } else {
      nav.classList.remove("nav-hidden", "nav-scrolled");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* the switcher */
  var box = document.createElement("div");
  box.className = "nx-switch";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Navigation exploration (not part of the site)");
  var tag = document.createElement("span");
  tag.textContent = "Nav";
  box.appendChild(tag);
  NAMES.forEach(function (n) {
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.name = n;
    b.textContent = LABELS[n];
    b.addEventListener("click", function () { apply(n); });
    box.appendChild(b);
  });
  document.body.appendChild(box);

  apply(current);
})();
