/* ==========================================================================
   ХАКАТОН 2026 — спільний скрипт сайту
   --------------------------------------------------------------------------
   Підключається в <head> КОЖНОЇ сторінки (без defer — так треба для
   плавних переходів). Що він робить:
     • малює навігацію (<site-nav>) і футер (<site-footer>)
     • напрямок анімації переходу між сторінками
     • свайп вліво/вправо на телефоні = наступна/попередня сторінка
     • поява блоків під час прокрутки (.reveal)
     • вкладки (.tabs-ui), кнопки «Копіювати», липкий зміст (.toc-bar)

   ЩОБ ДОДАТИ НОВУ СТОРІНКУ В МЕНЮ — просто допиши її в масив PAGES.
   ========================================================================== */

(function () {
  "use strict";

  const PAGES = [
    { id: "home",   href: "index.html",  label: "Робота з ШІ", short: "ШІ",       icon: "spark" },
    { id: "task-1", href: "task-1.html", label: "Задача 1",    short: "Задача 1", icon: "1" },
    { id: "task-2", href: "task-2.html", label: "Задача 2",    short: "Задача 2", icon: "2" },
    { id: "task-3", href: "task-3.html", label: "Задача 3",    short: "Задача 3", icon: "3" },
    { id: "task-4", href: "task-4.html", label: "Задача 4",    short: "Задача 4", icon: "4" },
  ];

  const ICONS = {
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 2.5c.3 0 .5.2.6.5l1.2 4.1a3 3 0 0 0 2.1 2.1l4.1 1.2c.6.2.6 1 0 1.2l-4.1 1.2a3 3 0 0 0-2.1 2.1L11.6 19c-.2.6-1 .6-1.2 0l-1.2-4.1a3 3 0 0 0-2.1-2.1L3 11.6c-.6-.2-.6-1 0-1.2l4.1-1.2a3 3 0 0 0 2.1-2.1L10.4 3c.1-.3.3-.5.6-.5Zm7.5 12c.2 0 .4.1.4.3l.5 1.4c.1.4.4.7.8.8l1.4.5c.4.1.4.6 0 .8l-1.4.5c-.4.1-.7.4-.8.8l-.5 1.4c-.1.4-.6.4-.8 0l-.5-1.4a1.3 1.3 0 0 0-.8-.8l-1.4-.5c-.4-.1-.4-.6 0-.8l1.4-.5c.4-.1.7-.4.8-.8l.5-1.4c0-.2.2-.3.4-.3Z"/></svg>',
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#121212" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 9v6M9.5 5v14M14 8v8M18.5 10v4"/></svg>',
  };


  /* ---------- ІКОНКИ (SVG-спрайт) ----------
     Використання в HTML:  <svg class="i"><use href="#i-mic"/></svg>
     Розмір = font-size батька, колір = color. Щоб додати іконку — допиши шлях сюди
     (сітка 24×24, лінії; стиль як у lucide.dev). */
  const ICON_PATHS = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    "mic-off": '<path d="m2 2 20 20M18.9 13.2A7 7 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 12 5M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 5.1 2.1M12 19v3"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    bot: '<rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><path d="M8.5 13v2M15.5 13v2"/>',
    audio: '<path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4"/>',
    "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    "file-audio": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 15v2M11 12v8M14 14v4"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4"/>',
    pin: '<path d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V17h14v-1.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
    wand: '<path d="M3 21 14 10M14 3l1 2.2L17.2 6 15 7l-1 2.2L13 7l-2.2-1L13 5zM19 11l.7 1.4 1.3.6-1.3.7L19 15l-.7-1.3L17 13l1.3-.6z"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    lifebuoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.3 4.3M14.8 9.2l4.3-4.3M14.8 14.8l4.3 4.3M9.2 14.8l-4.3 4.3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    cog: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    "shield-alert": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    git: '<circle cx="6" cy="5" r="3"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="8" r="3"/><path d="M6 8v8M18 11c0 4-7 3-10 6"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2.5"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
    clapper: '<path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8z"/><path d="m4 11-.9-3.8a2 2 0 0 1 1.5-2.4l11.6-2.7a2 2 0 0 1 2.4 1.5l.5 2.3zM7.5 9.9 7 5.8M13 8.6l-.6-4"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    video: '<path d="m22 8-6 4 6 4z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.3-2.5-1-3.5.3-1.2.3-2.4 0-3.5 0 0-1 0-3 1.5a10.6 10.6 0 0 0-8 0C6 2 5 2 5 2c-.3 1.2-.3 2.4 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.4.5-.7 1-.8 1.7-.2.6-.3 1.2-.2 1.8v4M9 18c-4.5 2-5-2-7-2"/>',
    scale: '<path d="M12 3v18M5 7h14M7 21h10"/><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    crown: '<path d="m2 6 4 11h12l4-11-6 5-4-7-4 7z"/><path d="M6 21h12"/>',
    sprout: '<path d="M7 20h10M12 20v-8M12 12C12 8 9 6 4 6c0 4 3 6 8 6ZM12 12c0-3 2-6 8-6 0 4-3 6-8 6Z"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1z"/>',
    school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6"/>',
    blocks: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M13 7h4a4 4 0 0 1 4 4M11 17H7a4 4 0 0 1-4-4"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    swipe: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    slash: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m14.5 7-5 10"/>',
    signal: '<path d="M3 20h.01M8 20v-4M13 20v-8M18 20V8"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M12 9h5M12 13h5M12 17h3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    discord: '<path fill="currentColor" stroke="none" d="M19.3 5.3A17 17 0 0 0 15 4l-.5 1.1a15.7 15.7 0 0 0-5 0L9 4a17 17 0 0 0-4.3 1.3C2 9.4 1.2 13.4 1.6 17.3A17.2 17.2 0 0 0 6.9 20l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.3 12.3 0 0 0 10.6 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a17.1 17.1 0 0 0 5.3-2.7c.5-4.5-.8-8.5-3.1-12ZM8.7 14.9c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z"/>',
  };

  /* іконка як рядок HTML — зручно в JS: Site.icon("mic") */
  function svgIcon(name, cls) {
    return `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }
  window.Site = Object.assign(window.Site || {}, { icon: svgIcon });

  function injectSprite() {
    if (document.getElementById("hk-sprite")) return;
    const symbols = Object.entries(ICON_PATHS)
      .map(([n, d]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`).join("");
    document.body.insertAdjacentHTML("afterbegin",
      `<svg id="hk-sprite" xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${symbols}</svg>`);
  }

  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const curIdx = PAGES.findIndex((p) => p.href === file);
  const cur = PAGES[curIdx];

  function icon(p) {
    return ICONS[p.icon]
      ? `<span class="nav-ico">${ICONS[p.icon]}</span>`
      : `<span class="nav-ico"><span class="num-ico">${p.icon}</span></span>`;
  }

  function navLink(p, cls, pillCls, labelKey) {
    const active = cur && p.id === cur.id;
    return `<a class="${cls}${active ? " active" : ""}" href="${p.href}"${active ? ' aria-current="page"' : ""}>` +
      (active ? `<span class="${pillCls}"></span>` : "") +
      `${icon(p)}<span>${p[labelKey]}</span></a>`;
  }

  /* ---------- <site-nav> ---------- */
  class SiteNav extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = "1";
      injectSprite();
      this.innerHTML =
        `<header class="site-header"><nav class="nav-shell" aria-label="Розділи сайту">` +
        `<a class="brand" href="index.html" aria-label="Хакатон 2026 — на головну"><span class="brand-mark">${ICONS.logo}</span><span class="brand-text">ХАКАТОН <b>2026</b></span></a>` +
        `<div class="nav-links">${PAGES.map((p) => navLink(p, "nav-link", "nav-pill", "label")).join("")}</div>` +
        `</nav></header>` +
        `<nav class="tabbar" aria-label="Розділи сайту">${PAGES.map((p) => navLink(p, "tab", "tab-pill", "short")).join("")}</nav>`;

    }
  }

  /* ---------- <site-footer> ---------- */
  class SiteFooter extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = "1";
      const prev = curIdx > 0 ? PAGES[curIdx - 1] : null;
      const next = curIdx >= 0 && curIdx < PAGES.length - 1 ? PAGES[curIdx + 1] : null;
      const pager = curIdx < 0 ? "" :
        `<nav class="pager" aria-label="Гортати сторінки">` +
        (prev ? `<a class="prev" href="${prev.href}"><small>← Назад</small><b>${prev.label}</b></a>` : "") +
        (next ? `<a class="next" href="${next.href}"><small>Далі →</small><b>${next.label}</b></a>` : "") +
        `</nav>`;
      this.innerHTML =
        `<div class="container">${pager}</div>` +
        `<footer class="site-footer"><div class="container">` +
        `<div class="foot-big" aria-hidden="true">Хакатон<span>’26</span></div>` +
        `<div class="foot-row"><span>Вайбкодинг з ШІ для учнів 8–11 класів</span>` +
        `<a href="components.html">Компоненти для авторів →</a></div></div></footer>`;
    }
  }

  customElements.define("site-nav", SiteNav);
  customElements.define("site-footer", SiteFooter);

  /* ---------- Напрямок анімації між сторінками ---------- */
  const NAV_KEY = "hk26-nav-from";
  function rememberFrom() {
    try { sessionStorage.setItem(NAV_KEY, String(curIdx)); } catch (e) { /* приватний режим */ }
  }
  window.addEventListener("pageswap", rememberFrom);
  window.addEventListener("pagereveal", (e) => {
    if (!e.viewTransition) return;
    document.documentElement.classList.add("has-vt");
    let from = NaN;
    try { from = parseInt(sessionStorage.getItem(NAV_KEY), 10); } catch (err) { /* ignore */ }
    if (e.viewTransition.types && !Number.isNaN(from) && from >= 0 && curIdx >= 0) {
      e.viewTransition.types.add(curIdx < from ? "back" : "forward");
    }
  });

  function go(delta) {
    if (curIdx < 0) return;
    const target = PAGES[curIdx + delta];
    if (!target) return;
    rememberFrom();
    location.href = target.href;
  }

  /* ---------- Після завантаження сторінки ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.addEventListener("click", (e) => {
      if (e.target.closest("a[href$='.html']")) rememberFrom();
    });

    // Миттєві переходи: браузер заздалегідь готує сторінку, на яку наводиш
    if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
      const s = document.createElement("script");
      s.type = "speculationrules";
      s.textContent = JSON.stringify({ prerender: [{ where: { href_matches: "/*.html" }, eagerness: "moderate" }] });
      document.head.appendChild(s);
    }

    initReveal(reduced);
    initTabs();
    initCopy();
    initToc();
    initCarousels();
    initSteppers();
    initPickers();
    initDrawers();
    initSwipe();
  });

  /* .reveal → з'являється, коли доскролили. Діти [data-stagger] — по черзі */
  function initReveal(reduced) {
    document.querySelectorAll("[data-stagger]").forEach((wrap) => {
      [...wrap.children].forEach((el, i) => el.style.setProperty("--i", i));
    });
    const els = document.querySelectorAll(".reveal");
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          en.target.dispatchEvent(new CustomEvent("reveal"));
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* Вкладки: <div class="tabs-ui"><div class="tab-list" role="tablist"> <button role="tab" aria-controls="id">…
     і панелі <div role="tabpanel" id="id">. Індикатор додається сам. */
  function initTabs() {
    document.querySelectorAll(".tabs-ui").forEach((ui) => {
      if (ui.dataset.ready) return;
      ui.dataset.ready = "1";
      const list = ui.querySelector(".tab-list");
      const tabs = [...list.querySelectorAll('[role="tab"]')];
      const ind = document.createElement("span");
      ind.className = "tab-ind";
      list.prepend(ind);

      function place(tab) {
        ind.style.width = tab.offsetWidth + "px";
        ind.style.transform = `translateX(${tab.offsetLeft}px)`;
      }
      function select(tab, focus) {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute("aria-selected", on);
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute("aria-controls"));
          if (!panel) return;
          panel.hidden = !on;
          if (on) {
            panel.classList.remove("entering");
            void panel.offsetWidth;
            panel.classList.add("entering");
          }
        });
        place(tab);
        if (focus) tab.focus({ preventScroll: true });
        // прокручуємо тільки рядок вкладок (на телефоні), а не всю сторінку
        list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: "smooth" });
      }
      tabs.forEach((t, i) => {
        t.addEventListener("click", () => select(t));
        t.addEventListener("keydown", (e) => {
          const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
        });
      });
      const first = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
      select(first);
      new ResizeObserver(() => place(tabs.find((t) => t.getAttribute("aria-selected") === "true"))).observe(list);
      document.fonts && document.fonts.ready.then(() => place(tabs.find((t) => t.getAttribute("aria-selected") === "true")));
    });
  }

  /* Кнопка «Копіювати» у .terminal (копіює текст без коментарів і $) */
  function initCopy() {
    document.querySelectorAll(".terminal").forEach((term) => {
      const bar = term.querySelector(".terminal-bar");
      const pre = term.querySelector("pre");
      if (!bar || !pre || bar.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = "Копіювати";
      bar.appendChild(btn);
      btn.addEventListener("click", async () => {
        const clone = pre.cloneNode(true);
        clone.querySelectorAll(".c, .p").forEach((n) => n.remove());
        const text = clone.textContent.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim()).join("\n");
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Скопійовано ✓";
          btn.classList.add("done");
        } catch (e) {
          btn.textContent = "Не вийшло :(";
        }
        setTimeout(() => { btn.textContent = "Копіювати"; btn.classList.remove("done"); }, 1800);
      });
    });
  }

  /* Липкий зміст: підсвічує розділ, який зараз на екрані */
  function initToc() {
    document.querySelectorAll(".toc-bar").forEach((bar) => {
      const links = [...bar.querySelectorAll('a[href^="#"]')];
      const map = new Map();
      links.forEach((a) => {
        const sec = document.querySelector(a.getAttribute("href"));
        if (sec) map.set(sec, a);
      });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((l) => l.classList.remove("current"));
          const a = map.get(en.target);
          a.classList.add("current");
          const box = a.parentElement;
          box.scrollTo({ left: a.offsetLeft - box.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      map.forEach((_, sec) => io.observe(sec));
    });
  }

  /* Каруселька: кнопки ←/→, точки, лічильник, перетягування мишкою */
  function initCarousels() {
    document.querySelectorAll("[data-carousel]").forEach((car) => {
      const track = car.querySelector(".carousel-track");
      if (!track || car.querySelector(".carousel-ui")) return;
      const slides = [...track.children];
      const ui = document.createElement("div");
      ui.className = "carousel-ui";
      ui.innerHTML =
        `<div class="carousel-dots">${slides.map((_, i) => `<button type="button" aria-label="Картка ${i + 1}"></button>`).join("")}</div>` +
        `<span class="carousel-count"></span>` +
        `<div class="carousel-btns"><button type="button" data-dir="-1" aria-label="Назад"><svg class="i thick" style="rotate:180deg"><use href="#i-arrow"/></svg></button>` +
        `<button type="button" data-dir="1" aria-label="Далі"><svg class="i thick"><use href="#i-arrow"/></svg></button></div>`;
      car.appendChild(ui);
      const dots = [...ui.querySelectorAll(".carousel-dots button")];
      const [prev, next] = ui.querySelectorAll(".carousel-btns button");
      const count = ui.querySelector(".carousel-count");

      const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
      function current() { return Math.round(track.scrollLeft / step()); }
      function update() {
        const i = Math.min(slides.length - 1, current());
        dots.forEach((d, k) => d.classList.toggle("on", k === i));
        count.textContent = `${i + 1} / ${slides.length}`;
        prev.disabled = track.scrollLeft < 4;
        next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      }
      const go = (i) => track.scrollTo({ left: slides[Math.max(0, Math.min(slides.length - 1, i))].offsetLeft - slides[0].offsetLeft, behavior: "smooth" });
      dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
      ui.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => go(current() + +b.dataset.dir)));
      track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
      addEventListener("resize", update);
      update();

      // перетягування мишкою (на телефоні працює звичайний свайп)
      let down = false, sx = 0, sl = 0, moved = false;
      track.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button, a, input, select, textarea, label")) return;
        down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
      });
      addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - sx;
        if (Math.abs(dx) > 5) { moved = true; track.classList.add("dragging"); }
        if (moved) track.scrollLeft = sl - dx;
      });
      addEventListener("pointerup", () => {
        if (!down) return;
        down = false;
        if (moved) { track.classList.remove("dragging"); go(current()); }
      });
      track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });
  }

  /* Покроковий блок: одна картка за раз, вкладки зверху, «Детальніше / Назад / Далі» знизу */
  function initSteppers() {
    document.querySelectorAll("[data-stepper]").forEach((box) => {
      if (box.dataset.ready) return;
      box.dataset.ready = "1";
      const stage = box.querySelector(".stepper-stage");
      const steps = [...stage.children];
      const tabs = document.createElement("div");
      tabs.className = "stepper-tabs";
      tabs.setAttribute("role", "tablist");
      tabs.innerHTML = steps.map((st, i) =>
        `<button type="button" role="tab"><b>${String(i + 1).padStart(2, "0")}</b><span>${st.dataset.title || "Крок " + (i + 1)}</span></button>`).join("");
      box.prepend(tabs);
      const bar = document.createElement("div");
      bar.className = "stepper-bar";
      bar.innerHTML =
        `<button class="more stepper-more" type="button">Детальніше ${svgIcon("arrow")}</button>` +
        `<span class="stepper-count"></span>` +
        `<button class="stepper-prev" type="button" aria-label="Назад">${svgIcon("arrow", "thick")}</button>` +
        `<a class="btn btn-primary stepper-next" href="#"></a>`;
      box.appendChild(bar);
      const tabBtns = [...tabs.children];
      const more = bar.querySelector(".stepper-more");
      const prev = bar.querySelector(".stepper-prev");
      const next = bar.querySelector(".stepper-next");
      const count = bar.querySelector(".stepper-count");
      let cur = -1;

      function go(n, user) {
        if (n === cur || n < 0 || n >= steps.length) return;
        const dir = n > cur ? 1 : -1;
        const old = steps[cur];
        const neu = steps[n];
        if (old) {
          old.classList.remove("active");
          old.classList.toggle("out-left", dir > 0);
          setTimeout(() => old.classList.remove("out-left"), 560);
        }
        neu.classList.add("no-anim");
        neu.classList.toggle("from-left", dir < 0 && cur >= 0);
        void neu.offsetWidth;
        neu.classList.remove("no-anim", "from-left");
        neu.classList.add("active");
        steps.forEach((st, i) => st.setAttribute("aria-hidden", i !== n));
        tabBtns.forEach((t, i) => {
          t.setAttribute("aria-selected", i === n);
          if (i === n) t.classList.add("seen");
        });
        const tb = tabBtns[n];
        tabs.scrollTo({ left: tb.offsetLeft - tabs.clientWidth / 2 + tb.offsetWidth / 2, behavior: "smooth" });
        more.hidden = !neu.dataset.drawer;
        if (neu.dataset.drawer) { more.dataset.drawer = neu.dataset.drawer; more.dataset.title = neu.dataset.title || "Детальніше"; }
        count.textContent = `${n + 1} / ${steps.length}`;
        prev.disabled = n === 0;
        const last = n === steps.length - 1;
        next.innerHTML = (last ? (box.dataset.finalLabel || "Готово") : "Далі") + ' <span class="arr">→</span>';
        next.setAttribute("href", last ? (box.dataset.finalHref || "#") : "#");
        cur = n;
        if (user) neu.dispatchEvent(new CustomEvent("stepshow", { bubbles: true }));
      }
      tabBtns.forEach((t, i) => t.addEventListener("click", () => go(i, true)));
      prev.addEventListener("click", () => go(cur - 1, true));
      next.addEventListener("click", (e) => {
        if (cur < steps.length - 1) { e.preventDefault(); go(cur + 1, true); }
      });
      box.addEventListener("keydown", (e) => {
        if (e.target.closest("input, textarea")) return;
        if (e.key === "ArrowRight") go(cur + 1, true);
        if (e.key === "ArrowLeft") go(cur - 1, true);
      });
      go(0);
    });
  }

  /* Вибір зі списку: кнопки [data-pick="id"] показують відповідну картку */
  function initPickers() {
    document.querySelectorAll("[data-picker]").forEach((box) => {
      if (box.dataset.ready) return;
      box.dataset.ready = "1";
      const btns = [...box.querySelectorAll("[data-pick]")];
      const panels = btns.map((b) => document.getElementById(b.dataset.pick)).filter(Boolean);
      function pick(id, anim) {
        btns.forEach((b) => b.setAttribute("aria-selected", b.dataset.pick === id));
        panels.forEach((pn) => {
          const on = pn.id === id;
          pn.hidden = !on;
          if (on && anim) { pn.classList.remove("entering"); void pn.offsetWidth; pn.classList.add("entering"); }
        });
      }
      btns.forEach((b) => b.addEventListener("click", () => pick(b.dataset.pick, true)));
      box.pickById = (id) => pick(id, true);
      pick(btns[0].dataset.pick, false);
    });
  }

  /* Бокова панель «Детальніше»: <button data-drawer="id"> + <template id="id"> */
  function initDrawers() {
    if (!document.querySelector("[data-drawer]")) return;
    const dlg = document.createElement("dialog");
    dlg.className = "drawer";
    dlg.innerHTML = `<div class="drawer-head"><b></b><button class="drawer-close" type="button" aria-label="Закрити">${svgIcon("x", "thick")}</button></div><div class="drawer-body"></div>`;
    document.body.appendChild(dlg);
    const title = dlg.querySelector(".drawer-head b");
    const body = dlg.querySelector(".drawer-body");
    let opener = null;

    function close() {
      if (!dlg.open || dlg.classList.contains("closing")) return;
      dlg.classList.add("closing");
      setTimeout(() => { dlg.classList.remove("closing"); dlg.close(); if (opener) opener.focus({ preventScroll: true }); }, 280);
    }
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-drawer]");
      if (!btn) return;
      const tpl = document.getElementById(btn.dataset.drawer);
      if (!tpl) return;
      opener = btn;
      title.textContent = btn.dataset.title || tpl.dataset.title || "Детальніше";
      body.innerHTML = "";
      body.appendChild(tpl.content.cloneNode(true));
      body.scrollTop = 0;
      dlg.showModal();
      // нові терміналі/вкладки всередині панелі теж мають працювати
      initCopy(); initTabs();
    });
    dlg.querySelector(".drawer-close").addEventListener("click", close);
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  }

  /* Свайп на телефоні: ← наступна сторінка, → попередня */
  function initSwipe() {
    if (curIdx < 0 || !matchMedia("(pointer: coarse)").matches) return;
    let sx = 0, sy = 0, st = 0, ok = false;
    const blocked = "[data-no-swipe], pre, .tab-list, .toc-inner, .carousel-track, dialog, input, textarea, select, .scroll-x";
    document.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      ok = e.touches.length === 1 && t.clientX > 28 && t.clientX < innerWidth - 28 && !e.target.closest(blocked);
      sx = t.clientX; sy = t.clientY; st = Date.now();
    }, { passive: true });
    document.addEventListener("touchend", (e) => {
      if (!ok) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 90 && Math.abs(dy) < Math.abs(dx) * 0.4 && Date.now() - st < 650) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    // одноразова підказка
    let seen = false;
    try { seen = localStorage.getItem("hk26-swipe-hint") === "1"; } catch (e) { seen = true; }
    if (seen) return;
    const hint = document.createElement("div");
    hint.className = "swipe-hint";
    hint.innerHTML = `<span class="hand">${svgIcon("swipe")}</span> Свайпай вліво/вправо, щоб гортати розділи`;
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add("show"), 1200);
    setTimeout(() => { hint.classList.remove("show"); setTimeout(() => hint.remove(), 600); }, 5200);
    try { localStorage.setItem("hk26-swipe-hint", "1"); } catch (e) { /* ignore */ }
  }
})();
