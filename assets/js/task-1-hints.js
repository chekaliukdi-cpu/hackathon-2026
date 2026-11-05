/* ==========================================================================
   Задача 1 — розумні підказки в редакторі лабораторії
     • p → pet, pet. → усі команди з поясненнями
     • усередині виклику — допустимі значення: емоції, події, іконки, кольори…
     • останній пункт — «ШІ: допиши на свій смак» (якщо підключено мозок)
   Працює поверх CodeMirror 5 + addon show-hint. Підключає task-1.js:
   ZrazokHints.attach(cm, ctx)
   ========================================================================== */

(function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Члени об'єктів: назва, вставка ($ — де стане курсор), опис ---------- */
  const MEMBERS = {
    pet: [
      ["say", 'say("$")', "Репліка в бульбашці", "pet.say"],
      ["speak", 'speak("$")', "Сказати вголос (голос — у вкладці «Мозок»)", "pet.speak"],
      ["stopSpeaking", "stopSpeaking()$", "Замовкнути"],
      ["emote", 'emote("$", 2000)', "Тимчасова емоція", "pet.emote"],
      ["setEmotion", 'setEmotion("$")', "Постійна емоція", "pet.setEmotion"],
      ["fx", 'fx("$", 3)', "Частинки над головою", "pet.fx"],
      ["animate", 'animate("$")', "Рух тілом", "pet.animate"],
      ["change", "change({ $ })", "Змінити показники", "pet.change"],
      ["stats", "stats.$", "Показники 0–100", "pet.stats"],
      ["addAction", 'addAction("$", "star", () => {\n\t\n})', "Кнопка під зразком", "pet.addAction"],
      ["addAction з ШІ", 'addAction("$", "sparkles", async () => {\n\tpet.emote("think", 5000);\n\tconst text = await ai.ask(`Опиши, що сталося. Мій настрій ${pet.stats.mood}`);\n\tpet.say(text);\n})', "Кнопка, на яку зразок відповідає через ШІ (async + await)"],
      ["addStat", 'addStat("$", "Назва", { value: 50, color: "lime", icon: "star", decay: 1 })', "Новий показник зі смужкою", "pet.addStat"],
      ["on", 'on("$", () => {\n\t\n})', "Підписатися на подію", "pet.on"],
      ["onTick", "onTick(() => {\n\t$\n})", "Кожні 5 секунд", "pet.on.tick"],
      ["sleep", "sleep()$", "Покласти спати", "pet.sleep"],
      ["wake", "wake()$", "Розбудити", "pet.sleep"],
      ["isSleeping", "isSleeping$", "Чи спить (true / false)", "pet.sleep"],
      ["name", "name$", "Ім'я зразка", "pet.name"],
      ["emotion", "emotion$", "Поточна емоція", "pet.emotion"],
      ["getFood", "getFood()$", "Ситість зараз (0–100)"],
      ["getEnergy", "getEnergy()$", "Енергія зараз (0–100)"],
      ["getMood", "getMood()$", "Настрій зараз (0–100)"],
      ["getStability", "getStability()$", "Стабільність зараз (0–100)"],
      ["getStat", 'getStat("$")', "Будь-який показник за назвою", "pet.getStat"],
      ["getStats", "getStats()$", "Усі показники одним об'єктом", "pet.getStats"],
      ["getEmotion", "getEmotion()$", "Поточна емоція", "pet.getEmotion"],
      ["getSleeping", "getSleeping()$", "Чи спить (true / false)", "pet.getSleeping"],
      ["getName", "getName()$", "Ім'я зразка"],
      ["getLook", "getLook()$", "Гени вигляду", "pet.getLook"],
      ["getAge", "getAge()$", "Вік у хвилинах"],
      ["getAwayMinutes", "getAwayMinutes()$", "Скільки хвилин тебе не було"],
      ["getActions", "getActions()$", "Назви твоїх кнопок", "pet.getActions"],
      ["getDna", "getDna()$", "Код ДНК"],
      ["getInfo", "getInfo()$", "Усе про зразка одним об'єктом", "pet.info"],
      ["setName", 'setName("$")', "Змінити ім'я"],
      ["setStat", 'setStat("$", 50)', "Встановити показник за назвою", "pet.getStat"],
      ["setSize", "setSize($)", "Розмір 0.5–1.25", "pet.setSize"],
      ["size", "size$", "Поточний розмір (число)", "pet.size"],
      ["getSize", "getSize()$", "Поточний розмір (число)", "pet.size"],
      ["info", "info()$", "Усе про зразка одним об'єктом", "pet.info"],
      ["setLook", "setLook({ $ })", "Змінити гени вигляду", "pet.setLook"],
      ["look", "look$", "Гени зразка", "pet.look"],
      ["addPart", "addPart('$', { at: \"head\" })", "Свій SVG-аксесуар", "pet.addPart"],
      ["clearParts", "clearParts()$", "Прибрати аксесуари", "pet.anchors"],
      ["anchors", "anchors$", "Точки прив'язки", "pet.anchors"],
      ["age", "age$", "Вік у хвилинах", "pet.age"],
      ["awayMinutes", "awayMinutes$", "Скільки тебе не було", "pet.age"],
    ],
    ai: [
      ["ask", 'ask("$")', "Запит до Gemini → текст (потрібен await)", "ai.ask"],
      ["json", 'json("$", { reply: "текст" })', "Відповідь-об'єкт (потрібен await)", "ai.json"],
      ["ready", "ready$", "Чи вставлено ключ", "ai.ready"],
    ],
    memory: [
      ["set", 'set("$", )', "Запам'ятати назавжди", "memory.set"],
      ["get", 'get("$", 0)', "Дістати збережене", "memory.get"],
      ["remove", 'remove("$")', "Видалити", "memory.all"],
      ["all", "all()$", "Усе збережене", "memory.all"],
    ],
    ui: [["box", 'box("$")', "Блок під зразком для гри / лічильника", "ui.box"]],
    Math: [
      ["random", "random()$", "Випадкове від 0 до 1"],
      ["floor", "floor($)", "Відкинути дробову частину"],
      ["round", "round($)", "Округлити"],
      ["min", "min($)", "Менше з чисел"],
      ["max", "max($)", "Більше з чисел"],
      ["abs", "abs($)", "Модуль числа"],
    ],
  };

  const GLOBALS = [
    ["pet", "pet.$", "Зразок: команди, показники, події", "pet.say"],
    ["ai", "ai.$", "Мозок: запити до Gemini", "ai.ask"],
    ["memory", "memory.$", "Пам'ять між перезаходами", "memory.set"],
    ["ui", "ui.$", "Блоки під зразком", "ui.box"],
    ["log", "log($)", "Вивести в консоль", "log"],
    ["random", "random($)", "Випадкове число: random(від, до)", "random"],
    ["randomInt", "randomInt($)", "Випадкове ціле: randomInt(від, до)", "randomInt"],
    ["pick", "pick([$])", "Випадковий елемент списку", "pick"],
    ["const", "const $ = ", "Змінна, що не змінюється", "js.vars"],
    ["let", "let $ = ", "Змінна, яку можна міняти", "js.vars"],
    ["if", "if ($) {\n\t\n}", "Умова", "js.if"],
    ["else", "else {\n\t$\n}", "Інакше", "js.if"],
    ["await", "await $", "Почекати на результат", "js.async"],
    ["async", "async () => {\n\t$\n}", "Асинхронна функція", "js.async"],
    ["try", "try {\n\t$\n} catch (e) {\n\tlog(e.message);\n}", "Спробувати без падіння", "js.trycatch"],
    ["setTimeout", "setTimeout(() => {\n\t$\n}, 1000)", "Виконати пізніше", "timers"],
    ["setInterval", "setInterval(() => {\n\t$\n}, 1000)", "Повторювати", "timers"],
    ["return", "return $", "Повернути значення з функції"],
    ["Math", "Math.$", "Математика"],
    ["new Date().getHours()", "new Date().getHours()$", "Котра година (0–23)", "js.date"],
    ["true", "true$", "Так"],
    ["false", "false$", "Ні"],
  ];

  const EMO_UA = { neutral: "спокій", happy: "радість", sad: "сум", angry: "злість", sleepy: "сон", shock: "шок", love: "закоханість", bored: "нудьга", smug: "самовдоволення", think: "роздуми", glitch: "глюк" };
  const FX_UA = { heart: "сердечка", spark: "іскри", zzz: "Z-z-z", sweat: "крапля поту", note: "ноти", question: "знак питання", alert: "знак оклику" };
  const MOVES = [["hop", "підстрибнути"], ["shake", "потрусити головою"], ["nod", "кивнути"], ["squish", "сплющитись"]];
  const EVENTS = [["tick", "кожні 5 секунд"], ["click", "тицьнули в зразка"], ["chat", "написали в чат (отримує текст)"], ["action", "натиснули будь-яку дію"], ["low", "показник упав нижче 25"], ["return", "ти повернувся (хвилини)"], ["sleep", "заснув"], ["wake", "прокинувся"]];
  const SIZES = [["0.7", "малюк"], ["1", "звичайний"], ["1.2", "великий"], ["random(0.5, 1.25)", "випадковий щоразу"]];
  const STAT_UA = { food: "ситість", energy: "енергія", mood: "настрій", stability: "стабільність" };

  /* ==========================================================================
     Змінні учня з урахуванням області видимості
     Простий сканер: блоки { }, const/let/var, параметри стрілкових і звичайних
     функцій, присвоєння без оголошення. Рядки й коментарі пропускає.
     ========================================================================== */
  const KEYWORDS = new Set("const let var function return if else for while do break continue new typeof instanceof in of await async try catch finally throw switch case default true false null undefined this class extends import export delete void yield".split(" "));

  function skipString(t, i, q) {
    for (i++; i < t.length; i++) {
      if (t[i] === "\\") { i++; continue; }
      if (t[i] === q || (t[i] === "\n" && q !== "`")) return i + 1;
    }
    return t.length;
  }
  function matchParen(t, i) { // i — на «(»; повертає індекс «)» або -1
    let d = 0;
    for (let j = i; j < t.length; j++) {
      const c = t[j];
      if (c === '"' || c === "'" || c === "`") { j = skipString(t, j, c) - 1; continue; }
      if (c === "(") d++;
      else if (c === ")" && --d === 0) return j;
    }
    return -1;
  }
  function paramNames(s) { // «a, b = 1, { c, d }» → [a, b, c, d]
    const out = [];
    let depth = 0, seg = "";
    const flush = () => {
      const m = seg.match(/^\s*(?:\.\.\.)?\s*([A-Za-z_$][\w$]*)/);
      if (m && !KEYWORDS.has(m[1])) out.push(m[1]);
      else {
        const d = seg.match(/^\s*[{[]([^}\]]*)/);
        if (d) d[1].split(",").forEach((x) => { const mm = x.match(/^\s*([A-Za-z_$][\w$]*)/); if (mm) out.push(mm[1]); });
      }
      seg = "";
    };
    for (const ch of s) {
      if ("([{".includes(ch)) depth++;
      if (")]}".includes(ch)) depth--;
      if (ch === "," && depth === 0) flush(); else seg += ch;
    }
    flush();
    return out;
  }

  // Повертає { scopes: [Map ...] (зовнішня → внутрішня), pending: [...] } на момент кінця тексту
  function scanScopes(text) {
    const scopes = [new Map()];
    let pending = [];
    let fnParams = false;
    const add = (name, info) => { if (!KEYWORDS.has(name) && !scopes[scopes.length - 1].has(name)) scopes[scopes.length - 1].set(name, info); };
    const declared = (name) => scopes.some((s) => s.has(name)) || pending.includes(name);
    const n = text.length;
    let i = 0;
    while (i < n) {
      const c = text[i];
      if (c === "/" && text[i + 1] === "/") { const e = text.indexOf("\n", i); if (e < 0) break; i = e; continue; }
      if (c === "/" && text[i + 1] === "*") { const e = text.indexOf("*/", i + 2); if (e < 0) break; i = e + 2; continue; }
      if (c === '"' || c === "'" || c === "`") { i = skipString(text, i, c); continue; }
      if (c === "{") { scopes.push(new Map(pending.map((p) => [p, { kind: "param" }]))); pending = []; i++; continue; }
      if (c === "}") { if (scopes.length > 1) scopes.pop(); i++; continue; }
      if (c === ";") { pending = []; i++; continue; }
      if (c === "(") {
        const e = matchParen(text, i);
        const inside = e > 0 ? text.slice(i + 1, e) : text.slice(i + 1);
        const after = e > 0 ? text.slice(e + 1, e + 6) : "";
        if (fnParams || /^\s*=>/.test(after)) {
          pending = paramNames(inside);
          fnParams = false;
        }
        i++; continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w$]/.test(text[j])) j++;
        const w = text.slice(i, j);
        const prev = text.slice(0, i).replace(/\s+$/, "").slice(-1);
        if (prev === ".") { i = j; continue; } // властивість, не змінна
        if (w === "const" || w === "let" || w === "var") {
          const rest = text.slice(j);
          const m = rest.match(/^\s*([A-Za-z_$][\w$]*)\s*(=\s*([^;\n]{0,28}))?/);
          if (m) add(m[1], { kind: w, init: m[3] ? m[3].trim() : "" });
          else {
            const d = rest.match(/^\s*[{[]([^}\]]*)[}\]]/); // const { a, b } = …
            if (d) paramNames(d[1]).forEach((p) => add(p, { kind: w }));
          }
          i = j; continue;
        }
        if (w === "function") {
          const m = text.slice(j).match(/^\s*([A-Za-z_$][\w$]*)/);
          if (m) add(m[1], { kind: "function" });
          fnParams = true;
          i = j; continue;
        }
        if (w === "catch") { fnParams = true; i = j; continue; }
        if (!KEYWORDS.has(w)) {
          const after = text.slice(j);
          if (/^\s*=>/.test(after)) pending = [w]; // x => …
          else if (/^\s*=(?![=>])/.test(after) && /^$|[;{}\n]/.test(prev) && !declared(w)) {
            const m = after.match(/^\s*=\s*([^;\n]{0,28})/);
            scopes[0].set(w, { kind: "global", init: m ? m[1].trim() : "" }); // присвоєння без const
          }
        }
        i = j; continue;
      }
      i++;
    }
    return { scopes, pending };
  }

  const KIND_UA = { const: "змінна · const", let: "змінна · let", var: "змінна · var", param: "параметр функції", function: "функція", global: "змінна без const — краще додай const" };
  function visibleVars(cm, ctx) {
    const cur = cm.getCursor();
    const all = cm.getValue();
    const idx = cm.indexFromPos(cur);
    const before = scanScopes(all.slice(0, idx));
    const out = new Map();
    before.pending.forEach((p) => out.set(p, { kind: "param" }));
    for (let k = before.scopes.length - 1; k >= 0; k--) before.scopes[k].forEach((v, name) => { if (!out.has(name)) out.set(name, v); });
    // зсередини функції видно й ті змінні верхнього рівня, що оголошені нижче
    if (before.scopes.length > 1) {
      scanScopes(all).scopes[0].forEach((v, name) => { if (!out.has(name)) out.set(name, v); });
    }
    // змінні й функції верхнього рівня з інших файлів (вони виконуються разом)
    if (ctx && ctx.otherCode) {
      scanScopes(ctx.otherCode()).scopes[0].forEach((v, name) => { if (!out.has(name)) out.set(name, Object.assign({ other: true }, v)); });
    }
    return out;
  }

  /* ==========================================================================
     attach(cm, ctx) — ctx: { docs, emotions, fx, icons(), colors, stats(), genes, aiReady(), aiComplete(before, after) }
     ========================================================================== */
  function attach(cm, ctx) {
    if (!window.CodeMirror || !CodeMirror.showHint) return;
    const Pos = CodeMirror.Pos;

    const item = (o) => Object.assign({ className: "lh-item" + (o.kind ? " lh-" + o.kind : "") }, o, {
      render(el, self, d) {
        el.innerHTML = `${d.icon ? `<svg class="i lh-ico" aria-hidden="true"><use href="#i-${esc(d.icon)}"/></svg>` : ""}${d.swatch ? `<i class="lh-sw" style="background:${esc(d.swatch)}"></i>` : ""}<b>${esc(d.label)}</b>${d.desc ? `<span>${esc(d.desc)}</span>` : ""}`;
      },
      hint(cm, data, c) { insert(cm, data.from, data.to, c.snip, c.again); },
    });

    // вставка з $ (курсор) і \t (відступ поточного рядка + 2 пробіли)
    function insert(cm, from, to, snip, again) {
      const indent = (cm.getLine(from.line).match(/^\s*/) || [""])[0];
      let text = snip.replace(/\n/g, "\n" + indent).replace(/\t/g, "  ");
      const at = text.indexOf("$");
      text = text.replace("$", "");
      cm.replaceRange(text, from, to, "complete");
      if (at >= 0) {
        const before = text.slice(0, at).split("\n");
        const line = from.line + before.length - 1;
        const ch = (before.length === 1 ? from.ch : 0) + before[before.length - 1].length;
        cm.setCursor(Pos(line, ch));
      }
      if (again !== false) setTimeout(() => open(cm), 30);
    }

    const filter = (list, word) => {
      const w = word.toLowerCase();
      if (!w) return list;
      const starts = list.filter((x) => x.label.toLowerCase().startsWith(w));
      const has = list.filter((x) => !x.label.toLowerCase().startsWith(w) && x.label.toLowerCase().includes(w));
      return starts.concat(has);
    };
    const docDesc = (id, fallback) => (id && ctx.docs[id] ? ctx.docs[id].desc : fallback);

    const aiItem = (from, to) => item({
      label: "ШІ: допиши на свій смак", desc: "Gemini допише цей вираз", kind: "ai", icon: "sparkles",
      hint(cm) { ctx.aiComplete(cm, from, to); },
    });

    function values(list, word, from, to, kind, withAi) {
      let out = filter(list.map((v) => item(Object.assign({ kind }, v, { snip: v.snip || v.label, again: false }))), word);
      if (withAi && ctx.aiReady()) out = out.concat(aiItem(from, to));
      return out;
    }

    function labHint(cm) {
      const cur = cm.getCursor();
      const tok = cm.getTokenAt(cur);
      if (tok.type && /comment/.test(tok.type)) return null;
      const before = cm.getLine(cur.line).slice(0, cur.ch);
      const range = (len) => ({ from: Pos(cur.line, cur.ch - len), to: cur });
      let m;
      const res = (list, len) => (list.length ? Object.assign({ list }, range(len)) : null);

      // 1. значення в лапках усередині відомих викликів
      if ((m = before.match(/pet\.(emote|setEmotion)\(\s*["']([\w]*)$/))) {
        const r = range(m[2].length);
        return res(values(ctx.emotions.map((e) => ({ label: e, desc: EMO_UA[e] })), m[2], r.from, r.to, "val", true), m[2].length);
      }
      if ((m = before.match(/pet\.(?:getStat|setStat)\(\s*["']([\w]*)$/))) {
        return res(values(ctx.stats().map((s) => ({ label: s, desc: STAT_UA[s] || "твій показник" })), m[1], null, null, "val"), m[1].length);
      }
      if ((m = before.match(/pet\.fx\(\s*["']([\w]*)$/))) return res(values(ctx.fx.map((f) => ({ label: f, desc: FX_UA[f] })), m[1], null, null, "val"), m[1].length);
      if ((m = before.match(/pet\.animate\(\s*["']([\w]*)$/))) return res(values(MOVES.map(([l, d]) => ({ label: l, desc: d })), m[1], null, null, "val"), m[1].length);
      if ((m = before.match(/pet\.on\(\s*["']([\w]*)$/))) return res(values(EVENTS.map(([l, d]) => ({ label: l, desc: d })), m[1], null, null, "val"), m[1].length);
      if ((m = before.match(/(?:addAction\(\s*["'][^"']*["']\s*,\s*|icon:\s*)["']([\w-]*)$/))) {
        return res(values(ctx.icons().map((n) => ({ label: n, icon: n })), m[1], null, null, "icon"), m[1].length);
      }
      if ((m = before.match(/(?:color|accent):\s*["']([\w]*)$/))) {
        return res(values(Object.keys(ctx.colors).map((c) => ({ label: c, swatch: ctx.colors[c] })), m[1], null, null, "val"), m[1].length);
      }
      if ((m = before.match(/(shape|eyes|mouth|top|pattern):\s*["']([\w]*)$/))) {
        return res(values(ctx.genes[m[1]].map((g) => ({ label: g })), m[2], null, null, "val"), m[2].length);
      }
      if ((m = before.match(/at:\s*["']([\w]*)$/))) {
        return res(values(["head", "face", "leftEye", "rightEye", "mouth", "body", "left", "right", "feet"].map((g) => ({ label: g })), m[1], null, null, "val"), m[1].length);
      }
      if ((m = before.match(/pet\.(say|addAction)\(\s*["']([^"']*)$/))) {
        if (!ctx.aiReady()) return null;
        const r = range(m[2].length);
        return { list: [aiItem(r.from, r.to)], from: r.from, to: r.to };
      }
      if (/["'`][^"'`]*$/.test(before) && (before.match(/["'`]/g) || []).length % 2 === 1) return null; // усередині іншого рядка

      // 2. числа для setSize
      if ((m = before.match(/pet\.setSize\(\s*([\w.]*)$/))) {
        const r = range(m[1].length);
        return res(values(SIZES.map(([l, d]) => ({ label: l, desc: d })), m[1], r.from, r.to, "val", true), m[1].length);
      }
      // 3. ключі показників у pet.change({ … })
      if ((m = before.match(/pet\.change\(\{(?:[^}]*,)?\s*(\w*)$/))) {
        const r = range(m[1].length);
        const list = ctx.stats().map((s) => ({ label: s, snip: s + ": 10", desc: STAT_UA[s] || "твій показник" }));
        return res(values(list, m[1], r.from, r.to, "val", true), m[1].length);
      }
      // 4. pet.stats.
      if ((m = before.match(/pet\.stats\.(\w*)$/))) {
        return res(values(ctx.stats().map((s) => ({ label: s, desc: STAT_UA[s] || "твій показник" })), m[1], null, null, "val"), m[1].length);
      }
      // 5. члени об'єктів: pet. ai. memory. ui. Math.
      if ((m = before.match(/\b(pet|ai|memory|ui|Math)\.(\w*)$/))) {
        const list = MEMBERS[m[1]].map(([label, snip, desc, doc]) => item({ label, snip, desc: docDesc(doc, desc) || desc, kind: "member", again: /\$\)|"\$"|\.\$|\{ \$ \}/.test(snip) }));
        return res(filter(list, m[2]), m[2].length);
      }
      // 6. назви з першої літери: спершу твої змінні (тільки ті, що видно тут), потім готові
      if (/(const|let|var|function)\s+[\w$]*$/.test(before)) return null; // оголошуєш нову назву
      if ((m = before.match(/(?:^|[^\w.$])([A-Za-z_$][\w$]*)$/))) {
        const word = m[1];
        const vars = [...visibleVars(cm, ctx)].filter(([name]) => name !== word).map(([name, v]) => item({
          label: name, snip: name + "$", kind: "var", icon: v.kind === "function" ? "code" : v.kind === "param" ? "arrow" : "package",
          desc: KIND_UA[v.kind] + (v.init ? " = " + v.init : "") + (v.other ? " · з іншого файлу" : ""), again: false,
        }));
        const names = new Set(vars.map((x) => x.label));
        const list = GLOBALS.filter(([label]) => !names.has(label)).map(([label, snip, desc, doc]) => item({ label, snip, desc: docDesc(doc, desc) || desc, kind: "global", again: /\.\$/.test(snip) }));
        const out = filter(vars, word).concat(filter(list, word).filter((x) => x.label !== word));
        return res(out, word.length);
      }
      return null;
    }

    function open(cm) {
      cm.showHint({ hint: labHint, completeSingle: false, closeCharacters: /[\s()[\]{};>,]/, container: document.body });
    }

    cm.on("inputRead", (cm, ch) => {
      if (ch.origin !== "+input") return;
      const t = ch.text.join("");
      if (/^[\w.("'{ ,:]$/.test(t) && !(cm.state.completionActive && /\w/.test(t))) open(cm);
    });
    // лапки й дужки вставляє addon closebrackets — inputRead на них не спрацьовує
    cm.on("keyup", (cm, e) => {
      if (/^["'(]$/.test(e.key) && !cm.state.completionActive) open(cm);
    });
    cm.addKeyMap({ "Ctrl-Space": (cm) => open(cm) });
  }

  window.ZrazokHints = { attach };
})();
