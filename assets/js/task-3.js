/* ==========================================================================
   Задача 3 — інтерактив сторінки task-3.html
     • етапи «Шлях від follow-up до картки» (автоперемикання + клік)
     • симуляція агента (5 кроків, пауза, гортання)
     • лінія прогресу в інструкції «Ключ і токен»
     • квест з XP (прогрес зберігається в localStorage)
     • картки словника, що перевертаються
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ico = (name) => (window.Site && Site.icon ? Site.icon(name) : "");

  document.addEventListener("DOMContentLoaded", () => {
    initFlow();
    initSim();
    initSteps();
    initQuest();
    initFlips();
  });

  /* ---------------------------------------------------------------- FLOW */
  function initFlow() {
    const flow = $("#flow");
    if (!flow) return;
    const nodes = $$(".flow-node", flow);
    const details = $$(".flow-detail", flow);
    let i = 0, timer = 0, auto = true, visible = false;

    function show(n) {
      i = n;
      nodes.forEach((el, k) => {
        el.classList.toggle("active", k === n);
        el.setAttribute("aria-selected", k === n);
      });
      details.forEach((d) => (d.hidden = d.dataset.for !== String(n)));
    }
    function tick() {
      clearTimeout(timer);
      if (!auto || !visible) return;
      timer = setTimeout(() => { show((i + 1) % nodes.length); tick(); }, 3800);
    }
    nodes.forEach((el, k) => el.addEventListener("click", () => { auto = false; clearTimeout(timer); show(k); }));
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; tick(); }, { threshold: 0.35 }).observe(flow);
    show(0);
  }

  /* ----------------------------------------------------------- SIMULATOR */
  const TASKS = [
    { who: "Макс", c: "#ff6fb5", title: "Зробити слайди презентації", raw: "до пт", due: "пт, 06.11", desc: "Слайди для презентації проєкту. Тексти бере в Дані." },
    { who: "Даня", c: "#4fd8e8", title: "Написати тексти для слайдів", raw: "до ср", due: "ср, 04.11", desc: "Короткий текст до кожного слайда, готове скинути Максу." },
    { who: "Оля",  c: "#ffd23f", title: "Підготувати демо бота", raw: "до чт", due: "чт, 05.11", desc: "Живе демо бота і репетиція виступу перед зустріччю в четвер." },
  ];
  const PROMPT = "Сьогодні пн, 02.11.2026. Знайди у follow-up усі задачі. Поверни JSON: заголовок, відповідальний, дедлайн (дата), короткий зміст. Не вигадуй.";
  const CANCEL = Symbol("cancel");

  function initSim() {
    const sim = $("#sim3");
    if (!sim) return;
    const stage = $("#s3Stage");
    const fx = $("#s3Fx");
    const ui = {
      num: $("#s3Num"), title: $("#s3Title"), text: $("#s3Text"), cap: $(".sim-cap", sim),
      progress: $("#s3Progress"), prompt: $("#s3Prompt"), cards: $("#s3Cards"),
      dc: $("#s3Dc"), trello: $("#s3Trello"),
    };
    const node = (n) => $(`.node[data-node="${n}"]`, sim);
    const marks = $$("mark.hl", sim);

    let ctx = null, cur = 0, playing = true, visible = false, started = false, pendingNext = false;

    // --- допоміжне ---------------------------------------------------------
    const newCtx = () => { if (ctx) ctx.dead = true; ctx = { dead: false }; return ctx; };
    const sleep = (c, ms) => new Promise((res, rej) => setTimeout(() => (c.dead ? rej(CANCEL) : res()), reduced ? Math.min(ms, 120) : ms));

    async function type(c, el, text, speed = 28) {
      el.textContent = "";
      for (const ch of text) {
        el.textContent += ch;
        await sleep(c, speed);
      }
    }

    function rel(el) {
      const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
    }

    // частинка летить по дузі від одного елемента до іншого
    function fly(from, to, { cls = "dot", html = "", color = "#fff", dur = 800, bend = 0.25 } = {}) {
      if (reduced) return Promise.resolve();
      const a = rel(from), b = rel(to);
      const dx = b.x - a.x, dy = b.y - a.y;
      const cx = a.x + dx / 2 - dy * bend, cy = a.y + dy / 2 + dx * bend * 0.6 - 30;
      const el = document.createElement("div");
      el.className = "fly " + cls;
      el.style.setProperty("--pc", color);
      el.innerHTML = html;
      el.style.offsetPath = `path("M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}")`;
      fx.appendChild(el);
      const anim = el.animate(
        [
          { offsetDistance: "0%", opacity: 0, transform: "scale(.4)" },
          { opacity: 1, transform: "scale(1)", offset: 0.15 },
          { opacity: 1, transform: "scale(1)", offset: 0.85 },
          { offsetDistance: "100%", opacity: 0, transform: "scale(.5)" },
        ],
        { duration: dur, easing: "cubic-bezier(.5,0,.3,1)" }
      );
      return anim.finished.then(() => { el.remove(); burst(to, color); }, () => el.remove());
    }
    function burst(target, color) {
      if (reduced || !target.isConnected) return;
      const p = rel(target);
      const b = document.createElement("div");
      b.className = "burst";
      b.style.cssText = `left:${p.x}px;top:${p.y}px;--pc:${color}`;
      fx.appendChild(b);
      setTimeout(() => b.remove(), 750);
    }

    function setNode(name, state) {
      const n = node(name);
      n.classList.toggle("active", state === "active");
      n.classList.toggle("done", state === "done");
    }

    // картки задач у колонці агента: поля спершу порожні, заповнюються кроком 3
    ui.cards.innerHTML = TASKS.map((t) =>
      `<div class="tcard" style="--c:${t.c}">` +
        `<div class="tf tf-title">${ico("pencil")}<span data-f="title"></span></div>` +
        `<div class="tf">${ico("user")}<span data-f="who"></span></div>` +
        `<div class="tf tf-due">${ico("clock")}<span data-f="due"></span></div>` +
        `<div class="tf tf-desc">${ico("file-text")}<span data-f="desc"></span></div>` +
      `</div>`
    ).join("");
    const tcards = $$(".tcard", ui.cards);
    const dueHTML = (t) => `<s>${t.raw}</s> → <b>${t.due}</b>`;
    function fillCard(k) {
      const t = TASKS[k], el = tcards[k];
      el.classList.add("on");
      $('[data-f="title"]', el).textContent = t.title;
      $('[data-f="who"]', el).textContent = t.who;
      $('[data-f="due"]', el).innerHTML = dueHTML(t);
      $('[data-f="desc"]', el).textContent = t.desc;
    }

    function renderDc() {
      ui.dc.innerHTML =
        `<div class="dc-embed"><h5>${ico("pin")} Задачі після зустрічі · ${TASKS.length}</h5>` +
        TASKS.map((t) => `<div class="t3-task"><b>${t.title}</b><span><span class="mention">@${t.who}</span> · до ${t.due}</span></div>`).join("") +
        `</div><span class="no-desc">зміст → тільки в Trello</span>`;
    }
    function addTrelloCard(k, anim) {
      const t = TASKS[k];
      const el = document.createElement("div");
      el.className = "tr-card" + (anim ? " drop" : "");
      el.style.setProperty("--c", t.c);
      el.innerHTML = `<b>${t.title}</b><span class="tr-desc">${t.desc}</span>` +
        `<span class="tr-badges"><span class="due">${ico("clock")} ${t.due.split(", ")[1]}</span><span class="who" style="--c:${t.c}">${t.who[0]}</span></span>`;
      ui.trello.appendChild(el);
      return el;
    }

    // --- кроки -------------------------------------------------------------
    // apply() — миттєво ставить кінцевий стан кроку; play() — анімує його.
    const STEPS = [
      {
        title: "Follow-up прийшов",
        text: "Бот із Задачі 2 щойно надіслав підсумок зустрічі. Агент отримує його текст.",
        focus: "fu", est: 2600,
        apply() { sim.classList.add("has-fu"); },
        async play(c) {
          await sleep(c, 500);
          sim.classList.add("has-fu", "fu-anim");
          await sleep(c, 900);
          await fly($(".t3-fu .dc-embed", sim), node("llm").querySelector(".node-ico"), { cls: "file", html: ico("file-text") + " follow-up.txt", dur: 900, bend: 0.4 });
          await sleep(c, 300);
        },
      },
      {
        title: "ШІ шукає задачі",
        text: "Follow-up і промпт ідуть у мовну модель. У промпті — сьогоднішня дата, щоб «до п’ятниці» стало числом.",
        focus: "agent", est: 9000,
        apply() { ui.prompt.textContent = PROMPT; marks.forEach((m) => m.classList.add("on")); setNode("llm", "done"); },
        async play(c) {
          setNode("llm", "active");
          await type(c, ui.prompt, PROMPT, 14);
          sim.classList.add("thinking");
          for (const m of marks) {
            await sleep(c, 650);
            m.classList.add("on");
          }
          await sleep(c, 700);
          sim.classList.remove("thinking");
          setNode("llm", "done");
          await sleep(c, 300);
        },
      },
      {
        title: "Задачі зібрано",
        text: "Модель повертає JSON: у кожної задачі заголовок, відповідальний, дедлайн-дата і короткий зміст.",
        focus: "agent", est: 9500,
        apply() { TASKS.forEach((t, k) => fillCard(k)); setNode("json", "done"); },
        async play(c) {
          setNode("json", "active");
          for (let k = 0; k < TASKS.length; k++) {
            const t = TASKS[k], el = tcards[k];
            await fly($(".llm-orb", sim), el, { color: t.c, dur: 600 });
            el.classList.add("on");
            await type(c, $('[data-f="title"]', el), t.title, 16);
            $('[data-f="who"]', el).textContent = t.who;
            await sleep(c, 200);
            $('[data-f="due"]', el).innerHTML = dueHTML(t);
            await sleep(c, 200);
            await type(c, $('[data-f="desc"]', el), t.desc, 8);
            await sleep(c, 250);
          }
          setNode("json", "done");
          await sleep(c, 300);
        },
      },
      {
        title: "Коротко — в Discord",
        text: "Бот надсилає в канал список: заголовок, відповідальний, дедлайн. Короткий зміст сюди не йде.",
        focus: "res", est: 4200,
        apply() { renderDc(); sim.classList.add("has-dc"); setNode("send", "active"); $$(".send-targets span", sim)[0].classList.add("on"); },
        async play(c) {
          setNode("send", "active");
          const target = $$(".send-targets span", sim)[0];
          await fly(node("json").querySelector(".node-ico"), node("send").querySelector(".node-ico"), { color: "#b4f04b", dur: 600 });
          target.classList.add("on");
          await fly(node("send").querySelector(".node-ico"), $(".res-dc .col-head", sim), { cls: "file", html: ico("message") + " повідомлення", dur: 850, bend: 0.3 });
          renderDc();
          sim.classList.add("has-dc", "dc-anim");
          await sleep(c, 1600);
        },
      },
      {
        title: "Картки в Trello",
        text: "Для кожної задачі — запит POST /1/cards: назва, опис, дата і відповідальний. Картки з’являються на дошці.",
        focus: "res", est: 6000,
        apply() { TASKS.forEach((t, k) => addTrelloCard(k, false)); $$(".send-targets span", sim).forEach((s) => s.classList.add("on")); setNode("send", "done"); },
        async play(c) {
          const target = $$(".send-targets span", sim)[1];
          target.classList.add("on");
          for (let k = 0; k < TASKS.length; k++) {
            await fly(node("send").querySelector(".node-ico"), ui.trello, { cls: "file", html: "POST /1/cards", color: TASKS[k].c, dur: 800, bend: -0.25 });
            addTrelloCard(k, true);
            await sleep(c, 250);
          }
          setNode("send", "done");
          await sleep(c, 600);
        },
      },
    ];

    // --- керування ---------------------------------------------------------
    ui.progress.innerHTML = STEPS.map((s, k) => `<button class="sim-seg" type="button" aria-label="Крок ${k + 1}: ${s.title}"><i></i></button>`).join("");
    const segs = $$(".sim-seg", ui.progress);
    let segAnim = null;

    function reset() {
      sim.classList.remove("has-fu", "fu-anim", "has-dc", "dc-anim", "thinking");
      marks.forEach((m) => m.classList.remove("on"));
      $$(".node", sim).forEach((n) => n.classList.remove("active", "done"));
      $$(".send-targets span", sim).forEach((s) => s.classList.remove("on"));
      tcards.forEach((el) => { el.classList.remove("on"); $$("[data-f]", el).forEach((f) => (f.textContent = "")); });
      ui.prompt.textContent = ""; ui.dc.innerHTML = ""; ui.trello.innerHTML = "";
      fx.innerHTML = "";
    }

    function updateUI(n) {
      const s = STEPS[n];
      ui.num.textContent = n + 1;
      ui.title.textContent = s.title;
      ui.text.textContent = s.text;
      ui.cap.classList.remove("swap"); void ui.cap.offsetWidth; ui.cap.classList.add("swap");
      sim.dataset.focus = s.focus;
      if (segAnim) segAnim.cancel();
      segs.forEach((g, k) => {
        g.classList.toggle("done", k < n);
        g.querySelector("i").style.width = "";
      });
      segAnim = segs[n].querySelector("i").animate([{ width: "0%" }, { width: "100%" }], { duration: s.est, fill: "forwards", easing: "linear" });
      if (!playing) segAnim.pause();
    }

    async function goTo(n) {
      const c = newCtx();
      pendingNext = false;
      cur = n;
      reset();
      for (let k = 0; k < n; k++) STEPS[k].apply();
      updateUI(n);
      try {
        await STEPS[n].play(c);
        await sleep(c, n === STEPS.length - 1 ? 3600 : 1100);
      } catch (e) {
        if (e === CANCEL) return;
        throw e;
      }
      pendingNext = true;
      maybeAdvance();
    }
    function maybeAdvance() {
      if (pendingNext && playing && visible) goTo((cur + 1) % STEPS.length);
    }
    function setPlaying(p) {
      playing = p;
      sim.classList.toggle("paused", !p);
      $('[data-sim="toggle"]', sim).setAttribute("aria-label", p ? "Пауза" : "Відтворити");
      if (segAnim) p ? segAnim.play() : segAnim.pause();
      if (p) maybeAdvance();
    }

    sim.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sim]");
      if (b) {
        const a = b.dataset.sim;
        if (a === "toggle") setPlaying(!playing);
        if (a === "next") goTo((cur + 1) % STEPS.length);
        if (a === "prev") goTo((cur - 1 + STEPS.length) % STEPS.length);
        return;
      }
      const seg = e.target.closest(".sim-seg");
      if (seg) goTo(segs.indexOf(seg));
    });

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !started) { started = true; goTo(0); }
      else maybeAdvance();
    }, { threshold: 0.3 }).observe(sim);

    // підготовка: показати перший крок до старту
    updateUI(0);
    if (segAnim) segAnim.pause();
  }

  /* ---------------------------------------------- KEY STEPS (лінія) */
  function initSteps() {
    const list = $("#psteps");
    if (!list) return;
    const fill = document.createElement("span");
    fill.className = "psteps-fill";
    list.appendChild(fill);
    let raf = 0;
    function update() {
      raf = 0;
      const r = list.getBoundingClientRect();
      const mid = innerHeight * 0.6;
      const h = Math.max(0, Math.min(r.height - 40, mid - r.top - 20));
      fill.style.height = h + "px";
    }
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener("resize", update);
    update();
  }

  /* --------------------------------------------------------------- QUEST */
  const RANKS = [
    { xp: 0,   name: "Глядач",  icon: "eye" },
    { xp: 10,  name: "Новачок", icon: "sprout" },
    { xp: 95,  name: "Джун",    icon: "rocket" },
    { xp: 155, name: "Профі",   icon: "zap" },
    { xp: 250, name: "Бос",     icon: "crown" },
  ];
  const KEY = "hk26-task3-quest";

  function initQuest() {
    const levels = $("#levels");
    if (!levels) return;
    const boxes = $$("input[type=checkbox]", levels);
    const max = boxes.reduce((s, b) => s + +b.dataset.xp, 0);
    $("#xpMax").textContent = max;

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { saved = {}; }
    boxes.forEach((b) => (b.checked = !!saved[b.dataset.id]));

    let lastRank = null;
    function render(fromUser) {
      const xp = boxes.filter((b) => b.checked).reduce((s, b) => s + +b.dataset.xp, 0);
      $("#xpNum").textContent = xp;
      $("#xpFill").style.width = (xp / max) * 100 + "%";
      const rank = [...RANKS].reverse().find((r) => xp >= r.xp);
      if (rank !== lastRank) {
        $("#xpRank").textContent = rank.name;
        const em = $("#xpEmoji");
        em.innerHTML = ico(rank.icon);
        if (fromUser) { em.classList.remove("pop"); void em.offsetWidth; em.classList.add("pop"); }
        lastRank = rank;
      }
      $$(".level", levels).forEach((lv) => {
        const bs = $$("input", lv);
        const done = bs.filter((b) => b.checked).length;
        const pct = Math.round((done / bs.length) * 100);
        $(".level-pct", lv).textContent = pct + "%";
        const was = lv.classList.contains("complete");
        lv.classList.toggle("complete", pct === 100);
        if (fromUser && pct === 100 && !was) confetti();
      });
    }

    boxes.forEach((b) => b.addEventListener("change", () => {
      saved[b.dataset.id] = b.checked;
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (err) { /* ignore */ }
      if (b.checked) floatXP(b);
      render(true);
    }));
    render(false);
  }

  function floatXP(input) {
    const r = input.closest("label").querySelector(".q-xp").getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = "+" + input.dataset.xp + " XP";
    el.style.left = r.left + "px";
    el.style.top = r.top - 6 + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function confetti() {
    if (reduced) return;
    const cv = document.createElement("canvas");
    cv.className = "confetti";
    document.body.appendChild(cv);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);
    const cols = ["#b4f04b", "#3d6bff", "#ff6fb5", "#4fd8e8", "#ffd23f", "#fff"];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(t) {
      const life = (t - t0) / 2400;
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save();
        g.globalAlpha = Math.max(0, 1 - life);
        g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        g.restore();
      });
      if (life < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ---------------------------------------------------------- GLOSSARY */
  function initFlips() {
    $$(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("flipped")));
  }
})();
