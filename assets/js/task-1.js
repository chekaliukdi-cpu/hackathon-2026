/* ==========================================================================
   Задача 1 — ШІ-зразок: двигун, мозок, лабораторія, квест
     • двигун зразка: показники, сон, події, дії, тихий режим
     • мозок: запити до Gemini прямо з браузера (ключ учня в localStorage)
     • лабораторія: редактор коду (CodeMirror), запуск коду учня, консоль
     • квест з авто-перевіркою і підказками, довідник API, шпаргалка для Claude
     • живий зразок у hero, сітка емоцій, картки словника
   Тіло істоти (SVG, емоції, анімації) — у task-1-pet.js
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ico = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const noEmoji = (s) => String(s).replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, "").replace(/\s{2,}/g, " ").trim();

  const LS = {
    state: "hk26-t1-pet", key: "hk26-t1-key", code: "hk26-t1-code", quest: "hk26-t1-quest",
    usage: "hk26-t1-usage", guard: "hk26-t1-guard", memory: "hk26-t1-memory", chat: "hk26-t1-chat", files: "hk26-t1-files",
  };
  const load = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
  /* ---------- Синхронізація між вкладками ----------
     Одна вкладка — «головна»: тільки вона рахує час (голод, енергія, tick, setInterval).
     Решта отримують стан, код, чат, квест, пам'ять і репліки через BroadcastChannel. */
  const sync = {
    ch: "BroadcastChannel" in window ? new BroadcastChannel("hk26-t1") : null,
    remote: false,
    send(m) { if (this.ch && !this.remote) { try { this.ch.postMessage(m); } catch (e) { /* ignore */ } } },
  };
  let isLeader = true;
  if (sync.ch && navigator.locks) {
    isLeader = false;
    navigator.locks.request("hk26-t1-leader", () => { isLeader = true; return new Promise(() => {}); });
  }
  const SYNC_KEYS = new Set(["hk26-t1-pet", "hk26-t1-key", "hk26-t1-code", "hk26-t1-files", "hk26-t1-quest", "hk26-t1-memory", "hk26-t1-chat", "hk26-t1-usage"]);
  const save = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватний режим */ }
    if (SYNC_KEYS.has(k)) sync.send({ t: "ls", k, v }); // значення — прямо в повідомленні: localStorage між вкладками оновлюється з запізненням
  };
  const drop = (k) => {
    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    if (SYNC_KEYS.has(k)) sync.send({ t: "ls", k, v: null });
  };

  /* ==========================================================================
     ДАНІ
     ========================================================================== */
  const TICK_MS = 5000;
  const BASE_STATS = [
    { id: "food",      label: "Ситість",      icon: "apple",   color: "orange", decay: 2 },
    { id: "energy",    label: "Енергія",      icon: "battery", color: "yellow", decay: 1.5 },
    { id: "mood",      label: "Настрій",      icon: "heart",   color: "pink",   decay: 1.2 },
    { id: "stability", label: "Стабільність", icon: "cpu",     color: "cyan",   decay: 0 },
  ];
  const MODELS = [
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (радимо)", think: "MINIMAL" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (запасна)" },
    { id: "gemini-3.8-flash",      label: "Gemini 3.8 Flash (розумніша, ~20 запитів на день)", think: "LOW" },
  ];
  const DEFAULT_CHAR = "Ти трохи саркастичний, але добрий. Говориш просто і коротко, як підліток.";
  const PRESETS = [
    { name: "Втомлений геймер", text: "Ти втомлений геймер, який не спав три дні. Говориш ліниво, жартуєш про лаги, респавн і донат." },
    { name: "Драматичний поет", text: "Ти драматичний поет. Кожна дрібниця для тебе — трагедія або тріумф, і ти говориш піднесено." },
    { name: "Суворий тренер",   text: "Ти суворий, але справедливий тренер. Говориш коротко, наказами, не даєш розкисати." },
    { name: "Філософ о 3 ночі", text: "Ти філософ, який о третій ночі думає про сенс буття. Часто відповідаєш питанням на питання." },
    { name: "Тривожний стажер", text: "Ти тривожний стажер у лабораторії. Постійно перепрошуєш і боїшся щось зламати." },
  ];
  const LINES = {
    food: ["Я б щось з'їв. Байти, наприклад.", "Ситість падає. Просто кажу."],
    energy: ["Мої процеси сповільнюються…", "Може, мені трохи поспати?"],
    mood: ["Нудно. Тицьни в мене чи що.", "Хтось тут узагалі є?"],
    ok: ["Цікаво, що ти там пишеш.", "Я тут, якщо що.", "Мене склали з JavaScript. Це пояснює характер.", "Я придумав жарт, але він ще компілюється."],
    nobrain: ["Без мозку я тільки кліпаю. Ключ — у вкладці «Мозок».", "Мені б мозок. Gemini підійде."],
  };
  const STARTER = `// ЛАБОРАТОРІЯ ЗРАЗКА
// Тут твій код. Запуск — кнопка «Запустити» або Ctrl+Enter.
// Кожен запуск починає з чистого аркуша: старі кнопки й події з коду зникають.
// Усі команди — у вкладці «Довідник». Код зберігається сам.
// Хочеш розкласти код по файлах? Кнопка «+ Файл» над редактором.

log("Код запущено. Зразка звати", pet.name);
log("Його стан:", pet.stats);

pet.emote("think", 1500);
`;

  /* ---------- Довідник (з нього ж будується шпаргалка для Claude) ----------
     id — для посилань із квестів: {pet.addAction} або {js.functions|функція}.
     more — пояснення простими словами, ex — приклад, see — пов'язані команди. */
  const EMO_LIST = "neutral, happy, sad, angry, sleepy, shock, love, bored, smug, think, glitch";
  const DOCS = [
    { title: "Основи JavaScript", icon: "code", basics: true, items: [
      { id: "js.comment", sig: "// коментар", desc: "Нотатка в коді, яку комп'ютер пропускає.",
        more: "Усе після // до кінця рядка — для людей. Пиши коментарі, щоб за годину пам'ятати, що робить код.",
        ex: `// ця кнопка годує зразка цукеркою\nlog("коментарі не виконуються");` },
      { id: "js.vars", sig: "const / let", desc: "Змінна — коробка з назвою, куди кладеш значення.",
        more: "const — значення не зміниться. let — можна змінювати. Назву вигадуєш сам (латиницею, без пробілів). Потім звертаєшся до значення за назвою.",
        ex: `const name = "Бублик";   // текст\nlet clicks = 0;          // число\nclicks = clicks + 1;     // тепер 1\nlog(name, clicks);`, see: ["js.strings", "js.numbers"] },
      { id: "js.strings", sig: "\"текст\" і `привіт, ${name}`", desc: "Рядок — це текст у лапках.",
        more: "Звичайні лапки \"…\" — просто текст, ${…} у них НЕ спрацює. Зворотні лапки `…` (бектик, клавіша під Esc, там де Ё / ~) дозволяють вставити змінну або число через ${…}. У редакторі вставка ${…} підсвічується іншим кольором — так видно, що вона працює.",
        ex: "const food = pet.stats.food;\npet.say(`Моя ситість: ${food}`);", see: ["js.vars"] },
      { id: "js.numbers", sig: "+ − * /, Math.random()", desc: "Числа і математика.",
        more: "Звичайні дії: + − * /. Для випадкових чисел найпростіше — готові random(від, до) і randomInt(від, до) з розділу «Корисні функції». Math.random() дає випадкове число від 0 до 1. Math.floor() відкидає дробову частину. Math.max(a, b) і Math.min(a, b) — більше й менше з двох.",
        ex: "const dice = Math.floor(Math.random() * 6) + 1; // від 1 до 6\nlog(\"Випало\", dice);\nconst safe = Math.min(100, Math.max(0, 150)); // 100 — «обрізали» до меж", see: ["js.if"] },
      { id: "js.objects", sig: "{ ключ: значення }", desc: "Об'єкт — набір підписаних значень.",
        more: "У фігурних дужках пари «назва: значення» через кому. Дістати значення — через крапку: obj.mood. Саме так влаштовані pet.stats і те, що передаєш у pet.change.",
        ex: "const changes = { mood: 10, food: -5 };\nlog(changes.mood);   // 10\npet.change(changes);", see: ["pet.change", "pet.stats"] },
      { id: "js.arrays", sig: "[ a, b, c ]", desc: "Масив — список значень.",
        more: "Елементи в квадратних дужках через кому. list.includes(x) перевіряє, чи є x у списку. list[0] — перший елемент.",
        ex: "const moods = [\"happy\", \"smug\", \"love\"];\nconst pick = moods[Math.floor(Math.random() * moods.length)];\npet.emote(pick);", see: ["js.numbers"] },
      { id: "js.functions", sig: "() => { … }", desc: "Функція — код, який виконається пізніше, коли його викличуть.",
        more: "Стрілка => означає «ось що зробити». Код у фігурних дужках не виконується одразу — тільки коли функцію викличуть. Тому команди на кшталт pet.addAction чи pet.on просять саме функцію: «коли натиснуть / коли станеться — зроби це». Якщо функція щось отримує (наприклад, текст повідомлення), це пишуть у дужках: (text) => { … }.",
        ex: "const greet = () => {\n  pet.say(\"Привіт!\");\n};\n\ngreet();          // виклик: зразок скаже «Привіт!»\n\nconst echo = (text) => pet.say(text);\necho(\"Луна\");", see: ["pet.addAction", "pet.on"] },
      { id: "js.if", sig: "if (умова) { … } else { … }", desc: "Умова: зробити щось, тільки якщо це правда.",
        more: "Порівняння: < менше, > більше, === дорівнює, !== не дорівнює. Об'єднати умови: && (і), || (або). Блок else виконується, коли умова хибна.",
        ex: "if (pet.stats.food < 30) {\n  pet.say(\"Я голодний\");\n} else if (pet.stats.mood > 80) {\n  pet.emote(\"happy\");\n} else {\n  pet.emote(\"bored\");\n}", see: ["pet.stats"] },
      { id: "js.async", sig: "async / await", desc: "Почекати на результат, який приходить не одразу.",
        more: "Запит до ШІ триває 1–3 секунди. Слово await перед ним каже: «зачекай на відповідь, потім іди далі». await можна писати тільки всередині функції, позначеної async (або просто в коді лабораторії на верхньому рівні).",
        ex: "pet.addAction(\"Питання\", \"message\", async () => {\n  pet.emote(\"think\", 5000);\n  const answer = await ai.ask(\"Скажи щось мудре\");\n  pet.say(answer);\n});", see: ["ai.ask", "js.functions"] },
      { id: "js.trycatch", sig: "try { … } catch (e) { … }", desc: "Спробувати і не впасти, якщо сталася помилка.",
        more: "Код у try виконується як звичайно. Якщо там помилка (наприклад, ШІ не відповів), програма не ламається, а переходить у catch. e.message — текст помилки.",
        ex: "try {\n  const text = await ai.ask(\"Привіт\");\n  pet.say(text);\n} catch (e) {\n  pet.emote(\"glitch\");\n  log(\"Не вийшло:\", e.message);\n}", see: ["js.async"] },
      { id: "js.date", sig: "new Date().getHours()", desc: "Котра зараз година.",
        more: "new Date() — поточні дата й час. .getHours() — година від 0 до 23, .getMinutes() — хвилини, .getDay() — день тижня (0 — неділя).",
        ex: "const hour = new Date().getHours();\nif (hour >= 22 || hour < 7) pet.say(\"Ніч надворі. Чому ти не спиш?\");", see: ["js.if", "pet.on.return"] },
    ] },
    { title: "Зразок", icon: "bot", items: [
      { id: "pet.name", sig: "pet.name", desc: "Ім'я зразка. Можна прочитати або змінити.", ex: "log(pet.name);\npet.name = \"Бублик\";" },
      { id: "pet.say", sig: "pet.say(текст)", desc: "Репліка в бульбашці над зразком (і в чаті).",
        more: "Текст — у лапках або змінна. Довгі репліки обрізаються в бульбашці, повністю — у вкладці «Чат». Сплячий зразок не говорить.",
        ex: "pet.say(\"Хто тут?\");\npet.say(`Мене звати ${pet.name}`);", see: ["js.strings", "pet.emote"] },
      { id: "pet.speak", sig: "pet.speak(текст)", desc: "Сказати вголос (озвучка). pet.stopSpeaking() — замовкнути.",
        more: "Голос обирається у вкладці «Мозок». За замовчуванням: у Edge — природні Поліна чи Остап, в інших браузерах і на телефоні — нейромережевий голос Piper (Лада, Микита чи Тетяна), який працює прямо в браузері. Перший раз Piper завантажує ~77 МБ, далі — з кешу. Звук браузер дозволяє лише після першого кліку на сторінці.",
        ex: "pet.addAction(\"Привітатись\", \"volume\", async () => {\n  pet.say(\"Привіт!\");\n  await pet.speak(\"Привіт!\"); // чекаємо, поки договорить\n  pet.emote(\"happy\");\n});", see: ["pet.say"] },
      { id: "pet.emote", sig: "pet.emote(емоція, мс)", desc: "Тимчасова емоція на обличчі.",
        more: `Перше — назва емоції в лапках, друге — скільки мілісекунд її тримати (1000 мс = 1 секунда, за замовчуванням 2 с). Емоції: ${EMO_LIST}. Усі їх можна подивитись на сторінці вище, у розділі «Як влаштований».`,
        ex: "pet.emote(\"shock\", 1000);", see: ["pet.setEmotion", "pet.fx"] },
      { id: "pet.setEmotion", sig: "pet.setEmotion(емоція)", desc: "Постійна емоція — вимикає автоматичні емоції від стану.",
        more: "Зазвичай зразок сам обирає емоцію за показниками (голодний — злий). setEmotion бере керування на себе. pet.setEmotion(null) повертає автоматику.",
        ex: "pet.setEmotion(\"smug\");\n// пізніше:\npet.setEmotion(null);", see: ["pet.emote"] },
      { id: "pet.emotion", sig: "pet.emotion", desc: "Поточна емоція (текст), наприклад \"happy\".", ex: "if (pet.emotion === \"sad\") pet.say(\"Обійми мене\");" },
      { id: "pet.info", sig: "pet.info()", desc: "Усе про зразка одним об'єктом: ім'я, розмір, емоція, сон, показники, вигляд, вік.",
        more: "Зручно, щоб подивитись стан у консолі або передати його в запит до ШІ.",
        ex: "log(pet.info());\nconst i = pet.info();\npet.say(`Я ${i.name}, мій настрій ${i.stats.mood}`);", see: ["pet.stats", "pet.size"] },
      { id: "pet.fx", sig: "pet.fx(назва, кількість)", desc: "Частинки над головою.",
        more: "Назви: heart, spark, zzz, sweat, note, question, alert. Кількість — скільки штук (за замовчуванням 3).", ex: "pet.fx(\"heart\", 5);" },
      { id: "pet.animate", sig: "pet.animate(рух)", desc: "Рух тілом: hop, shake, nod, squish.",
        more: "hop — підстрибнути, shake — потрусити головою, nod — кивнути, squish — сплющитись.", ex: "pet.animate(\"hop\");" },
      { id: "pet.sleep", sig: "pet.sleep() / pet.wake()", desc: "Покласти спати / розбудити. pet.isSleeping — чи спить.",
        more: "Уві сні енергія швидко відновлюється, а ситість падає повільніше. Кнопка «Спати» робить те саме.", ex: "if (pet.stats.energy < 10) pet.sleep();" },
    ] },
    { title: "Дізнатися стан (get)", icon: "search", items: [
      { id: "pet.get", sig: "pet.getFood() / getEnergy() / getMood() / getStability()", desc: "Поточне значення показника (число 0–100).",
        more: "get-методи нічого не змінюють — тільки дізнаються. Результат можна зберегти в змінну, порівняти в if або вставити в текст через ${…}.",
        ex: "const food = pet.getFood();\nif (food < 30) pet.say(`Я голодний, ситість лише ${food}`);", see: ["pet.getStat", "js.if"] },
      { id: "pet.getStat", sig: "pet.getStat(id) / pet.setStat(id, число)", desc: "Будь-який показник за назвою — і вбудований, і твій.",
        ex: "pet.addStat(\"coffee\", \"Кава\");\npet.setStat(\"coffee\", 80);\nlog(pet.getStat(\"coffee\"));", see: ["pet.addStat"] },
      { id: "pet.getStats", sig: "pet.getStats()", desc: "Усі показники одним об'єктом: { food: 80, energy: 70, … }.", ex: "log(pet.getStats());" },
      { id: "pet.getEmotion", sig: "pet.getEmotion()", desc: "Поточна емоція (текст), наприклад \"happy\".", ex: "if (pet.getEmotion() === \"sad\") pet.fx(\"heart\");", see: ["pet.emote"] },
      { id: "pet.getSize", sig: "pet.getSize()", desc: "Поточний розмір (1 — звичайний).", ex: "const old = pet.getSize();\npet.setSize(old + 0.1);", see: ["pet.setSize"] },
      { id: "pet.getSleeping", sig: "pet.getSleeping()", desc: "Чи спить зараз (true / false).", ex: "if (pet.getSleeping()) pet.wake();", see: ["pet.sleep"] },
      { id: "pet.getName", sig: "pet.getName() / pet.setName(текст)", desc: "Ім'я зразка: дізнатися / змінити.", ex: "pet.say(`Мене звати ${pet.getName()}`);" },
      { id: "pet.getLook", sig: "pet.getLook()", desc: "Гени вигляду: shape, color, eyes, top, pattern…", ex: "if (pet.getLook().top === \"horns\") pet.say(\"Обережно, роги!\");", see: ["pet.setLook"] },
      { id: "pet.getAge", sig: "pet.getAge() / pet.getAwayMinutes()", desc: "Скільки хвилин зразку / скільки хвилин тебе не було перед цим візитом.", ex: "log(\"Зразку\", pet.getAge(), \"хв\");" },
      { id: "pet.getActions", sig: "pet.getActions()", desc: "Назви твоїх кнопок-дій (масив).", ex: "log(pet.getActions());" },
      { id: "pet.getDna", sig: "pet.getDna() / pet.getInfo()", desc: "Код ДНК / усе про зразка одним об'єктом.", ex: "log(pet.getInfo());", see: ["pet.info"] },
    ] },
    { title: "Показники", icon: "signal", items: [
      { id: "pet.stats", sig: "pet.stats.food / energy / mood / stability", desc: "Числа 0–100: ситість, енергія, настрій, стабільність.",
        more: "Можна читати (pet.stats.mood) і присвоювати (pet.stats.mood = 50). Значення завжди обрізаються до 0–100. Стабільність падає, коли зразка довго не доглядати — тоді він «глючить».",
        ex: "log(pet.stats.food);\npet.stats.mood = pet.stats.mood + 10;", see: ["pet.change", "js.objects"] },
      { id: "pet.change", sig: "pet.change({ mood: 10, food: -5 })", desc: "Змінити кілька показників одразу (з анімацією +/−).",
        more: "Передаєш об'єкт: назва показника і на скільки змінити. Плюс — додати, мінус — відняти. Біля смужки з'явиться +10 чи −5.",
        ex: "pet.change({ food: 20, energy: -5 });", see: ["pet.stats", "js.objects"] },
      { id: "pet.addStat", sig: "pet.addStat(id, назва, опції)", desc: "Новий показник зі своєю смужкою.",
        more: "id — коротке слово латиницею (через нього звертаєшся: pet.stats.coffee). Назва — текст біля смужки. Опції (необов'язково): value — початкове значення, color — колір (yellow, pink, cyan, lime, orange, lilac…), icon — іконка, decay — на скільки падає за хвилину.",
        ex: "pet.addStat(\"coffee\", \"Кава\", { value: 30, color: \"orange\", icon: \"flame\", decay: 2 });\nlog(pet.stats.coffee);", see: ["pet.stats", "icons"] },
    ] },
    { title: "Дії і події", icon: "zap", items: [
      { id: "pet.addAction", sig: "pet.addAction(назва, іконка, функція)", desc: "Кнопка під зразком.",
        more: "Назва — текст на кнопці. Іконка — назва з розділу «Іконки» нижче. Функція — що робити, коли кнопку натиснуть. Твої кнопки мають пунктирну рамку. При новому запуску коду старі кнопки зникають і створюються заново.",
        ex: "pet.addAction(\"Привітатись\", \"hand\", () => {\n  pet.emote(\"happy\");\n  pet.say(\"Привіт!\");\n});", see: ["js.functions", "icons", "pet.change"] },
      { id: "pet.on", sig: "pet.on(подія, функція)", desc: "Підписатися на подію: «коли станеться — зроби це».",
        more: "Події: tick, click, chat, action, low, return, sleep, wake (кожна описана нижче). Можна мати кілька підписок на одну подію.",
        ex: "pet.on(\"click\", () => pet.fx(\"heart\", 2));", see: ["js.functions"] },
      { id: "pet.on.tick", sig: "pet.on(\"tick\", функція)", desc: "Кожні 5 секунд (поки вкладка відкрита). Те саме: pet.onTick(функція).",
        more: "Зручно, щоб перевіряти стан. Але не говори тут щоразу — це буде бісити. І не викликай тут ШІ: ліміт закінчиться дуже швидко.",
        ex: "pet.on(\"tick\", () => {\n  if (pet.stats.energy < 20) pet.emote(\"sleepy\", 3000);\n});", see: ["js.if", "pet.on.low"] },
      { id: "pet.on.click", sig: "pet.on(\"click\", функція)", desc: "Тицьнули в зразка.", ex: "pet.on(\"click\", () => {\n  pet.animate(\"squish\");\n  pet.change({ mood: 2 });\n});" },
      { id: "pet.on.chat", sig: "pet.on(\"chat\", функція)", desc: "Написали в чат. Функція отримує текст.",
        more: "Якщо функція поверне рядок (return \"…\"), зразок його скаже. Коли є хоч одна така підписка, стандартна відповідь ШІ вимикається — тепер чатом керуєш ти.",
        ex: "pet.on(\"chat\", (text) => {\n  if (text.includes(\"кіт\")) return \"Я боюся котів!\";\n  return \"Цікаво…\";\n});", see: ["ai.ask", "js.strings"] },
      { id: "pet.on.action", sig: "pet.on(\"action\", функція)", desc: "Натиснули будь-яку дію. Функція отримує назву.", ex: "pet.on(\"action\", (name) => log(\"Натиснули\", name));" },
      { id: "pet.on.low", sig: "pet.on(\"low\", функція)", desc: "Показник упав нижче 25. Функція отримує його id.",
        more: "Спрацьовує один раз у момент падіння, а не постійно — тому тут зручно говорити.",
        ex: "pet.on(\"low\", (stat) => {\n  if (stat === \"food\") pet.say(\"Я голодний!\");\n});", see: ["pet.on.tick"] },
      { id: "pet.on.return", sig: "pet.on(\"return\", функція)", desc: "Ти знову відкрив сторінку. Функція отримує, скільки хвилин тебе не було.",
        ex: "pet.on(\"return\", (minutes) => {\n  if (minutes > 60) pet.emote(\"sad\", 4000);\n});", see: ["js.date"] },
      { id: "pet.on.sleep", sig: "pet.on(\"sleep\" | \"wake\", функція)", desc: "Заснув / прокинувся.", ex: "pet.on(\"wake\", () => pet.say(\"Доброго ранку\"));" },
      { id: "pet.age", sig: "pet.age / pet.awayMinutes", desc: "Скільки хвилин зразку / скільки хвилин тебе не було перед цим візитом.", ex: "log(\"Зразку\", pet.age, \"хв\");" },
    ] },
    { title: "Мозок (ШІ)", icon: "brain", items: [
      { id: "ai.ask", sig: "await ai.ask(текст)", desc: "Запит до Gemini, повертає текст відповіді.",
        more: "Характер і поточний стан зразка додаються до запиту самі. Пиши в запиті, що сталося і що треба відповісти. Варіант ai.ask(текст, { system: false }) — без характеру. Потрібен await.",
        ex: "const text = await ai.ask(\"Тебе погладили. Відреагуй одним реченням.\");\npet.say(text);", see: ["js.async", "js.strings", "ai.json"] },
      { id: "ai.json", sig: "await ai.json(текст, приклад)", desc: "Відповідь як об'єкт за твоїм прикладом формату.",
        more: "Приклад — об'єкт із полями, які хочеш отримати. Модель поверне такий самий об'єкт зі своїми значеннями. Модель може помилитися, тож перевіряй значення перед використанням.",
        ex: "const r = await ai.json(\"Оціни погоду за вікном\", { verdict: \"текст\", score: 0 });\nlog(r.verdict, r.score);", see: ["js.objects", "js.trycatch"] },
      { id: "ai.ready", sig: "ai.ready", desc: "true, якщо ключ вставлено.", ex: "if (!ai.ready) pet.say(\"Дай мені мозок!\");" },
      { id: "ai.limits", sig: "Ліміти", desc: "Безкоштовно ~10 запитів на хвилину і ~500 на день. Запит триває 1–3 секунди. Не викликай ai у tick." },
    ] },
    { title: "Пам'ять", icon: "folder", items: [
      { id: "memory.set", sig: "memory.set(ключ, значення)", desc: "Запам'ятати назавжди (у цьому браузері).",
        more: "Ключ — назва в лапках. Значення — текст, число, масив чи об'єкт. Переживає перезавантаження сторінки.",
        ex: "memory.set(\"owner\", \"Оля\");\nmemory.set(\"feeds\", 3);", see: ["memory.get"] },
      { id: "memory.get", sig: "memory.get(ключ, запасне)", desc: "Дістати збережене. Якщо ще немає — поверне «запасне».",
        ex: "const feeds = memory.get(\"feeds\", 0);\nmemory.set(\"feeds\", feeds + 1);", see: ["memory.set"] },
      { id: "memory.all", sig: "memory.remove(ключ) / memory.all()", desc: "Видалити одне / отримати все збережене.", ex: "log(memory.all());" },
    ] },
    { title: "Вигляд", icon: "dna", items: [
      { id: "pet.look", sig: "pet.look", desc: "Гени зразка: shape, color, accent, eyes, mouth, top, pattern.", ex: "log(pet.look.shape);" },
      { id: "pet.setLook", sig: "pet.setLook({ … })", desc: "Змінити гени (до наступного запуску коду).",
        more: "shape: blob drop cube crystal ghost bean · eyes: round big tiny cyclops triple visor · mouth: line fang teeth cat · top: none horns antenna antennae ears sprout spikes crest · pattern: none spots stripes belly patch · color / accent: yellow pink blue blurple lime orange lilac cyan red green white.",
        ex: "pet.setLook({ top: \"horns\", color: \"red\" });", see: ["pet.setSize"] },
      { id: "pet.setSize", sig: "pet.setSize(число)", desc: "Розмір від 0.5 до 1.25 (1 — звичайний).",
        more: "Поточний розмір дізнаєшся через pet.size (або pet.getSize()). Можна й присвоїти: pet.size = 0.8.",
        ex: "const old = pet.size;\npet.setSize(random(0.5, 1.25));\nlog(\"Було\", old, \"стало\", pet.size);", see: ["pet.size", "random"] },
      { id: "pet.size", sig: "pet.size / pet.getSize()", desc: "Поточний розмір зразка (число, 1 — звичайний).", ex: "if (pet.size < 0.8) pet.say(\"Я ще малий\");", see: ["pet.setSize"] },
      { id: "pet.addPart", sig: "pet.addPart(svg, опції)", desc: "Свій SVG-елемент: капелюх, окуляри, шрам…",
        more: "svg — рядок із фігурами (circle, rect, path) без тегу <svg>. Опції: at — точка прив'язки (head, face, leftEye, rightEye, mouth, body, left, right, feet), x / y — точні координати, scale, rotate, behind: true — за тілом. Сітка зразка 200×200; точка (0,0) у твоєму SVG = точка прив'язки; мінус по y — вгору.",
        ex: "pet.addPart('<circle r=\"9\" fill=\"#ffd23f\" stroke=\"#121212\" stroke-width=\"4\"/>', { at: \"head\" });", see: ["pet.anchors"] },
      { id: "pet.anchors", sig: "pet.anchors / pet.clearParts()", desc: "Координати точок прив'язки / прибрати всі деталі.", ex: "log(pet.anchors.head);" },
    ] },
    { title: "Корисні функції", icon: "dice", items: [
      { id: "random", sig: "random(від, до)", desc: "Випадкове дробове число в межах, наприклад 0.73.",
        more: "Кожен виклик дає нове число. Зручно для розміру, шансів і будь-якої випадковості. Якщо межі не вказати — від 0 до 1.",
        ex: "pet.setSize(random(0.5, 1.25));\nif (random(0, 1) < 0.3) pet.say(\"Пощастило!\"); // шанс 30%", see: ["randomInt", "pick", "js.numbers"] },
      { id: "randomInt", sig: "randomInt(від, до)", desc: "Випадкове ціле число, обидві межі включно.",
        ex: "const dice = randomInt(1, 6);\npet.say(`Випало ${dice}`);", see: ["random"] },
      { id: "pick", sig: "pick(список)", desc: "Випадковий елемент зі списку.",
        ex: "pet.emote(pick([\"happy\", \"smug\", \"love\"]));\npet.say(pick([\"Привіт\", \"Хай\", \"Йо\"]));", see: ["js.arrays"] },
    ] },
    { title: "Інтерфейс і налагодження", icon: "terminal", items: [
      { id: "ui.box", sig: "ui.box(заголовок)", desc: "Порожній блок під зразком — для лічильників, кнопок, міні-ігор.",
        more: "Повертає HTML-елемент. Наповнюєш його звичайним JavaScript: box.textContent, box.innerHTML, кнопки через document.createElement і onclick.",
        ex: "const box = ui.box(\"Рахунок\");\nbox.textContent = \"0 очок\";" },
      { id: "files", sig: "Файли коду: main.js + свої", desc: "Код можна розкласти по файлах — кнопка «+ Файл» над редактором.",
        more: "main.js є завжди. Свої файли (game.js, evolution.js…) виконуються разом із ним, в одній області видимості: спершу додаткові зліва направо, main.js — останнім. Тож функції й змінні, оголошені в іншому файлі, можна використовувати в main.js. Подвійний клік по вкладці — перейменувати, хрестик — видалити. Помилка покаже назву файлу й рядок.",
        ex: "// game.js\nfunction cheer() {\n  pet.fx(\"spark\", 5);\n  pet.say(\"Ура!\");\n}\n\n// main.js\npet.addAction(\"Ура\", \"star\", () => cheer());" },
      { id: "log", sig: "log(...)", desc: "Вивести в консоль лабораторії. console.log теж працює.", ex: "log(\"Ситість:\", pet.stats.food);" },
      { id: "timers", sig: "setTimeout / setInterval", desc: "Виконати пізніше / повторювати. При новому запуску коду скидаються самі.",
        ex: "setTimeout(() => pet.say(\"Минуло 3 секунди\"), 3000);", see: ["js.functions"] },
    ] },
    { title: "Іконки", icon: "star", icons: true, items: [
      { id: "icons", sig: "назви іконок", desc: "Натисни на іконку, щоб скопіювати її назву. Використовуй у pet.addAction і pet.addStat." },
    ] },
  ];
  const DOC = {};
  const docLabel = (d) => d.sig.replace(/\(.*$/, "").trim() || d.sig;
  DOCS.forEach((g) => g.items.forEach((it) => { DOC[it.id] = it; }));

  /* Шпаргалка для Claude: Claude нічого не знає про цю лабораторію, тож пояснюємо все —
     що за середовище, що таке pet/ai/memory, усі команди з прикладами, допустимі значення,
     поточний код і стан зразка. compact — коротка версія для ШІ-автодоповнення. */
  function cheatSheet({ compact = false } = {}) {
    const ind = (code) => code.split("\n").map((l) => "    " + l).join("\n");
    let md = `# Контекст: «Лабораторія зразка»

Я учень, роблю хакатон-задачу. На сайті живе віртуальна ШІ-істота — «зразок» (як тамагочі): у неї є тіло з емоціями й анімаціями, показники (ситість, енергія, настрій, стабільність) і мозок на Gemini. На сторінці є редактор коду, куди я вставляю JavaScript, щоб навчити зразка нових вмінь. Допоможи мені писати цей код.

## Як працює середовище
- Код із редактора виконується в браузері як тіло async-функції: можна писати await на верхньому рівні.
- Немає HTML-файлів, <script>, import, require, npm, Node.js — тільки звичайний JavaScript і готові об'єкти нижче.
- Код може бути в кількох файлах (main.js і додаткові, кнопка «+ Файл»). Вони виконуються разом в одній області видимості: спершу додаткові, main.js — останнім. Якщо радиш винести щось в окремий файл — скажи назву файлу.
- Кожен запуск («Запустити» / Ctrl+Enter) починається з чистого аркуша: кнопки, підписки на події, свої показники й таймери з минулого запуску скидаються, тож увесь код має бути в редакторі.
- Готові глобальні об'єкти (їх НЕ треба створювати чи імпортувати):
  - pet — сам зразок: репліки, емоції, показники, кнопки-дії, події, вигляд;
  - ai — запити до Gemini від імені зразка (характер і стан додаються самі);
  - memory — пам'ять, що переживає перезавантаження сторінки;
  - ui — порожні блоки під зразком для лічильників і міні-ігор;
  - log(...) — вивід у консоль лабораторії;
  - random(від, до), randomInt(від, до), pick(список) — випадковість.

## Правила
- Не вигадуй команд, яких немає нижче. Якщо чогось немає — скажи і запропонуй обхід звичайним JavaScript.
- ai.ask / ai.json тривають 1–3 с і мають ліміт ~10 запитів на хвилину: ніколи не викликай їх у pet.on("tick") чи setInterval.
- Подія tick спрацьовує кожні 5 секунд — не став туди pet.say без умови, інакше зразок говоритиме без кінця.
- Без емодзі в текстах реплік.
`;
    if (!compact) md += `- Я вчуся програмувати (8–11 клас). Давай короткий код для вставки в редактор і поясни простими словами, що робить кожен рядок. Якщо щось можна зробити простіше — зроби простіше.
`;
    md += `\n## Усі команди\n`;
    DOCS.filter((g) => !g.basics && !g.icons).forEach((g) => {
      md += `\n### ${g.title}\n`;
      g.items.forEach((it) => {
        md += `- ${it.sig} — ${it.desc}${it.more ? " " + it.more : ""}\n`;
        if (!compact && it.ex) md += `  Приклад:\n${ind(it.ex)}\n`;
      });
    });
    md += `
## Допустимі значення
- Емоції (pet.emote / pet.setEmotion): ${EMO_LIST}
- Частинки (pet.fx): ${Zrazok.FX.join(", ")}
- Рухи (pet.animate): hop, shake, nod, squish
- Події (pet.on): tick, click, chat, action, low, return, sleep, wake
- Кольори (addStat color, setLook color/accent): ${Object.keys(Zrazok.COLORS).join(", ")}
- Гени (pet.setLook): shape: ${Zrazok.SHAPES.join(" ")}; eyes: ${Zrazok.EYES.join(" ")}; mouth: ${Zrazok.MOUTHS.join(" ")}; top: ${Zrazok.TOPS.join(" ")}; pattern: ${Zrazok.PATTERNS.join(" ")}
- Іконки (addAction, addStat icon): ${iconNames().join(", ")}
`;
    if (!compact) {
      const s = state.stats;
      const extra = Object.entries(engine.userStats).map(([id, d]) => `${id} («${d.label}») = ${Math.round(engine.statValue(id))}`).join(", ");
      md += `
## Мій зразок зараз
- Ім'я: ${state.name}
- Показники: food = ${Math.round(s.food)}, energy = ${Math.round(s.energy)}, mood = ${Math.round(s.mood)}, stability = ${Math.round(s.stability)}${extra ? `; мої показники: ${extra}` : ""}
- Мої кнопки: ${engine.userActions.map((a) => `«${a.label}»`).join(", ") || "поки немає"}
- Характер (системний промпт): ${(state.character || "").trim() ? `«${state.character.trim().slice(0, 400)}»` : "ще не написаний"}

## Мій поточний код
${files.data && files.data.order.length > 1 ? `Код розбитий на файли. Усі виконуються разом в одній області видимості: ${files.runOrder().join(" → ")} (main.js — останнім), тож функції й змінні з одного файлу видно в інших.\n` : ""}${(files.data ? files.runOrder() : ["main.js"]).map((n) => `### ${n}\n\`\`\`js\n${((files.data ? files.data.src[n] : load(LS.code, "")) || "").trim() || "// поки порожньо"}\n\`\`\``).join("\n\n")}

## Моє завдання
(опиши тут, що має робити зразок — поведінку словами, а не код)
`;
    }
    return md;
  }
  function iconNames() {
    return $$("#hk-sprite symbol, #t1-sprite symbol").map((s) => s.id.replace(/^i-/, ""));
  }

  /* ---------- Квест ----------
     guide — покроковий гайд (Старт, Новачок), hints — підказки по одній (Профі),
     info — пояснення без інструкції (Бос). У тексті: {id} або {id|текст} — посилання
     на довідник, `код` — код. Старт–Профі зараховуються тільки автоматично. */
  const LEVELS = [
    { n: 0, name: "Старт", sub: "пробудження зразка", c: "var(--yellow)", help: "guide" },
    { n: 1, name: "Новачок", sub: "перший код, крок за кроком", c: "var(--lime)", help: "guide" },
    { n: 2, name: "Профі", sub: "ШІ керує зразком", c: "var(--cyan)", help: "hints" },
    { n: 3, name: "Бос", sub: "сам, на своєму досвіді", c: "var(--pink)", help: "info" },
  ];
  const QUESTS = [
    { lv: 0, id: "s-brain", xp: 10, auto: true, t: "Підключи мозок: ключ Gemini працює", guide: [
      { h: "Отримай ключ", p: "Відкрий aistudio.google.com/apikey, увійди через Google-акаунт і натисни «Create API key». Детально — на сторінці «Робота з ШІ» (у меню зверху)." },
      { h: "Встав ключ", p: "Вкладка «Мозок» → поле «API-ключ» → кнопка «Зберегти і перевірити». Якщо все добре, під кнопкою з'явиться зелений напис, а зразок скаже, що почав думати." },
      { h: "Не працює?", p: "Під полем буде текст помилки з кодом (400, 402, 403, 429). Що означає кожен — у розділі «Допомога» внизу сторінки." },
    ] },
    { lv: 0, id: "s-name", xp: 5, auto: true, t: "Дай ім'я і знайди свою ДНК", guide: [
      { h: "Ім'я", p: "Вкладка «Характер» → поле «Ім'я». Ім'я з'явиться над зразком, і він сам знатиме, як його звати." },
      { h: "ДНК", p: "ДНК — 8 символів (0–9, A–F), з яких генерується вигляд: форма, очі, роги, візерунок. Кнопка з кубиком — випадкова ДНК, «З імені» — ДНК з імені. Можна вписати код вручну." },
      { h: "Запам'ятай код", p: "Знайшов того, хто подобається? Запиши код ДНК: за ним зразка можна відтворити на будь-якому комп'ютері." },
    ] },
    { lv: 0, id: "s-char", xp: 15, auto: true, t: "Напиши свій унікальний характер", guide: [
      { h: "Що таке характер", p: "Це системний промпт — інструкція, яку модель отримує перед кожною відповіддю. Від неї залежить, як зразок говорить і поводиться." },
      { h: "З чого скласти", p: "Дай відповіді на питання: хто він? як говорить (слівця, манера, довжина реплік)? що любить? чого боїться? чого не робить ніколи? Форма: «Ти — … Говориш … Любиш … Боїшся … Ніколи не …»." },
      { h: "Заготовка — не рахується", p: "Заготовку можна взяти як старт, але квест зарахується, коли допишеш щонайменше 80 своїх символів. Лічильник — під полем характеру." },
      { h: "Перевір у чаті", p: "Напиши зразку 2–3 різні питання. Квест зарахується після першої відповіді з твоїм характером. Чи впізнаєш ти його в кожній відповіді?" },
    ] },

    { lv: 1, id: "n-action", xp: 15, auto: true, t: "Перша кнопка: дія, що змінює стан зразка", guide: [
      { h: "Що таке дія", p: "Дія — кнопка під зразком. Її створює команда {pet.addAction}. Їй треба три речі: назва (текст на кнопці), іконка (назва з {icons|розділу «Іконки»}) і {js.functions|функція} — що робити при натисканні." },
      { h: "Каркас кнопки", p: "Ось «порожня» кнопка. `() => { … }` — це функція: код у фігурних дужках виконається тільки тоді, коли кнопку натиснуть.",
        code: "pet.addAction(\"Назва\", \"star\", () => {\n  // що зробити при натисканні\n});" },
      { h: "Наповни її", p: "Усередину функції пиши, що відбувається: змінити показники через {pet.change}, показати емоцію {pet.emote}, сказати щось {pet.say}. Приклад — кнопка «Помити»:",
        code: "pet.addAction(\"Помити\", \"droplet\", () => {\n  pet.change({ mood: -5, stability: 10 }); // мити неприємно, але корисно\n  pet.emote(\"angry\", 1500);                // сердиться 1,5 секунди\n  pet.say(\"Холодна вода! Навіщо?!\");\n});", insert: true },
      { h: "Запусти і натисни", p: "Натисни «Запустити» (або Ctrl+Enter). Під зразком з'явиться кнопка з пунктирною рамкою — натисни її і подивись на смужки." },
      { h: "Тепер — своя", p: "Кнопка з прикладу не зараховується. Придумай свою: інша назва, інша іконка, свій вплив на показники і своя реакція. Ідеї: «Енергетик», «Погладити», «Вчити уроки», «Дати мем»." },
    ] },
    { lv: 1, id: "n-react", xp: 15, auto: true, t: "Зразок сам реагує на свій стан", guide: [
      { h: "Події", p: "Подія — це «коли щось стається». {pet.on} підписує функцію на подію. Подія {pet.on.tick|tick} спрацьовує кожні 5 секунд — зручно, щоб перевіряти стан." },
      { h: "Умова", p: "{js.if|if} перевіряє, чи правда умова. Показники лежать у {pet.stats}. Тут: якщо енергія менша за 30 — зразок сонно кліпає 3 секунди.",
        code: "pet.on(\"tick\", () => {\n  if (pet.stats.energy < 30) {\n    pet.emote(\"sleepy\", 3000);\n  }\n});", insert: true },
      { h: "Не будь набридливим", p: "tick — кожні 5 секунд. Якщо там щоразу писати pet.say, зразок говоритиме без кінця. Для реплік краща подія {pet.on.low|low}: вона спрацьовує один раз, коли показник падає нижче 25.",
        code: "pet.on(\"low\", (stat) => {\n  if (stat === \"food\") pet.say(\"Я голодний!\");\n});" },
      { h: "Твоє завдання", p: "Придумай свою реакцію: на що (ситість, енергія, настрій, стабільність) і як (емоція, частинки {pet.fx}, рух {pet.animate}). Перевір: зменш показник кнопкою «Пограти» і почекай кілька секунд." },
    ] },
    { lv: 1, id: "n-stat", xp: 15, auto: true, t: "Свій показник зі смужкою", guide: [
      { h: "Що таке показник", p: "Смужка з числом 0–100. Створюється командою {pet.addStat}: id (слово латиницею), назва, опції." },
      { h: "Приклад", p: "id \"clean\" — через нього звертаєшся: `pet.stats.clean`. decay: 1 — показник падає на 1 щохвилини сам.",
        code: "pet.addStat(\"clean\", \"Чистота\", { value: 70, color: \"cyan\", icon: \"droplet\", decay: 1 });", insert: true },
      { h: "Зв'яжи з рештою", p: "Показник оживає, коли на нього щось впливає і він на щось впливає. Наприклад, кнопка «Помити» робить `pet.change({ clean: 30 })`, а в tick: якщо чистота нижче 20 — настрій падає.",
        code: "pet.on(\"tick\", () => {\n  if (pet.stats.clean < 20) pet.change({ mood: -1 });\n});" },
      { h: "Твій показник", p: "Показник «clean» з прикладу не зараховується — придумай свій: кава, слава, wi-fi, совість… Що його піднімає? Що буде, коли він на нулі?" },
    ] },
    { lv: 1, id: "n-ai", xp: 20, auto: true, t: "Кнопка, на яку зразок відповідає через ШІ", guide: [
      { h: "ai.ask", p: "{ai.ask} надсилає текст у Gemini і повертає відповідь. Це триває 1–3 секунди, тому перед ним пишуть {js.async|await}, а саму функцію позначають словом async." },
      { h: "Приклад", p: "Поки чекає відповідь, зразок «думає» (емоція think). Потім каже те, що відповіла модель.",
        code: "pet.addAction(\"Комплімент\", \"heart\", async () => {\n  pet.emote(\"think\", 5000);\n  const answer = await ai.ask(\"Скажи власнику короткий комплімент.\");\n  pet.say(answer);\n});", insert: true },
      { h: "Розкажи ШІ, що сталося", p: "Модель не бачить, що ти натиснув. Опиши ситуацію прямо в запиті. Змінні вставляються через `${…}` у зворотних лапках ({js.strings}): `Тебе погодували. Твоя ситість ${pet.stats.food}. Відреагуй.`" },
      { h: "Твоє завдання", p: "«Комплімент» з прикладу не зараховується. Зроби свою дію з відповіддю ШІ — наприклад, додай ШІ до своєї першої кнопки." },
    ] },

    { lv: 2, id: "p-json", xp: 25, auto: true, t: "ШІ керує станом: відповідь моделі змінює показники й емоцію", hints: [
      "{ai.json} повертає не текст, а {js.objects|об'єкт}. Формат задаєш прикладом — об'єктом із полями, які хочеш отримати (текст репліки, зміна настрою, емоція…).",
      "Отримане — звичайний об'єкт, поля дістаються через крапку. Застосуй їх через {pet.say}, {pet.change}, {pet.emote}. Квест зарахується, коли після ai.json зразок реально зміниться.",
      "Модель може помилитися: емоція, якої немає, або +500 до настрою. Перевір: чи є емоція у {js.arrays|списку} допустимих, обріж число до меж ({js.numbers|Math.min / Math.max}), обгорни все в {js.trycatch|try / catch}.",
    ] },
    { lv: 2, id: "p-memory", xp: 25, auto: true, t: "Пам'ять: зразок пам'ятає щось про тебе навіть після перезавантаження", hints: [
      "{memory.set} зберігає значення, {memory.get} дістає — навіть після перезавантаження сторінки. Квест зарахується, коли зразок дістане з пам'яті те, що зберіг минулого разу (перезавантаж сторінку, щоб перевірити).",
      "Що зберігати? Ім'я власника, улюблене, скільки разів його годували. Звідки брати? Наприклад, з чату: {pet.on.chat|подія chat} дає текст повідомлення.",
      "Щоб ШІ «пам'ятав», додавай збережене в запит: `Ти знаєш про власника: ${…}`. А може, хай модель сама вирішує, що варто запам'ятати? Подумай про {ai.json}.",
    ] },
    { lv: 2, id: "p-time", xp: 20, auto: true, t: "Реальний час: поведінка залежить від години чи від того, скільки тебе не було", hints: [
      "Подія {pet.on.return|return} повідомляє, скільки хвилин тебе не було. Поточну годину дає {js.date}. Квест зарахується, коли твій код використає одне з них.",
      "Вночі (з 22 до 7) — сонний і просить спати? Вранці — бурчить? Після довгої відсутності — ображений і голодний? Обери 1–2 ідеї.",
      "Зроби так, щоб це було видно (емоція, репліка, показники), але один раз, а не кожні 5 секунд.",
    ] },
    { lv: 2, id: "p-part", xp: 20, auto: true, t: "Свій аксесуар або деталь вигляду", hints: [
      "{pet.addPart} додає твій SVG-малюнок у точку прив'язки (голова, обличчя…). SVG — рядок із фігурами circle, rect, path.",
      "Координати: (0,0) — точка прив'язки, мінус по y — вгору. Сітка зразка 200×200, тож капелюх — приблизно 40 на 30. Точні координати точок — у {pet.anchors}.",
      "Стиль сайту: `stroke=\"#121212\" stroke-width=\"4\"` і кольори з палітри (#ffd23f, #ff6fb5, #4fd8e8, #b4f04b). SVG можна попросити в Claude, але він має пасувати саме твоєму зразку.",
    ] },

    { lv: 3, id: "b-evo", xp: 30, t: "Еволюція: зразок змінює вигляд залежно від догляду",
      info: "Зразок проходить стадії (наприклад, малюк → підліток → дорослий або «мутант», якщо його погано доглядали). Перехід має бути подією, яку видно, а стадія — зберігатися між візитами. Інструменти, які існують: {pet.setLook}, {pet.setSize}, {pet.addPart}, {memory.set}. Як саме їх поєднати — вирішуєш ти." },
    { lv: 3, id: "b-game", xp: 30, t: "Міні-гра в лабораторії",
      info: "Гра прямо під зразком: реакція, вгадай число, камінь-ножиці-папір, що завгодно. Результат має впливати на зразка (настрій, енергія, репліки). Місце для гри дає {ui.box}; кнопки й текст у ньому — звичайний JavaScript (DOM)." },
    { lv: 3, id: "b-daily", xp: 25, t: "Щоденні завдання від ШІ",
      info: "Раз на день зразок просить тебе щось зробити (придумує ШІ), пам'ятає завдання і перевіряє, чи ти його виконав. Подумай, як зрозуміти, що настав новий день і що завдання виконане. Знадобляться {ai.json}, {memory.set} і {pet.on.return}." },
    { lv: 3, id: "b-idea", xp: 30, t: "Своя ідея: те, чого немає в списку",
      info: "Зроби те, що зробить твого зразка схожим на живого. Браузер уміє багато: голос (Web Speech API), час, погода через відкриті API без ключа, вібрація на телефоні. Покажи на захисті, як це працює." },
  ];
  const EXAMPLE = { actions: ["помити", "комплімент"], stats: ["clean"] };
  const RANKS = [
    { xp: 0, name: "Стажер", icon: "eye" },
    { xp: 25, name: "Лаборант", icon: "flask" },
    { xp: 90, name: "Інженер", icon: "wrench" },
    { xp: 180, name: "Генетик", icon: "dna" },
    { xp: 270, name: "Творець", icon: "crown" },
  ];

  /* ==========================================================================
     СТАН
     ========================================================================== */
  const freshState = () => ({
    name: "Зразок", dna: Zrazok.randomDna(), character: "",
    stats: { food: 80, energy: 80, mood: 70, stability: 90 }, extra: {},
    sleeping: false, born: Date.now(), lastSeen: Date.now(), model: MODELS[0].id, quiet: false, voice: "auto",
  });
  const state = Object.assign(freshState(), load(LS.state, {}));
  state.stats = Object.assign(freshState().stats, state.stats);
  let apiKey = load(LS.key, "");
  let questState = Object.assign({ done: {}, hints: {}, flags: {} }, load(LS.quest, {}));
  const saveState = () => { state.lastSeen = Date.now(); save(LS.state, state); };

  /* ==========================================================================
     МОЗОК — Gemini
     ========================================================================== */
  const brain = { status: apiKey ? "unknown" : "none", stamps: [], pending: 0, noThink: {} };

  function usage(add) {
    const today = new Date().toDateString();
    let u = load(LS.usage, { d: today, n: 0 });
    if (u.d !== today) u = { d: today, n: 0 };
    if (add) { u.n += add; save(LS.usage, u); }
    return u.n;
  }

  class BrainError extends Error { constructor(kind, msg) { super(msg); this.kind = kind; } }

  async function waitSlot() {
    for (;;) {
      const now = Date.now();
      brain.stamps = brain.stamps.filter((t) => now - t < 60000);
      if (brain.stamps.length < 9) { brain.stamps.push(now); return; }
      const wait = 60000 - (now - brain.stamps[0]) + 80;
      lab.log("info", `Ліміт ~10 запитів на хвилину: чекаю ${Math.ceil(wait / 1000)} с…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  async function gemini({ system, contents, json }) {
    if (!apiKey) throw new BrainError("no_key", "Немає ключа Gemini. Встав його у вкладці «Мозок».");
    if (brain.pending >= 3) throw new BrainError("busy", "Забагато запитів до ШІ одночасно. Зачекай на відповідь, перш ніж питати знову.");
    brain.pending++;
    try {
      await waitSlot();
      return await fetchGemini({ system, contents, json }, 0);
    } finally { brain.pending--; }
  }

  async function fetchGemini({ system, contents, json }, attempt) {
    const model = state.model;
    const m = MODELS.find((x) => x.id === model);
    const gc = { maxOutputTokens: 2048, temperature: 0.9 };
    if (m && m.think && !brain.noThink[model]) gc.thinkingConfig = { thinkingLevel: m.think };
    if (json) gc.responseMimeType = "application/json";
    let res, data;
    usage(1); lab.updateQuota();
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents, generationConfig: gc }),
      });
    } catch (e) {
      throw new BrainError("network", "Немає зв'язку з Gemini. Перевір інтернет.");
    }
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const er = data.error || {};
      const det = JSON.stringify(er.details || []);
      const msg = String(er.message || "");
      if (res.status === 400 && /thinking/i.test(msg) && gc.thinkingConfig && attempt < 1) {
        brain.noThink[model] = true;
        return fetchGemini({ system, contents, json }, attempt + 1);
      }
      if ((res.status >= 500) && attempt < 1) {
        await new Promise((r) => setTimeout(r, 1600));
        return fetchGemini({ system, contents, json }, attempt + 1);
      }
      if (det.includes("API_KEY_INVALID") || (res.status === 400 && /api key/i.test(msg))) throw new BrainError("bad_key", "Ключ не підходить (400). Перевір, що скопіював його повністю, без пробілів.");
      if (res.status === 402) throw new BrainError("billing", "Закінчились передоплачені кредити (402): цей ключ із платного проєкту. Створи в AI Studio новий проєкт без оплати, зроби там ключ і встав сюди.");
      if (res.status === 401 || res.status === 403) throw new BrainError("forbidden", `Доступ заборонено (${res.status}). Ключ вимкнено або проєкт без безкоштовного доступу. Створи новий ключ в AI Studio.`);
      if (res.status === 404) throw new BrainError("model", `Модель «${model}» не знайдено (404). Обери іншу у вкладці «Мозок».`);
      if (res.status === 429) {
        if (/PerDay/i.test(det)) throw new BrainError("daily", "Денний ліміт вичерпано (429). Оновиться близько 10 ранку за Києвом. Можна обрати іншу модель у вкладці «Мозок».");
        throw new BrainError("minute", "Забагато запитів за хвилину (429). Зачекай хвилину.");
      }
      if (res.status >= 500) throw new BrainError("server", `Сервер Gemini перевантажений (${res.status}). Спробуй ще раз за хвилину.`);
      throw new BrainError("http", `Помилка Gemini ${res.status}: ${msg.slice(0, 160)}`);
    }
    if (data.promptFeedback && data.promptFeedback.blockReason) throw new BrainError("blocked", "Gemini не відповів на це: спрацював фільтр безпеки.");
    const cand = (data.candidates || [])[0];
    const text = ((cand && cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
    if (!text) {
      if (cand && cand.finishReason === "MAX_TOKENS") throw new BrainError("truncated", "Відповідь обірвалась (MAX_TOKENS). Попроси коротшу відповідь.");
      throw new BrainError("blocked", "Gemini повернув порожню відповідь (можливо, фільтр безпеки).");
    }
    setBrain("ok");
    return text;
  }

  function systemPrompt() {
    const s = state.stats;
    const extra = Object.keys(engine.userStats).map((id) => `, ${engine.userStats[id].label.toLowerCase()} ${Math.round(engine.statValue(id))}`).join("");
    return `${(state.character || "").trim() || DEFAULT_CHAR}

---
Ти — ${state.name}, цифрова істота-зразок, що живе в браузерній лабораторії.
Твій стан зараз (0–100): ситість ${Math.round(s.food)}, енергія ${Math.round(s.energy)}, настрій ${Math.round(s.mood)}, стабільність ${Math.round(s.stability)}${extra}.${state.sleeping ? " Ти щойно спав." : ""}
Відповідай українською і ДУЖЕ коротко: максимум 2 короткі речення (до 200 символів), без емодзі і без markdown.`;
  }

  function parseJsonLoose(text) {
    let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try { return JSON.parse(t); } catch (e) { /* далі */ }
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* ignore */ } }
    return undefined;
  }

  function setBrain(st, msg) {
    brain.status = st;
    lab.updateBrain(msg);
    if (st === "ok") questFlag("brain-ok");
  }

  /* ==========================================================================
     ГОЛОС — pet.speak(текст)
     1) Piper — нейромережевий український голос прямо в браузері (Web Worker +
        onnxruntime-web). Працює в будь-якому сучасному браузері й на телефоні,
        без ключа. Модель ~77 МБ завантажується один раз і лежить у кеші.
        Три диктори: Лада, Микита, Тетяна.
     2) Вбудовані голоси браузера (у Edge — природні Поліна й Остап).
     3) Gemini TTS (з ключем учня) — безкоштовно дуже мало запитів.
     «Авто»: природний голос браузера, якщо він є, інакше Piper.
     ========================================================================== */
  const PIPER_MODEL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx";
  const PIPER_ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
  const PIPER_SPEAKERS = [{ id: 0, name: "Лада" }, { id: 1, name: "Микита" }, { id: 2, name: "Тетяна" }];
  const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"];

  // код фонового потоку: завантажує модель (з кешем) і перетворює літери на звук
  const PIPER_WORKER = `
const MODEL = ${JSON.stringify(PIPER_MODEL)}, ORT = ${JSON.stringify(PIPER_ORT)}, CACHE = "hk26-t1-voice-v1";
let ort, session, cfg;
async function getBuf(url, progress) {
  let cache = null;
  try { cache = await caches.open(CACHE); const hit = await cache.match(url); if (hit) return await hit.arrayBuffer(); } catch (e) { cache = null; }
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const total = +res.headers.get("content-length") || 0;
  const reader = res.body.getReader(); const parts = []; let got = 0, last = -1;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length;
    const pct = total ? Math.floor(got * 100 / total) : 0; if (progress && pct !== last) { last = pct; progress(pct); } }
  const buf = await new Blob(parts).arrayBuffer();
  if (cache) { try { await cache.put(url, new Response(buf)); } catch (e) {} }
  return buf;
}
async function init() {
  if (session) return;
  ort = await import(ORT + "ort.wasm.min.mjs");
  ort.env.wasm.wasmPaths = ORT; ort.env.wasm.numThreads = 1;
  cfg = await (await fetch(MODEL + ".json")).json();
  const buf = await getBuf(MODEL, (p) => postMessage({ type: "progress", pct: p }));
  session = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"] });
}
onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "cached") { let ok = false; try { ok = !!(await (await caches.open(CACHE)).match(MODEL)); } catch (er) {} postMessage({ type: "cached", ok }); return; }
    await init();
    if (m.type === "init") { postMessage({ type: "ready" }); return; }
    const map = cfg.phoneme_id_map, pad = map["_"][0];
    const ids = [map["^"][0], pad];
    for (const ch of m.text) if (map[ch]) ids.push(map[ch][0], pad);
    ids.push(map["$"][0]);
    const res = await session.run({
      input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor("float32", Float32Array.from([cfg.inference.noise_scale, m.length || cfg.inference.length_scale, cfg.inference.noise_w]), [3]),
      sid: new ort.Tensor("int64", BigInt64Array.from([BigInt(m.sid || 0)]), [1]),
    });
    const pcm = res.output.data;
    postMessage({ type: "audio", id: m.id, pcm, rate: cfg.audio.sample_rate }, [pcm.buffer]);
  } catch (err) { postMessage({ type: "error", id: m.id, message: String(err && err.message || err) }); }
};`;

  // числа словами (модель знає тільки літери)
  function numUa(n) {
    n = Math.abs(Math.trunc(n));
    if (n === 0) return "нуль";
    const ones = ["", "один", "два", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"];
    const onesF = ["", "одна", "дві", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"];
    const teens = ["десять", "одинадцять", "дванадцять", "тринадцять", "чотирнадцять", "п'ятнадцять", "шістнадцять", "сімнадцять", "вісімнадцять", "дев'ятнадцять"];
    const tens = ["", "", "двадцять", "тридцять", "сорок", "п'ятдесят", "шістдесят", "сімдесят", "вісімдесят", "дев'яносто"];
    const hund = ["", "сто", "двісті", "триста", "чотириста", "п'ятсот", "шістсот", "сімсот", "вісімсот", "дев'ятсот"];
    const tri = (x, fem) => {
      const h = Math.floor(x / 100), t = Math.floor((x % 100) / 10), o = x % 10, w = [];
      if (h) w.push(hund[h]);
      if (t === 1) w.push(teens[o]); else { if (t) w.push(tens[t]); if (o) w.push((fem ? onesF : ones)[o]); }
      return w.join(" ");
    };
    const mil = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), rest = n % 1000, parts = [];
    if (mil) parts.push(tri(mil) + " " + pluralUa(mil, "мільйон", "мільйони", "мільйонів"));
    if (th) parts.push(tri(th, true) + " " + pluralUa(th, "тисяча", "тисячі", "тисяч"));
    if (rest) parts.push(tri(rest));
    return parts.join(" ");
  }
  function pluralUa(x, a, b, c) { const t = x % 100, o = x % 10; if (t >= 11 && t <= 14) return c; if (o === 1) return a; if (o >= 2 && o <= 4) return b; return c; }
  function prepUa(text) {
    const num = (m) => (m.startsWith("-") ? "мінус " : "") + numUa(parseFloat(m.replace(",", ".")));
    return String(text)
      .replace(/(-?\d+)\s*°/g, (m, d) => num(d) + " " + pluralUa(Math.abs(+d), "градус", "градуси", "градусів"))
      .replace(/(\d+)\s*%/g, (m, d) => numUa(+d) + " " + pluralUa(+d, "відсоток", "відсотки", "відсотків"))
      .replace(/(\d+)-(й|а|е|го|му)\b/g, "$1")
      .replace(/-?\d+([.,]\d+)?/g, num)
      .replace(/[’ʼ`]/g, "'").replace(/…/g, ".").replace(/[«»"“”()]/g, "").replace(/&/g, " і ")
      .toLowerCase().normalize("NFD");
  }

  const voice = {
    list: [],
    audio: null,
    gen: 0,                 // номер поточної репліки (stop() скасовує старі)
    piper: { worker: null, ready: false, loading: null, pct: 0, cached: null, wait: new Map(), seq: 0 },
    ctx: null,
    sources: [],

    load() {
      if (!window.speechSynthesis) return;
      const norm = (l) => String(l || "").replace("_", "-").toLowerCase();
      this.list = speechSynthesis.getVoices().filter((v) => norm(v.lang).startsWith("uk") && !/undefined/i.test(v.name));
      lab.renderVoices && lab.renderVoices();
    },
    rank(v) {
      if (/Polina|Ostap|Поліна|Остап|Natural/i.test(v.name)) return 4; // Edge підписує їх і латиницею, і кирилицею
      if (/Google|uk-ua-x/i.test(v.name)) return 3;
      if (/Lesya/i.test(v.name)) return 2;
      return 1;
    },
    bestNative() { return [...this.list].sort((a, b) => this.rank(b) - this.rank(a))[0] || null; },
    // що реально звучатиме: { kind: "native"|"piper"|"gemini", voice?, sid? }
    engine() {
      const want = state.voice || "auto";
      if (want === "gemini") return { kind: "gemini" };
      if (want.startsWith("piper:")) return { kind: "piper", sid: +want.slice(6) || 0 };
      if (want !== "auto") { const v = this.list.find((x) => x.name === want); if (v) return { kind: "native", voice: v }; }
      const best = this.bestNative();
      if (best && this.rank(best) >= 3) return { kind: "native", voice: best };
      return { kind: "piper", sid: 0 };
    },
    describe() {
      const e = this.engine();
      if (e.kind === "native") return e.voice.name;
      if (e.kind === "gemini") return "Gemini TTS";
      return `${PIPER_SPEAKERS[e.sid].name} (Piper)`;
    },

    stop() {
      this.gen++;
      if (window.speechSynthesis) speechSynthesis.cancel();
      if (this.audio) { this.audio.pause(); this.audio = null; }
      this.sources.forEach((s) => { try { s.stop(); } catch (e) { /* ignore */ } });
      this.sources = [];
    },
    // ріжемо на речення: довгий текст деякі голоси обривають, а Piper так швидше починає говорити
    chunks(text) {
      return (String(text).replace(/&/g, " і ").match(/[^.!?…]+[.!?…]*\s*/g) || [String(text)])
        .map((s) => s.trim()).filter(Boolean)
        .reduce((acc, s) => { if (acc.length && (acc[acc.length - 1] + " " + s).length < 160) acc[acc.length - 1] += " " + s; else acc.push(s); return acc; }, []);
    },

    /* --- вбудований голос браузера --- */
    speakNative(text, v) {
      return new Promise((resolve) => {
        const parts = this.chunks(text);
        this._keep = [];
        setTimeout(() => {
          parts.forEach((p, i) => {
            const u = new SpeechSynthesisUtterance(p);
            u.voice = v; u.lang = v.lang; u.rate = 1.02;
            if (i === parts.length - 1) { u.onend = () => resolve(true); u.onerror = () => resolve(false); }
            this._keep.push(u); // інакше Chrome інколи «забуває» onend
            speechSynthesis.speak(u);
          });
        }, 60);
      });
    },

    /* --- Piper у фоновому потоці --- */
    piperWorker() {
      const P = this.piper;
      if (P.worker) return P.worker;
      P.worker = new Worker(URL.createObjectURL(new Blob([PIPER_WORKER], { type: "text/javascript" })), { type: "module" });
      P.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === "progress") { P.pct = m.pct; lab.renderVoices && lab.renderVoices(); return; }
        if (m.type === "cached") { P.cached = m.ok; lab.renderVoices && lab.renderVoices(); return; }
        const w = P.wait.get(m.id ?? "init");
        if (!w) return;
        P.wait.delete(m.id ?? "init");
        if (m.type === "error") w.reject(new Error(m.message)); else w.resolve(m);
      };
      return P.worker;
    },
    piperAsk(msg) {
      const P = this.piper;
      const id = msg.type === "init" ? "init" : ++P.seq;
      return new Promise((resolve, reject) => {
        P.wait.set(id, { resolve, reject });
        this.piperWorker().postMessage(Object.assign({ id }, msg));
      });
    },
    piperInit() {
      const P = this.piper;
      if (P.ready) return Promise.resolve();
      if (!P.loading) {
        if (!P.cached) {
          lab.log("info", "Завантажую український голос Piper (~77 МБ, лише перший раз — далі з кешу)…");
          lab.toast("Завантажую український голос (~77 МБ, лише перший раз). Зачекай трохи…", "info");
        }
        P.loading = this.piperAsk({ type: "init" }).then(() => {
          P.ready = true; P.cached = true; lab.renderVoices && lab.renderVoices();
          lab.log("ok", "Голос Piper готовий.");
        }, (e) => { P.loading = null; throw e; });
      }
      return P.loading;
    },
    unlockAudio() {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    async speakPiper(text, sid) {
      const my = this.gen;
      try { await this.piperInit(); } catch (e) {
        lab.log("warn", `Голос Piper не завантажився (${e.message}). Перевір інтернет.`);
        return false;
      }
      this.unlockAudio();
      const ctx = this.ctx;
      if (!ctx) return false;
      let at = ctx.currentTime + 0.05, last = null;
      for (const part of this.chunks(text)) {
        let r;
        try { r = await this.piperAsk({ type: "speak", text: prepUa(part), sid, length: 1 }); } catch (e) { lab.log("warn", "Голос Piper: " + e.message); break; }
        if (my !== this.gen) return false; // поки рахували — попросили замовкнути
        const buf = ctx.createBuffer(1, r.pcm.length, r.rate);
        buf.copyToChannel(r.pcm, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination);
        at = Math.max(at, ctx.currentTime + 0.02);
        src.start(at);
        at += buf.duration;
        this.sources.push(src);
        last = src;
      }
      if (!last) return false;
      await new Promise((res) => { last.onended = res; });
      return my === this.gen;
    },

    /* --- Gemini TTS --- */
    async speakGemini(text) {
      if (!apiKey) { lab.log("warn", "Голос Gemini потребує ключа у вкладці «Мозок»."); return false; }
      let lastErr = null;
      for (const model of TTS_MODELS) {
        try {
          usage(1); lab.updateQuota();
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: String(text).slice(0, 600) }] }],
              generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: state.geminiVoice || "Kore" } } } },
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { lastErr = (data.error && data.error.message) || "HTTP " + res.status; if (res.status === 404) continue; break; }
          const part = (((data.candidates || [])[0] || {}).content || {}).parts || [];
          const inline = (part.find((p) => p.inlineData) || {}).inlineData;
          if (!inline) { lastErr = "порожня відповідь"; continue; }
          const bytes = Uint8Array.from(atob(inline.data), (c) => c.charCodeAt(0));
          const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // "RIFF"
          const blob = new Blob([isWav ? bytes : this.wav(bytes, 24000)], { type: "audio/wav" });
          this.audio = new Audio(URL.createObjectURL(blob));
          await new Promise((r) => { this.audio.onended = r; this.audio.onerror = r; this.audio.play().catch(r); });
          return true;
        } catch (e) { lastErr = e.message; }
      }
      lab.log("warn", `Голос Gemini недоступний (${lastErr}). Безкоштовно це лише ~10–15 фраз на день. Говорю голосом Piper.`);
      return this.speakPiper(text, 0);
    },
    // сирий PCM 16 біт моно → WAV
    wav(pcm, rate) {
      const h = new DataView(new ArrayBuffer(44));
      const w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
      w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
      h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
      h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true);
      w(36, "data"); h.setUint32(40, pcm.length, true);
      const out = new Uint8Array(44 + pcm.length);
      out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44);
      return out;
    },

    speak(text) {
      text = noEmoji(text);
      if (!text) return Promise.resolve(false);
      this.stop();
      const e = this.engine();
      if (e.kind === "gemini") return this.speakGemini(text);
      if (e.kind === "native") return this.speakNative(text, e.voice);
      return this.speakPiper(text, e.sid);
    },
  };
  if (window.speechSynthesis) {
    speechSynthesis.addEventListener ? speechSynthesis.addEventListener("voiceschanged", () => voice.load()) : (speechSynthesis.onvoiceschanged = () => voice.load());
    setTimeout(() => voice.load(), 300);
    setTimeout(() => voice.load(), 1500);
  }
  // звук у браузері дозволений лише після дії користувача — розблоковуємо на першому кліку
  addEventListener("pointerdown", () => voice.unlockAudio(), { once: true, capture: true });
  // чи голос Piper уже лежить у кеші (щоб не показувати «77 МБ» дарма)
  setTimeout(() => { try { voice.piperWorker().postMessage({ type: "cached" }); } catch (e) { /* ignore */ } }, 1200);

  /* ==========================================================================
     ДВИГУН ЗРАЗКА
     ========================================================================== */
  const engine = {
    creature: null,
    handlers: {},       // event -> [fn]
    userActions: [],
    userStats: {},      // id -> {label, color, icon, decay}
    timers: new Set(),
    boxes: [],
    autoEmotion: true,
    awayMinutes: 0,
    ctx: null,          // у якому обробнику зараз виконується код учня
    lastTickAi: 0,
    jsonAt: 0,
    curAction: "",
    history: [],        // стандартний чат (тільки в цій сесії)

    statDefs() {
      return BASE_STATS.concat(Object.entries(this.userStats).map(([id, d]) => Object.assign({ id, user: true }, d)));
    },
    hasStat(id) { return id in state.stats || id in this.userStats; },
    statValue(id) { return id in state.stats ? state.stats[id] : (state.extra[id] ?? 0); },

    setStat(id, v, show = true) {
      if (!this.hasStat(id)) return false;
      const old = this.statValue(id);
      const nv = clamp(+v || 0, 0, 100);
      if (id in state.stats) state.stats[id] = nv; else state.extra[id] = nv;
      if (show && Math.abs(nv - old) >= 1) lab.statDiff(id, Math.round(nv - old));
      if (old >= 25 && nv < 25) setTimeout(() => this.emit("low", id), 0);
      lab.renderStats();
      this.updateMood();
      return true;
    },
    change(obj) {
      Object.entries(obj || {}).forEach(([k, d]) => {
        if (!this.hasStat(k)) { lab.log("warn", `pet.change: показника «${k}» немає. Є: ${this.statDefs().map((s) => s.id).join(", ")}.`); return; }
        this.setStat(k, this.statValue(k) + (+d || 0));
      });
    },

    updateMood() {
      const c = this.creature;
      if (!c) return;
      const s = state.stats;
      if (this.autoEmotion) {
        let e = "neutral";
        if (s.stability < 20) e = "glitch";
        else if (s.food < 15) e = "angry";
        else if (s.energy < 15) e = "bored";
        else if (s.mood < 25) e = "sad";
        else if (s.mood > 80 && s.food > 40 && s.energy > 30) e = "happy";
        c.setEmotion(e);
      }
      const low = BASE_STATS.filter((d) => d.id !== "stability").map((d) => [d, s[d.id]]).sort((a, b) => a[1] - b[1])[0];
      if (low && low[1] < 25 && !state.sleeping) c.setNeed(low[0].icon, low[0].label + ": мало"); else c.setNeed(null);
    },

    decay(minutes, cap) {
      const s = state.stats;
      const loss = (v) => (cap ? Math.min(v, cap) : v);
      if (state.sleeping) {
        s.energy = clamp(s.energy + minutes * 24, 0, 100);
        s.food = clamp(s.food - loss(minutes * 1), 0, 100);
      } else {
        s.food = clamp(s.food - loss(minutes * 2), 0, 100);
        s.energy = clamp(s.energy - loss(minutes * 1.5), 0, 100);
        const extraSad = (s.food < 20 ? 1 : 0) + (s.energy < 15 ? 1 : 0);
        s.mood = clamp(s.mood - loss(minutes * (1.2 + extraSad)), 0, 100);
      }
      const bad = s.food < 15 || s.energy < 10 || s.mood < 15;
      s.stability = clamp(s.stability + (bad ? -loss(minutes * 2) : minutes * 1), 0, 100);
      Object.entries(this.userStats).forEach(([id, d]) => {
        if (d.decay) state.extra[id] = clamp((state.extra[id] ?? 0) - loss(minutes * d.decay), 0, 100);
      });
    },

    tick() {
      if (!isLeader) { chatter.tick(); return; } // час рахує головна вкладка, тут лише показуємо
      const before = Object.assign({}, state.stats);
      this.decay(TICK_MS / 60000);
      ["food", "energy", "mood"].forEach((k) => { if (before[k] >= 25 && state.stats[k] < 25) this.emit("low", k); });
      if (state.sleeping && state.stats.energy >= 100) this.wake();
      lab.renderStats();
      this.updateMood();
      if (!document.hidden) this.emit("tick");
      chatter.tick();
      saveState();
    },

    sleep() {
      if (state.sleeping) return;
      state.sleeping = true;
      this.creature.setSleeping(true);
      this.creature.hideBubble();
      lab.renderActions(); this.updateMood(); saveState();
      this.emit("sleep");
    },
    wake() {
      if (!state.sleeping) return;
      state.sleeping = false;
      this.creature.setSleeping(false);
      lab.renderActions(); this.updateMood(); saveState();
      this.emit("wake");
    },

    on(ev, fn) {
      if (typeof fn !== "function") { lab.log("warn", `pet.on("${ev}", …): другим параметром має бути функція.`); return; }
      const ok = ["tick", "click", "chat", "action", "low", "return", "sleep", "wake"];
      if (!ok.includes(ev)) { lab.log("warn", `Події «${ev}» немає. Є: ${ok.join(", ")}.`); return; }
      (this.handlers[ev] = this.handlers[ev] || []).push(fn);
    },
    emit(ev, ...args) {
      const list = this.handlers[ev] || [];
      let result;
      list.forEach((fn) => {
        const r = runUser(fn, args, ev);
        if (r !== undefined) result = r;
      });
      return { count: list.length, result };
    },

    reset() {
      this.handlers = {};
      this.userActions = [];
      this.userStats = {};
      this.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      this.timers.clear();
      this.boxes.forEach((b) => b.remove());
      this.boxes = [];
      this.autoEmotion = true;
      if (this.creature) {
        this.creature.clearParts();
        this.creature.resetLook();
        this.creature.temp = null;
        this.creature.render();
      }
      lab.renderStats(); lab.renderActions();
      this.updateMood();
    },
  };

  /* Виклик коду учня: ловить помилки і стереже від зависання */
  function runUser(fn, args, ctx) {
    const prev = engine.ctx;
    engine.ctx = ctx;
    try { localStorage.setItem(LS.guard, "1"); } catch (e) { /* ignore */ }
    try {
      const r = fn(...args);
      if (r && typeof r.then === "function") {
        return r.then((v) => { if (ctx === "chat" && typeof v === "string") petSay(v, "код"); }, (err) => lab.reportError(err));
      }
      return r;
    } catch (err) {
      lab.reportError(err);
      return undefined;
    } finally {
      engine.ctx = prev;
      drop(LS.guard);
    }
  }

  /* ---------- Стандартні дії ---------- */
  const BASE_ACTIONS = [
    { label: "Погодувати", icon: "apple", run() {
      if (state.stats.food > 95) { engine.creature.emote("bored", 1500); engine.creature.shake(); return; }
      engine.change({ food: 25, mood: 3 });
      engine.creature.emote("happy", 1400); engine.creature.nod();
    } },
    { label: "Пограти", icon: "gamepad", run() {
      if (state.stats.energy < 12) { engine.creature.emote("bored", 1800); engine.creature.fx("sweat", 1); return; }
      engine.change({ mood: 18, energy: -10, food: -4 });
      engine.creature.emote("happy", 1600); engine.creature.hop(); engine.creature.fx("note", 2);
    } },
    { label: "Спати", wakeLabel: "Розбудити", icon: "moon", run() { if (state.sleeping) engine.wake(); else engine.sleep(); } },
  ];

  /* ==========================================================================
     API ДЛЯ КОДУ УЧНЯ
     ========================================================================== */
  function lev(a, b) {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1);
    }
    return m[a.length][b.length];
  }
  function guarded(obj, name) {
    return new Proxy(obj, {
      get(t, p) {
        if (typeof p === "string" && !(p in t) && !p.startsWith("__") && p !== "then" && p !== "toJSON" && p !== "constructor") {
          const near = Object.keys(t).map((k) => [k, lev(p.toLowerCase(), k.toLowerCase())]).sort((a, b) => a[1] - b[1])[0];
          lab.log("warn", `${name}.${p} — такої команди немає.${near && near[1] <= 3 ? ` Можливо, ${name}.${near[0]}?` : ""} Список — у вкладці «Довідник».`);
        }
        return t[p];
      },
    });
  }

  const statsProxy = new Proxy({}, {
    get(_, k) { return typeof k === "string" && engine.hasStat(k) ? Math.round(engine.statValue(k)) : undefined; },
    set(_, k, v) {
      if (!engine.hasStat(k)) { lab.log("warn", `Показника «${String(k)}» немає. Спершу створи його: pet.addStat("${String(k)}", "Назва").`); return true; }
      engine.setStat(k, v); markEffect(); return true;
    },
    has(_, k) { return engine.hasStat(k); },
    ownKeys() { return engine.statDefs().map((d) => d.id); },
    getOwnPropertyDescriptor(_, k) { return engine.hasStat(k) ? { enumerable: true, configurable: true, value: Math.round(engine.statValue(k)) } : undefined; },
  });

  function markEffect() {
    if (engine.ctx === "tick" || engine.ctx === "low") questFlag("tick-effect");
    if (Date.now() - engine.jsonAt < 15000) questFlag("ai-json"); // зразок змінився після ai.json
  }

  const pet = guarded({
    get name() { return state.name; },
    set name(v) { state.name = String(v).slice(0, 24) || "Зразок"; saveState(); lab.renderHead(); },
    get stats() { return statsProxy; },
    get dna() { return state.dna; },
    get emotion() { return engine.creature.emotion; },
    get isSleeping() { return state.sleeping; },
    // get-методи: дізнатися будь-що про зразка
    getName() { return state.name; },
    getEmotion() { return engine.creature.emotion; },
    getFood() { return Math.round(state.stats.food); },
    getEnergy() { return Math.round(state.stats.energy); },
    getMood() { return Math.round(state.stats.mood); },
    getStability() { return Math.round(state.stats.stability); },
    getStat(id) {
      if (!engine.hasStat(id)) { lab.log("warn", `pet.getStat("${id}"): такого показника немає. Є: ${engine.statDefs().map((d) => d.id).join(", ")}.`); return undefined; }
      return Math.round(engine.statValue(id));
    },
    getStats() { return Object.fromEntries(engine.statDefs().map((d) => [d.id, Math.round(engine.statValue(d.id))])); },
    getSleeping() { return state.sleeping; },
    getLook() { return pet.look; },
    getAge() { return pet.age; },
    getAwayMinutes() { return engine.awayMinutes; },
    getDna() { return state.dna; },
    getActions() { return engine.userActions.map((a) => a.label); },
    getInfo() { return pet.info(); },
    // парні set-методи
    setName(v) { pet.name = v; },
    setStat(id, v) {
      if (!engine.hasStat(id)) { lab.log("warn", `pet.setStat("${id}", …): такого показника немає. Є: ${engine.statDefs().map((d) => d.id).join(", ")}.`); return; }
      engine.setStat(id, v); markEffect();
    },
    get age() { return Math.floor((Date.now() - state.born) / 60000); },
    get awayMinutes() { return engine.awayMinutes; },
    get look() { const { w, h, ...g } = engine.creature.genes; return g; },
    get anchors() { return engine.creature.anchors; },
    say(text) { if (state.sleeping) return; petSay(text, "код"); markEffect(); },
    speak(text) { if (state.sleeping) return Promise.resolve(false); markEffect(); return voice.speak(text); },
    stopSpeaking() { voice.stop(); },
    emote(name, ms) {
      if (!engine.creature.emote(name, ms || 2000)) lab.log("warn", `Емоції «${name}» немає. Є: ${EMO_LIST}.`);
      markEffect();
    },
    setEmotion(name) {
      if (name == null) { engine.autoEmotion = true; engine.updateMood(); return; }
      if (!Zrazok.EMOTIONS.includes(name)) { lab.log("warn", `Емоції «${name}» немає. Є: ${EMO_LIST}.`); return; }
      engine.autoEmotion = false; engine.creature.setEmotion(name); markEffect();
    },
    fx(name, n) { if (!engine.creature.fx(name, clamp(+n || 3, 1, 12))) lab.log("warn", `Частинок «${name}» немає. Є: ${Zrazok.FX.join(", ")}.`); markEffect(); },
    animate(kind) {
      const c = engine.creature;
      const m = { hop: () => c.hop(), shake: () => c.shake(), nod: () => c.nod(), squish: () => c.squish() }[kind];
      if (m) m(); else lab.log("warn", `Руху «${kind}» немає. Є: hop, shake, nod, squish.`);
      markEffect();
    },
    change(obj) { engine.change(obj); markEffect(); },
    addStat(id, label, o = {}) {
      id = String(id || "").trim();
      if (!/^[a-zA-Z_]\w*$/.test(id)) { lab.log("warn", "pet.addStat: id — це слово латиницею без пробілів, наприклад \"coffee\"."); return; }
      if (id in state.stats) { lab.log("warn", `Показник «${id}» уже є (він вбудований).`); return; }
      engine.userStats[id] = { label: String(label || id), color: o.color || "lime", icon: o.icon || "star", decay: +o.decay || 0 };
      if (state.extra[id] == null || o.reset) state.extra[id] = clamp(o.value ?? 50, 0, 100);
      lab.renderStats();
      if (!exampleUsed("stats", id)) questFlag("stat-added");
    },
    addAction(label, icon, fn) {
      if (typeof icon === "function") { fn = icon; icon = "star"; }
      if (typeof fn !== "function") { lab.log("warn", "pet.addAction(назва, іконка, функція): третім параметром має бути функція."); return; }
      engine.userActions.push({ label: String(label || "Дія"), icon: icon || "star", fn });
      lab.renderActions();
    },
    on(ev, fn) { engine.on(ev, fn); },
    onTick(fn) { engine.on("tick", fn); },
    sleep() { engine.sleep(); },
    wake() { engine.wake(); },
    setLook(o) {
      const bad = engine.creature.setLook(o);
      if (bad.length) lab.log("warn", `pet.setLook: не знаю ${bad.join(", ")}. Допустимі значення — у Довіднику, розділ «Вигляд».`);
      lab.syncMiniPets();
    },
    setSize(n) { setSizeChecked(n); },
    get size() { return engine.creature.size; },
    set size(n) { setSizeChecked(n); },
    getSize() { return engine.creature.size; },
    info() {
      const c = engine.creature;
      return {
        name: state.name, size: c.size, emotion: c.emotion, sleeping: state.sleeping,
        stats: Object.fromEntries(engine.statDefs().map((d) => [d.id, Math.round(engine.statValue(d.id))])),
        look: pet.look, age: pet.age, dna: state.dna,
      };
    },
    addPart(svg, o) {
      if (typeof svg !== "string" || !svg.trim()) { lab.log("warn", "pet.addPart: перший параметр — рядок із SVG, наприклад '<circle r=\"8\" fill=\"#ffd23f\"/>'."); return; }
      engine.creature.addPart(svg.replace(/<\/?svg[^>]*>/gi, ""), o || {});
      questFlag("part-added");
    },
    clearParts() { engine.creature.clearParts(); },
  }, "pet");

  function setSizeChecked(n) {
    const v = +n;
    if (!Number.isFinite(v)) { lab.log("warn", `pet.setSize: потрібне число, а отримано ${JSON.stringify(n)}.`); return; }
    if (v < 0.5 || v > 1.25) lab.log("warn", `pet.setSize(${v}): розмір буває від 0.5 до 1.25, тому стане ${Math.max(0.5, Math.min(1.25, v))}.`);
    engine.creature.setSize(v);
  }

  const ai = guarded({
    get ready() { return !!apiKey; },
    async ask(prompt, o = {}) {
      checkTickAi();
      const fromExample = engine.ctx === "action" && exampleUsed("actions", engine.curAction || "");
      const text = await withThinking("ai.ask", prompt, () => gemini({
        system: o.system === false ? undefined : (typeof o.system === "string" ? o.system : systemPrompt()),
        contents: [{ role: "user", parts: [{ text: String(prompt) }] }],
      }));
      if (!fromExample) questFlag("ai-user");
      return text;
    },
    async json(prompt, example, o = {}) {
      checkTickAi();
      const fmt = example !== undefined ? `\n\nВідповідай ТІЛЬКИ JSON такого вигляду (значення заміни своїми):\n${JSON.stringify(example)}` : "\n\nВідповідай ТІЛЬКИ JSON.";
      const text = await withThinking("ai.json", prompt, () => gemini({
        system: o.system === false ? undefined : (typeof o.system === "string" ? o.system : systemPrompt()),
        contents: [{ role: "user", parts: [{ text: String(prompt) + fmt }] }],
        json: true,
      }));
      const obj = parseJsonLoose(text);
      if (obj === undefined) throw new BrainError("json", "Модель повернула не JSON: " + text.slice(0, 120));
      engine.jsonAt = Date.now();
      return obj;
    },
  }, "ai");

  /* Поки ШІ думає: крапки над зразком, «ШІ думає…» у панелі, запит і час відповіді в консолі */
  let thinkingNow = 0;
  async function withThinking(label, prompt, run, { bubble = true } = {}) {
    const c = engine.creature;
    const t0 = performance.now();
    const short = String(prompt).replace(/\s+/g, " ").slice(0, 70);
    thinkingNow++; lab.setThinking(true);
    lab.log("info", `→ ${label}: «${short}${String(prompt).length > 70 ? "…" : ""}» — ШІ думає…`);
    const showBubble = bubble && c && c.bubbleEl.hidden && !state.sleeping;
    if (showBubble) c.say("", { thinking: true });
    try {
      const r = await run();
      lab.log("ok", `← відповідь за ${((performance.now() - t0) / 1000).toFixed(1)} с`);
      return r;
    } finally {
      thinkingNow = Math.max(0, thinkingNow - 1);
      if (!thinkingNow) lab.setThinking(false);
      if (showBubble && c.bubbleEl.classList.contains("thinking")) c.hideBubble();
    }
  }

  function checkTickAi() {
    if (engine.ctx !== "tick") return;
    const now = Date.now();
    if (now - engine.lastTickAi < 120000) {
      throw new BrainError("tick", "ai викликано з tick частіше, ніж раз на 2 хвилини. Tick спрацьовує кожні 5 с — так ліміт закінчиться за пів години. Виклич ШІ з дії, чату чи події return.");
    }
    engine.lastTickAi = now;
  }

  const memStore = load(LS.memory, {});
  const memAtLoad = new Set(Object.keys(memStore));
  const memory = guarded({
    get(k, def) {
      if (memAtLoad.has(k)) questFlag("memory-used"); // дістав те, що зберіг минулого разу
      return k in memStore ? memStore[k] : def;
    },
    set(k, v) {
      try { memStore[k] = JSON.parse(JSON.stringify(v)); } catch (e) { lab.log("warn", "memory.set: це значення не можна зберегти (тільки текст, числа, масиви, об'єкти)."); return; }
      save(LS.memory, memStore);
    },
    remove(k) { delete memStore[k]; save(LS.memory, memStore); },
    all() { return JSON.parse(JSON.stringify(memStore)); },
  }, "memory");

  const ui = guarded({
    box(title) {
      const el = document.createElement("div");
      el.className = "stage-box";
      el.innerHTML = `${title ? `<b>${esc(title)}</b>` : ""}<div class="stage-box-body"></div>`;
      $("#petBoxes").appendChild(el);
      engine.boxes.push(el);
      return el.querySelector(".stage-box-body");
    },
  }, "ui");

  const fmtVal = (v) => {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.message;
    if (v && v.nodeType) return `<${(v.tagName || "node").toLowerCase()}>`;
    try { return JSON.stringify(v, (k, x) => (typeof x === "function" ? "ƒ" : x)); } catch (e) { return String(v); }
  };
  const log = (...a) => lab.log("log", a.map(fmtVal).join(" "));
  // готові випадкові числа для коду учня
  const random = (a = 0, b = 1) => +(Math.min(a, b) + Math.random() * Math.abs(b - a)).toFixed(3);
  const randomInt = (a = 0, b = 10) => Math.floor(Math.min(a, b) + Math.random() * (Math.abs(b - a) + 1));
  const pick = (list) => (Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)] : undefined);
  const labConsole = {
    log, info: log, debug: log,
    warn: (...a) => lab.log("warn", a.map(fmtVal).join(" ")),
    error: (...a) => lab.log("error", a.map(fmtVal).join(" ")),
  };
  const tSet = (fn, ms, ...a) => { const id = setTimeout(() => { engine.timers.delete(id); runUser(fn, a, "timer"); }, ms); engine.timers.add(id); return id; };
  const tInt = (fn, ms, ...a) => { const id = setInterval(() => { if (isLeader) runUser(fn, a, "timer"); }, Math.max(200, +ms || 0)); engine.timers.add(id); return id; };
  const tClear = (id) => { clearTimeout(id); clearInterval(id); engine.timers.delete(id); };

  /* ---------- Запуск коду учня ---------- */
  let runNo = 0, curBlob = "", loadingBlob = false;
  // Часті пастки новачків, які не є помилкою JavaScript, але ламають задум
  function lintCode(code) {
    code.split("\n").forEach((line, i) => {
      if (line.includes("`") || /^\s*\/\//.test(line)) return;
      if (/(["'])[^"']*\$\{[^}]*\}[^"']*\1/.test(line)) {
        lab.log("warn", `${lab.where(i + 1)}: \${…} у звичайних лапках не підставиться — візьми зворотні лапки \`…\` (бектик, клавіша під Esc).`);
      }
    });
  }

  function runCode(code, { auto, remote } = {}) {
    engine.reset();
    lab.clearMarks();
    if (!auto && !remote) lintCode(code);
    runNo++;
    const src = `window.__t1lab = async function (pet, ai, memory, ui, log, console, setTimeout, setInterval, clearTimeout, clearInterval, random, randomInt, pick) {\n${code}\n};`;
    if (curBlob) URL.revokeObjectURL(curBlob);
    curBlob = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const url = curBlob;
    loadingBlob = true;
    return new Promise((resolve) => {
      let syntaxErr = null;
      const onErr = (ev) => { if (ev.filename === url) { syntaxErr = ev; ev.preventDefault(); } };
      window.addEventListener("error", onErr);
      const s = document.createElement("script");
      s.src = url;
      s.onload = s.onerror = () => {
        loadingBlob = false;
        window.removeEventListener("error", onErr);
        s.remove();
        const fn = window.__t1lab;
        window.__t1lab = null;
        if (syntaxErr || typeof fn !== "function") {
          const line = syntaxErr ? syntaxErr.lineno - 1 : 0;
          lab.reportError(syntaxErr ? syntaxErr.error || new SyntaxError(syntaxErr.message) : new Error("Код не вдалося запустити."), line);
          resolve(false);
          return;
        }
        if (remote) lab.log("info", "Код оновлено й запущено з іншої вкладки.");
        else if (!auto) lab.log("ok", `Запуск №${runNo}`);
        // автозапуск і запуск «за компанію» з іншої вкладки не розсилають репліки назад
        const prevRemote = sync.remote;
        if (auto || remote) sync.remote = true;
        runUser(() => fn(pet, ai, memory, ui, log, labConsole, tSet, tInt, tClear, tClear, random, randomInt, pick), [], "run");
        sync.remote = prevRemote;
        if (/\.get(Hours|Day|Minutes)\s*\(/.test(code) || (engine.handlers.return || []).length) questFlag("time-used");
        resolve(true);
      };
      document.head.appendChild(s);
    });
  }
  // помилки в коді учня, які не впіймав runUser (наприклад, у власних обробниках подій DOM)
  window.addEventListener("error", (ev) => { if (!loadingBlob && curBlob && ev.filename === curBlob) { lab.reportError(ev.error || new Error(ev.message), ev.lineno - 1); ev.preventDefault(); } });
  window.addEventListener("unhandledrejection", (ev) => {
    const st = ev.reason && ev.reason.stack;
    if ((curBlob && st && st.includes(curBlob)) || ev.reason instanceof BrainError) { lab.reportError(ev.reason); ev.preventDefault(); }
  });

  /* ==========================================================================
     РЕПЛІКИ І ЧАТ — усе, що каже зразок, потрапляє у вкладку «Чат»
     ========================================================================== */
  const BUBBLE_MAX = 120;
  const chatLog = load(LS.chat, []);
  function logChat(w, text, src) {
    chatLog.push({ w, t: String(text), at: Date.now(), src: src || "" });
    while (chatLog.length > 150) chatLog.shift();
    save(LS.chat, chatLog);
    lab.renderChat(true);
  }
  // Репліка зразка: бульбашка (обрізана, якщо довга) + запис у чат
  function petSay(text, src) {
    text = noEmoji(text);
    if (!text) return;
    let shown = text;
    if (text.length > BUBBLE_MAX) {
      const cut = text.slice(0, BUBBLE_MAX);
      shown = cut.slice(0, Math.max(cut.lastIndexOf(" "), 90)) + "… (далі — у «Чаті»)";
    }
    engine.creature.say(shown);
    engine.creature.bubbleEl.classList.toggle("more", shown !== text);
    if (!sync.remote) logChat("pet", text, src);
  }

  /* ==========================================================================
     БАЛАКУЧІСТЬ — щоб зразок був живим, але не набридав
     ========================================================================== */
  const chatter = {
    lastActivity: Date.now(),
    lastLine: Date.now(),
    focusUntil: 0,
    labVisible: false,
    used: new Set(),
    get focus() { return Date.now() < this.focusUntil || lab.editorFocused(); },
    pick(list) {
      const fresh = list.filter((l) => !this.used.has(l));
      const l = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length || list.length))];
      this.used.add(l);
      return l;
    },
    tick() {
      const c = engine.creature;
      c.quiet = this.focus;
      c.focusEl = lab.editorBox();
      const now = Date.now();
      if (!isLeader || state.quiet || this.focus || document.hidden || !this.labVisible || state.sleeping) return;
      if (now - this.lastActivity < 45000 || now - this.lastLine < 4 * 60000) return;
      if (!c.bubbleEl.hidden) return;
      const s = state.stats;
      let list = LINES.ok;
      if (!apiKey) list = LINES.nobrain;
      else if (s.food < 25) list = LINES.food;
      else if (s.energy < 25) list = LINES.energy;
      else if (s.mood < 30) list = LINES.mood;
      petSay(this.pick(list), "сам");
      this.lastLine = now;
    },
  };
  ["pointerdown", "keydown", "wheel"].forEach((ev) => addEventListener(ev, () => { chatter.lastActivity = Date.now(); }, { passive: true }));

  /* ---------- Чат ---------- */
  async function onChat(text) {
    text = text.trim();
    if (!text) return;
    const c = engine.creature;
    lab.showUserLine(text);
    logChat("me", text);
    if (state.sleeping) { engine.wake(); c.emote("angry", 1200); }
    if ((engine.handlers.chat || []).length) { engine.emit("chat", text); return; }
    if (!apiKey) { c.emote("think", 1600); petSay("Без мозку я тільки кліпаю. Встав ключ Gemini у вкладці «Мозок»."); return; }
    c.emote("think", 30000);
    c.say("", { thinking: true });
    engine.history.push({ role: "user", parts: [{ text }] });
    engine.history = engine.history.slice(-10);
    try {
      const reply = await withThinking("чат", text, () => gemini({ system: systemPrompt(), contents: engine.history }));
      engine.history.push({ role: "model", parts: [{ text: reply }] });
      c.temp = null; c.render();
      petSay(reply);
      questFlag("chat-ok");
      if (charOwnLength(state.character) >= CHAR_MIN) questFlag("char-ok");
    } catch (err) {
      engine.history.pop();
      c.temp = null; c.render();
      c.emote("glitch", 1200);
      c.say(err.kind === "no_key" ? err.message : "Мій мозок не відповідає. Подивись у вкладку «Мозок».");
      logChat("sys", err.message);
      setBrain(err.kind === "minute" || err.kind === "busy" ? brain.status : "error", err.message);
      lab.log("error", "Чат: " + err.message);
    }
  }

  /* ---------- Свій характер: заготовки не рахуються ---------- */
  const CHAR_MIN = 80;
  function charOwnLength(text) {
    let t = String(text || "");
    PRESETS.forEach((p) => { t = t.split(p.text).join(""); });
    return t.replace(/\s+/g, " ").trim().length;
  }

  /* ==========================================================================
     КВЕСТ
     ========================================================================== */
  const FLAG_QUEST = {
    "chat-ok": "s-brain", "brain-ok": "s-brain", "named": "s-name", "char-ok": "s-char",
    "action-used": "n-action", "tick-effect": "n-react", "stat-added": "n-stat", "ai-user": "n-ai",
    "ai-json": "p-json", "memory-used": "p-memory", "time-used": "p-time", "part-added": "p-part",
  };
  function questFlag(flag) {
    const q = FLAG_QUEST[flag];
    if (q && !questState.done[q]) completeQuest(q, true);
  }
  function completeQuest(id, auto) {
    questState.done[id] = true;
    save(LS.quest, questState);
    renderQuests(true);
    const q = QUESTS.find((x) => x.id === id);
    if (auto && q) {
      lab.toast(`Квест виконано: ${q.t} <b>+${q.xp} XP</b>`);
      const c = engine.creature;
      if (c) { c.emote("happy", 1600); c.fx("spark", 3); }
      if (QUESTS.filter((x) => x.lv === q.lv).every((x) => questState.done[x.id])) confetti();
    }
  }
  let exampleWarned = {};
  function exampleUsed(kind, name) {
    if (!EXAMPLE[kind].includes(String(name).trim().toLowerCase())) return false;
    if (!exampleWarned[kind + name]) {
      exampleWarned[kind + name] = 1;
      lab.toast("Це приклад із гайду — він працює, але квест зарахується за твій власний варіант.", "info");
    }
    return true;
  }

  function questXp() { return QUESTS.filter((q) => questState.done[q.id]).reduce((s, q) => s + q.xp, 0); }
  const QMAX = QUESTS.reduce((s, q) => s + q.xp, 0);

  // текст квестів: {id} / {id|текст} — посилання в довідник, `код` — код
  function rich(text) {
    return esc(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\{([\w.]+)(?:\|([^}]+))?\}/g, (m, id, label) => {
        const d = DOC[id];
        if (!d) return label || id;
        return `<a href="#doc/${id}" class="doc-link" data-doc="${id}">${label || esc(docLabel(d))}</a>`;
      });
  }
  const codeBlock = (code, insert) => `<div class="g-code"><pre>${esc(code)}</pre><div class="g-code-btns">
      ${insert ? `<button type="button" data-insert>${ico("play")} Вставити в редактор</button>` : ""}
      <button type="button" data-copy-code>${ico("copy")} Копіювати</button></div></div>`;

  const openHelp = new Set();
  function questHelp(q) {
    const L = LEVELS[q.lv];
    const open = openHelp.has(q.id);
    if (L.help === "guide") {
      return `<div class="q-help">
        <button class="q-hint-btn${open ? " on" : ""}" type="button" data-guide="${q.id}" aria-expanded="${open}">${ico("book")} ${open ? "Сховати гайд" : "Гайд крок за кроком"}</button>
        ${open ? `<ol class="guide">${q.guide.map((s) => `<li><b>${esc(s.h)}</b><p>${rich(s.p)}</p>${s.code ? codeBlock(s.code, s.insert) : ""}</li>`).join("")}</ol>` : ""}
      </div>`;
    }
    if (L.help === "hints") {
      const shown = questState.hints[q.id] || 0;
      return `<div class="q-help">
        ${q.hints.slice(0, shown).map((h, i) => `<p class="q-hint"><b>Підказка ${i + 1}.</b> ${rich(h)}</p>`).join("")}
        ${shown < q.hints.length ? `<button class="q-hint-btn" type="button" data-hint="${q.id}">${ico("bulb")} ${shown ? `Ще підказка (${shown + 1}/${q.hints.length})` : "Підказка"}</button>` : ""}
      </div>`;
    }
    return `<div class="q-help">
      <button class="q-hint-btn${open ? " on" : ""}" type="button" data-guide="${q.id}" aria-expanded="${open}">${ico("target")} ${open ? "Сховати" : "Що треба зробити"}</button>
      ${open ? `<p class="q-hint q-info">${rich(q.info)}</p>` : ""}
    </div>`;
  }

  function questHtml(withHelp) {
    return LEVELS.map((L) => {
      const qs = QUESTS.filter((q) => q.lv === L.n);
      const done = qs.filter((q) => questState.done[q.id]).length;
      const pct = Math.round((done / qs.length) * 100);
      return `<div class="level${pct === 100 ? " complete" : ""}" style="--c:${L.c}">
        <div class="level-head"><span class="level-badge">${L.n}</span><div><h3>${L.name}</h3><small>${L.sub}</small></div><span class="level-pct">${pct}%</span></div>
        <ul class="quests">${qs.map((q) => {
          const isDone = !!questState.done[q.id];
          const box = q.auto
            ? `<span class="q-row${isDone ? " done" : ""}" title="${isDone ? "Зараховано" : "Зарахується автоматично, коли лабораторія побачить, що все працює"}"><span class="q-box auto${isDone ? " on" : ""}"></span><span class="q-text">${esc(q.t)} <span class="q-auto">авто</span></span><span class="q-xp">+${q.xp}</span></span>`
            : `<label><input type="checkbox" data-q="${q.id}" ${isDone ? "checked" : ""}><span class="q-box"></span><span class="q-text">${esc(q.t)}</span><span class="q-xp">+${q.xp}</span></label>`;
          return `<li class="q-item">${box}${withHelp ? questHelp(q) : ""}</li>`;
        }).join("")}</ul>
      </div>`;
    }).join("");
  }

  let lastRank = null;
  function renderQuests(fromUser) {
    const xp = questXp();
    const rank = [...RANKS].reverse().find((r) => xp >= r.xp);
    $$("[data-quest-list]").forEach((box) => {
      const st = box.closest(".lp") ? box.closest(".lp").scrollTop : 0;
      box.innerHTML = questHtml(box.dataset.questList === "hints");
      if (box.closest(".lp")) box.closest(".lp").scrollTop = st;
    });
    $$("[data-xp-num]").forEach((el) => (el.textContent = xp));
    $$("[data-xp-max]").forEach((el) => (el.textContent = QMAX));
    $$("[data-xp-fill]").forEach((el) => (el.style.width = (xp / QMAX) * 100 + "%"));
    $$("[data-xp-rank]").forEach((el) => (el.textContent = rank.name));
    $$("[data-xp-icon]").forEach((el) => {
      el.innerHTML = ico(rank.icon);
      if (fromUser && rank !== lastRank && lastRank) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
    });
    lastRank = rank;
  }

  function initQuest() {
    document.addEventListener("change", (e) => {
      const b = e.target.closest("input[data-q]");
      if (!b) return;
      const id = b.dataset.q;
      const q = QUESTS.find((x) => x.id === id);
      if (!q || q.auto) return;
      if (b.checked) {
        floatXP(b, q.xp);
        completeQuest(id, false);
        if (QUESTS.filter((x) => x.lv === q.lv).every((x) => questState.done[x.id])) confetti();
      } else {
        delete questState.done[id];
        save(LS.quest, questState);
        renderQuests(true);
      }
    });
    document.addEventListener("click", (e) => {
      const hint = e.target.closest("[data-hint]");
      if (hint) {
        questState.hints[hint.dataset.hint] = (questState.hints[hint.dataset.hint] || 0) + 1;
        save(LS.quest, questState);
        renderQuests(false);
        return;
      }
      const g = e.target.closest("[data-guide]");
      if (g) {
        const id = g.dataset.guide;
        if (openHelp.has(id)) openHelp.delete(id); else openHelp.add(id);
        renderQuests(false);
        return;
      }
      const ins = e.target.closest("[data-insert]");
      if (ins && lab.editor) {
        const code = ins.closest(".g-code").querySelector("pre").textContent;
        const cur = lab.editor.get().replace(/\s+$/, "");
        lab.editor.set(cur + "\n\n" + code + "\n");
        lab.codeChanged();
        lab.openTab("code");
        lab.toast("Код вставлено в кінець редактора. Тепер натисни «Запустити».", "info");
        return;
      }
      const cp = e.target.closest("[data-copy-code]");
      if (cp) { copyText(cp.closest(".g-code").querySelector("pre").textContent, cp); return; }
      const dl = e.target.closest("[data-doc]");
      if (dl && !(e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); lab.openDoc(dl.dataset.doc); }
    });
    renderQuests(false);
  }

  function floatXP(input, xp) {
    const r = input.closest("label").querySelector(".q-xp").getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = "+" + xp + " XP";
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
    const cols = ["#ff6fb5", "#ffd23f", "#b4f04b", "#4fd8e8", "#b79cff", "#fff"];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(t) {
      const life = (t - t0) / 2400;
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.globalAlpha = Math.max(0, 1 - life); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); g.restore();
      });
      if (life < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ==========================================================================
     ЛАБОРАТОРІЯ (інтерфейс)
     ========================================================================== */
  /* ---------- Файли коду: main.js + свої ----------
     Усі файли виконуються разом, в одній області видимості: спершу додаткові
     (зліва направо), main.js — останнім. Тож у main.js можна користуватися
     функціями й змінними з інших файлів. */
  const files = {
    data: null,
    load() {
      let d = load(LS.files, null);
      if (!d || !Array.isArray(d.order) || !d.src) d = { order: ["main.js"], src: { "main.js": load(LS.code, null) ?? STARTER }, active: "main.js" };
      if (typeof d.src["main.js"] !== "string") d.src["main.js"] = "";
      d.order = ["main.js"].concat(d.order.filter((n) => n !== "main.js" && typeof d.src[n] === "string"));
      if (!d.order.includes(d.active)) d.active = "main.js";
      this.data = d;
    },
    save() { save(LS.files, this.data); },
    runOrder() { return this.data.order.filter((n) => n !== "main.js").concat("main.js"); },
    // один спільний код для запуску + карта: який рядок з якого файлу
    combined() {
      const parts = [], map = [];
      let line = 1;
      this.runOrder().forEach((name) => {
        const src = this.data.src[name] || "";
        const count = src.split("\n").length;
        map.push({ name, start: line, count });
        parts.push(src);
        line += count + 1; // +1 — рядок-роздільник «;» між файлами
      });
      return { code: parts.join("\n;\n"), map };
    },
    where(map, line) {
      for (const f of map || []) if (line >= f.start && line < f.start + f.count) return { name: f.name, line: line - f.start + 1 };
      return null;
    },
    others(except) { return this.runOrder().filter((n) => n !== except).map((n) => this.data.src[n] || "").join("\n;\n"); },
    isDefault() { return this.data.order.length === 1 && (this.data.src["main.js"] || "") === STARTER; },
    validName(raw, except) {
      let n = String(raw || "").trim().replace(/\s+/g, "-");
      if (!n) return null;
      if (!/\.js$/i.test(n)) n += ".js";
      if (!/^[A-Za-z_][\w-]{0,24}\.js$/.test(n)) { alert("Назва файлу — латиницею, без пробілів, наприклад game.js"); return null; }
      if (n === "main.js" || (n !== except && this.data.src[n] !== undefined)) { alert(`Файл ${n} уже є.`); return null; }
      return n;
    },
  };

  const CM_URL = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";
  const loadScript = (src) => new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });

  const lab = {
    el: null, editor: null, cm: null, errLine: null, focused: false,

    init() {
      this.el = $("#labApp");
      if (!this.el) return false;
      this.consoleEl = $("#labConsole");
      this.renderHead();
      this.renderStats();
      this.renderActions();
      this.updateBrain();
      this.updateQuota();
      this.initBrainTab();
      this.initCharTab();
      this.initCodeTab();
      this.initDocs();
      this.initChatTab();
      this.initBar();
      $("#petChat").addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = $("#petChatInput");
        onChat(inp.value);
        inp.value = "";
      });
      $("#petActions").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-act]");
        if (!b) return;
        const [kind, i] = b.dataset.act.split(":");
        const act = kind === "base" ? BASE_ACTIONS[+i] : engine.userActions[+i];
        if (!act) return;
        // захист від спаму: поки дія працює (або щойно спрацювала) — кнопка не реагує
        if (act.busy || Date.now() - (act.lastAt || 0) < 600) {
          b.classList.remove("deny"); void b.offsetWidth; b.classList.add("deny");
          return;
        }
        act.lastAt = Date.now();
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
        if (kind === "base") act.run();
        else {
          if (state.sleeping) engine.wake();
          engine.curAction = act.label;
          const r = runUser(act.fn, [], "action");
          engine.curAction = "";
          if (r && typeof r.then === "function") {
            act.busy = true; this.renderActions();
            r.finally(() => { act.busy = false; this.renderActions(); });
          }
          if (!exampleUsed("actions", act.label)) questFlag("action-used");
        }
        engine.emit("action", kind === "base" ? BASE_ACTIONS[+i].label : engine.userActions[+i].label);
        saveState();
      });
      new IntersectionObserver((en) => { chatter.labVisible = en[0].isIntersecting; }, { threshold: 0.25 }).observe(this.el);
      return true;
    },

    /* --- верхня панель --- */
    initBar() {
      const full = $("#labFull"), quiet = $("#labQuiet");
      const setFull = (on) => {
        if (on === this.el.classList.contains("is-full")) return;
        // на весь екран лабораторія переїжджає в <body>: всередині .page її перекриває шапка сайту
        if (on) {
          this.ph = document.createElement("div");
          this.ph.style.height = this.el.offsetHeight + "px";
          this.el.replaceWith(this.ph);
          document.body.appendChild(this.el);
        } else if (this.ph) {
          this.ph.replaceWith(this.el);
          this.ph = null;
          this.el.scrollIntoView({ block: "center" });
        }
        this.el.classList.toggle("is-full", on);
        document.documentElement.classList.toggle("t1-lab-open", on);
        full.innerHTML = on ? `${ico("shrink")}<span>Згорнути</span>` : `${ico("expand")}<span>На весь екран</span>`;
        full.setAttribute("aria-pressed", on);
        if (this.cm) { setTimeout(() => this.cm.refresh(), 60); setTimeout(() => this.cm.refresh(), 450); }
      };
      full.addEventListener("click", () => setFull(!this.el.classList.contains("is-full")));
      addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.el.classList.contains("is-full") && !document.querySelector("dialog[open]") && !this.editorFocused()) setFull(false);
      });
      this.setFull = setFull;
      const setQuiet = this.setQuietUi = () => {
        quiet.setAttribute("aria-pressed", state.quiet);
        quiet.innerHTML = state.quiet ? `${ico("bell-off")}<span>Не турбувати</span>` : `${ico("bell")}<span>Не турбувати</span>`;
        quiet.title = state.quiet ? "Зразок не говорить сам (увімкнено)" : "Зразок іноді говорить сам, коли ти нічого не робиш";
      };
      quiet.addEventListener("click", () => {
        state.quiet = !state.quiet; saveState(); setQuiet();
        engine.creature.emote(state.quiet ? "bored" : "happy", 1200);
      });
      setQuiet();
      $$("[data-open-lab]").forEach((a) => a.addEventListener("click", (e) => {
        e.preventDefault();
        setFull(true);
        const tab = a.dataset.openLab && $(`#lab-tab-${a.dataset.openLab}`);
        if (tab) tab.click();
      }));
    },
    openTab(name) { const t = $(`#lab-tab-${name}`); if (t) t.click(); },

    /* --- зразок: шапка, показники, дії --- */
    renderHead() {
      $("#petName").textContent = state.name;
      $("#petDna").textContent = state.dna;
    },
    renderStats() {
      const box = $("#petStats");
      if (!box) return;
      const defs = engine.statDefs();
      const sig = defs.map((d) => d.id).join(",");
      if (box.dataset.sig !== sig) {
        box.dataset.sig = sig;
        box.innerHTML = defs.map((d) => `<div class="stat${d.user ? " user" : ""}" data-stat="${d.id}" style="--c:${Zrazok.COLORS[d.color] ? `var(--${d.color})` : esc(d.color)}" title="${esc(d.label)} · pet.stats.${d.id}">
          <span class="stat-ico">${ico(d.icon)}</span><span class="stat-name">${esc(d.label)}</span>
          <span class="stat-bar"><i></i></span><b class="stat-val"></b></div>`).join("");
      }
      defs.forEach((d) => {
        const row = box.querySelector(`[data-stat="${d.id}"]`);
        const v = Math.round(engine.statValue(d.id));
        row.querySelector("i").style.width = v + "%";
        row.querySelector(".stat-val").textContent = v;
        row.classList.toggle("low", v < 25);
      });
    },
    statDiff(id, d) {
      const row = $(`#petStats [data-stat="${id}"]`);
      if (!row) return;
      const el = document.createElement("span");
      el.className = "stat-diff " + (d > 0 ? "up" : "down");
      el.textContent = (d > 0 ? "+" : "") + d;
      row.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    },
    renderActions() {
      const box = $("#petActions");
      if (!box) return;
      box.innerHTML = BASE_ACTIONS.map((a, i) => {
        const label = state.sleeping && a.wakeLabel ? a.wakeLabel : a.label;
        return `<button type="button" class="act" data-act="base:${i}">${ico(state.sleeping && a.wakeLabel ? "sparkles" : a.icon)}<span>${label}</span></button>`;
      }).join("") + engine.userActions.map((a, i) => `<button type="button" class="act user${a.busy ? " busy" : ""}" data-act="user:${i}" ${a.busy ? 'aria-busy="true" title="Працює… зачекай"' : ""}>${ico(esc(a.icon))}<span>${esc(a.label)}</span></button>`).join("");
    },
    showUserLine(text) {
      const el = $("#petChatLast");
      el.innerHTML = `<b>Ти:</b> ${esc(text)}`;
      el.hidden = false;
      clearTimeout(this._ul);
      this._ul = setTimeout(() => { el.hidden = true; }, 9000);
    },

    /* --- статуси --- */
    updateBrain(msg) {
      const chip = $("#labBrain");
      if (!chip) return;
      const st = brain.status;
      const txt = { none: "без мозку", unknown: "ключ є", ok: "мозок працює", error: "мозок: помилка" }[st] || st;
      chip.className = "lab-chip brain-" + st;
      chip.innerHTML = `<i></i>${txt}`;
      const ks = $("#keyStatus");
      if (ks && msg !== undefined) { ks.textContent = msg; ks.className = "lab-status " + (st === "ok" ? "ok" : st === "error" ? "err" : ""); }
    },
    setThinking(on) {
      const el = $("#labThink");
      if (el) el.hidden = !on;
    },
    updateQuota() {
      const n = usage(0);
      $$("[data-usage]").forEach((el) => (el.textContent = n));
    },

    /* --- вкладка «Мозок» --- */
    renderVoices() {
      const sel = $("#voiceSel");
      if (!sel) return;
      const P = voice.piper;
      const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
      sel.innerHTML = opt("auto", "Авто — найкращий доступний")
        + `<optgroup label="Piper — працює в будь-якому браузері й на телефоні">${PIPER_SPEAKERS.map((s) => opt("piper:" + s.id, s.name)).join("")}</optgroup>`
        + (voice.list.length ? `<optgroup label="Голоси цього браузера">${voice.list.map((v) => opt(v.name, v.name)).join("")}</optgroup>` : "")
        + `<optgroup label="Інше">${opt("gemini", "Gemini TTS (з ключем, ~10–15 фраз на день)")}</optgroup>`;
      sel.value = [...sel.options].some((o) => o.value === state.voice) ? state.voice : "auto";
      const e = voice.engine();
      let st = `Зараз звучатиме: <b>${esc(voice.describe())}</b>.`;
      if (e.kind === "piper") {
        st += P.ready || P.cached ? " Голос уже завантажений — працює навіть без інтернету."
          : P.loading ? ` Завантаження голосу: <b>${P.pct}%</b> (~77 МБ, лише перший раз).`
          : " Перший раз завантажиться ~77 МБ (потім — з кешу).";
      } else if (e.kind === "native") {
        st += " Це вбудований голос браузера — звучить миттєво.";
      }
      $("#voiceStatus").innerHTML = st;
    },
    initBrainTab() {
      this.renderVoices();
      $("#voiceSel").addEventListener("change", (e) => { state.voice = e.target.value; saveState(); this.renderVoices(); });
      $("#voiceTest").addEventListener("click", () => {
        voice.unlockAudio();
        const t = `Привіт! Я ${state.name}. Так звучить мій голос.`;
        petSay(t);
        voice.speak(t);
      });
      const inp = $("#keyInput"), form = $("#keyForm");
      inp.value = apiKey;
      $("#keyShow").addEventListener("click", () => {
        inp.type = inp.type === "password" ? "text" : "password";
        $("#keyShow").setAttribute("aria-pressed", inp.type === "text");
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const v = inp.value.trim().replace(/^["']|["']$/g, "");
        if (!v) { this.updateBrain("Встав ключ у поле."); return; }
        apiKey = v; save(LS.key, apiKey);
        brain.status = "unknown";
        this.updateBrain("Перевіряю…");
        try {
          await gemini({ contents: [{ role: "user", parts: [{ text: "Відповідай одним словом: працюю" }] }] });
          setBrain("ok", "Готово: мозок підключено. Напиши зразку щось у чат.");
          engine.creature.emote("shock", 900);
          setTimeout(() => { engine.creature.emote("happy", 1800); engine.creature.fx("spark", 4); petSay("О. Я думаю. Я ДУМАЮ!"); }, 900);
        } catch (err) {
          setBrain(err.kind === "minute" || err.kind === "daily" ? "unknown" : "error", err.message);
        }
      });
      $("#keyForget").addEventListener("click", () => {
        apiKey = ""; drop(LS.key); inp.value = "";
        brain.status = "none";
        this.updateBrain("Ключ видалено з цього браузера.");
        engine.creature.emote("sleepy", 1500);
      });
      const sel = $("#modelSel");
      sel.innerHTML = MODELS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join("");
      if (!MODELS.some((m) => m.id === state.model)) sel.insertAdjacentHTML("beforeend", `<option value="${esc(state.model)}">${esc(state.model)}</option>`);
      sel.value = state.model;
      sel.addEventListener("change", () => { state.model = sel.value; saveState(); });
      $("#modelCustom").addEventListener("change", (e) => {
        const v = e.target.value.trim();
        if (!v) return;
        if (![...sel.options].some((o) => o.value === v)) sel.insertAdjacentHTML("beforeend", `<option value="${esc(v)}">${esc(v)}</option>`);
        sel.value = v; state.model = v; saveState(); e.target.value = "";
      });
    },

    /* --- вкладка «Характер» --- */
    initCharTab() {
      const name = $("#charName"), dna = $("#charDna"), txt = $("#charText");
      name.value = state.name; dna.value = state.dna; txt.value = state.character;
      const applyDna = (d, from) => {
        const n = Zrazok.normDna(d);
        if (!n) { dna.classList.add("bad"); return; }
        dna.classList.remove("bad");
        state.dna = n; dna.value = n; saveState();
        engine.creature.emote("glitch", 420);
        setTimeout(() => {
          engine.creature.setDna(n);
          engine.creature.emote("shock", 900);
          this.renderHead(); this.syncMiniPets();
        }, reduced ? 0 : 300);
        if (from !== "load") checkNamed();
      };
      const checkNamed = () => { if (state.name.trim() && state.name !== "Зразок") questFlag("named"); };
      name.addEventListener("input", () => { state.name = name.value.trim().slice(0, 24) || "Зразок"; this.renderHead(); saveState(); });
      name.addEventListener("change", checkNamed);
      $("#dnaRandom").addEventListener("click", () => applyDna(Zrazok.randomDna()));
      $("#dnaName").addEventListener("click", () => applyDna(Zrazok.dnaFromName(name.value || state.name)));
      dna.addEventListener("change", () => applyDna(dna.value));
      const meter = () => {
        const n = charOwnLength(txt.value);
        const isPreset = PRESETS.some((p) => txt.value.includes(p.text));
        const ok = n >= CHAR_MIN;
        $("#charMeter").className = "char-meter" + (ok ? " ok" : "");
        $("#charMeter").innerHTML = `<span class="cm-bar"><i style="width:${Math.min(100, (n / CHAR_MIN) * 100)}%"></i></span>
          <span>${ok ? `${ico("check")} Свого тексту достатньо (${n} символів). Тепер напиши зразку в чат.` : `Своїх символів: <b>${n}</b> з ${CHAR_MIN}${isPreset ? " — текст заготовки не рахується, допиши своє" : ""}`}</span>`;
      };
      meter();
      let t;
      txt.addEventListener("input", () => {
        meter();
        clearTimeout(t);
        t = setTimeout(() => { state.character = txt.value.slice(0, 3000); saveState(); this.flashSaved($("#charSaved")); }, 500);
      });
      $("#charPresets").innerHTML = PRESETS.map((p, i) => `<button type="button" class="chip" data-preset="${i}">${esc(p.name)}</button>`).join("");
      $("#charPresets").addEventListener("click", (e) => {
        const b = e.target.closest("[data-preset]");
        if (!b) return;
        const p = PRESETS[+b.dataset.preset];
        if (txt.value.trim() && !confirm("Замінити поточний характер заготовкою?")) return;
        txt.value = p.text + "\n";
        txt.dispatchEvent(new Event("input"));
        txt.focus();
      });
    },
    flashSaved(el) {
      if (!el) return;
      el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    },

    /* --- вкладка «Код» --- */
    initCodeTab() {
      const host = $("#labEditor");
      files.load();
      this.docs = {};
      const code = files.data.src[files.data.active];
      const done = (cmOk) => {
        if (cmOk && window.CodeMirror) {
          host.innerHTML = "";
          this.cm = CodeMirror(host, {
            value: code, mode: "javascript", theme: "zlab", lineNumbers: true, tabSize: 2, indentUnit: 2,
            matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
            extraKeys: { "Ctrl-Enter": () => this.run(), "Cmd-Enter": () => this.run(), Tab: (cm) => cm.execCommand("insertSoftTab") },
          });
          this.docs[files.data.active] = this.cm.getDoc();
          this.cm.on("change", () => this.codeChanged());
          this.cm.on("focus", () => { this.focused = true; chatter.focusUntil = Date.now() + 10000; });
          this.cm.on("blur", () => { this.focused = false; });
          this.cm.on("keydown", () => { chatter.focusUntil = Date.now() + 10000; });
          // шрифт JetBrains Mono довантажується пізніше — переміряти символи, інакше курсор і виділення з'їжджають
          if (document.fonts) {
            document.fonts.ready.then(() => this.cm.refresh());
            document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => this.cm.refresh());
          }
          if (window.ZrazokHints) {
            ZrazokHints.attach(this.cm, {
              docs: DOC, emotions: Zrazok.EMOTIONS, fx: Zrazok.FX, icons: iconNames, colors: Zrazok.COLORS,
              stats: () => engine.statDefs().map((d) => d.id),
              genes: { shape: Zrazok.SHAPES, eyes: Zrazok.EYES, mouth: Zrazok.MOUTHS, top: Zrazok.TOPS, pattern: Zrazok.PATTERNS },
              aiReady: () => !!apiKey,
              aiComplete,
              otherCode: () => files.others(files.data.active),
            });
          }
          this.editor = {
            get: () => this.cm.getValue(), set: (v) => this.cm.setValue(v),
            mark: (line) => { if (line >= 1 && line <= this.cm.lineCount()) { this.errLine = this.cm.addLineClass(line - 1, "background", "cm-err-line"); this.cm.scrollIntoView({ line: line - 1, ch: 0 }, 60); } },
            clear: () => { if (this.errLine) { this.cm.removeLineClass(this.errLine, "background", "cm-err-line"); this.errLine = null; } },
          };
        } else {
          host.innerHTML = `<textarea class="lab-textarea" spellcheck="false" aria-label="Код"></textarea>`;
          const ta = host.querySelector("textarea");
          ta.value = code;
          ta.addEventListener("input", () => this.codeChanged());
          ta.addEventListener("focus", () => { this.focused = true; });
          ta.addEventListener("blur", () => { this.focused = false; });
          ta.addEventListener("keydown", (e) => {
            chatter.focusUntil = Date.now() + 10000;
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.run(); }
            if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end"); }
          });
          this.editor = { get: () => ta.value, set: (v) => { ta.value = v; }, mark() {}, clear() {} };
          this.log("info", "Редактор із підсвіткою не завантажився (немає інтернету?) — працює простий.");
        }
        this.renderFileTabs();
        bootCode();
      };
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = CM_URL + "codemirror.min.css";
      document.head.appendChild(css);
      const css2 = document.createElement("link");
      css2.rel = "stylesheet"; css2.href = CM_URL + "addon/hint/show-hint.min.css";
      document.head.appendChild(css2);
      const timeout = new Promise((_, bad) => setTimeout(bad, 8000));
      Promise.race([
        loadScript(CM_URL + "codemirror.min.js").then(() => Promise.all(["mode/javascript/javascript.min.js", "addon/edit/matchbrackets.min.js", "addon/edit/closebrackets.min.js", "addon/hint/show-hint.min.js"].map((p) => loadScript(CM_URL + p)))),
        timeout,
      ]).then(() => done(true), () => done(false));

      // CodeMirror, створений у прихованій вкладці, треба перемалювати, коли вкладку відкрили
      $("#lab-tab-code").addEventListener("click", (e) => {
        e.currentTarget.classList.remove("has-news");
        if (this.cm) { setTimeout(() => this.cm.refresh(), 30); setTimeout(() => this.cm.refresh(), 400); }
      });
      $("#codeRun").addEventListener("click", () => this.run());
      $("#codeReset").addEventListener("click", () => {
        const many = files.data.order.length > 1;
        if (!confirm(many ? "Повернути початковий шаблон? main.js стане як на початку, а інші файли буде видалено." : "Повернути початковий шаблон? Твій код буде видалено.")) return;
        files.data = { order: ["main.js"], src: { "main.js": STARTER }, active: "main.js" };
        Object.keys(this.docs).forEach((n) => { if (n !== "main.js") delete this.docs[n]; });
        this.switchFile("main.js", true);
        this.editor.set(STARTER);
        this.flushFile();
        this.log("info", "Код скинуто до шаблону.");
      });
      // вкладки файлів
      $("#fileTabs").addEventListener("click", (e) => {
        const del = e.target.closest("[data-del]");
        if (del) {
          const n = del.dataset.del;
          if (!confirm(`Видалити файл ${n}?`)) return;
          delete files.data.src[n];
          files.data.order = files.data.order.filter((x) => x !== n);
          delete this.docs[n];
          if (files.data.active === n) this.switchFile("main.js", true);
          else { files.save(); this.renderFileTabs(); }
          return;
        }
        if (e.target.closest("[data-add-file]")) {
          const n = files.validName(prompt("Назва нового файлу (латиницею), наприклад game.js:", ""));
          if (!n) return;
          files.data.src[n] = `// ${n}\n// Цей файл виконується перед main.js — усе, що тут оголошено, видно в main.js.\n\n`;
          files.data.order.push(n);
          this.switchFile(n);
          return;
        }
        const f = e.target.closest("[data-file]");
        if (f && f.dataset.file !== files.data.active) this.switchFile(f.dataset.file);
      });
      $("#fileTabs").addEventListener("dblclick", (e) => {
        const f = e.target.closest("[data-file]");
        if (!f || f.dataset.file === "main.js") return;
        const old = f.dataset.file;
        const n = files.validName(prompt("Нова назва файлу:", old), old);
        if (!n || n === old) return;
        this.flushFile();
        files.data.src[n] = files.data.src[old]; delete files.data.src[old];
        files.data.order = files.data.order.map((x) => (x === old ? n : x));
        if (this.docs[old]) { this.docs[n] = this.docs[old]; delete this.docs[old]; }
        if (files.data.active === old) files.data.active = n;
        files.save(); this.renderFileTabs();
      });
      $("#consoleClear").addEventListener("click", () => { this.consoleEl.innerHTML = ""; });
      $$("[data-copy-cheat]").forEach((b) => b.addEventListener("click", () => copyText(cheatSheet(), b)));
    },
    renderFileTabs() {
      const box = $("#fileTabs");
      if (!box || !files.data) return;
      const d = files.data;
      box.innerHTML = d.order.map((n) => `<button type="button" class="ft${n === d.active ? " on" : ""}" data-file="${esc(n)}" title="${n === "main.js" ? "Головний файл — виконується останнім" : "Подвійний клік — перейменувати"}">${ico(n === "main.js" ? "star" : "file")}<span>${esc(n)}</span>${n !== "main.js" ? `<i class="ft-x" data-del="${esc(n)}" title="Видалити файл" aria-label="Видалити ${esc(n)}">×</i>` : ""}</button>`).join("")
        + `<button type="button" class="ft ft-add" data-add-file title="Новий файл коду">+ Файл</button>`;
      const hint = $("#fileHint");
      if (hint) {
        hint.hidden = d.order.length < 2;
        hint.innerHTML = `Порядок запуску: ${files.runOrder().map((n) => `<code>${esc(n)}</code>`).join(" → ")}. Усі файли бачать змінні й функції один одного.`;
      }
    },
    // зберегти вміст відкритого файлу в files.data
    flushFile() {
      if (!this.editor || !files.data) return;
      files.data.src[files.data.active] = this.editor.get();
      files.save();
    },
    switchFile(name, noFlush) {
      if (!noFlush) this.flushFile();
      files.data.active = name;
      const src = files.data.src[name] || "";
      if (this.cm) {
        if (!this.docs[name]) this.docs[name] = CodeMirror.Doc(src, "javascript");
        this.cm.swapDoc(this.docs[name]);
        setTimeout(() => this.cm.refresh(), 20);
      } else if (this.editor) {
        this.skipSave = true; this.editor.set(src); this.skipSave = false;
      }
      this.errLine = null;
      files.save();
      this.renderFileTabs();
    },
    codeChanged() {
      if (this.skipSave) { this.skipSave = false; this.clearMarks(); return; }
      clearTimeout(this._cs);
      this._cs = setTimeout(() => { this.flushFile(); this.flashSaved($("#codeSaved")); }, 400);
      this.clearMarks();
    },
    editorFocused() { return this.focused; },
    editorBox() { return $("#labEditor"); },
    clearMarks() { if (this.editor) this.editor.clear(); },
    // запустити всі файли разом (і запам'ятати, де який рядок — для помилок)
    runAll(opts) {
      const c = files.combined();
      this.runMap = c.map;
      return runCode(c.code, opts || {});
    },
    async run() {
      if (!this.editor) return;
      this.flushFile();
      sync.send({ t: "run" });
      const ok = await this.runAll({});
      const c = engine.creature;
      setTimeout(() => {
        if (ok && !this._lastErrAt) { c.nod(); c.fx("spark", 2); }
        this._lastErrAt = 0;
      }, 120);
    },
    // «main.js, рядок 4» для рядка спільного коду
    where(line) {
      const w = files.where(this.runMap, line);
      return w ? (files.data.order.length > 1 ? `${w.name}, рядок ${w.line}` : `Рядок ${w.line}`) : `Рядок ${line}`;
    },

    /* --- консоль --- */
    log(kind, text) {
      const el = this.consoleEl;
      if (!el) return;
      const row = document.createElement("div");
      row.className = "cl " + kind;
      const t = new Date();
      row.innerHTML = `<time>${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}</time><span>${esc(text)}</span>`;
      el.appendChild(row);
      while (el.children.length > 200) el.firstChild.remove();
      el.scrollTop = el.scrollHeight;
      if (kind === "error" || kind === "warn") {
        const tab = $("#lab-tab-code");
        if (tab && tab.getAttribute("aria-selected") !== "true") tab.classList.add("has-news");
      }
    },
    reportError(err, line) {
      if (err instanceof BrainError) {
        this.log("error", "ШІ: " + err.message);
        if (err.kind !== "tick" && err.kind !== "busy" && err.kind !== "json") setBrain(err.kind === "minute" ? brain.status : "error", err.message);
        return;
      }
      if (!line && err && err.stack && curBlob) {
        const m = err.stack.split("\n").map((l) => l.includes(curBlob) && l.match(/:(\d+):(\d+)\)?\s*$/)).find(Boolean);
        if (m) line = +m[1] - 1;
      }
      const msg = (err && err.message) || String(err);
      let hint = "";
      if (/is not defined/.test(msg)) hint = " Можливо, опечатка в назві або змінна не створена. Підказки з'являються самі, поки пишеш (або Ctrl+Space).";
      else if (/is not a function/.test(msg)) hint = " Перевір назву команди в Довіднику.";
      else if (/await is only valid|reserved word/i.test(msg)) hint = " await можна писати тільки всередині async-функції: заміни () => { на async () => {.";
      else if (/Unexpected token|Unexpected end|missing \)|Invalid or unexpected/i.test(msg)) hint = " Схоже, не закрита дужка чи лапка.";
      else if (/Cannot read propert/i.test(msg)) hint = " Щось має значення undefined — перевір, звідки воно береться.";
      const w = line ? files.where(this.runMap, line) : null;
      this.log("error", `${line ? this.where(line) + ": " : ""}${msg}.${hint}`);
      if (w && this.editor) {
        if (w.name !== files.data.active) this.switchFile(w.name);
        this.editor.mark(w.line);
      }
      this._lastErrAt = Date.now();
      const c = engine.creature;
      if (c) {
        c.emote("shock", 900); c.fx("sweat", 1);
        if (!state.quiet && line && Date.now() - (this._errSay || 0) > 60000) {
          this._errSay = Date.now();
          petSay(`${this.where(line)}. Я нічого не чіпав.`);
        }
      }
    },

    /* --- довідник --- */
    initDocs() {
      const box = $("#labDocs");
      if (!box) return;
      const see = (ids) => ids && ids.length ? `<p class="doc-see">Див. також: ${ids.filter((id) => DOC[id]).map((id) => `<a href="#doc/${id}" class="doc-link" data-doc="${id}">${esc(docLabel(DOC[id]))}</a>`).join(", ")}</p>` : "";
      box.innerHTML = DOCS.map((g) => `<div class="doc-group${g.basics ? " basics" : ""}"><h4>${ico(g.icon)} ${esc(g.title)}</h4>
        ${g.icons ? `<p class="doc-desc">${esc(g.items[0].desc)}</p><div class="icon-grid" id="doc-icons"></div>` :
        g.items.map((it) => {
          const rich = it.more || it.ex || it.see;
          return rich ? `<details class="doc-item" id="doc-${it.id.replace(/\./g, "-")}"><summary><code>${esc(it.sig)}</code><span>${esc(it.desc)}</span></summary>
            <div class="doc-more">${it.more ? `<p>${esc(it.more)}</p>` : ""}${it.ex ? codeBlock(it.ex, false) : ""}${see(it.see)}</div></details>`
            : `<div class="doc-item flat" id="doc-${it.id.replace(/\./g, "-")}"><code>${esc(it.sig)}</code><span>${esc(it.desc)}</span></div>`;
        }).join("")}</div>`).join("");
      // сітка іконок (спрайт уже вставлений у сторінку)
      setTimeout(() => {
        $("#doc-icons").innerHTML = iconNames().map((n) => `<button type="button" class="ic" data-icon="${n}" title="Скопіювати «${n}»">${ico(n)}<small>${n}</small></button>`).join("");
      }, 0);
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-icon]");
        if (b) copyText(b.dataset.icon, null, () => this.toast(`Скопійовано назву іконки «${b.dataset.icon}»`, "info"));
      });
    },
    openDoc(id) {
      this.openTab("docs");
      if (id === "icons") { const ic = $("#doc-icons"); if (ic) ic.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
      const el = $("#doc-" + id.replace(/\./g, "-"));
      if (!el) return;
      if (el.tagName === "DETAILS") el.open = true;
      setTimeout(() => {
        el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
        el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      }, 60);
    },

    /* --- вкладка «Чат» --- */
    renderChat(scroll) {
      const box = $("#chatLog");
      if (!box) return;
      if (!chatLog.length) { box.innerHTML = `<p class="chat-empty">Тут буде вся ваша переписка. Напиши зразку щось — у поле нижче або під ним.</p>`; return; }
      const fmt = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
      box.innerHTML = chatLog.map((m) => `<div class="msg from-${m.w}"><p>${esc(m.t)}</p><small>${m.w === "me" ? "ти" : m.w === "sys" ? "помилка" : esc(state.name)}${m.src ? " · " + esc(m.src) : ""} · ${fmt(m.at)}</small></div>`).join("");
      if (scroll) box.scrollTop = box.scrollHeight;
    },
    initChatTab() {
      this.renderChat(true);
      $("#chatForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = $("#chatInput");
        onChat(inp.value);
        inp.value = "";
      });
      $("#chatClear").addEventListener("click", () => {
        if (!chatLog.length || !confirm("Очистити всю переписку?")) return;
        chatLog.length = 0; save(LS.chat, chatLog); engine.history = []; this.renderChat();
      });
      $("#lab-tab-chat").addEventListener("click", () => setTimeout(() => this.renderChat(true), 30));
    },

    toast(html, kind) {
      $$(".lab-toast", this.el).forEach((x) => x.remove());
      const t = document.createElement("div");
      t.className = "lab-toast" + (kind ? " " + kind : "");
      t.innerHTML = `${ico(kind === "info" ? "info" : "trophy")}<span>${html}</span>`;
      this.el.appendChild(t);
      setTimeout(() => t.classList.add("out"), 3600);
      setTimeout(() => t.remove(), 4000);
    },

    syncMiniPets() {
      emoPets.forEach((p) => { p.over = Object.assign({}, engine.creature.over); p.setDna(state.dna); });
    },
  };

  /* ШІ-автодоповнення в редакторі: Gemini дописує вираз у місці курсора */
  async function aiComplete(cm) {
    const cur = cm.getCursor();
    const all = cm.getValue(), idx = cm.indexFromPos(cur);
    const before = all.slice(Math.max(0, idx - 1500), idx), after = all.slice(idx, idx + 300);
    const mark = cm.setBookmark(cur, { insertLeft: true });
    try {
      let text = await withThinking("автодоповнення", cm.getLine(cur.line).trim(), () => gemini({
        system: cheatSheet({ compact: true }) + "\nТи — автодоповнення коду в редакторі лабораторії.",
        contents: [{ role: "user", parts: [{ text: `Код (курсор позначено <КУРСОР>):\n${before}<КУРСОР>${after}\n\nПоверни ТІЛЬКИ текст, який треба вставити замість <КУРСОР>, щоб цікаво завершити поточний вираз чи рядок. Без пояснень, без markdown, до 2 рядків. Не повторюй те, що вже є до і після курсора.` }] }],
      }), { bubble: false });
      text = text.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "").replace(/<КУРСОР>/g, "");
      const pos = mark.find() || cur;
      cm.replaceRange(text, pos, pos, "ai");
      const end = cm.posFromIndex(cm.indexFromPos(pos) + text.length);
      const hl = cm.markText(pos, end, { className: "cm-ai-text" });
      setTimeout(() => hl.clear(), 2500);
      cm.focus();
      lab.log("ok", "ШІ дописав: " + text.replace(/\s+/g, " ").slice(0, 80));
    } catch (e) {
      lab.log("error", "ШІ: " + e.message);
    } finally { mark.clear(); }
  }

  function copyText(text, btn, cb) {
    const done = () => {
      if (cb) cb();
      if (!btn) return;
      const old = btn.innerHTML;
      btn.classList.add("done");
      btn.innerHTML = `${ico("check")} Скопійовано`;
      setTimeout(() => { btn.classList.remove("done"); btn.innerHTML = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
      ta.remove();
    }
  }

  /* ---------- Перший запуск коду при завантаженні ---------- */
  function bootCode() {
    const hung = load(LS.guard, null);
    if (hung) {
      drop(LS.guard);
      lab.log("warn", "Минулого разу твій код завис або впав — тому зараз я його не запускаю. Виправ код і натисни «Запустити».");
      fireReturn();
      return;
    }
    if (!files.isDefault() && files.combined().code.trim()) {
      lab.runAll({ auto: true }).then((ok) => {
        if (ok) lab.log("info", "Твій код запущено автоматично.");
        fireReturn();
      });
    } else {
      lab.log("info", "Привіт! Це консоль лабораторії: тут з'являтимуться log(...) і помилки.");
      fireReturn();
    }
  }
  function fireReturn() {
    const mins = engine.awayMinutes;
    if (mins < 1) return;
    const r = engine.emit("return", mins);
    if (!r.count && mins >= 30 && !state.quiet) {
      engine.creature.emote("bored", 2500);
      setTimeout(() => petSay(`Тебе не було ${fmtAway(mins)}. Я рахував.`), 800);
    }
  }
  function fmtAway(m) {
    if (m < 60) return `${m} хв`;
    if (m < 60 * 24) return `${Math.round(m / 60)} год`;
    return `${Math.round(m / 1440)} дн.`;
  }

  /* ==========================================================================
     HERO, СІТКА ЕМОЦІЙ, СЛОВНИК
     ========================================================================== */
  const emoPets = [];
  function initHero() {
    const host = $("#heroPet");
    if (!host) return;
    const c = new Zrazok.Creature(host, { dna: Zrazok.randomDna(), bubble: false });
    const dnaEl = $("#heroDna");
    const show = () => { if (dnaEl) dnaEl.textContent = c.dna; };
    show();
    const emos = ["happy", "smug", "love", "think", "shock", "neutral", "bored"];
    let busy = false;
    const mutate = () => {
      if (busy) return;
      busy = true;
      c.emote("glitch", 380);
      setTimeout(() => {
        c.setDna(Zrazok.randomDna());
        c.emote(emos[Math.floor(Math.random() * emos.length)], 2600);
        c.hop(0.6);
        show();
        busy = false;
      }, 320);
    };
    c.onPoke = mutate;
    if (!reduced) setInterval(() => { if (c.visible && !document.hidden) mutate(); }, 4200);
  }

  function initEmoGrid() {
    const grid = $("#emoGrid");
    if (!grid) return;
    grid.innerHTML = Zrazok.EMOTIONS.map((e) => `<button type="button" class="emo-card" data-emo="${e}"><span class="emo-pet"></span><code>"${e}"</code></button>`).join("");
    $$(".emo-card", grid).forEach((b) => {
      const p = new Zrazok.Creature($(".emo-pet", b), { dna: state.dna, idle: false, bubble: false, clickable: false, follow: false });
      p.setEmotion(b.dataset.emo);
      emoPets.push(p);
      b.addEventListener("click", () => {
        p.emote(b.dataset.emo, 2000);
        if (b.dataset.emo === "angry") p.shake(); else if (b.dataset.emo === "sad") p.nod(); else p.hop(0.7);
      });
    });
  }

  function initFlips() {
    $$(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("flipped")));
  }

  /* ==========================================================================
     СТАРТ
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    initHero();
    initFlips();
    initQuest();
    if (!lab.init()) { initEmoGrid(); return; }

    // зразок
    const away = Math.floor((Date.now() - (state.lastSeen || Date.now())) / 60000);
    engine.awayMinutes = away;
    if (away > 0) engine.decay(Math.min(away, 60 * 24 * 3), 50);
    engine.creature = new Zrazok.Creature($("#labPet"), { dna: state.dna });
    engine.creature.onPoke = () => {
      if (state.sleeping) { engine.wake(); engine.creature.emote("angry", 1500); petSay("Я СПАВ."); return; }
      const r = engine.emit("click");
      if (!r.count) {
        const roll = Math.random();
        if (roll < 0.5) { engine.creature.emote("happy", 900); engine.creature.fx("heart", 1); }
        else if (roll < 0.75) engine.creature.emote("smug", 1000);
        else engine.creature.emote("shock", 700);
        engine.change({ mood: 2 });
      }
    };
    if (state.sleeping) engine.creature.setSleeping(true);
    mirrorCreature(engine.creature);
    // довга репліка обрізана — клік по бульбашці відкриває «Чат»
    engine.creature.bubbleEl.addEventListener("click", (e) => {
      if (engine.creature.bubbleEl.classList.contains("more")) { e.stopPropagation(); lab.openTab("chat"); }
    });
    // продовжуємо розмову з того місця, де зупинились
    const hist = chatLog.filter((m) => (m.w === "me" || m.w === "pet") && !m.src).slice(-10)
      .map((m) => ({ role: m.w === "me" ? "user" : "model", parts: [{ text: m.t }] }));
    while (hist.length && hist[0].role !== "user") hist.shift();
    engine.history = hist;
    engine.updateMood();
    lab.renderStats(); lab.renderActions();
    saveState();
    setInterval(() => engine.tick(), TICK_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) saveState(); });
    addEventListener("pagehide", saveState);

    initEmoGrid();
  });

  /* ---------- Посилання на довідник за адресою: task-1.html#doc/pet.addAction ----------
     Клік — відкриває довідник тут же; середня кнопка миші / «у новій вкладці» —
     нова вкладка одразу відкриє лабораторію на потрібній команді. */
  function openDocFromHash() {
    const m = location.hash.match(/^#doc\/([\w.]+)$/);
    if (!m || !lab.el || !DOC[m[1]]) return;
    lab.setFull(true);
    setTimeout(() => lab.openDoc(m[1]), 150);
  }
  addEventListener("hashchange", openDocFromHash);
  addEventListener("load", () => setTimeout(openDocFromHash, 200));

  /* ---------- Приймач синхронізації ---------- */
  function applyRemote(m) {
    if (!lab.el || !engine.creature) return;
    const c = engine.creature;
    sync.remote = true;
    try {
      if (m.t === "fx" && typeof c[m.m] === "function") { c[m.m](...(m.a || [])); return; }
      if (m.t === "run") { if (files.data) lab.runAll({ remote: true }); return; }
      if (m.t !== "ls") return;
      const val = (def) => (m.v === undefined ? load(m.k, def) : m.v ?? def);
      if (m.k === LS.state) {
        const r = val(null);
        if (!r) return;
        const dnaChanged = r.dna !== state.dna;
        Object.assign(state, r);
        if (dnaChanged) { c.setDna(state.dna); lab.syncMiniPets(); }
        c.setSleeping(state.sleeping);
        lab.renderHead(); lab.renderStats(); lab.renderActions(); engine.updateMood();
        const f = (id, v) => { const el = $(id); if (el && document.activeElement !== el && el.value !== v) el.value = v; };
        f("#charName", state.name); f("#charDna", state.dna); f("#charText", state.character || "");
        $("#labQuiet") && lab.setQuietUi && lab.setQuietUi();
      } else if (m.k === LS.quest) {
        questState = Object.assign({ done: {}, hints: {}, flags: {} }, val({}));
        renderQuests(false);
      } else if (m.k === LS.memory) {
        Object.keys(memStore).forEach((k) => delete memStore[k]);
        Object.assign(memStore, val({}));
      } else if (m.k === LS.chat) {
        chatLog.length = 0; chatLog.push(...val([]));
        lab.renderChat(true);
      } else if (m.k === LS.key) {
        apiKey = val("");
        const inp = $("#keyInput"); if (inp && document.activeElement !== inp) inp.value = apiKey;
        brain.status = apiKey ? (brain.status === "none" ? "unknown" : brain.status) : "none";
        lab.updateBrain();
      } else if (m.k === LS.files) {
        const d = val(null);
        if (!d || !files.data || !Array.isArray(d.order)) return;
        const active = d.order.includes(files.data.active) ? files.data.active : "main.js";
        files.data = Object.assign(d, { active });
        Object.keys(lab.docs || {}).forEach((n) => { if (d.src[n] === undefined) delete lab.docs[n]; });
        d.order.forEach((n) => {
          const doc = lab.docs && lab.docs[n];
          if (n === active) {
            if (lab.editor && !lab.editorFocused() && lab.editor.get() !== d.src[n]) { lab.skipSave = true; lab.editor.set(d.src[n]); }
          } else if (doc && doc.getValue() !== d.src[n]) doc.setValue(d.src[n]);
        });
        if (lab.cm && lab.docs[active] && lab.cm.getDoc() !== lab.docs[active]) lab.cm.swapDoc(lab.docs[active]);
        lab.renderFileTabs();
      } else if (m.k === LS.usage) lab.updateQuota();
    } finally { sync.remote = false; }
  }
  if (sync.ch) sync.ch.onmessage = (e) => applyRemote(e.data || {});

  // репліки й рухи зразка повторюються в інших вкладках
  function mirrorCreature(c) {
    ["say", "hideBubble", "emote", "fx", "hop", "shake", "nod", "squish"].forEach((m) => {
      const orig = c[m].bind(c);
      c[m] = (...a) => { const r = orig(...a); sync.send({ t: "fx", m, a }); return r; };
    });
  }

  // для налагодження з консолі браузера
  window.T1 = { state, engine, lab };
})();
