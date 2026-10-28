/* ==========================================================================
   Задача 2 — інтерактив сторінки task-2.html
     • етапи «Шлях від голосу до follow-up» (автоперемикання + клік)
     • симуляція зустрічі (6 кроків, пауза, гортання)
     • лінія прогресу в інструкції «Як отримати токен»
     • квест з XP (прогрес зберігається в localStorage)
     • картки словника, що перевертаються
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const TALK = [
    { u: "olya", name: "Оля",  t: "00:03", text: "Треба вирішити, хто що робить до п’ятниці." },
    { u: "max",  name: "Макс", t: "00:09", text: "Я зроблю слайди, але скиньте мені тексти." },
    { u: "dan",  name: "Даня", t: "00:15", text: "Тексти на мені, скину до середи." },
    { u: "olya", name: "Оля",  t: "00:22", text: "Тоді я готую демо бота і репетирую виступ." },
    { u: "max",  name: "Макс", t: "00:30", text: "Збираємось ще раз у четвер о 18:00?" },
    { u: "dan",  name: "Даня", t: "00:34", text: "Го, домовились! 🔥" },
  ];
  const COLORS = { olya: "#f472b6", max: "#22d3ee", dan: "#a3e635", bot: "#5865f2" };
  const PROMPT = "Ось транскрипт зустрічі. Зроби короткий підсумок, список рішень і задач: хто, що, до коли.";
  const CANCEL = Symbol("cancel");

  function initSim() {
    const sim = $("#sim");
    if (!sim) return;
    const stage = $("#simStage");
    const fx = $("#simFx");
    const ui = {
      num: $("#simNum"), title: $("#simTitle"), text: $("#simText"), cap: $(".sim-cap", sim),
      progress: $("#simProgress"), bubble: $("#simBubble"), log: $("#simLog"), input: $("#simInput"),
      tracks: $("#simTracks"), transcript: $("#simTranscript"), prompt: $("#simPrompt"),
      toast: $("#simToast"), msg: $("#simMsg"),
    };
    const user = (u) => $(`.vc-user[data-u="${u}"]`, sim);
    const ava = (u) => $(`.vc-user[data-u="${u}"] .ava`, sim);
    const node = (n) => $(`.node[data-node="${n}"]`, sim);

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

    function chat(html, cls = "") {
      const d = document.createElement("div");
      d.className = "chat-line " + cls;
      d.innerHTML = html;
      ui.log.appendChild(d);
      while (ui.log.children.length > 3) ui.log.firstChild.remove();
    }
    function addTranscriptLine(l) {
      const d = document.createElement("div");
      d.style.setProperty("--c", COLORS[l.u]);
      d.innerHTML = `<time>[${l.t}]</time> <b>${l.name}:</b> <span></span>`;
      ui.transcript.appendChild(d);
      return d.querySelector("span");
    }
    function segment(u, idx) {
      const bar = $(`.track[data-u="${u}"] .track-bar`, ui.tracks);
      const seg = document.createElement("i");
      seg.style.left = (idx * 16 + 2) + "%";
      bar.appendChild(seg);
      return seg;
    }
    function setNode(name, state) {
      const n = node(name);
      n.classList.toggle("active", state === "active");
      n.classList.toggle("done", state === "done");
    }
    function showBubble(l) {
      if (!l) { ui.bubble.classList.remove("show"); return; }
      ui.bubble.style.setProperty("--bc", COLORS[l.u]);
      ui.bubble.querySelector("b").textContent = l.name;
      ui.bubble.querySelector("span").textContent = l.text;
      ui.bubble.classList.add("show");
    }

    // --- кроки -------------------------------------------------------------
    // apply() — миттєво ставить кінцевий стан кроку; play() — анімує його.
    const STEPS = [
      {
        title: "Команда /join",
        text: "Учасники зайшли в голосовий канал. Оля пише slash-команду /join — це сигнал для бота.",
        focus: "voice", est: 3800,
        apply() { sim.classList.add("has-users"); chat("<b>Оля</b> використала <span class='cmd'>/join</span>"); },
        async play(c) {
          await sleep(c, 300);
          sim.classList.add("has-users");
          await sleep(c, 900);
          const box = ui.input.parentElement;
          box.classList.add("typing");
          await type(c, ui.input, "/join", 120);
          await sleep(c, 350);
          box.classList.remove("typing");
          box.classList.add("sent");
          ui.input.textContent = "";
          chat("<b>Оля</b> використала <span class='cmd'>/join</span>");
          await sleep(c, 500);
          box.classList.remove("sent");
        },
      },
      {
        title: "Бот підключився",
        text: "Бот заходить у голосовий канал і чесно попереджає в чаті, що йде запис.",
        focus: "voice", est: 2600,
        apply() { sim.classList.add("has-bot"); chat("🔴 <b>FollowUp</b> записує цю зустріч. Підсумок прийде після /stop", "sys"); },
        async play(c) {
          await sleep(c, 200);
          sim.classList.add("has-bot");
          await sleep(c, 450);
          burst(ava("bot"), COLORS.bot);
          await sleep(c, 500);
          chat("🔴 <b>FollowUp</b> записує цю зустріч. Підсумок прийде після /stop", "sys");
          await sleep(c, 900);
        },
      },
      {
        title: "Запис розмови",
        text: "Discord надсилає звук кожного учасника окремим потоком. Бот складає їх у доріжки — видно, хто й коли говорив.",
        focus: "brain", est: 13500,
        apply() {
          TALK.forEach((l, k) => { const s = segment(l.u, k); s.style.transition = "none"; s.style.width = "14%"; });
          setNode("rec", "done");
        },
        async play(c) {
          setNode("rec", "active");
          const rec = node("rec");
          for (let k = 0; k < TALK.length; k++) {
            const l = TALK[k];
            const u = user(l.u);
            u.classList.add("speaking");
            showBubble(l);
            const seg = segment(l.u, k);
            seg.style.setProperty("--grow", "1.6s");
            requestAnimationFrame(() => requestAnimationFrame(() => (seg.style.width = "14%")));
            for (let p = 0; p < 7; p++) {
              fly(ava(l.u), rec.querySelector(`.track[data-u="${l.u}"] .track-bar`), { color: COLORS[l.u], dur: 700, bend: 0.15 });
              await sleep(c, 230);
            }
            u.classList.remove("speaking");
            await sleep(c, 300);
          }
          showBubble(null);
          setNode("rec", "done");
          await sleep(c, 400);
        },
      },
      {
        title: "Голос → текст",
        text: "Після /stop аудіо йде в сервіс розпізнавання мови (STT). Виходить транскрипт з іменами й тайм-кодами.",
        focus: "brain", est: 8000,
        apply() {
          sim.classList.add("stopped");
          chat("<b>Оля</b> використала <span class='cmd'>/stop</span>");
          TALK.forEach((l) => (addTranscriptLine(l).textContent = l.text));
          setNode("stt", "done");
        },
        async play(c) {
          const box = ui.input.parentElement;
          box.classList.add("typing");
          await type(c, ui.input, "/stop", 110);
          await sleep(c, 250);
          box.classList.remove("typing");
          ui.input.textContent = "";
          chat("<b>Оля</b> використала <span class='cmd'>/stop</span>");
          sim.classList.add("stopped");
          setNode("stt", "active");
          await fly(node("rec").querySelector(".node-ico"), node("stt").querySelector(".node-ico"), { cls: "file", html: "🎧 meeting.wav", dur: 900, bend: 0.5 });
          for (const l of TALK) {
            const span = addTranscriptLine(l);
            await type(c, span, l.text, 14);
            await sleep(c, 80);
          }
          setNode("stt", "done");
          await sleep(c, 400);
        },
      },
      {
        title: "ШІ робить зміст",
        text: "Транскрипт і промпт відправляються в мовну модель (LLM). Вона виділяє головне: підсумок, рішення, задачі.",
        focus: "brain", est: 6500,
        apply() { ui.prompt.textContent = PROMPT; sim.classList.add("has-llm"); setNode("llm", "done"); },
        async play(c) {
          setNode("llm", "active");
          await fly(node("stt").querySelector(".node-ico"), $(".llm-orb", sim), { cls: "file", html: "📄 transcript.txt", dur: 900, bend: 0.5 });
          await type(c, ui.prompt, PROMPT, 16);
          sim.classList.add("thinking");
          await sleep(c, 1500);
          sim.classList.remove("thinking");
          for (const chip of $$(".llm-out span", sim)) {
            chip.classList.add("on");
            await sleep(c, 320);
          }
          sim.classList.add("has-llm");
          setNode("llm", "done");
          await sleep(c, 400);
        },
      },
      {
        title: "Follow-up надіслано",
        text: "Бот публікує гарне повідомлення в канал і надсилає кожному учаснику його задачі в особисті.",
        focus: "out", est: 5000,
        apply() { sim.classList.add("has-msg", "has-dm"); setNode("send", "done"); },
        async play(c) {
          setNode("send", "active");
          await fly($(".llm-orb", sim), node("send").querySelector(".node-ico"), { color: "#a3e635", dur: 700 });
          const targets = $$(".send-targets span", sim);
          targets[0].classList.add("on");
          await fly(node("send").querySelector(".node-ico"), $(".col-out .col-head", sim), { cls: "file", html: "📋 embed", dur: 800, bend: 0.3 });
          sim.classList.add("has-msg", "msg-anim");
          await sleep(c, 700);
          const dms = ["olya", "max", "dan"].map((u, k) => {
            targets[k + 1].classList.add("on");
            return fly(node("send").querySelector(".node-ico"), ava(u), { cls: "file", html: "📩", color: COLORS[u], dur: 900, bend: -0.3 });
          });
          await Promise.all(dms);
          sim.classList.add("has-dm");
          ui.toast.classList.add("show");
          setNode("send", "done");
          await sleep(c, 2600);
          ui.toast.classList.remove("show");
        },
      },
    ];

    // --- керування ---------------------------------------------------------
    ui.progress.innerHTML = STEPS.map((s, k) => `<button class="sim-seg" type="button" aria-label="Крок ${k + 1}: ${s.title}"><i></i></button>`).join("");
    const segs = $$(".sim-seg", ui.progress);
    let segAnim = null;

    function reset() {
      sim.classList.remove("has-users", "has-bot", "stopped", "has-llm", "has-msg", "has-dm", "msg-anim", "thinking");
      $$(".vc-user", sim).forEach((u) => u.classList.remove("speaking"));
      $$(".track-bar", sim).forEach((b) => (b.innerHTML = ""));
      $$(".node", sim).forEach((n) => n.classList.remove("active", "done"));
      $$(".llm-out span, .send-targets span", sim).forEach((s) => s.classList.remove("on"));
      ui.log.innerHTML = ""; ui.transcript.innerHTML = ""; ui.prompt.textContent = ""; ui.input.textContent = "";
      ui.input.parentElement.classList.remove("typing", "sent");
      ui.toast.classList.remove("show");
      showBubble(null);
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
        await sleep(c, n === STEPS.length - 1 ? 3200 : 1100);
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

  /* ---------------------------------------------- TOKEN STEPS (лінія) */
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
    { xp: 0,   name: "Глядач",  emoji: "🥚" },
    { xp: 10,  name: "Новачок", emoji: "🐣" },
    { xp: 100, name: "Джун",    emoji: "🚀" },
    { xp: 160, name: "Профі",   emoji: "⚡" },
    { xp: 250, name: "Бос",     emoji: "👑" },
  ];
  const KEY = "hk26-task2-quest";

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
        em.textContent = rank.emoji;
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

    boxes.forEach((b) => b.addEventListener("change", (e) => {
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
    const cols = ["#5865f2", "#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#fff"];
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
