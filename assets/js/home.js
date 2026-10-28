/* ==========================================================================
   Головна «Робота з ШІ» — інтерактивні демо
     • токенайзер (текст → токени)
     • передбачення наступного слова + температура
     • контекстне вікно (ШІ «забуває» початок)
     • ліміт запитів (429) і повторні спроби з паузами (backoff)
     • підбір локальної моделі за обсягом RAM
     • конструктор промпту
     • «Що тобі треба?» — підбір сервісу
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ico = (n) => (window.Site && Site.icon ? Site.icon(n) : "");
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 60) : ms));

  // запускає fn, коли елемент уперше з'являється на екрані
  function onVisible(el, fn, threshold = 0.35) {
    if (!el) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); fn(); } }, { threshold });
    io.observe(el);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTokenizer();
    initNextToken();
    initContext();
    initHallucination();
    initRateLimit();
    initBackoff();
    initRam();
    initPrompt();
    initChooser();
    initHeroChat();
    const deck = $(".deck");
    onVisible(deck, () => setTimeout(() => deck.classList.add("open"), 500), 0.5);
  });

  /* --------------------------------------------------------------- HERO */
  function initHeroChat() {
    const box = $("#heroChat");
    if (!box) return;
    const lines = [
      { who: "me", text: "Поясни, що таке фотосинтез, як для 8 класу" },
      { who: "ai", text: "Уяви, що листок — маленька кухня. Сонце дає енергію, корінь приносить воду, а з повітря береться CO₂. З цього рослина «готує» цукор і віддає нам кисень." },
      { who: "me", text: "А тепер одним реченням для шпаргалки?" },
      { who: "ai", text: "Рослини на світлі перетворюють воду і CO₂ на цукор і кисень." },
    ];
    let alive = true;
    async function run() {
      while (alive) {
        box.innerHTML = "";
        for (const l of lines) {
          const b = document.createElement("div");
          b.className = "hc-msg " + l.who;
          box.appendChild(b);
          if (l.who === "ai") {
            b.innerHTML = '<span class="hc-dots"><i></i><i></i><i></i></span>';
            await wait(900);
            b.textContent = "";
            for (const w of l.text.split(" ")) { b.textContent += (b.textContent ? " " : "") + w; await wait(55); }
          } else {
            b.textContent = l.text;
          }
          await wait(900);
        }
        await wait(3500);
      }
    }
    onVisible(box, run, 0.2);
  }

  /* ---------------------------------------------------------- TOKENIZER */
  // Наближений токенайзер: справжні (BPE) ріжуть інакше, але принцип той самий —
  // часті шматки = 1 токен, рідкісні слова розбиваються на частини.
  function tokenize(text) {
    const parts = text.match(/\s*[\p{L}\p{N}’']+|\s*[^\s\p{L}\p{N}]/gu) || [];
    const out = [];
    const common = new Set(["the", "and", "you", "are", "how", "hello", "what", "is", "a", "to", "of", "in", "it", "i", "my", "привіт", "як", "що", "це", "і", "в", "на", "не", "я", "ти"]);
    parts.forEach((p) => {
      const lead = p.match(/^\s*/)[0];
      let w = p.slice(lead.length);
      const cyr = /[Ѐ-ӿ]/.test(w);
      const max = cyr ? 3 : 5;
      if (w.length <= max + 1 || common.has(w.toLowerCase())) { out.push(lead + w); return; }
      let first = true;
      while (w.length) {
        const n = w.length <= max + 1 ? w.length : max;
        out.push((first ? lead : "") + w.slice(0, n));
        w = w.slice(n);
        first = false;
      }
    });
    return out;
  }

  function initTokenizer() {
    const input = $("#tokInput");
    if (!input) return;
    const outEl = $("#tokOut"), cnt = $("#tokCount"), chars = $("#tokChars");
    const colors = ["var(--yellow)", "var(--pink)", "var(--cyan)", "var(--lime)", "var(--lilac)", "var(--orange)"];
    function render() {
      const toks = tokenize(input.value);
      outEl.innerHTML = toks.map((t, i) =>
        `<span class="tok" style="--c:${colors[i % colors.length]};--d:${Math.min(i, 40) * 18}ms">${t.replace(/ /g, "␣").replace(/</g, "&lt;")}</span>`).join("");
      cnt.textContent = toks.length;
      chars.textContent = input.value.length;
    }
    input.addEventListener("input", render);
    $$("[data-tok-example]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.tokExample; render(); }));
    render();
  }

  /* ---------------------------------------------------- NEXT TOKEN + T° */
  const CANDS = [
    { w: "кава", l: 3.1 }, { w: "ШІ", l: 2.7 }, { w: "дебагер", l: 2.2 }, { w: "Google", l: 1.9 },
    { w: "гумова качечка", l: 1.4 }, { w: "сон", l: 0.9 }, { w: "кіт", l: 0.5 },
  ];
  function softmax(arr, t) {
    const m = Math.max(...arr.map((x) => x / t));
    const e = arr.map((x) => Math.exp(x / t - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  }
  function initNextToken() {
    const root = $("#nextTok");
    if (!root) return;
    const bars = $("#ntBars"), slider = $("#ntTemp"), tval = $("#ntTempVal"), mood = $("#ntMood");
    const sentence = $("#ntSentence"), pick = $("#ntPick");
    bars.innerHTML = CANDS.map((c) => `<div class="nt-row"><span class="nt-w">${c.w}</span><div class="nt-bar"><i></i></div><span class="nt-p"></span></div>`).join("");
    const rows = $$(".nt-row", bars);
    let probs = [];
    function render() {
      const t = +slider.value;
      tval.textContent = t.toFixed(1);
      mood.textContent = t < 0.5 ? "передбачувано, майже завжди одне й те саме" : t < 1.2 ? "баланс: розумно і трохи різноманітно" : "креативно… або дивно";
      probs = softmax(CANDS.map((c) => c.l), t);
      rows.forEach((r, i) => {
        r.querySelector("i").style.width = (probs[i] * 100).toFixed(1) + "%";
        r.querySelector(".nt-p").textContent = Math.round(probs[i] * 100) + "%";
      });
    }
    slider.addEventListener("input", render);
    render();

    let busy = false;
    pick.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      // вибір за ймовірностями
      let r = Math.random(), idx = 0;
      for (; idx < probs.length - 1; idx++) { r -= probs[idx]; if (r <= 0) break; }
      // «рулетка» по рядках
      const spins = reduced ? 0 : 10 + idx;
      for (let k = 0; k <= spins; k++) {
        rows.forEach((row) => row.classList.remove("hot"));
        rows[spins === 0 ? idx : k % rows.length].classList.add("hot");
        await wait(40 + k * 12);
      }
      rows.forEach((row) => row.classList.remove("hot"));
      rows[idx].classList.add("chosen");
      const word = document.createElement("span");
      word.className = "nt-new";
      word.textContent = " " + CANDS[idx].w;
      sentence.querySelector(".nt-new")?.remove();
      sentence.appendChild(word);
      await wait(700);
      rows[idx].classList.remove("chosen");
      busy = false;
    });
  }

  /* ------------------------------------------------------ CONTEXT WINDOW */
  function initContext() {
    const root = $("#ctx");
    if (!root) return;
    const strip = $("#ctxStrip"), fill = $("#ctxFill"), num = $("#ctxNum");
    const MAX = 100;
    const msgs = [
      ["me", "Мене звати Остап, я з Львова", 14], ["ai", "Привіт, Остапе!", 8], ["me", "Допоможи з проєктом про космос", 16],
      ["ai", "Почнімо з планети, яка тобі цікава", 18], ["me", "Марс! Яка там температура?", 15], ["ai", "У середньому близько −60 °C", 14],
      ["me", "А скільки летіти до Марса?", 14], ["ai", "Приблизно 7–9 місяців", 12], ["me", "Нагадай, як мене звати?", 13], ["ai", "Вибач, я цього вже не бачу в розмові…", 18],
    ];
    let i = 0, timer = 0, running = false;
    function used() { return $$(".ctx-msg:not(.gone)", strip).reduce((s, m) => s + +m.dataset.t, 0); }
    function step() {
      if (i >= msgs.length) { timer = setTimeout(reset, 3200); return; }
      const [who, text, t] = msgs[i++];
      const m = document.createElement("div");
      m.className = "ctx-msg " + who;
      m.dataset.t = t;
      m.innerHTML = `<span>${text}</span><em>${t} ток.</em>`;
      strip.appendChild(m);
      while (used() > MAX) {
        const first = $(".ctx-msg:not(.gone)", strip);
        first.classList.add("gone");
      }
      const u = used();
      fill.style.width = (u / MAX) * 100 + "%";
      num.textContent = u;
      root.classList.toggle("full", u > MAX * 0.85);
      strip.scrollTo({ left: strip.scrollWidth, behavior: reduced ? "auto" : "smooth" });
      timer = setTimeout(step, 1500);
    }
    function reset() { strip.innerHTML = ""; i = 0; fill.style.width = "0"; num.textContent = "0"; root.classList.remove("full"); timer = setTimeout(step, 600); }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; step(); }
      else if (!en.isIntersecting && running) { running = false; clearTimeout(timer); }
    }, { threshold: 0.4 }).observe(root);
  }

  /* ------------------------------------------------------- HALLUCINATION */
  function initHallucination() {
    const root = $("#halluc");
    if (!root) return;
    onVisible(root, async () => {
      const ans = $(".hl-answer", root);
      const full = ans.dataset.text;
      ans.textContent = "";
      await wait(400);
      for (const w of full.split(" ")) { ans.textContent += (ans.textContent ? " " : "") + w; await wait(60); }
      await wait(500);
      root.classList.add("stamped");
    });
  }

  /* --------------------------------------------------- RATE LIMIT (429) */
  function initRateLimit() {
    const root = $("#rl");
    if (!root) return;
    const lane = $("#rlLane"), cnt = $("#rlCount"), clock = $("#rlClock"), log = $("#rlLog");
    const LIMIT = 5, WINDOW = 6000; // наочно: 5 запитів за «хвилину» (6 с у демо)
    let sent = 0, start = 0, timer = 0, running = false;

    function packet(ok) {
      const p = document.createElement("span");
      p.className = "rl-pkt " + (ok ? "ok" : "bad");
      p.textContent = ok ? "200" : "429";
      lane.appendChild(p);
      const w = lane.clientWidth - 46;
      const kf = ok
        ? [{ transform: "translateX(0)" }, { transform: `translateX(${w}px)` }]
        : [{ transform: "translateX(0)" }, { transform: `translateX(${w * 0.82}px)`, offset: .55 }, { transform: "translateX(0) rotate(-12deg)" }];
      p.animate(kf, { duration: ok ? 900 : 1300, easing: "cubic-bezier(.5,0,.3,1)" }).finished.then(() => p.remove(), () => p.remove());
      const li = document.createElement("div");
      li.className = ok ? "ok" : "bad";
      li.innerHTML = ok ? `${ico("check")} 200 OK` : `${ico("x")} 429 Too Many Requests`;
      log.prepend(li);
      while (log.children.length > 4) log.lastChild.remove();
    }
    function tick() {
      const now = performance.now();
      if (now - start >= WINDOW) { start = now; sent = 0; root.classList.remove("blocked"); }
      const ok = sent < LIMIT;
      if (ok) sent++;
      else root.classList.add("blocked");
      cnt.textContent = `${sent} / ${LIMIT}`;
      packet(ok);
      timer = setTimeout(tick, 650);
    }
    (function clockLoop() {
      if (running) clock.style.setProperty("--p", Math.min(1, (performance.now() - start) / WINDOW));
      requestAnimationFrame(clockLoop);
    })();
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; start = performance.now(); sent = 0; tick(); }
      else if (!en.isIntersecting && running) { running = false; clearTimeout(timer); }
    }, { threshold: 0.3 }).observe(root);
  }

  /* ------------------------------------------------ RETRY WITH BACKOFF */
  function initBackoff() {
    const root = $("#bo");
    if (!root) return;
    const track = $("#boTrack"), btn = $("#boRun"), cursor = $("#boCursor");
    const plan = [
      { code: 503, wait: 1.2 }, { code: 503, wait: 2.3 }, { code: 429, wait: 4.4 }, { code: 200 },
    ];
    const TOTAL = 9; // секунд на шкалі
    let running = false;
    async function run() {
      if (running) return;
      running = true;
      btn.disabled = true;
      $$(".bo-mark, .bo-gap", track).forEach((n) => n.remove());
      let t = 0;
      for (let k = 0; k < plan.length; k++) {
        const a = plan[k];
        cursor.style.left = (t / TOTAL) * 100 + "%";
        await wait(350);
        const m = document.createElement("div");
        m.className = "bo-mark " + (a.code === 200 ? "ok" : "bad") + (k % 2 ? " hi" : "");
        m.style.left = (t / TOTAL) * 100 + "%";
        m.innerHTML = `<b>${a.code}</b><small>спроба ${k + 1}</small>`;
        track.appendChild(m);
        if (a.code === 200) break;
        const g = document.createElement("div");
        g.className = "bo-gap" + (k % 2 ? " hi" : "");
        g.style.left = (t / TOTAL) * 100 + "%";
        g.style.width = (a.wait / TOTAL) * 100 + "%";
        g.innerHTML = `<span>чекаємо ${a.wait.toString().replace(".", ",")} с</span>`;
        track.appendChild(g);
        cursor.style.transition = `left ${reduced ? 0 : a.wait * 0.45}s linear`;
        t += a.wait;
        cursor.style.left = (t / TOTAL) * 100 + "%";
        await wait(a.wait * 450);
        cursor.style.transition = "";
      }
      await wait(600);
      btn.disabled = false;
      running = false;
    }
    btn.addEventListener("click", run);
    onVisible(root, run, 0.5);
  }

  /* ------------------------------------------------------ RAM → MODELS */
  function initRam() {
    const root = $("#ram");
    if (!root || !window.RAM_MODELS) return;
    const list = $("#ramList"), btns = $$("[data-ram]", root);
    function show(gb) {
      btns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.ram === gb));
      const items = window.RAM_MODELS[gb] || [];
      list.innerHTML = items.map((m, i) => `
        <div class="ram-card" style="--d:${i * 70}ms;--c:${m.c || "var(--white)"}">
          <div class="ram-top"><b>${m.name}</b>${m.badge ? `<span class="chip">${m.badge}</span>` : ""}</div>
          <code>ollama run ${m.tag}</code>
          <p>${m.note}</p>
          <div class="ram-meta"><span>${ico("package")} ${m.size}</span>${m.ua ? `<span class="ua ua-${m.ua}">укр: ${m.ua === 3 ? "добре" : m.ua === 2 ? "нормально" : "слабко"}</span>` : ""}</div>
        </div>`).join("");
    }
    btns.forEach((b) => b.addEventListener("click", () => show(b.dataset.ram)));
    show(root.dataset.default || "8");
  }

  /* ----------------------------------------------------- PROMPT BUILDER */
  function initPrompt() {
    const root = $("#pb");
    if (!root) return;
    const out = $("#pbOut"), meter = $("#pbMeter"), score = $("#pbScore"), verdict = $("#pbVerdict");
    const parts = {
      role: "Ти — вчитель біології, який пояснює просто і з прикладами.",
      context: "Я учень 9 класу, завтра контрольна, тему пропустив через хворобу.",
      task: "Поясни фотосинтез.",
      format: "Дай відповідь у 5 пунктах, а в кінці — одне речення для шпаргалки.",
      limits: "Без складних термінів; якщо термін потрібен — поясни його в дужках.",
      check: "Після пояснення постав мені 3 запитання, щоб я перевірив себе.",
    };
    const weights = { role: 15, context: 20, task: 20, format: 20, limits: 10, check: 15 };
    function render() {
      const on = $$("[data-part]", root).filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.part);
      if (!on.includes("task")) on.unshift("task");
      const order = ["role", "context", "task", "format", "limits", "check"].filter((k) => on.includes(k));
      out.innerHTML = order.map((k) => `<span class="pb-part pb-${k}">${parts[k]}</span>`).join(" ");
      const s = order.reduce((a, k) => a + weights[k], 0);
      meter.style.width = s + "%";
      score.textContent = s;
      verdict.textContent = s <= 20 ? "ШІ вгадуватиме, чого ти хочеш" : s < 60 ? "Вже краще, але ще загально" : s < 90 ? "Добрий промпт!" : "Ідеально: ШІ точно зрозуміє";
      root.dataset.level = s <= 20 ? "1" : s < 60 ? "2" : s < 90 ? "3" : "4";
    }
    $$("[data-part]", root).forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.part === "task") return;
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
      render();
    }));
    render();
  }

  /* ------------------------------------------------------- CHOOSER */
  function initChooser() {
    const root = $("#chooser");
    if (!root || !window.CHOOSER) return;
    const out = $("#chooserOut");
    const btns = $$("[data-need]", root);
    function show(k) {
      btns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.need === k));
      const c = window.CHOOSER[k];
      out.innerHTML = `<p class="ch-why">${c.why}</p><div class="ch-picks">${c.picks.map((p, i) => p.svc
        ? `<button type="button" class="ch-pick" data-svc="${p.svc}" style="--d:${i * 80}ms;--c:${p.c}"><b>${p.name}</b><small>${p.note}</small></button>`
        : `<span class="ch-pick" style="--d:${i * 80}ms;--c:${p.c}"><b>${p.name}</b><small>${p.note}</small></span>`).join("")}</div>`;
    }
    // клік по підказці — відкриває картку сервісу в списку нижче
    out.addEventListener("click", (e) => {
      const b = e.target.closest("[data-svc]");
      const picker = $("#svcPicker");
      if (!b || !picker || !picker.pickById) return;
      picker.pickById(b.dataset.svc);
      picker.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
    btns.forEach((b) => b.addEventListener("click", () => show(b.dataset.need)));
    show(btns[0].dataset.need);
  }
})();
