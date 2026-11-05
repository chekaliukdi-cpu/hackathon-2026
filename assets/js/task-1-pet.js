/* ==========================================================================
   Задача 1 — ШІ-зразок: тіло істоти
     • вигляд генерується з ДНК (форма, колір, очі, рот, роги, візерунок)
     • емоції, кліпання, погляд за курсором, частинки, репліки
     • аксесуари (addPart) і точки прив'язки (anchors)
   Двигун, мозок і лабораторія — у task-1.js. Тут тільки «тіло».
   ========================================================================== */

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const INK = "#121212";
  const SCREEN = "#17161a";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COLORS = {
    yellow: "#ffd23f", pink: "#ff6fb5", blue: "#3d6bff", blurple: "#5865f2", lime: "#b4f04b",
    orange: "#ff8c42", lilac: "#b79cff", cyan: "#4fd8e8", red: "#ff5a5a", green: "#2fd36f", white: "#ffffff",
  };
  const BODY_COLORS = ["yellow", "pink", "blue", "lime", "orange", "lilac", "cyan", "red", "green", "blurple"];
  const DARK = new Set(["blue", "blurple"]);

  const SHAPES = ["blob", "drop", "cube", "crystal", "ghost", "bean"];
  const EYES = ["round", "big", "tiny", "cyclops", "triple", "visor"];
  const MOUTHS = ["line", "fang", "teeth", "cat"];
  const TOPS = ["none", "horns", "antenna", "antennae", "ears", "sprout", "spikes", "crest"];
  const PATTERNS = ["none", "spots", "stripes", "belly", "patch"];
  const EMOTIONS = ["neutral", "happy", "sad", "angry", "sleepy", "shock", "love", "bored", "smug", "think", "glitch"];

  /* ---------- Додаткові іконки (яких немає в спільному спрайті) ---------- */
  const EXTRA_ICONS = {
    apple: '<path d="M12 7c-1.5-1-3.5-1.4-5-.6C4.6 7.6 4 10.6 5 13.6c1 3.2 3.2 6.4 5.4 6.4.7 0 1.1-.4 1.6-.4s.9.4 1.6.4c2.2 0 4.4-3.2 5.4-6.4 1-3 .4-6-2-7.2-1.5-.8-3.5-.4-5 .6Z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
    gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15 12h.01M18 13.5h.01"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>',
    dna: '<path d="M6 3c0 6 12 6 12 12v6M18 3c0 6-12 6-12 12v6"/><path d="M8 6h8M8 18h8M9.5 12h5"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V6a2.5 2.5 0 0 0-3-2Z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    "bell-off": '<path d="M8.7 3A6 6 0 0 1 18 8c0 2 .3 3.7.7 5M17 17H3s3-2 3-9c0-.6.1-1.2.3-1.7M10.3 21a1.9 1.9 0 0 0 3.4 0M2 2l20 20"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
    droplet: '<path d="M12 2.7 6.3 9a8 8 0 1 0 11.4 0Z"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0"/>',
  };
  function injectIcons() {
    if (document.getElementById("t1-sprite")) return;
    const symbols = Object.entries(EXTRA_ICONS)
      .map(([n, d]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`).join("");
    document.body.insertAdjacentHTML("afterbegin",
      `<svg id="t1-sprite" xmlns="${NS}" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${symbols}</svg>`);
  }
  if (document.body) injectIcons(); else document.addEventListener("DOMContentLoaded", injectIcons);

  /* ---------- ДНК ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const fmtDna = (n) => { const h = (n >>> 0).toString(16).toUpperCase().padStart(8, "0"); return h.slice(0, 4) + "-" + h.slice(4); };
  function randomDna() {
    const a = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return fmtDna(a[0]);
  }
  const dnaFromName = (name) => fmtDna(hashStr(String(name).trim().toLowerCase() + "#zrazok"));
  function normDna(s) {
    const h = String(s || "").replace(/[^0-9a-f]/gi, "").toUpperCase();
    return h.length === 8 ? h.slice(0, 4) + "-" + h.slice(4) : null;
  }
  const seedOf = (dna) => parseInt(dna.replace("-", ""), 16) >>> 0;

  function genes(dna) {
    const r = mulberry32(seedOf(dna));
    const pick = (a) => a[Math.floor(r() * a.length)];
    const color = pick(BODY_COLORS);
    const accent = pick(BODY_COLORS.filter((c) => c !== color && !(DARK.has(c) && DARK.has(color))));
    return {
      shape: pick(SHAPES), color, accent,
      eyes: pick(EYES), mouth: pick(MOUTHS), top: pick(TOPS), pattern: pick(PATTERNS),
      cheeks: r() < 0.55, arms: r() < 0.5, feet: r() < 0.45,
      w: 0.9 + r() * 0.22, h: 0.88 + r() * 0.22,
    };
  }

  /* ---------- Геометрія ---------- */
  const f1 = (n) => Math.round(n * 10) / 10;
  const pt = (p) => f1(p[0]) + "," + f1(p[1]);

  function smoothClosed(pts) {
    const n = pts.length;
    let d = "M" + pt(pts[0]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += "C" + pt(c1) + " " + pt(c2) + " " + pt(p2);
    }
    return d + "Z";
  }

  // Будує тіло: path + контур-ламана (для точок прив'язки)
  function buildBody(g, seed) {
    const r = mulberry32(seed ^ 0x9e3779b9);
    const k = { blob: [1, 1], drop: [0.98, 1.08], cube: [0.95, 0.95], crystal: [0.9, 1.05], ghost: [0.92, 1.05], bean: [1.12, 0.82] }[g.shape];
    const W = 122 * g.w * k[0], H = 110 * g.h * k[1];
    const cx = 100, B = 172, T = B - H, cy = T + H / 2;
    let d, outline;

    const ellipsePts = (n, jit) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const j = 1 + (r() - 0.5) * jit;
      return [cx + Math.cos(a) * (W / 2) * j, cy + Math.sin(a) * (H / 2) * j];
    });

    if (g.shape === "blob" || g.shape === "drop" || g.shape === "bean") {
      let pts = ellipsePts(g.shape === "blob" ? 12 : 16, g.shape === "blob" ? 0.13 : 0.05);
      if (g.shape === "drop") {
        pts = pts.map(([x, y], i) => {
          const t = Math.max(0, Math.min(1, (y - T) / H));
          return [cx + (x - cx) * (0.42 + 0.58 * Math.pow(t, 0.7)), i === 0 ? T - H * 0.07 : y];
        });
      }
      if (g.shape === "bean") {
        pts = pts.map(([x, y]) => [x, y < cy ? y + H * 0.15 * Math.exp(-Math.pow((x - cx) / (W * 0.17), 2)) : y]);
      }
      pts = pts.map(([x, y]) => [x, Math.min(y, B)]);
      d = smoothClosed(pts);
      outline = pts;
    } else if (g.shape === "cube") {
      const x0 = cx - W / 2, x1 = cx + W / 2, rr = Math.min(W, H) * 0.27, rb = rr * 0.5;
      d = `M${f1(x0 + rr)},${f1(T)}H${f1(x1 - rr)}Q${f1(x1)},${f1(T)} ${f1(x1)},${f1(T + rr)}V${f1(B - rb)}Q${f1(x1)},${f1(B)} ${f1(x1 - rb)},${f1(B)}H${f1(x0 + rb)}Q${f1(x0)},${f1(B)} ${f1(x0)},${f1(B - rb)}V${f1(T + rr)}Q${f1(x0)},${f1(T)} ${f1(x0 + rr)},${f1(T)}Z`;
      outline = [[x0 + rr, T], [x1 - rr, T], [x1 - rr * 0.3, T + rr * 0.3], [x1, T + rr], [x1, B], [x0, B], [x0, T + rr], [x0 + rr * 0.3, T + rr * 0.3]];
    } else if (g.shape === "crystal") {
      const j = () => (r() - 0.5) * 6;
      outline = [
        [cx + j(), T - 4], [cx + W * 0.33 + j(), T + H * 0.2], [cx + W / 2, T + H * 0.56 + j()], [cx + W * 0.36, B],
        [cx - W * 0.36, B], [cx - W / 2, T + H * 0.56 + j()], [cx - W * 0.33 + j(), T + H * 0.2],
      ];
      d = "M" + outline.map(pt).join("L") + "Z";
    } else { // ghost
      const x0 = cx - W / 2, x1 = cx + W / 2, ym = T + H * 0.45, ry = H * 0.45, bw = W / 3;
      d = `M${f1(x0)},${f1(B - 4)}V${f1(ym)}A${f1(W / 2)},${f1(ry)} 0 0 1 ${f1(x1)},${f1(ym)}V${f1(B - 4)}`;
      for (let i = 0; i < 3; i++) {
        const xa = x1 - bw * i, xb = xa - bw;
        d += `Q${f1(xa - bw / 2)},${f1(B + 9)} ${f1(xb)},${f1(B - 4)}`;
      }
      d += "Z";
      outline = Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI + (i / 12) * Math.PI;
        return [cx + Math.cos(a) * W / 2, ym + Math.sin(a) * ry];
      }).concat([[x1, B], [x0, B]]);
    }
    return { d, outline, W, H, T, B, cx, cy };
  }

  // Перетин ламаної з вертикаллю/горизонталлю
  function topAt(outline, x) {
    let best = Infinity;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) {
        const y = a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
        if (y < best) best = y;
      }
    }
    return best === Infinity ? null : best;
  }
  function sideAt(outline, y, dir) {
    let best = dir > 0 ? -Infinity : Infinity;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) {
        const x = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
        best = dir > 0 ? Math.max(best, x) : Math.min(best, x);
      }
    }
    return Number.isFinite(best) ? best : 100 + dir * 50;
  }

  /* ---------- Емоції ---------- */
  // lid: [зовнішній край, внутрішній край] у частках радіуса (−1.2 = повністю відкрите)
  const EMO = {
    neutral: { eye: "open", lid: [-1.2, -1.2], mouth: "neutral" },
    happy:   { eye: "happy", mouth: "open", cheeks: 1, anim: "bounce", baseAnim: "" },
    sad:     { eye: "open", lid: [-0.5, -0.95], brow: "sad", mouth: "sad", pupil: 1.12, look: [0, 0.5], anim: "droop" },
    angry:   { eye: "open", lid: [-0.9, -0.32], brow: "angry", mouth: "angry", pupil: 0.8, anim: "shake", baseAnim: "" },
    sleepy:  { eye: "closed", mouth: "small", anim: "sleep" },
    shock:   { eye: "open", lid: [-1.2, -1.2], brow: "up", mouth: "o", pupil: 0.55, anim: "jolt" },
    love:    { eye: "heart", mouth: "cat", cheeks: 1, anim: "float" },
    bored:   { eye: "open", lid: [-0.08, -0.08], mouth: "flat", look: [0.4, 0.3], anim: "sway" },
    smug:    { eye: "open", lid: [-0.22, -0.32], brow: "smug", mouth: "smirk", look: [0.5, 0], anim: "tilt-r" },
    think:   { eye: "open", lid: [-0.6, -0.6], brow: "think", mouth: "side", look: [-0.7, -0.8], anim: "tilt" },
    glitch:  { eye: "x", mouth: "zig", anim: "glitch" },
  };

  function mouthPath(kind, mw, catGene) {
    switch (kind) {
      case "neutral": return catGene
        ? { d: `M${-mw},${-1}Q${-mw / 2},${f1(mw * 0.65)} 0,${-1}Q${mw / 2},${f1(mw * 0.65)} ${mw},${-1}` }
        : { d: `M${-mw},0Q0,${f1(mw * 0.5)} ${mw},0` };
      case "open": return { d: `M${-mw},-2Q0,${f1(mw * 1.55)} ${mw},-2Z`, fill: 1, tongue: 1 };
      case "sad": return { d: `M${f1(-mw * 0.8)},${f1(mw * 0.42)}Q0,${f1(-mw * 0.38)} ${f1(mw * 0.8)},${f1(mw * 0.42)}` };
      case "angry": return { d: `M${f1(-mw * 0.9)},${f1(mw * 0.32)}Q0,${f1(-mw * 0.22)} ${f1(mw * 0.9)},${f1(mw * 0.32)}` };
      case "small": return { d: `M-3,1A3,3.6 0 1,0 3,1A3,3.6 0 1,0 -3,1Z`, fill: 1 };
      case "o": return { d: `M${f1(-mw * 0.42)},2A${f1(mw * 0.42)},${f1(mw * 0.6)} 0 1,0 ${f1(mw * 0.42)},2A${f1(mw * 0.42)},${f1(mw * 0.6)} 0 1,0 ${f1(-mw * 0.42)},2Z`, fill: 1 };
      case "cat": return { d: `M${-mw},-1Q${-mw / 2},${f1(mw * 0.7)} 0,-1Q${mw / 2},${f1(mw * 0.7)} ${mw},-1` };
      case "flat": return { d: `M${f1(-mw * 0.7)},2L${f1(mw * 0.7)},2` };
      case "smirk": return { d: `M${f1(-mw * 0.8)},${f1(mw * 0.15)}Q${f1(mw * 0.1)},${f1(mw * 0.5)} ${f1(mw * 0.9)},${f1(-mw * 0.38)}` };
      case "side": return { d: `M${f1(-mw * 0.15)},2Q${f1(mw * 0.3)},-1.5 ${f1(mw * 0.75)},3` };
      case "zig": return { d: `M${-mw},0L${f1(-mw * 0.5)},4L0,-2L${f1(mw * 0.5)},4L${mw},0` };
    }
    return { d: "" };
  }
  const FANG_Y = { neutral: 0.34, smirk: 0.12, open: -0.14 };

  const heartPath = (s) => `M0,${f1(s * 0.38)}C${f1(-s * 1.15)},${f1(-s * 0.3)} ${f1(-s * 0.5)},${f1(-s * 1.08)} 0,${f1(-s * 0.45)}C${f1(s * 0.5)},${f1(-s * 1.08)} ${f1(s * 1.15)},${f1(-s * 0.3)} 0,${f1(s * 0.38)}Z`;

  /* ---------- Частинки ---------- */
  const FX = {
    heart:    { html: '<svg class="i"><use href="#i-heart"/></svg>', cls: "fx-heart" },
    spark:    { html: '<svg class="i"><use href="#i-sparkles"/></svg>', cls: "fx-spark" },
    zzz:      { html: "Z", cls: "fx-zzz" },
    sweat:    { html: '<svg class="i"><use href="#i-droplet"/></svg>', cls: "fx-sweat" },
    note:     { html: '<svg class="i"><use href="#i-music"/></svg>', cls: "fx-note" },
    question: { html: "?", cls: "fx-mark" },
    alert:    { html: "!", cls: "fx-mark fx-alert" },
  };

  /* ---------- Спільний цикл: погляд, кліпання, дрібні рухи ---------- */
  const all = new Set();
  const mouse = { x: 0, y: 0, t: -1e9 };
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now(); }, { passive: true });
  let looping = false;
  function loop(now) {
    all.forEach((c) => c._frame(now));
    if (all.size) requestAnimationFrame(loop); else looping = false;
  }
  function startLoop() { if (!looping) { looping = true; requestAnimationFrame(loop); } }

  let uid = 0;
  const svgEl = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ==========================================================================
     Creature — одна істота в контейнері
     ========================================================================== */
  class Creature {
    constructor(host, opts = {}) {
      this.host = host;
      this.id = "pz" + ++uid;
      this.opts = Object.assign({ idle: true, follow: true, bubble: true, clickable: true }, opts);
      this.dna = normDna(opts.dna) || randomDna();
      this.over = {};          // перевизначення вигляду (setLook)
      this.size = 1;
      this.base = "neutral";   // емоція від стану
      this.temp = null;        // тимчасова емоція (emote)
      this.tempUntil = 0;
      this.sleeping = false;
      this.quiet = false;      // режим фокусу: не крутиться, дивиться на focusEl
      this.focusEl = null;
      this.parts = [];
      this.visible = true;
      this.look = { x: 0, y: 0, tx: 0, ty: 0, wanderAt: 0 };
      this.nextBlink = performance.now() + 1500 + Math.random() * 2500;
      this.nextIdle = performance.now() + 5000 + Math.random() * 6000;

      host.classList.add("pet");
      host.innerHTML = `<div class="pet-fx" aria-hidden="true"></div>
        <div class="pet-need" hidden></div>
        <div class="pet-bubble" hidden><p></p></div>`;
      this.fxEl = host.querySelector(".pet-fx");
      this.needEl = host.querySelector(".pet-need");
      this.bubbleEl = host.querySelector(".pet-bubble");

      this.build();
      if (this.opts.clickable) {
        host.addEventListener("click", (e) => {
          if (e.target.closest(".pet-bubble")) { this.hideBubble(); return; }
          if (!e.target.closest("svg")) return;
          this.squish();
          if (this.onPoke) this.onPoke(e);
        });
      }
      this.io = new IntersectionObserver((en) => { this.visible = en[0].isIntersecting; });
      this.io.observe(host);
      all.add(this);
      startLoop();
    }

    get genes() { return Object.assign(genes(this.dna), this.over); }

    /* ---------- Побудова SVG ---------- */
    build() {
      const g = this.genes;
      const P = this.id;
      const body = buildBody(g, seedOf(this.dna));
      this.geo = body;
      const col = COLORS[g.color] || g.color;
      const acc = COLORS[g.accent] || g.accent;
      const glow = g.color === "lime" ? COLORS.cyan : COLORS.lime;
      const { W, H, T, B, cx, outline } = body;

      if (this.svg) this.svg.remove();
      const svg = svgEl("svg", { viewBox: "0 0 200 200", class: "pet-svg", "aria-hidden": "true", "data-shape": g.shape });
      svg.style.setProperty("--pet-c", col);
      const defs = svgEl("defs", {}, svg);
      const clip = svgEl("clipPath", { id: P + "-body" }, defs);
      svgEl("path", { d: body.d }, clip);

      svgEl("ellipse", { class: "pet-ground", cx: 100, cy: 182, rx: f1(W * 0.42), ry: 6 }, svg);
      const move = svgEl("g", { class: "pet-move" }, svg);
      const pose = svgEl("g", { class: "pet-pose" }, move);
      const breath = svgEl("g", { class: "pet-breath" }, pose);

      svgEl("path", { class: "pet-shadow", d: body.d, transform: "translate(7 7)", fill: INK }, breath);
      const back = svgEl("g", { class: "pet-back" }, breath);
      this.backUser = svgEl("g", { class: "pet-parts-back" }, back);

      const stroke = { stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" };

      // Ніжки
      if (g.feet) {
        [-1, 1].forEach((s) => svgEl("ellipse", Object.assign({ cx: f1(cx + s * W * 0.2), cy: B + 3, rx: 13, ry: 7.5, fill: col }, stroke), back));
      }
      // Ручки
      if (g.arms) {
        const ay = T + H * 0.64;
        [-1, 1].forEach((s) => {
          const x = sideAt(outline, ay, s);
          const arm = svgEl("g", { class: "pet-arm " + (s < 0 ? "arm-l" : "arm-r"), transform: `translate(${f1(x - s * 2)} ${f1(ay)})` }, back);
          const inner = svgEl("g", { class: "pet-arm-in" }, arm);
          svgEl("ellipse", Object.assign({ cx: s * 6, cy: 4, rx: 8.5, ry: 13, transform: `rotate(${-s * 28})`, fill: col }, stroke), inner);
        });
      }
      // Верхні деталі (роги, антени, вушка…)
      const narrow = g.shape === "drop" ? 0.55 : 1;
      const topY = (dx) => (topAt(outline, cx + dx) ?? T);
      const top = svgEl("g", { class: "pet-top" }, back);
      const part = (dx, inner, rot = 0, cls = "") => {
        const y = topY(dx);
        const gg = svgEl("g", { class: "pet-tp " + cls, transform: `translate(${f1(cx + dx)} ${f1(y + 5)}) rotate(${rot})` }, top);
        gg.innerHTML = inner;
        return gg;
      };
      const st = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
      switch (g.top) {
        case "horns": [-1, 1].forEach((s) => part(s * W * 0.25 * narrow, `<path d="M${-7 * s},4Q${-9 * s},-14 ${5 * s},-25Q${2 * s},-10 ${8 * s},3Z" fill="${acc}" ${st}/>`, 0)); break;
        case "antenna": part(0, `<g class="pet-wobble"><path d="M0,2L5,-26" fill="none" ${st}/><circle cx="5.5" cy="-30" r="6.5" fill="${acc}" ${st}/></g>`); break;
        case "antennae": [-1, 1].forEach((s) => part(s * W * 0.15 * narrow, `<g class="pet-wobble"><path d="M0,2L${9 * s},-22" fill="none" ${st}/><circle cx="${10 * s}" cy="-26" r="5" fill="${acc}" ${st}/></g>`)); break;
        case "ears": [-1, 1].forEach((s) => part(s * W * 0.25 * narrow, `<path d="M${-13 * s},9L${-5 * s},-22L${13 * s},5Z" fill="${col}" ${st}/><path d="M${-6 * s},4L${-4 * s},-11L${5 * s},3Z" fill="${acc}"/>`)); break;
        case "sprout": part(0, `<g class="pet-wobble"><path d="M0,4C0,-6 2,-12 0,-20" fill="none" ${st}/><path d="M0,-18C-4,-28 -16,-27 -18,-21C-12,-14 -4,-15 0,-18Z" fill="${COLORS.lime}" ${st}/><path d="M1,-14C6,-24 17,-22 18,-16C12,-10 5,-11 1,-14Z" fill="${COLORS.green}" ${st}/></g>`); break;
        case "spikes": [[-0.2, 12], [0, 19], [0.2, 12]].forEach(([k, h]) => part(k * W * narrow, `<path d="M-9,6L0,${-h}L9,6Z" fill="${acc}" ${st}/>`)); break;
        case "crest": [-0.12, -0.04, 0.04, 0.12].forEach((k, i) => part(k * W * narrow, `<circle cx="0" cy="${-6 - (i % 2) * 3}" r="8" fill="${acc}" ${st}/>`)); break;
      }

      // Тіло
      svgEl("path", Object.assign({ class: "pet-body", d: body.d, fill: col }, stroke, { "stroke-width": 4.5 }), breath);
      // Візерунок
      const pat = svgEl("g", { "clip-path": `url(#${P}-body)` }, breath);
      const pr = mulberry32(seedOf(this.dna) ^ 0x51ed27);
      const pst = { fill: acc, stroke: INK, "stroke-width": 3 };
      if (g.pattern === "spots") {
        [[-0.33, 0.3], [0.35, 0.6], [-0.22, 0.86], [0.18, 0.1], [0.06, 0.95]].forEach(([kx, ky]) => {
          svgEl("circle", Object.assign({ cx: f1(cx + kx * W + (pr() - 0.5) * 8), cy: f1(T + ky * H + (pr() - 0.5) * 6), r: f1(5 + pr() * 6) }, pst), pat);
        });
      } else if (g.pattern === "stripes") {
        [0.8, 0.95].forEach((ky) => svgEl("rect", Object.assign({ x: 10, y: f1(T + ky * H - 5), width: 180, height: 9, transform: `rotate(-9 100 ${f1(T + ky * H)})` }, pst), pat));
      } else if (g.pattern === "belly") {
        svgEl("ellipse", { cx, cy: f1(B - H * 0.14), rx: f1(W * 0.3), ry: f1(H * 0.2), fill: COLORS.white, opacity: 0.55 }, pat);
      } else if (g.pattern === "patch") {
        svgEl("circle", Object.assign({ cx: f1(cx + W * 0.34), cy: f1(T + H * 0.18), r: f1(H * 0.27) }, pst), pat);
      }
      // Блік
      const hy = T + H * 0.3, hx = sideAt(outline, hy, -1);
      svgEl("path", { class: "pet-shine", d: `M${f1(hx + 11)},${f1(hy + 12)}Q${f1(hx + 11)},${f1(hy - 1)} ${f1(hx + 23)},${f1(hy - 7)}`, fill: "none", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.85 }, breath);
      // Копії контуру для «глюка»
      svgEl("path", { class: "pet-gl gl1", d: body.d, fill: "none", stroke: COLORS.cyan, "stroke-width": 4 }, breath);
      svgEl("path", { class: "pet-gl gl2", d: body.d, fill: "none", stroke: COLORS.pink, "stroke-width": 4 }, breath);

      // Обличчя
      const face = svgEl("g", { class: "pet-face" }, breath);
      const faceY = T + H * ({ drop: 0.6, ghost: 0.42, crystal: 0.55, bean: 0.55 }[g.shape] || 0.48);
      const R = { round: 12.5, big: 17, tiny: 7.5, cyclops: 21, triple: 10, visor: 8 }[g.eyes];
      const ex = W * (g.eyes === "tiny" ? 0.25 : g.eyes === "visor" ? 0.15 : 0.19);
      let eyes;
      if (g.eyes === "cyclops") eyes = [[cx, faceY]];
      else if (g.eyes === "triple") eyes = [[cx - ex * 1.05, faceY + 3], [cx + ex * 1.05, faceY + 3], [cx, faceY - R * 1.75]];
      else eyes = [[cx - ex, faceY], [cx + ex, faceY]];
      const visor = g.eyes === "visor";
      if (visor) {
        const vw = Math.min(W * 0.66, 92);
        svgEl("rect", { x: f1(cx - vw / 2), y: f1(faceY - 17), width: f1(vw), height: 34, rx: 14, fill: SCREEN, stroke: INK, "stroke-width": 4 }, face);
      }
      this.eyes = eyes.map(([x, y], k) => this.buildEye(face, x, y, R, k, { col, visor, glow, side: x < cx - 1 ? -1 : x > cx + 1 ? 1 : 0 }));
      this.R = R;
      // Щічки
      const mouthY = faceY + (visor ? 31 : g.eyes === "big" ? R + 15 : g.eyes === "cyclops" ? R + 13 : g.eyes === "triple" ? R + 16 : 23);
      const cheekC = g.color === "pink" || g.color === "red" ? COLORS.white : COLORS.pink;
      this.cheeks = svgEl("g", { class: "pet-cheeks" + (g.cheeks ? "" : " off") }, face);
      [-1, 1].forEach((s) => svgEl("ellipse", { cx: f1(cx + s * (Math.max(ex, 14) + (visor ? 18 : R * 0.7))), cy: f1(mouthY - 3), rx: 7.5, ry: 4.5, fill: cheekC, opacity: 0.75 }, this.cheeks));
      // Рот
      this.mw = Math.max(9, Math.min(16, W * 0.1));
      const mouth = svgEl("g", { class: "pet-mouth", transform: `translate(${cx} ${f1(mouthY)})` }, face);
      this.mouthEl = svgEl("path", { stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, mouth);
      this.tongueEl = svgEl("ellipse", { cx: 0, cy: f1(this.mw * 0.68), rx: f1(this.mw * 0.42), ry: f1(this.mw * 0.26), fill: COLORS.pink }, mouth);
      this.teethEl = svgEl("rect", { x: f1(-this.mw * 0.55), y: -2, width: f1(this.mw * 1.1), height: 4.5, fill: "#fff" }, mouth);
      this.fangEl = svgEl("path", { fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, mouth);

      this.frontUser = svgEl("g", { class: "pet-parts-front" }, breath);

      this.host.insertBefore(svg, this.host.firstChild);
      this.svg = svg;
      this.move = move; this.pose = pose; this.breathEl = breath;
      this.applySize();
      this.parts.forEach((p) => this._placePart(p));
      this.render();
      this.placeBubble();
    }

    buildEye(face, x, y, R, k, o) {
      const P = this.id;
      const g = svgEl("g", { class: "pz-eye", transform: `translate(${f1(x)} ${f1(y)})` }, face);
      const clipId = `${P}-eye${k}`;
      svgEl("circle", { r: R }, svgEl("clipPath", { id: clipId }, g));
      const open = svgEl("g", { class: "eye-open" }, g);
      const lineC = o.visor ? o.glow : INK;
      if (!o.visor) svgEl("circle", { r: R, fill: "#fff" }, open);
      const pupil = svgEl("g", { class: "eye-pupil" }, open);
      svgEl("circle", { r: f1(o.visor ? R : R * 0.52), fill: o.visor ? o.glow : INK }, pupil);
      if (!o.visor) svgEl("circle", { cx: f1(-R * 0.18), cy: f1(-R * 0.2), r: f1(Math.max(1.6, R * 0.17)), fill: "#fff" }, pupil);
      const lids = svgEl("g", { "clip-path": `url(#${clipId})` }, open);
      const lid = svgEl("path", { fill: o.visor ? SCREEN : o.col }, lids);
      const lidLine = svgEl("path", { fill: "none", stroke: o.visor ? o.glow : INK, "stroke-width": 3.5, "stroke-linecap": "round" }, lids);
      if (!o.visor) svgEl("circle", { r: R, fill: "none", stroke: INK, "stroke-width": 3.5 }, open);
      const alt = { fill: "none", stroke: lineC, "stroke-width": o.visor ? 3.5 : 4.5, "stroke-linecap": "round", "stroke-linejoin": "round" };
      svgEl("path", Object.assign({ class: "eye-happy", d: `M${f1(-R * 0.85)},${f1(R * 0.28)}Q0,${f1(-R * 1.05)} ${f1(R * 0.85)},${f1(R * 0.28)}` }, alt), g);
      svgEl("path", Object.assign({ class: "eye-closed", d: `M${f1(-R * 0.85)},${f1(-R * 0.05)}Q0,${f1(R * 0.62)} ${f1(R * 0.85)},${f1(-R * 0.05)}` }, alt), g);
      const a = f1(R * 0.55);
      svgEl("path", Object.assign({ class: "eye-x", d: `M${-a},${-a}L${a},${a}M${a},${-a}L${-a},${a}` }, alt), g);
      svgEl("path", { class: "eye-heart", d: heartPath(R * 0.95), fill: COLORS.red, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      const brow = svgEl("path", { class: "eye-brow", fill: "none", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, g);
      if (o.visor) brow.style.display = "none";
      return { g, open, pupil, lid, lidLine, brow, R, side: o.side, x, y };
    }

    /* ---------- Емоції ---------- */
    get emotion() { return this.sleeping ? "sleepy" : (this.temp && performance.now() < this.tempUntil ? this.temp : this.base); }

    render() {
      const name = this.emotion;
      if (name === this._shown && !this._dirty) return;
      const prev = this._shown;
      this._shown = name; this._dirty = false;
      const e = EMO[name] || EMO.neutral;
      const g = this.genes;
      this.svg.dataset.emo = name;
      this.svg.dataset.eye = e.eye;
      const fromBase = !this.sleeping && !(this.temp && performance.now() < this.tempUntil);
      this.svg.dataset.anim = reduced ? "" : ((fromBase && e.baseAnim != null ? e.baseAnim : e.anim) || "");
      this.cheeks.classList.toggle("hot", !!e.cheeks);

      const lid = e.lid || [-1.2, -1.2];
      this.eyes.forEach((ey) => {
        const R = ey.R, s = ey.side;
        let outer = lid[0], inner = lid[1];
        if (s === 0) outer = inner = (lid[0] + lid[1]) / 2;
        const yl = (s <= 0 ? outer : inner) * R, yr = (s <= 0 ? inner : outer) * R;
        const L = -R - 3, Rr = R + 3;
        ey.lid.setAttribute("d", `M${L},${-R - 3}H${Rr}V${f1(yr)}L${L},${f1(yl)}Z`);
        ey.lidLine.setAttribute("d", lid[0] <= -1.1 && lid[1] <= -1.1 ? "" : `M${L},${f1(yl)}L${Rr},${f1(yr)}`);
        // брови
        const by = -R - 8, si = s === 0 ? 1 : -s; // напрямок до центру обличчя
        let bd = "";
        switch (e.brow) {
          case "angry": bd = `M${f1(-si * R * 0.95)},${f1(by - 5)}L${f1(si * R * 0.55)},${f1(by + 3)}`; break;
          case "sad": bd = `M${f1(-si * R * 0.95)},${f1(by + 2)}L${f1(si * R * 0.55)},${f1(by - 6)}`; break;
          case "up": bd = `M${f1(-R * 0.8)},${f1(by - 4)}Q0,${f1(by - 11)} ${f1(R * 0.8)},${f1(by - 4)}`; break;
          case "smug": bd = s >= 0 ? `M${f1(-R * 0.8)},${f1(by - 3)}Q0,${f1(by - 10)} ${f1(R * 0.8)},${f1(by - 5)}` : `M${f1(-R * 0.8)},${f1(by + 1)}L${f1(R * 0.8)},${f1(by + 1)}`; break;
          case "think": bd = s <= 0 ? `M${f1(-R * 0.8)},${f1(by - 4)}Q0,${f1(by - 11)} ${f1(R * 0.8)},${f1(by - 4)}` : `M${f1(-R * 0.8)},${f1(by + 1)}L${f1(R * 0.8)},${f1(by)}`; break;
        }
        ey.brow.setAttribute("d", bd);
      });
      this.pupilScale = e.pupil || 1;
      this.emoLook = e.look || null;

      const m = mouthPath(e.mouth, f1(this.mw), g.mouth === "cat");
      this.mouthEl.setAttribute("d", m.d);
      this.mouthEl.setAttribute("fill", m.fill ? INK : "none");
      this.tongueEl.style.display = m.tongue ? "" : "none";
      this.teethEl.style.display = m.tongue && g.mouth === "teeth" ? "" : "none";
      const fy = FANG_Y[e.mouth];
      if (g.mouth === "fang" && fy != null) {
        const x0 = f1(this.mw * 0.28), y0 = f1(this.mw * fy);
        this.fangEl.setAttribute("d", `M${x0},${y0}l3.6,7.5l3.6,-8z`);
        this.fangEl.style.display = "";
      } else this.fangEl.style.display = "none";

      if (prev && prev !== name && !reduced) {
        if (e.anim === "jolt") this.hop(0.7);
        else this.blink();
      }
    }

    setEmotion(name) { if (EMO[name]) { this.base = name; this.render(); } }
    emote(name, ms = 2200) {
      if (!EMO[name]) return false;
      this.temp = name; this.tempUntil = performance.now() + ms;
      this.render();
      return true;
    }
    setSleeping(on) { this.sleeping = !!on; this.render(); }

    /* ---------- Рухи ---------- */
    _anim(el, frames, opts) {
      if (reduced || !el || !el.animate) return null;
      return el.animate(frames, Object.assign({ duration: 600, easing: "cubic-bezier(.34,1.7,.5,1)" }, opts));
    }
    hop(k = 1) {
      return this._anim(this.move, [
        { transform: "translateY(0) scale(1,1)" },
        { transform: "translateY(2px) scale(1.12,.88)", offset: 0.15 },
        { transform: `translateY(${-24 * k}px) scale(.94,1.08)`, offset: 0.45, easing: "ease-in" },
        { transform: "translateY(0) scale(1.1,.9)", offset: 0.75 },
        { transform: "translateY(0) scale(1,1)" },
      ], { duration: 650, easing: "ease-out" });
    }
    squish() {
      return this._anim(this.move, [
        { transform: "scale(1,1)" }, { transform: "scale(1.18,.8)", offset: 0.25 },
        { transform: "scale(.94,1.07)", offset: 0.6 }, { transform: "scale(1,1)" },
      ], { duration: 550, easing: "ease-out" });
    }
    shake() {
      return this._anim(this.move, [
        { transform: "rotate(0)" }, { transform: "rotate(-5deg)" }, { transform: "rotate(5deg)" },
        { transform: "rotate(-4deg)" }, { transform: "rotate(3deg)" }, { transform: "rotate(0)" },
      ], { duration: 450, easing: "linear" });
    }
    nod() {
      return this._anim(this.move, [
        { transform: "translateY(0)" }, { transform: "translateY(5px) scale(1.04,.96)" }, { transform: "translateY(0)" },
        { transform: "translateY(4px) scale(1.03,.97)" }, { transform: "translateY(0)" },
      ], { duration: 700, easing: "ease-in-out" });
    }
    blink() {
      this.eyes.forEach((ey) => this._anim(ey.open, [
        { transform: "scaleY(1)" }, { transform: "scaleY(.08)", offset: 0.45 }, { transform: "scaleY(1)" },
      ], { duration: 170, easing: "ease-in-out" }));
    }

    /* ---------- Частинки і репліки ---------- */
    fx(name, n = 3) {
      const def = FX[name];
      if (!def) return false;
      const hx = this.geo.cx / 2, hy = (this.geo.T / 200) * 100;
      for (let i = 0; i < n; i++) {
        const el = document.createElement("span");
        el.className = "fx " + def.cls;
        el.innerHTML = def.html;
        el.style.left = hx + (Math.random() - 0.5) * 36 + "%";
        el.style.top = hy + (Math.random() - 0.3) * 10 + "%";
        el.style.setProperty("--dx", (Math.random() - 0.5) * 50 + "px");
        el.style.setProperty("--rot", (Math.random() - 0.5) * 40 + "deg");
        el.style.animationDelay = i * 0.16 + "s";
        this.fxEl.appendChild(el);
        setTimeout(() => el.remove(), 1900 + i * 160);
      }
      return true;
    }

    placeBubble() {
      // верх голови з урахуванням масштабу (scale від точки 50% 91%)
      const top = 91 - (91 - ((this.geo.T - 8) / 200) * 100) * this.size;
      this.bubbleEl.style.bottom = 100 - top + 4 + "%";
      this.needEl.style.top = Math.max(0, (this.geo.T / 200) * 100 - 22) + "%";
    }

    say(text, opts = {}) {
      if (!this.opts.bubble) return;
      const p = this.bubbleEl.querySelector("p");
      clearTimeout(this._sayT); clearInterval(this._typeT);
      text = String(text ?? "").trim();
      if (!text && !opts.thinking) { this.hideBubble(); return; }
      this.bubbleEl.hidden = false;
      this.bubbleEl.classList.toggle("thinking", !!opts.thinking);
      this.bubbleEl.classList.remove("out");
      void this.bubbleEl.offsetWidth;
      this.bubbleEl.classList.add("in");
      if (opts.thinking) { p.innerHTML = "<i></i><i></i><i></i>"; return; }
      if (reduced) p.textContent = text;
      else {
        let i = 0;
        p.textContent = "";
        this._typeT = setInterval(() => {
          i += 2;
          p.textContent = text.slice(0, i);
          if (i >= text.length) clearInterval(this._typeT);
        }, 28);
      }
      const ms = opts.ms || Math.min(14000, 2600 + text.length * 55);
      this._sayT = setTimeout(() => this.hideBubble(), ms);
    }
    hideBubble() {
      clearTimeout(this._sayT); clearInterval(this._typeT);
      if (this.bubbleEl.hidden) return;
      this.bubbleEl.classList.remove("in");
      this.bubbleEl.classList.add("out");
      setTimeout(() => { if (this.bubbleEl.classList.contains("out")) this.bubbleEl.hidden = true; }, 220);
    }
    setNeed(icon, title) {
      if (!icon) { this.needEl.hidden = true; return; }
      this.needEl.hidden = false;
      this.needEl.title = title || "";
      this.needEl.innerHTML = `<svg class="i"><use href="#i-${icon}"/></svg>`;
    }

    /* ---------- Вигляд ---------- */
    setDna(dna) { const d = normDna(dna); if (!d) return false; this.dna = d; this._dirty = true; this.build(); return true; }
    setLook(over) {
      const ok = { shape: SHAPES, eyes: EYES, mouth: MOUTHS, top: TOPS, pattern: PATTERNS };
      const bad = [];
      Object.entries(over || {}).forEach(([k, v]) => {
        if (k === "color" || k === "accent") {
          if (COLORS[v]) this.over[k] = v; else bad.push(`${k}: "${v}"`);
        } else if (ok[k]) {
          if (ok[k].includes(v)) this.over[k] = v; else bad.push(`${k}: "${v}"`);
        } else if (k === "cheeks" || k === "arms" || k === "feet") this.over[k] = !!v;
        else bad.push(k);
      });
      this._dirty = true;
      this.build();
      return bad;
    }
    resetLook() { this.over = {}; this.size = 1; this._dirty = true; this.build(); }
    setSize(s) { this.size = Math.max(0.5, Math.min(1.25, +s || 1)); this.applySize(); this.placeBubble(); }
    applySize() { if (this.svg) this.svg.style.setProperty("--pet-size", this.size); }

    get anchors() {
      const { cx, T, B, W, H } = this.geo;
      const e = this.eyes;
      const r = (o) => ({ x: f1(o.x), y: f1(o.y) });
      return {
        head: r({ x: cx, y: (topAt(this.geo.outline, cx) ?? T) }),
        face: r({ x: cx, y: e[0].y }),
        leftEye: r(e[0]), rightEye: r(e[1] || e[0]),
        mouth: r({ x: cx, y: +this.mouthEl.parentNode.getAttribute("transform").split(" ")[1].replace(")", "") }),
        body: r({ x: cx, y: T + H * 0.62 }),
        left: r({ x: cx - W / 2, y: T + H * 0.6 }), right: r({ x: cx + W / 2, y: T + H * 0.6 }),
        feet: r({ x: cx, y: B }),
      };
    }

    addPart(svg, o = {}) {
      const p = { svg: String(svg || ""), o };
      this.parts.push(p);
      this._placePart(p);
      return p;
    }
    _placePart(p) {
      const o = p.o, a = this.anchors[o.at] || this.anchors.head;
      const x = o.x != null ? +o.x : a.x, y = o.y != null ? +o.y : a.y;
      const g = svgEl("g", { class: "pet-part", transform: `translate(${f1(x)} ${f1(y)}) rotate(${+o.rotate || 0}) scale(${+o.scale || 1})` }, o.behind ? this.backUser : this.frontUser);
      g.innerHTML = p.svg.replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, "").replace(/\son\w+\s*=/gi, " data-x=");
      p.el = g;
    }
    clearParts() { this.parts.forEach((p) => p.el && p.el.remove()); this.parts = []; }

    /* ---------- Кадр ---------- */
    _frame(now) {
      if (!this.visible || !this.svg) return;
      if (this.temp && now >= this.tempUntil) { this.temp = null; this.render(); }
      const L = this.look;
      const em = this.emotion;
      // куди дивитись
      if (this.emoLook && (em === "think" || em === "sad" || em === "smug" || em === "bored")) {
        L.tx = this.emoLook[0]; L.ty = this.emoLook[1];
      } else if (this.quiet && this.focusEl) {
        const r = this.focusEl.getBoundingClientRect(), m = this.svg.getBoundingClientRect();
        const dx = r.left + r.width * (0.35 + 0.15 * Math.sin(now / 900)) - (m.left + m.width / 2);
        const dy = r.top + r.height * 0.4 - (m.top + m.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        L.tx = (dx / d) * 0.8; L.ty = (dy / d) * 0.6;
      } else if (this.opts.follow && now - mouse.t < 2500) {
        const m = this.svg.getBoundingClientRect();
        const dx = mouse.x - (m.left + m.width / 2), dy = mouse.y - (m.top + m.height * 0.45);
        const d = Math.hypot(dx, dy);
        const k = Math.min(1, d / 260);
        L.tx = d ? (dx / d) * k : 0; L.ty = d ? (dy / d) * k : 0;
      } else if (now > L.wanderAt) {
        const a = Math.random() * Math.PI * 2, k = Math.random() < 0.4 ? 0 : 0.3 + Math.random() * 0.6;
        L.tx = Math.cos(a) * k; L.ty = Math.sin(a) * k * 0.7;
        L.wanderAt = now + 1600 + Math.random() * 2600;
      }
      L.x += (L.tx - L.x) * 0.14; L.y += (L.ty - L.y) * 0.14;
      const s = this.pupilScale || 1;
      this.eyes.forEach((ey) => {
        const m = ey.R * (this.genes.eyes === "visor" ? 0.55 : 0.38);
        ey.pupil.setAttribute("transform", `translate(${f1(L.x * m)} ${f1(L.y * m)}) scale(${s})`);
      });
      // кліпання
      if (now > this.nextBlink) {
        if (!this.sleeping && this.svg.dataset.eye === "open") this.blink();
        this.nextBlink = now + 2200 + Math.random() * 4200;
        if (Math.random() < 0.18) setTimeout(() => this.blink(), 240);
      }
      // дрібні рухи, коли нічого не відбувається
      if (now > this.nextIdle) {
        this.nextIdle = now + 7000 + Math.random() * 9000;
        if (this.opts.idle && !this.quiet && !this.sleeping && !reduced && !this.temp) {
          const roll = Math.random();
          if (em === "happy" || em === "neutral") { if (roll < 0.35) this.hop(0.5); else if (roll < 0.5) this.nod(); }
          else if (em === "bored" && roll < 0.4) this.fx("question", 1);
        }
        if (this.sleeping && Math.random() < 0.8) this.fx("zzz", 2);
      }
    }

    destroy() { all.delete(this); this.io.disconnect(); this.host.innerHTML = ""; }
  }

  window.Zrazok = {
    Creature, genes, randomDna, dnaFromName, normDna,
    EMOTIONS, SHAPES, EYES, MOUTHS, TOPS, PATTERNS, COLORS, BODY_COLORS, FX: Object.keys(FX),
  };
})();
