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
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 9v6M9.5 6v12M14 9v6M18.5 7v10"/></svg>',
  };

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
      this.innerHTML =
        `<header class="site-header"><nav class="nav-shell" aria-label="Розділи сайту">` +
        `<a class="brand" href="index.html" aria-label="Хакатон 2026 — на головну"><span class="brand-mark">${ICONS.logo}</span><span class="brand-text">ХАКАТОН <b>2026</b></span></a>` +
        `<div class="nav-links">${PAGES.map((p) => navLink(p, "nav-link", "nav-pill", "label")).join("")}</div>` +
        `</nav></header>` +
        `<nav class="tabbar" aria-label="Розділи сайту">${PAGES.map((p) => navLink(p, "tab", "tab-pill", "short")).join("")}</nav>`;

      if (!document.querySelector(".site-bg")) {
        document.body.insertAdjacentHTML("afterbegin",
          '<div class="site-bg" aria-hidden="true"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="grid"></div><div class="noise"></div><div class="spot"></div></div>');
      }
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
        `<footer class="site-footer"><div class="container">${pager}` +
        `<div class="foot-row"><span>Хакатон 2026 · зроблено з ШІ та ❤️ для учнів 8–11 класів</span>` +
        `<a href="components.html">🧩 Компоненти для авторів</a></div></div></footer>`;
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
    initPointerGlow();
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
        if (focus) tab.focus();
        tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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

  /* Світло за курсором: фон + картки */
  function initPointerGlow() {
    if (!matchMedia("(pointer: fine)").matches) return;
    const spot = document.querySelector(".site-bg .spot");
    let raf = 0, x = 0, y = 0, target = null;
    document.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY; target = e.target;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (spot) { spot.style.setProperty("--mx", x + "px"); spot.style.setProperty("--my", y + "px"); }
        const card = target && target.closest && target.closest(".card");
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", x - r.left + "px");
          card.style.setProperty("--my", y - r.top + "px");
        }
      });
    }, { passive: true });
  }

  /* Свайп на телефоні: ← наступна сторінка, → попередня */
  function initSwipe() {
    if (curIdx < 0 || !matchMedia("(pointer: coarse)").matches) return;
    let sx = 0, sy = 0, st = 0, ok = false;
    const blocked = "[data-no-swipe], pre, .tab-list, .toc-inner, input, textarea, select, .scroll-x";
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
    hint.innerHTML = '<span class="hand">👆</span> Свайпай вліво/вправо, щоб гортати розділи';
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add("show"), 1200);
    setTimeout(() => { hint.classList.remove("show"); setTimeout(() => hint.remove(), 600); }, 5200);
    try { localStorage.setItem("hk26-swipe-hint", "1"); } catch (e) { /* ignore */ }
  }
})();
