# Дизайн-система сайту «Хакатон 2026»

Документ для авторів сторінок **Задача 1, 3, 4** (і головної). Дай його Claude чи іншому ШІ-асистенту разом зі своїм текстом, і нова сторінка вийде в тому ж стилі, що й готова `task-2.html`.

> Коротко: **необруталізм для підлітків 14–18 років.** Кремовий «паперовий» фон у крапочку, товсті чорні рамки, жорсткі тіні без розмиття, кислотні кольори, наліпки під кутом, великі заголовки великими літерами, пружні «механічні» анімації. **Жодних емодзі** — тільки SVG-іконки.

---

## 1. Головні правила (обов’язково)

1. **Без емодзі.** Ніде: ні в тексті, ні в кнопках, ні в JS-рядках, ні в коментарях на сторінці. Іконки — тільки SVG зі спрайту (розділ 6). Можна типографські символи: `→ ✓ ● ✦`.
2. **Без «ШІ-шаблону».** Жодних фіолетово-блакитних градієнтів, скла (`backdrop-filter`), м’яких розмитих тіней, неонового світіння, темної теми.
3. **Рамка + жорстка тінь.** Кожен «предмет» (картка, кнопка, наліпка, панель) має `border: var(--border)` (3px чорна) і тінь `var(--sh-sm | --sh | --sh-lg)` — тінь зсунута, без розмиття.
4. **Плоскі кислотні кольори** з палітри (розділ 2). Не вигадуй нових відтінків, бери змінні.
5. **Легкі нахили.** Наліпки, бейджі й цифри стоять під кутом −8°…+8° (`--r`). Звичайний текст і великі блоки тексту — рівно.
6. **Спільний CSS не чіпати.** `assets/css/style.css` і `assets/js/main.js` спільні для всіх. Свої стилі — у новий файл `assets/css/task-N.css`, свій JS — у `assets/js/task-N.js`.
7. **Спершу телефон.** Усе має працювати на ширині 360–390px без горизонтального скролу (розділ 9).
8. **Мова — українська**, звертання на «ти», коротко й по-людськи.

---

## 2. Кольори (змінні з `style.css`)

| Змінна | Колір | Для чого |
|---|---|---|
| `--paper` | `#fff4e0` | фон сторінки (кремовий папір) |
| `--paper-2` | `#ffe9c2` | ховер, другорядний фон |
| `--ink` | `#121212` | текст, рамки, тіні |
| `--white` | `#ffffff` | картки, панелі |
| `--muted` | `#4a4540` | звичайний текст абзаців |
| `--dim` | `#857c72` | підписи, плейсхолдери |
| `--yellow` | `#ffd23f` | головний «маркер», кнопки-акценти, біжучі рядки |
| `--pink` | `#ff6fb5` | акцент |
| `--blue` | `#3d6bff` | акцент |
| `--blurple` | `#5865f2` | Discord (Задача 2) |
| `--lime` | `#b4f04b` | успіх, «готово», галочки |
| `--orange` | `#ff8c42` | акцент |
| `--lilac` | `#b79cff` | акцент (головна) |
| `--cyan` | `#4fd8e8` | інфо |
| `--red` | `#ff5a5a` | небезпека, REC |
| `--green` | `#2fd36f` | «говорить», онлайн |

**Колір сторінки.** Кожна сторінка має свій `--accent`, і він сам підставляється в кнопки, активну вкладку меню, індикатори. Задається в `style.css`:

```css
body[data-page="task-1"] { --accent: var(--pink); }
body[data-page="task-3"] { --accent: var(--lime); }
body[data-page="task-4"] { --accent: var(--orange); }
/* якщо акцент темний — текст на ньому білий: */
body[data-page="task-2"] { --accent: var(--blurple); --on-accent: #fff; }
```

Хочеш інший колір для своєї сторінки — зміни тільки свій рядок.

**Як поєднувати.** На одному екрані 2–4 кольори з палітри + чорний + білий/кремовий. Великі кольорові площини (картки `--c`) — по черзі різних кольорів. Текст завжди `--ink` (на `--blurple` — білий).

---

## 3. Типографіка

Шрифти (Google Fonts, усі з українськими літерами):

- **Rubik 800/900** — заголовки, кнопки, цифри (`--font-display`)
- **Onest 400–800** — основний текст (`--font-body`)
- **JetBrains Mono** — код, «технічні» підписи, мітки (`--font-mono`)

| Елемент | Стиль |
|---|---|
| `h1` | Rubik 900, ВЕЛИКИМИ, `clamp(2.6rem, 8.2vw, 6.2rem)`, line-height .95 |
| `h2` | Rubik 900, ВЕЛИКИМИ, `clamp(2rem, 5.4vw, 3.8rem)` |
| `h3` | Rubik 800, 1.3rem, звичайний регістр |
| абзац | Onest 17px, line-height 1.6, колір `--muted` |
| `.lead` | великий підзаголовок під `h1` |
| `.kicker` | мітка над `h2`: чорна плашка, mono, ВЕЛИКИМИ, нахил −2° |

**Виділення слів у заголовку:**

```html
<h1>Бот, що <span class="mark-box" style="--mc:var(--pink);--mt:var(--ink)">слухає</span> зустріч</h1>
<h2>Звичайний <span class="mark">маркер</span> і <span class="squiggle">хвиляста лінія</span></h2>
```

- `.mark-box` — слово-наліпка в рамці з тінню і нахилом (`--mc` колір фону, `--mt` колір тексту, `--r` кут). Не більше одного на заголовок.
- `.mark` (або старе `.grad-text`) — маркер позаду тексту, переноситься на кілька рядків.
- `.squiggle` — анімована хвиляста лінія під словом.

---

## 4. Каркас сторінки (копіюй як є)

```html
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Задача 3 · Назва — Хакатон 2026</title>
  <meta name="description" content="Один рядок про задачу">
  <meta name="theme-color" content="#fff4e0">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;800;900&family=Onest:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap">
  <link rel="stylesheet" href="assets/css/style.css?v=15">
  <link rel="stylesheet" href="assets/css/task-3.css?v=1">   <!-- свій файл, якщо потрібен -->
  <script src="assets/js/main.js?v=15"></script>            <!-- БЕЗ defer, саме в <head> -->
  <script src="assets/js/task-3.js?v=1" defer></script>      <!-- свій JS, якщо потрібен -->
</head>
<body data-page="task-3">
<site-nav></site-nav>        <!-- меню підставляється само -->

<main id="main" class="page">

  <section class="page-hero container"> … </section>

  <nav class="toc-bar container" aria-label="Розділи задачі"> … </nav>

  <section class="section container" id="mission"> … </section>
  <section class="section container" id="…"> … </section>

</main>

<site-footer></site-footer>  <!-- кнопки «Назад/Далі» і футер підставляються самі -->
</body>
</html>
```

Важливо:

- `body data-page="task-N"` — від нього залежать колір сторінки і підсвітка в меню.
- `<site-nav>` і `<site-footer>` не видаляй і нічого всередину не пиши.
- Кожна секція — `section.section.container` з унікальним `id` (на нього посилається зміст).
- Посилання між сторінками — відносні (`task-2.html`, `#quest`), бо сайт живе на GitHub Pages у підпапці.
- **Кеш.** Перед комітом запусти `python tools/bump_version.py` — він сам оновить версію на всіх сторінках, і браузери відвідувачів підтягнуть нову версію автоматично.

---

## 5. Компоненти (готові класи зі `style.css`)

Живі приклади з кодом — на сторінці **`components.html`**.

### Hero сторінки
```html
<section class="page-hero container">
  <span class="eyebrow reveal"><span class="dot"></span> Задача 03 · Тема</span>
  <h1 class="reveal">Назва, що <span class="mark-box" style="--mc:var(--yellow);--mt:var(--ink)">чіпляє</span></h1>
  <p class="lead reveal">Одне-два речення: що зробимо і навіщо.</p>
  <div class="btn-row reveal">
    <a class="btn btn-primary" href="#mission">Почати <span class="arr">→</span></a>
    <a class="btn btn-yellow" href="#quest">Квест</a>
  </div>
</section>
```
Праворуч у hero можна поставити свою ілюстрацію (CSS/SVG) у двоколонковій сітці, як у `task-2.html` (`.t2-hero`) чи `index.html` (`.home-hero`).

### Заголовок секції
```html
<div class="section-head reveal">
  <span class="kicker">Суть задачі</span>
  <h2>Великий заголовок</h2>
  <p>Пояснення в 1–2 речення.</p>
</div>
```
`section-head center` — по центру.

### Кнопки
`.btn` + `.btn-primary` (колір сторінки) / `.btn-yellow` / `.btn-ghost` (білий). Стрілка `<span class="arr">→</span>` при наведенні їде вправо. Група кнопок — `.btn-row`. При натисканні кнопка «вдавлюється» (тінь зникає).

### Картки
```html
<div class="grid grid-3" data-stagger>
  <article class="card lift reveal" style="--c:var(--cyan)">
    <div class="card-ico"><svg class="i"><use href="#i-zap"/></svg></div>
    <h3>Заголовок</h3>
    <p>Текст.</p>
  </article>
</div>
```
- `grid-2 / grid-3 / grid-4 / grid-auto` — сітки, на телефоні самі стають в одну колонку.
- `.lift` — підстрибує при наведенні. `.fill` — вся картка кольору `--c`.
- `--c` — колір іконки/картки.

### Наліпка (декор)
```html
<span class="sticker" style="--c:var(--pink);--r:6deg"><svg class="i"><use href="#i-mic"/></svg> голос</span>
```

### Мітки
`<span class="chip">звичайна</span>`, кольорові: `.green .amber .red .cyan .pink .violet`. Ряд міток — `.chip-row`.

### Підказки
```html
<div class="callout tip">          <!-- info | tip | warn | danger -->
  <span class="callout-ico"><svg class="i"><use href="#i-bulb"/></svg></span>
  <p><b>Порада.</b> Текст підказки.</p>
</div>
```
Рекомендовані іконки: info → `info`, tip → `bulb`/`check`, warn → `alert`, danger → `alert`/`shield-alert`.

### Термінал (кнопка «Копіювати» додається сама)
```html
<div class="terminal">
  <div class="terminal-bar"><i></i><i></i><i></i>встановлення</div>
<pre><span class="c"># коментар (не копіюється)</span>
<span class="p">$ </span>pip install requests</pre>
</div>
```
`<pre>` пиши з початку рядка, без відступу (інакше відступ буде в коді). Підсвітка: `.c` коментар, `.p` запрошення `$`, `.s` рядок, `.k` ключове слово.

### Вкладки
```html
<div class="tabs-ui">
  <div class="tab-list" role="tablist">
    <button class="tab-btn" role="tab" aria-selected="true"  aria-controls="t-a">Перша</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="t-b">Друга</button>
  </div>
  <div class="tab-panel" role="tabpanel" id="t-a">…</div>
  <div class="tab-panel" role="tabpanel" id="t-b" hidden>…</div>
</div>
```
`id` панелей мають бути унікальні на сторінці. Повзунок-індикатор додається сам.

### Питання-відповідь
```html
<div class="faq">
  <details><summary>Питання?</summary><div class="faq-body">Відповідь.</div></details>
</div>
```

### Липкий зміст сторінки
```html
<nav class="toc-bar container" aria-label="Розділи задачі">
  <div class="toc-inner">
    <a href="#mission"><svg class="i"><use href="#i-target"/></svg> Суть</a>
    <a href="#how"><svg class="i"><use href="#i-cog"/></svg> Як працює</a>
  </div>
</nav>
```
Поточний розділ підсвічується сам.

### Біжучий рядок
```html
<div class="marquee" style="--mq-bg:var(--yellow);--mq-r:-1.5deg" aria-hidden="true">
  <div class="marquee-track">
    <span>слово ✦ слово ✦ слово ✦ слово ✦ слово ✦ слово ✦ </span>
    <span>слово ✦ слово ✦ слово ✦ слово ✦ слово ✦ слово ✦ </span>
  </div>
</div>
```
Обидва `<span>` однакові, кожен довший за ширину екрана (повтори фразу 2–3 рази). `.reverse` — рух у інший бік, `--mq-speed: 34s` — швидкість. Два рядки навхрест — див. `.marquee-x` у `task2.css`.

### Круглий бейдж, що крутиться
```html
<div class="spin-badge" style="--sb:110px;--sb-bg:var(--lime)">
  <svg viewBox="0 0 100 100"><defs><path id="myCircle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs>
    <text><textPath href="#myCircle">текст по колу • текст • </textPath></text></svg>
  <span><svg class="i"><use href="#i-sparkles"/></svg></span>
</div>
```
`id` шляху (`myCircle`) має бути унікальний на сторінці.

### Заглушка «в розробці»
`<div class="placeholder">…</div>` — смуга «В РОЗРОБЦІ» додається сама. Прибери, коли сторінка готова.

### Каруселька (гортання вбік)
Щоб сторінку не доводилось довго гортати вниз: картки стоять у ряд і гортаються вбік (свайп, кнопки ←/→, точки, перетягування мишкою — додаються самі).
```html
<div class="carousel" data-carousel style="--slide-w:min(340px,84%)">
  <div class="carousel-track">
    <article class="card">…</article>
    <article class="card">…</article>
  </div>
</div>
```
`--slide-w` — ширина однієї картки.

### «Детальніше» — бокова панель
Коротко на сторінці, а повна інформація — у панелі, яка виїжджає справа (на телефоні — знизу).
```html
<button class="more" type="button" data-drawer="d-ollama" data-title="Ollama">
  Детальніше <svg class="i"><use href="#i-arrow"/></svg>
</button>

<!-- десь унизу сторінки, перед </main> чи після -->
<template id="d-ollama">
  <h3>Заголовок</h3>
  <p>Будь-який HTML: списки, підказки, термінали, навіть вкладки.</p>
</template>
```
`id` шаблону має бути унікальним. Панель закривається хрестиком, клавішею Esc або кліком повз неї. Великий приклад — `index.html`.

### Більші приклади з Задачі 2
У `assets/css/task2.css` є складніші блоки, які можна скопіювати у свій `task-N.css` і переробити під себе: кольорові картки з великими цифрами (`.mcard`), схема етапів зі стрілками (`.flow`), квест із XP (`.xp`, `.levels`, `.quests`), «погано/добре» (`.prompt-vs`), картки, що перевертаються (`.flips`), макети інтерфейсів (`.mock`), симуляція (`.sim`). Логіка до них — у `assets/js/task2.js`.

---

## 6. Іконки (тільки SVG)

Спрайт вбудований у `main.js`, нічого підключати не треба:

```html
<svg class="i"><use href="#i-rocket"/></svg>
```

- Розмір = `font-size` батька, колір = `color` батька.
- У JS: `Site.icon("rocket")` повертає готовий рядок HTML.
- Стиль — лінійні іконки 24×24, як на lucide.dev. Потрібна нова — додай шлях у `ICON_PATHS` у `main.js` (не ламаючи інші) або вставляй свій `<svg class="i">` прямо в HTML.

Доступні назви:

```
mic mic-off headphones volume audio music file file-text file-audio folder clipboard
pin panel cpu sparkles wand bot code terminal git github laptop key lock shield
shield-alert plug signal zap cog wrench blocks package search eye target info alert
bulb check x arrow swipe mail send message user users video film clapper clock
school book lifebuoy trophy crown star rocket sprout flame heart coins scale pencil
moon hash slash discord refresh
```

---

## 7. Анімації

Стиль руху — **пружний і «механічний»**: штуки підстрибують, нахиляються, вдавлюються. Не плавне «пливе й світиться».

- `.reveal` на будь-якому блоці — з’являється під час прокрутки (виїжджає знизу з легким поворотом).
- `data-stagger` на батьківському блоці — діти з’являються по черзі.
- Криві: `var(--spring)` (пружина, для появи/наведення), `var(--snap)` (різкий перехід), `var(--ease-out)`.
- Ховер на картках/кнопках: `translate(-3px, -3px)` + більша тінь. Натискання: `translate(4px, 4px)` + тінь 0.
- Безкінечні анімації (біжучий рядок, бейдж, «плавання» наліпок) — повільні, 3–30 секунд.
- Переходи між сторінками (шторка) і плавна підсвітка меню працюють самі, нічого не роби.
- `prefers-reduced-motion` уже враховано в `style.css`. У своєму JS теж перевіряй:
  `matchMedia("(prefers-reduced-motion: reduce)").matches`.
- Анімуй `transform` і `opacity`, а не `width/top/left` (окрім рідкісних випадків).

---

## 8. Відступи, радіуси, тіні

| Токен | Значення |
|---|---|
| `--border` | `3px solid var(--ink)` (для дрібних елементів — 2–2.5px) |
| `--sh-sm` / `--sh` / `--sh-lg` | `3px 3px 0` / `5px 5px 0` / `9px 9px 0` чорним |
| `--radius-sm` / `--radius` / `--radius-lg` | 10 / 16 / 24px |
| `.container` | max 1200px, бокові поля 24px (16px на телефоні) |
| `.section` | вертикальні відступи `clamp(56px, 9vw, 110px)` |
| відстань між картками | 18–26px |

Кольорова тінь як акцент: `box-shadow: 7px 7px 0 var(--accent), 7px 7px 0 3px var(--ink);`

---

## 9. Телефон (адаптивність)

Брейкпоінти в `style.css`: **1080px** (ховається текст логотипа), **960px** (сітки 3–4 → 2 колонки), **860px** (мобільне меню знизу, шапка не фіксована), **640px** (усі сітки → 1 колонка), **520px**.

Перевір на ширині 390px:

- немає горизонтального скролу (довгі слова, таблиці, код — у `overflow-x: auto`);
- двоколонкові hero/сітки стають однією колонкою;
- шрифти через `clamp()`, а не фіксовані px для заголовків;
- кнопки й елементи для натискання — не менше 44px;
- внизу фіксована панель меню (≈80px) — `.page` уже має відступ знизу, не перекривай її своїми `position: fixed`;
- на телефоні сторінки гортаються свайпом вліво/вправо. Якщо в тебе є елемент із власним горизонтальним жестом (слайдер, полотно), постав йому атрибут `data-no-swipe`.

---

## 10. Зміст сторінки задачі (рекомендована структура)

Як у `task-2.html`, але під свою тему:

1. **Hero** — назва з наліпкою-словом, 1–2 речення, кнопки, ілюстрація.
2. **Суть задачі** — 3 кольорові картки «що робимо».
3. **Як це працює** — схема/анімація логіки (найважливіша частина: школярі мають *побачити*, як працює система).
4. **Що потрібно** — інструменти, ключі, встановлення (термінали з командами).
5. **Варіанти/мови** — вкладки.
6. **Квест** — рівні Новачок/Профі/Бос із чекбоксами.
7. **Поради з вайбкодингу** — без готового рішення задачі.
8. **Словник** і **FAQ «якщо не працює»** (підказки, куди копати, а не відповіді).
9. **Фінальний заклик** — кольоровий блок із кнопками.

Готового коду розв’язку на сторінці бути не повинно: дай усю інформацію, але не роби задачу за учнів. Приклади промптів — на *іншу* тему, щоб їх не можна було просто скопіювати.

---

## 11. Чого НЕ робити

- емодзі (будь-які) — тільки SVG;
- градієнти, скло, розмиті тіні, свічення, темний фон сторінки;
- нові кольори поза палітрою, сірі «безликі» картки без рамки;
- шрифти, крім Rubik / Onest / JetBrains Mono;
- зміни в `style.css` / `main.js` без домовленості з іншими авторами;
- `position: fixed` поверх меню, горизонтальний скрол на телефоні;
- абсолютні посилання на кшталт `/task-1.html` (зламається на GitHub Pages);
- забути запустити `python tools/bump_version.py` перед комітом.

---

## 12. Готовий промпт для Claude

Скопіюй, заповни дужки і додай файли `assets/css/DESIGN.md`, `assets/css/style.css`, `components.html`, `task-2.html` (як приклад) і свій `task-N.html`.

```
Ти допомагаєш зробити сторінку «Задача [N]» для сайту хакатону для учнів 8–11 класів.
Сайт статичний (HTML/CSS/JS), живе на GitHub Pages. Дизайн-система описана в DESIGN.md —
дотримуйся її суворо: необруталізм, кремовий фон, чорні рамки 3px, жорсткі тіні,
кольори тільки з палітри, шрифти Rubik/Onest/JetBrains Mono, ЖОДНИХ емодзі — тільки
SVG-іконки зі спрайту (<svg class="i"><use href="#i-назва"/></svg>).

Правила:
- редагуй тільки task-[N].html; власні стилі — у новий assets/css/task-[N].css,
  власний JS — у assets/js/task-[N].js; style.css і main.js не змінюй;
- використовуй готові класи зі style.css (page-hero, section-head, kicker, card, sticker,
  callout, terminal, tabs-ui, faq, toc-bar, marquee, spin-badge, reveal, data-stagger);
- структура сторінки — як у розділі 10 DESIGN.md; приклад повної сторінки — task-2.html;
- зроби якісні анімації, що показують, як працює [система/алгоритм задачі] (CSS/SVG/JS,
  з урахуванням prefers-reduced-motion);
- адаптивно під телефон 360–390px, без горизонтального скролу;
- текст українською, на «ти», для підлітків; не давай готового розв’язку задачі.

Тема задачі: [опиши задачу: що учні мають зробити, які технології, які рівні складності].
```
