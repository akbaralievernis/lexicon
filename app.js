(() => {
  "use strict";

  /* ========= Утилиты ========= */
  const $ = (sel, root=document) => root.querySelector(sel);
  const now = () => performance.now();
  const clamp = (v,min,max) => Math.max(min, Math.min(max, v));
  const fmtInt = (n) => String(Math.max(0, Math.floor(n)));
  const fmtMult = (x) => `x${x.toFixed(1)}`;

  function splitIntoSentences(text){
    const t = (text || "").replace(/\s+/g, " ").trim();
    if(!t) return [];
    const raw = t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    return raw.length ? raw : [t];
  }

  function tokenize(sentence){
    const parts = sentence.split(/\s+/).filter(Boolean);
    return parts
      .map(w => w.replace(/^[^\wА-Яа-яЁёÀ-ž']+|[^\wА-Яа-яЁёÀ-ž']+$/g, ""))
      .filter(Boolean);
  }

  function mulberry32(seed){
    let t = seed >>> 0;
    return function(){
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rand()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  /* ========= Пресеты ========= */
  const PRESETS = {
    rus_general: [
      "Сегодня мы тренируем внимание и память.",
      "Нажимай слова в правильном порядке.",
      "Работай быстро, но думай внимательно.",
      "Команда побеждает благодаря точности.",
      "Подсказка помогает, но снижает очки.",
      "Ошибки — это часть обучения.",
      "Сосредоточься и действуй уверенно.",
      "Финишируй до конца таймера."
    ].join(" "),
    rus_school: [
      "Мы повторяем ключевые понятия урока.",
      "Смысл зависит от правильного порядка слов.",
      "Читай внимательно перед нажатием.",
      "Проверь грамматику и знаки препинания.",
      "Точность важнее скорости.",
      "Исправляй ошибки и двигайся дальше.",
      "Работай в команде и поддерживай других."
    ].join(" "),
    rus_motivation: [
      "Скорость важна, но точность важнее.",
      "Мы играем, чтобы стать лучше.",
      "Команда — это единство и поддержка.",
      "Не сдавайся, даже если трудно.",
      "Сделай паузу и подумай.",
      "Внимание к деталям приносит победу.",
      "Победа приходит к настойчивым."
    ].join(" ")
  };


/* ========= i18n (RU/EN/KY) ========= */
const I18N = {
  ru: {
    subtitle: "Собери предложение по порядку • Нажимай слова снизу",
    timerLabel: "Осталось",
    timerUnit: "сек",
    pause: "⏸ Пауза",
    resume: "▶ Продолжить",
    freeze: "⏱ Заморозить время",
    frozen: "⏱ Время заморожено",
    skipA: "⏭ Пропуск A",
    skipB: "⏭ Пропуск B",
    menuBtn: "Меню",
    resetBtn: "Сброс",
    startBtn: "Старт",
    menuTitle: "Меню (настройка учителя)",
    menuDesc: "1 предложение = 1 раунд. Обе команды получают одинаковый текст и одинаковый порядок раундов.",
    close: "Закрыть",
    presetLabel: "Готовые тексты",
    presetCustom: "— Пользовательский текст (вставить ниже) —",
    presetRusGeneral: "Русский — универсальный",
    presetRusSchool: "Русский — школьный стиль",
    presetRusMotiv: "Русский — мотивационный",
    textLabel: "Текст для раундов",
    textPlaceholder: "Вставь текст. Лучше 8–14 слов в одном предложении.",
    howtoTitle: "Как играть:",
    howtoText: "после показа слов появятся плитки снизу — нажимай слова строго по порядку.",
    uiTitle: "Интерфейс",
    langLabel: "Язык",
    langHint: "Русский / English / Кыргызча",
    themeLabel: "Тема",
    themeHint: "Светлая / Тёмная",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    modeLabel: "Режим",
    modeHint: "Текст или Математика",
    modeText: "Текст",
    modeMath: "Математика",
    mathRoundsLabel: "Раундов (математика)",
    mathRoundsHint: "сколько примеров за игру",
    opsLabel: "Операции",
    opsHint: "можно включить + и −",
    diffLabel: "Сложность",
    diffHint: "Лёгкий / Средний / Тяжёлый",
    diffEasy: "Лёгкий",
    diffMedium: "Средний",
    diffHard: "Тяжёлый",
    hardLabel: "Тяжёлый режим",
    hardHint: "добавляет × и : и смешанные примеры",
    speedLabel: "Скорость показа слов",
    speedHint: "мс на слово (меньше = быстрее)",
    timeLabel: "Общий таймер",
    timeHint: "секунд на игру",
    penaltyLabel: "Штраф за 3 ошибки подряд",
    penaltyHint: "минус очки сразу на 3-й ошибке",
    superSpeedLabel: "Супер скорость",
    superSpeedHint: "по раундам скорость растёт",
    speedStepLabel: "Шаг ускорения",
    speedStepHint: "на сколько мс быстрее каждый раунд",
    comboLabel: "Комбо-множитель",
    comboHint: "серия правильных увеличивает x",
    hiddenLabel: "Скрытый режим",
    hiddenHint: "после ошибки плитки исчезают на 2 сек",
    soundLabel: "Звук",
    soundHint: "правильно / ошибка / штраф / победа",
    soloLabel: "Один игрок",
    soloHint: "игра только для Команды A",
    applyBtn: "Применить",
    timeUp: "Время вышло!",
    finalScores: "Итоговые очки:",
    replay: "Сыграть ещё",
    hardReset: "Полный сброс",
    winnerSolo: "Режим: Один игрок — итоговый результат Команды A",
    winnerA: "Победитель: Команда A",
    winnerB: "Победитель: Команда B",
    draw: "Ничья: идеально ровно!",
    teamA: "Команда A",
    teamB: "Команда B",
    round: "Раунд:",
    combo: "Комбо:",
    score: "Счёт:",
    noteNeedText: "Открой «Меню», вставь текст и нажми «Применить».",
    noteBStart: "После показа слов — нажимай плитки снизу по порядку.",
    noteReady: (n) => `Готово: раундов — ${n}. Нажми «Старт».`,
    noteNoSentences: "Не найдено подходящих предложений. Нужно минимум 2 слова в предложении.",
    noteReset: "Сброс. Нажми «Старт».",
    notePause: "Пауза. Нажми «Продолжить».",
    notePlayText: "Нажимай слова снизу по порядку: 1 → 2 → 3…",
    notePlayMath: "Выбери правильный ответ (3 варианта).",
    noteRoundsOver: "Раунды закончились.",
    noteMathReady: (n) => `Готово: математических раундов — ${n}. Нажми «Старт».`
  },
  en: {
    subtitle: "Build the sentence in order • Tap the words below",
    timerLabel: "Left",
    timerUnit: "sec",
    pause: "⏸ Pause",
    resume: "▶ Resume",
    freeze: "⏱ Freeze time",
    frozen: "⏱ Time frozen",
    skipA: "⏭ Skip A",
    skipB: "⏭ Skip B",
    menuBtn: "Menu",
    resetBtn: "Reset",
    startBtn: "Start",
    menuTitle: "Menu (teacher setup)",
    menuDesc: "1 sentence = 1 round. Both teams get the same rounds in the same order.",
    close: "Close",
    presetLabel: "Preset texts",
    presetCustom: "— Custom text (paste below) —",
    presetRusGeneral: "Russian — general",
    presetRusSchool: "Russian — school style",
    presetRusMotiv: "Russian — motivational",
    textLabel: "Text for rounds",
    textPlaceholder: "Paste text. Best: 8–14 words per sentence.",
    howtoTitle: "How to play:",
    howtoText: "after the flash, tiles appear — tap words in the exact order.",
    uiTitle: "Interface",
    langLabel: "Language",
    langHint: "Russian / English / Kyrgyz",
    themeLabel: "Theme",
    themeHint: "Light / Dark",
    themeLight: "Light",
    themeDark: "Dark",
    modeLabel: "Mode",
    modeHint: "Text or Math",
    modeText: "Text",
    modeMath: "Math",
    mathRoundsLabel: "Rounds (math)",
    mathRoundsHint: "how many tasks per game",
    opsLabel: "Operations",
    opsHint: "enable + and −",
    hardLabel: "Hard mode",
    hardHint: "adds × and ÷ plus mixed expressions",
    speedLabel: "Flash speed",
    speedHint: "ms per word (lower = faster)",
    timeLabel: "Global timer",
    timeHint: "seconds per game",
    penaltyLabel: "Penalty for 3 wrong in a row",
    penaltyHint: "subtract points on the 3rd mistake",
    superSpeedLabel: "Super speed",
    superSpeedHint: "speed increases each round",
    speedStepLabel: "Speed step",
    speedStepHint: "ms faster each round",
    comboLabel: "Combo multiplier",
    comboHint: "streak increases x",
    hiddenLabel: "Hidden mode",
    hiddenHint: "after a mistake tiles hide for 2 sec",
    soundLabel: "Sound",
    soundHint: "correct / wrong / penalty / win",
    soloLabel: "Single player",
    soloHint: "only Team A plays",
    applyBtn: "Apply",
    timeUp: "Time is up!",
    finalScores: "Final scores:",
    replay: "Play again",
    hardReset: "Full reset",
    winnerSolo: "Mode: Single player — Team A result",
    winnerA: "Winner: Team A",
    winnerB: "Winner: Team B",
    draw: "Draw!",
    teamA: "Team A",
    teamB: "Team B",
    round: "Round:",
    combo: "Combo:",
    score: "Score:",
    noteNeedText: "Open Menu, paste text, and press Apply.",
    noteBStart: "After the flash — tap tiles in order.",
    noteReady: (n) => `Ready: ${n} rounds. Press Start.`,
    noteNoSentences: "No valid sentences found. Need at least 2 words per sentence.",
    noteReset: "Reset. Press Start.",
    notePause: "Paused. Press Resume.",
    notePlayText: "Tap words below in order: 1 → 2 → 3…",
    notePlayMath: "Pick the correct answer (3 options).",
    noteRoundsOver: "Rounds finished.",
    noteMathReady: (n) => `Ready: ${n} math rounds. Press Start.`
  },
  ky: {
    subtitle: "Сүйлөмдү туура тартипте түз • Төмөндөгү сөздөрдү бас",
    timerLabel: "Калды",
    timerUnit: "сек",
    pause: "⏸ Тыным",
    resume: "▶ Улантуу",
    freeze: "⏱ Убакытты тоңдур",
    frozen: "⏱ Убакыт тоңду",
    skipA: "⏭ Өткөр A",
    skipB: "⏭ Өткөр B",
    menuBtn: "Меню",
    resetBtn: "Тазалоо",
    startBtn: "Башта",
    menuTitle: "Меню (мугалим үчүн)",
    menuDesc: "1 сүйлөм = 1 раунд. Эки командага тең бирдей раунддар, бирдей тартип.",
    close: "Жабуу",
    presetLabel: "Даяр тексттер",
    presetCustom: "— Өз текстиң (ылдыйга кой) —",
    presetRusGeneral: "Орусча — жалпы",
    presetRusSchool: "Орусча — мектеп",
    presetRusMotiv: "Орусча — мотивация",
    textLabel: "Раунддар үчүн текст",
    textPlaceholder: "Текстти кой. Жакшысы: сүйлөмдө 8–14 сөз.",
    howtoTitle: "Кантип ойнойт:",
    howtoText: "көрсөтүүдөн кийин плиткалар чыгат — сөздөрдү так тартипте бас.",
    uiTitle: "Интерфейс",
    langLabel: "Тил",
    langHint: "Русский / English / Кыргызча",
    themeLabel: "Тема",
    themeHint: "Ачык / Караңгы",
    themeLight: "Ачык",
    themeDark: "Караңгы",
    modeLabel: "Режим",
    modeHint: "Текст же Математика",
    modeText: "Текст",
    modeMath: "Математика",
    mathRoundsLabel: "Раунд саны (математика)",
    mathRoundsHint: "канча мисал",
    opsLabel: "Амалдар",
    opsHint: "+ жана − күйгүзсө болот",
    hardLabel: "Оор режим",
    hardHint: "× жана : жана аралаш мисалдар",
    speedLabel: "Көрсөтүү ылдамдыгы",
    speedHint: "сөзгө мс (аз = тез)",
    timeLabel: "Жалпы таймер",
    timeHint: "оюнга секунд",
    penaltyLabel: "3 ката үчүн айып",
    penaltyHint: "3-катада упай кемийт",
    superSpeedLabel: "Супер ылдамдык",
    superSpeedHint: "ар раунд сайын тездетет",
    speedStepLabel: "Тездетүү кадамы",
    speedStepHint: "ар раундда канча мс",
    comboLabel: "Комбо көбөйткүч",
    comboHint: "серия x көбөйтөт",
    hiddenLabel: "Жашыруун режим",
    hiddenHint: "ката болсо 2 сек жашырат",
    soundLabel: "Үн",
    soundHint: "туура / ката / айып / жеңиш",
    soloLabel: "Бир оюнчу",
    soloHint: "Команда A гана ойнойт",
    applyBtn: "Колдонуу",
    timeUp: "Убакыт бүттү!",
    finalScores: "Жыйынтык упайлар:",
    replay: "Дагы ойно",
    hardReset: "Толук тазалоо",
    winnerSolo: "Режим: Бир оюнчу — Команда A жыйынтык",
    winnerA: "Жеңүүчү: Команда A",
    winnerB: "Жеңүүчү: Команда B",
    draw: "Тең чыгышты!",
    teamA: "Команда A",
    teamB: "Команда B",
    round: "Раунд:",
    combo: "Комбо:",
    score: "Упай:",
    noteNeedText: "«Меню» ачып, текст коюп, «Колдонуу» бас.",
    noteBStart: "Көрсөтүүдөн кийин — плиткаларды тартип менен бас.",
    noteReady: (n) => `Даяр: ${n} раунд. «Башта» бас.`,
    noteNoSentences: "Туура сүйлөм табылган жок. Сүйлөмдө жок дегенде 2 сөз керек.",
    noteReset: "Тазаланды. «Башта» бас.",
    notePause: "Тыным. «Улантуу» бас.",
    notePlayText: "Төмөнкү сөздөрдү тартип менен бас: 1 → 2 → 3…",
    notePlayMath: "Туура жоопту танда (3 вариант).",
    noteRoundsOver: "Раунддар бүттү.",
    noteMathReady: (n) => `Даяр: ${n} математика раунд. «Башта» бас.`
  }
};

function getLang(){
  const saved = localStorage.getItem("ld_lang");
  return (saved && I18N[saved]) ? saved : "ru";
}
function setLang(lang){
  const l = (I18N[lang]) ? lang : "ru";
  localStorage.setItem("ld_lang", l);
  document.documentElement.lang = l;
  applyI18n();
}

function getTheme(){
  const saved = localStorage.getItem("ld_theme");
  if(saved === "dark" || saved === "light") return saved;
  // default: follow system
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
function setTheme(theme){
  const t = (theme === "dark") ? "dark" : "light";
  localStorage.setItem("ld_theme", t);
  document.body.classList.toggle("dark", t === "dark");
  applyI18n(); // to refresh label on button
}

function applyI18n(){
  const lang = getLang();
  const T = I18N[lang];

  // top / common
  if(UI.subtitle) UI.subtitle.textContent = T.subtitle;
  if(UI.timerLabel) UI.timerLabel.textContent = T.timerLabel;
  if(UI.timerUnit) UI.timerUnit.textContent = T.timerUnit;

  UI.pauseBtn.textContent = Game.paused ? T.resume : T.pause;
  UI.freezeBtn.textContent = Game.globalFrozen ? T.frozen : T.freeze;
  UI.skipA.textContent = T.skipA;
  UI.skipB.textContent = T.skipB;
  UI.openSetupBtn.textContent = T.menuBtn;
  UI.resetBtn.textContent = T.resetBtn;
  UI.startBtn.textContent = T.startBtn;

  // menu header
  if(UI.menuTitle) UI.menuTitle.textContent = T.menuTitle;
  if(UI.menuDesc) UI.menuDesc.textContent = T.menuDesc;
  if(UI.closeMenuText) UI.closeMenuText.textContent = T.close;

  // menu labels
  if(UI.presetLabel) UI.presetLabel.textContent = T.presetLabel;
  if(UI.textLabel) UI.textLabel.textContent = T.textLabel;
  if(UI.textInput) UI.textInput.placeholder = T.textPlaceholder;

  if(UI.uiTitle) UI.uiTitle.textContent = T.uiTitle;
  if(UI.langLabel) UI.langLabel.textContent = T.langLabel;
  if(UI.langHint) UI.langHint.textContent = T.langHint;
  if(UI.themeLabel) UI.themeLabel.textContent = T.themeLabel;
  if(UI.themeHint) UI.themeHint.textContent = T.themeHint;
  if(UI.modeLabel) UI.modeLabel.textContent = T.modeLabel;
  if(UI.modeHint) UI.modeHint.textContent = T.modeHint;
  if(UI.mathRoundsLabel) UI.mathRoundsLabel.textContent = T.mathRoundsLabel;
  if(UI.mathRoundsHint) UI.mathRoundsHint.textContent = T.mathRoundsHint;
  if(UI.opsLabel) UI.opsLabel.textContent = T.opsLabel;
  if(UI.opsHint) UI.opsHint.textContent = T.opsHint;
  if(UI.diffLabel) UI.diffLabel.textContent = T.diffLabel;
  if(UI.diffHint) UI.diffHint.textContent = T.diffHint;
  if(UI.diffEasyBtn) UI.diffEasyBtn.textContent = T.diffEasy;
  if(UI.diffMediumBtn) UI.diffMediumBtn.textContent = T.diffMedium;
  if(UI.diffHardBtn) UI.diffHardBtn.textContent = T.diffHard;

  // preset option texts (keep ids by value)
  if(UI.presetSelect){
    const opts = UI.presetSelect.options;
    for(const opt of opts){
      if(opt.value === "custom") opt.textContent = T.presetCustom;
      if(opt.value === "rus_general") opt.textContent = T.presetRusGeneral;
      if(opt.value === "rus_school") opt.textContent = T.presetRusSchool;
      if(opt.value === "rus_motivation") opt.textContent = T.presetRusMotiv;
    }
  }

  // theme button label
  if(UI.themeBtn){
    UI.themeBtn.textContent = (getTheme() === "dark") ? T.themeDark : T.themeLight;
  }

  // mode select labels
  if(UI.modeSelect){
    const tOpt = [...UI.modeSelect.options].find(o => o.value === "text");
    const mOpt = [...UI.modeSelect.options].find(o => o.value === "math");
    if(tOpt) tOpt.textContent = T.modeText;
    if(mOpt) mOpt.textContent = T.modeMath;
  }

  // apply btn / end overlay
  UI.applyBtn.textContent = T.applyBtn;
  if(UI.timeUpTitle) UI.timeUpTitle.textContent = T.timeUp;
  if(UI.finalScoresLabel) UI.finalScoresLabel.textContent = T.finalScores;
  if(UI.closeEndText) UI.closeEndText.textContent = T.close;
  if(UI.replayText) UI.replayText.textContent = T.replay;
  if(UI.hardResetText) UI.hardResetText.textContent = T.hardReset;
  if(UI.teamAName) UI.teamAName.textContent = T.teamA;
  if(UI.teamBName) UI.teamBName.textContent = T.teamB;
  if(UI.teamAResult) UI.teamAResult.textContent = T.teamA;
  if(UI.teamBResult) UI.teamBResult.textContent = T.teamB;

  // pill labels
  UI.roundLabelEls.forEach(el => el.textContent = T.round);
  UI.comboLabelEls.forEach(el => el.textContent = T.combo);
  UI.scoreLabelEls.forEach(el => el.textContent = T.score);
}

  /* ========= UI ========= */
  const UI = {
    globalTimer: $("#globalTimer"),

    startBtn: $("#startBtn"),
    resetBtn: $("#resetBtn"),
    openSetupBtn: $("#openSetupBtn"),

    pauseBtn: $("#pauseBtn"),
    freezeBtn: $("#freezeBtn"),
    skipA: $("#skipA"),
    skipB: $("#skipB"),

    setupOverlay: $("#setupOverlay"),
    closeSetupBtn: $("#closeSetupBtn"),
    applyBtn: $("#applyBtn"),

    presetSelect: $("#presetSelect"),
    textInput: $("#textInput"),

    speedRange: $("#speedRange"),
    speedVal: $("#speedVal"),
    timeRange: $("#timeRange"),
    timeVal: $("#timeVal"),
    penaltyRange: $("#penaltyRange"),
    penaltyVal: $("#penaltyVal"),

    superSpeedBtn: $("#superSpeedBtn"),
    speedStepRange: $("#speedStepRange"),
    speedStepVal: $("#speedStepVal"),
    comboBtn: $("#comboBtn"),
    hiddenBtn: $("#hiddenBtn"),
    soundBtn: $("#soundBtn"),
    soloBtn: $("#soloBtn"),

    // i18n / theme / mode
    langSelect: $("#langSelect"),
    themeBtn: $("#themeBtn"),
    modeSelect: $("#modeSelect"),
    mathRoundsRange: $("#mathRoundsRange"),
    mathRoundsVal: $("#mathRoundsVal"),
    opPlusBtn: $("#opPlusBtn"),
    opMinusBtn: $("#opMinusBtn"),
    diffEasyBtn: $("#diffEasyBtn"),
    diffMediumBtn: $("#diffMediumBtn"),
    diffHardBtn: $("#diffHardBtn"),
    mathSettings: $("#mathSettings"),
    // labels for i18n
    subtitle: $("#subtitle"),
    timerLabel: $("#timerLabel"),
    timerUnit: $("#timerUnit"),
    menuTitle: $("#menuTitle"),
    menuDesc: $("#menuDesc"),
    closeMenuText: $("#closeMenuText"),
    presetLabel: $("#presetLabel"),
    textLabel: $("#textLabel"),
    uiTitle: $("#uiTitle"),
    langLabel: $("#langLabel"),
    langHint: $("#langHint"),
    themeLabel: $("#themeLabel"),
    themeHint: $("#themeHint"),
    modeLabel: $("#modeLabel"),
    modeHint: $("#modeHint"),
    mathRoundsLabel: $("#mathRoundsLabel"),
    mathRoundsHint: $("#mathRoundsHint"),
    opsLabel: $("#opsLabel"),
    opsHint: $("#opsHint"),
    diffLabel: $("#diffLabel"),
    diffHint: $("#diffHint"),
    timeUpTitle: $("#timeUpTitle"),
    finalScoresLabel: $("#finalScoresLabel"),
    closeEndText: $("#closeEndText"),
    replayText: $("#replayText"),
    hardResetText: $("#hardResetText"),
    teamAName: $("#teamAName"),
    teamBName: $("#teamBName"),
    teamAResult: $("#teamAResult"),
    teamBResult: $("#teamBResult"),
    roundLabelEls: document.querySelectorAll("#roundLabel"),
    comboLabelEls: document.querySelectorAll("#comboLabel"),
    scoreLabelEls: document.querySelectorAll("#scoreLabel"),

    endOverlay: $("#endOverlay"),
    closeEndBtn: $("#closeEndBtn"),
    replayBtn: $("#replayBtn"),
    hardResetBtn: $("#hardResetBtn"),
    finalA: $("#finalA"),
    finalB: $("#finalB"),
    winnerText: $("#winnerText"),

    teamA: {
      flash: $("#flashA"),
      slots: $("#slotsA"),
      tiles: $("#tilesA"),
      score: $("#scoreA"),
      round: $("#roundA"),
      combo: $("#comboA"),
      hintBtn: $("#hintA"),
      note: $("#noteA"),
      mathArea: $("#mathAreaA"),
      mathOptions: $("#mathOptionsA")
    },
    teamB: {
      flash: $("#flashB"),
      slots: $("#slotsB"),
      tiles: $("#tilesB"),
      score: $("#scoreB"),
      round: $("#roundB"),
      combo: $("#comboB"),
      hintBtn: $("#hintB"),
      note: $("#noteB"),
      mathArea: $("#mathAreaB"),
      mathOptions: $("#mathOptionsB")
    }
  };

  /* ========= Звук ========= */
  const Sound = {
    enabled: true,
    ctx: null,
    unlock(){
      if(Sound.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      Sound.ctx = new Ctx();
    },
    beep(freq, dur=0.12, gainVal=0.08, type="sine"){
      if(!Sound.enabled) return;
      Sound.unlock();
      if(!Sound.ctx) return;
      const t0 = Sound.ctx.currentTime;

      const osc = Sound.ctx.createOscillator();
      const gain = Sound.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(gain);
      gain.connect(Sound.ctx.destination);

      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    correct(){ Sound.beep(700, 0.10, 0.08, "triangle"); },
    wrong(){ Sound.beep(190, 0.12, 0.10, "sawtooth"); },
    penalty(){ Sound.beep(130, 0.20, 0.12, "square"); },
    roundWin(){
      Sound.beep(760, 0.08, 0.08, "triangle");
      setTimeout(()=>Sound.beep(980, 0.10, 0.08, "triangle"), 90);
    },
    gameEnd(){
      Sound.beep(520, 0.10, 0.08, "triangle");
      setTimeout(()=>Sound.beep(390, 0.12, 0.08, "triangle"), 110);
      setTimeout(()=>Sound.beep(260, 0.14, 0.08, "triangle"), 240);
    }
  };

  /* ========= Состояние ========= */
  function mkTeamState(key){
    return {
      key,
      idx: 0,
      phase: "idle", // idle | flash | scramble | done
      words: [],
      placed: [],
      score: 0,

      // Очки за раунд (декаем)
      sentenceStartAt: 0,
      lastActionAt: 0,
      perSentencePoints: 1000,

      hintAvailable: false,
      decayTickId: 0,

      // Flash
      flashTimerId: 0,
      flashIndex: 0,

      // Ошибки
      wrongStreak: 0,

      // Комбо
      comboStreak: 0,
      comboMultiplier: 1.0,

      // Для паузы
      pausedElapsedMs: 0
    };
  }

  const Game = {
    config: {
      baseFlashMs: 800,
      globalSeconds: 60,
      penaltyOn3Wrong: 150,

      superSpeed: false,
      speedStepMs: 40,
      minFlashMs: 250,

      comboEnabled: true,
      comboEvery: 3,        // каждые 3 правильных +0.1
      comboAdd: 0.1,
      comboMax: 2.0,

      hiddenMode: false,
      hideMs: 2000,

      soloMode: false,

      // modes
      mode: "text", // "text" | "math"
      mathRounds: 12,
      mathPlus: true,
      mathMinus: true,
      mathDifficulty: "easy",
    },
    sentences: [],
    mathRounds: [],
    seedBase: 123456789,
    running: false,

    // глобальный таймер
    globalEndAt: 0,
    globalTickId: 0,
    globalFrozen: false,
    frozenRemainingMs: 0,

    // пауза
    paused: false,
    pausedAt: 0,

    teams: {
      A: mkTeamState("A"),
      B: mkTeamState("B")
    }
  };


function isMathMode(){ return Game.config.mode === "math"; }
function totalRounds(){
  return isMathMode() ? Game.mathRounds.length : Game.sentences.length;
}
function getRoundAt(i){
  return isMathMode() ? Game.mathRounds[i] : Game.sentences[i];
}

function setMode(mode){
  Game.config.mode = (mode === "math") ? "math" : "text";
  document.body.classList.toggle("mode-math", isMathMode());
  // hide/show math settings block is handled by CSS + body class, but we also ensure controls are consistent
  if(UI.modeSelect) UI.modeSelect.value = Game.config.mode;
}

function randInt(rand, min, max){
  return Math.floor(rand() * (max - min + 1)) + min;
}

function buildMathRounds(count){
  const rounds = [];
  const seed = (Date.now() ^ (count * 97531)) >>> 0;
  const rand = mulberry32(seed);

  // ===== helpers for HARD mode (mixed expressions with × and :) =====
  const choose = (arr) => arr[Math.floor(rand()*arr.length)];
  const DIV = ":"; // display division as ':' (as requested)
  const MUL = "×";

  function safeOptions(answer, max){
    const opts = new Set([answer]);
    const spread = clamp(Math.floor(max/2), 3, 20);
    for(let tries=0; tries<300 && opts.size<3; tries++){
      const delta = randInt(rand, 1, spread);
      const sign = rand() < 0.5 ? -1 : 1;
      let w = answer + sign*delta;
      w = clamp(w, 1, 99);
      if(w !== answer) opts.add(w);
    }
    while(opts.size<3) opts.add(randInt(rand, 1, 99));
    return shuffle([...opts], rand);
  }

  function makeTerm(maxOperand, allowMul, allowDiv){
    // build term like: a × b : c (integer-only)
    let value = randInt(rand, 1, maxOperand);
    let expr = String(value);

    // maybe multiply
    if(allowMul && rand() < 0.65){
      for(let tries=0; tries<40; tries++){
        const m = randInt(rand, 2, clamp(maxOperand, 2, 12));
        if(value * m <= 99){
          value = value * m;
          expr = `${expr} ${MUL} ${m}`;
          break;
        }
      }
    }

    // maybe divide (exact)
    if(allowDiv && rand() < 0.65){
      // pick a divisor of current value (2..maxOperand)
      const divisors = [];
      for(let d=2; d<=Math.min(maxOperand, value); d++){
        if(value % d === 0) divisors.push(d);
      }
      if(divisors.length){
        const d = choose(divisors);
        value = Math.floor(value / d);
        expr = `${expr} ${DIV} ${d}`;
      }
    }

    return { expr, value };
  }

  function makeHardExpression(i){
    // difficulty progression by round index:
    // 0..2: + only (1..10)
    // 3..5: + and - (1..20)
    // 6..8: + - and × inside terms (1..30)
    // 9..11: add : (exact) (1..40)
    // 12+: mixed, 3 operators typical (1..99)
    const stage = (i < 3) ? 0 : (i < 6) ? 1 : (i < 9) ? 2 : (i < 12) ? 3 : 4;
    const maxOperand = clamp(10 + i*4, 10, 99);
    const allowMinus = stage >= 1;
    const allowMul = stage >= 2;
    const allowDiv = stage >= 3;
    const termsCount = (stage <= 1) ? 2 : (stage === 4 ? randInt(rand, 2, 3) : 2);

    for(let tries=0; tries<200; tries++){
      const terms = [];
      for(let t=0; t<termsCount; t++){
        terms.push(makeTerm(maxOperand, allowMul, allowDiv));
      }
      const ops = [];
      for(let t=0; t<termsCount-1; t++){
        if(stage === 0) ops.push("+");
        else ops.push(rand() < 0.5 ? "+" : "-");
      }
      // compute result
      let result = terms[0].value;
      for(let t=1; t<termsCount; t++){
        result = (ops[t-1] === "+") ? (result + terms[t].value) : (result - terms[t].value);
      }
      if(result >= 1 && result <= 99){
        // build expression string
        let expr = terms[0].expr;
        for(let t=1; t<termsCount; t++){
          const s = ops[t-1];
          expr = `${expr} ${s} ${terms[t].expr}`;
        }
        // stage 4: sometimes add one more +/− term for harder look
        if(stage === 4 && rand() < 0.55){
          const extra = makeTerm(maxOperand, true, true);
          const s = rand() < 0.5 ? "+" : "-";
          const newResult = (s === "+") ? (result + extra.value) : (result - extra.value);
          if(newResult >= 1 && newResult <= 99){
            expr = `${expr} ${s} ${extra.expr}`;
            result = newResult;
          }
        }
        return { expr, answer: result, maxOperand };
      }
    }
    // fallback (should be rare)
    const a = randInt(rand, 1, 10);
    const b = randInt(rand, 1, 10);
    return { expr: `${a} + ${b}`, answer: a + b, maxOperand: 10 };
  }

  

  function makeMediumExpression(i){
    // progression:
    // 0..2: + only (1..10)
    // 3..5: + and - (1..20)
    // 6..8: add × inside terms (1..35), 2-part expressions
    // 9+: mixed (+/− with × in terms), sometimes 3 parts (1..99)
    const stage = (i < 3) ? 0 : (i < 6) ? 1 : (i < 9) ? 2 : 3;
    const maxOperand = clamp(10 + i*5, 10, 99);
    const allowMinus = stage >= 1;
    const allowMul = stage >= 2;
    const termsCount = (stage < 3) ? 2 : (rand() < 0.45 ? 3 : 2);

    for(let tries=0; tries<250; tries++){
      const terms = [];
      for(let t=0; t<termsCount; t++){
        terms.push(makeTerm(maxOperand, allowMul, false)); // no division in medium
      }
      const ops = [];
      for(let t=0; t<termsCount-1; t++){
        if(stage === 0) ops.push("+");
        else ops.push(rand() < 0.5 ? "+" : "-");
      }

      let result = terms[0].value;
      for(let t=1; t<termsCount; t++){
        result = (ops[t-1] === "+") ? (result + terms[t].value) : (result - terms[t].value);
      }

      if(result >= 1 && result <= 99){
        let expr = terms[0].expr;
        for(let t=1; t<termsCount; t++){
          expr = `${expr} ${ops[t-1]} ${terms[t].expr}`;
        }
        return { expr, answer: result, maxOperand };
      }
    }

    // fallback
    const a = randInt(rand, 1, 10);
    const b = randInt(rand, 1, 10);
    return { expr: `${a} + ${b}`, answer: a + b, maxOperand: 10 };
  }
// ===== classic (easy) mode: + and − only =====
  const easyOps = [];
  if(Game.config.mathPlus) easyOps.push("+");
  if(Game.config.mathMinus) easyOps.push("-");
  if(!easyOps.length) easyOps.push("+");

  for(let i=0;i<count;i++){
    const max = clamp(10 + i*5, 10, 99);

    if(Game.config.mathDifficulty === "hard"){
      const h = makeHardExpression(i);
      const options = safeOptions(h.answer, h.maxOperand);
      rounds.push({
        type: "math",
        expr: h.expr,
        answer: h.answer,
        options,
        difficulty: "hard"
      });
      continue;
    }

    if(Game.config.mathDifficulty === "medium"){
      const m = makeMediumExpression(i);
      const options = safeOptions(m.answer, m.maxOperand);
      rounds.push({
        type: "math",
        expr: m.expr,
        answer: m.answer,
        options,
        difficulty: "medium"
      });
      continue;
    }

    // easy
let op = easyOps[Math.floor(rand()*easyOps.length)];
    let a=1, b=1, ans=2;
    for(let tries=0; tries<100; tries++){
      a = randInt(rand, 1, max);
      b = randInt(rand, 1, max);
      op = easyOps[Math.floor(rand()*easyOps.length)];
      if(op === "+"){
        if(a + b <= 99){ ans = a + b; break; }
      } else {
        if(a - b >= 1){ ans = a - b; break; }
        if(b - a >= 1){ ans = b - a; [a,b] = [b,a]; break; }
      }
    }
    const options = safeOptions(ans, max);
    rounds.push({
      type: "math",
      a, b, op,
      expr: `${a} ${op} ${b}`,
      answer: ans,
      options,
      hard: false
    });
  }
  return rounds;
}

  /* ========= UI helpers ========= */
  function zFor(k){ return (k==="A") ? UI.teamA : UI.teamB; }
  function setScore(k){ zFor(k).score.textContent = fmtInt(Game.teams[k].score); }
  function setRound(k){
    const t = Game.teams[k];
    zFor(k).round.textContent = totalRounds() ? `${t.idx+1}/${totalRounds()}` : "—";
  }
  function setCombo(k){ zFor(k).combo.textContent = fmtMult(Game.teams[k].comboMultiplier); }
  function setNote(k, txt){ zFor(k).note.textContent = txt; }
  function showHintButton(k, show){
    const btn = zFor(k).hintBtn;
    if(show) btn.classList.remove("disabled"); else btn.classList.add("disabled");
  }

  function clearZone(k){
    const z = zFor(k);
    z.flash.textContent = "";
    z.flash.classList.remove("show");
    z.slots.innerHTML = "";
    z.tiles.innerHTML = "";
    z.tiles.classList.remove("hiddenTemp");
    showHintButton(k, false);
  }

  function buildSlots(k, words){
    const z = zFor(k);
    z.slots.innerHTML = "";
    const frag = document.createDocumentFragment();
    for(let i=0;i<words.length;i++){
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.slotIndex = String(i);
      slot.textContent = "—";
      frag.appendChild(slot);
    }
    z.slots.appendChild(frag);
  }

  function buildTiles(k, scrambledWords){
    const z = zFor(k);
    z.tiles.innerHTML = "";
    const frag = document.createDocumentFragment();
    for(const w of scrambledWords){
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.textContent = w;
      tile.dataset.word = w;
      frag.appendChild(tile);
    }
    z.tiles.appendChild(frag);
  }

  function pulseSlot(k, slotIndex){
    const z = zFor(k);
    const slot = z.slots.querySelector(`.slot[data-slot-index="${slotIndex}"]`);
    if(!slot) return;
    slot.classList.remove("pulse");
    void slot.offsetWidth;
    slot.classList.add("pulse");
  }

  function showFlashMessage(k, msg, color){
    const z = zFor(k);
    const el = z.flash;
    el.textContent = msg;
    if(color) el.style.color = color;
    el.classList.add("show");
    setTimeout(() => {
      el.classList.remove("show");
      el.textContent = "";
      el.style.color = "";
    }, 950);
  }

  function wrongFeedback(tile){
    tile.classList.add("wrong");
    tile.animate?.(
      [
        { transform:"translate3d(0,0,0)" },
        { transform:"translate3d(-6px,0,0)" },
        { transform:"translate3d(6px,0,0)" },
        { transform:"translate3d(0,0,0)" }
      ],
      { duration: 200, easing: "ease-out" }
    );
    setTimeout(()=>tile.classList.remove("wrong"), 250);
  }

  function hideTilesTemporarily(k){
    if(!Game.config.hiddenMode) return;
    const z = zFor(k);
    z.tiles.classList.add("hiddenTemp");
    setTimeout(() => {
      z.tiles.classList.remove("hiddenTemp");
    }, Game.config.hideMs);
  }

  /* ========= Таймеры ========= */
  function stopTeamTimers(k){
    const t = Game.teams[k];
    clearInterval(t.decayTickId);
    clearTimeout(t.flashTimerId);
    t.decayTickId = 0;
    t.flashTimerId = 0;
  }

  function tickGlobalTimer(){
    if(!Game.running) return;

    if(Game.globalFrozen){
      const s = Math.ceil(Game.frozenRemainingMs / 1000);
      UI.globalTimer.textContent = fmtInt(s);
      return;
    }

    const remainingMs = Game.globalEndAt - now();
    const s = Math.ceil(remainingMs / 1000);
    UI.globalTimer.textContent = fmtInt(s);

    if(remainingMs <= 0){
      UI.globalTimer.textContent = "0";
      endGame();
    }
  }

  /* ========= Логика скорости ========= */
  function effectiveFlashMs(roundIndex){
    // roundIndex: 0-based
    if(!Game.config.superSpeed) return Game.config.baseFlashMs;
    const ms = Game.config.baseFlashMs - roundIndex * Game.config.speedStepMs;
    return clamp(ms, Game.config.minFlashMs, 3000);
  }

  /* ========= Комбо ========= */
  function resetCombo(k){
    const t = Game.teams[k];
    t.comboStreak = 0;
    t.comboMultiplier = 1.0;
    setCombo(k);
  }

  function addCombo(k){
    const t = Game.teams[k];
    if(!Game.config.comboEnabled) return;

    t.comboStreak++;
    // каждые comboEvery правильных повышаем множитель
    if(t.comboStreak % Game.config.comboEvery === 0){
      t.comboMultiplier = clamp(t.comboMultiplier + Game.config.comboAdd, 1.0, Game.config.comboMax);
      setCombo(k);
      // небольшой “приятный” звук
      Sound.beep(900, 0.06, 0.06, "triangle");
      setNote(k, `Отлично! Комбо выросло до ${fmtMult(t.comboMultiplier)}.`);
    }
  }

  /* ========= Пауза / Заморозка времени ========= */
  function setPaused(p){
    if(!Game.running) return;
    if(Game.paused === p) return;

    Game.paused = p;

    if(p){
      Game.pausedAt = now();

      // стопим глобальный тик (но не сбрасываем данные)
      clearInterval(Game.globalTickId);
      Game.globalTickId = 0;

      // пауза команд: сохраняем elapsed для декаем
      for(const k of ["A","B"]){
        const t = Game.teams[k];
        // сохраняем сколько прошло в раунде (чтобы не “съедало” очки в паузе)
        t.pausedElapsedMs = now() - t.sentenceStartAt;
        stopTeamTimers(k);
        showFlashMessage(k, "Пауза", "#ff9a1f");
      }

      UI.pauseBtn.textContent = "▶ Продолжить";
      UI.pauseBtn.classList.add("on");
      setNote("A","Пауза. Нажми «Продолжить».");
      setNote("B","Пауза. Нажми «Продолжить».");
    } else {
      // восстановление глобального таймера
      if(!Game.globalFrozen){
        // продлеваем endAt на длительность паузы
        const pausedFor = now() - Game.pausedAt;
        Game.globalEndAt += pausedFor;
      }
      Game.globalTickId = setInterval(tickGlobalTimer, 200);

      // восстановление команд
      for(const k of ["A","B"]){
        const t = Game.teams[k];
        // восстановим startAt так, будто паузы не было
        t.sentenceStartAt = now() - t.pausedElapsedMs;
        t.lastActionAt = now(); // чтобы подсказка не вылезла сразу
        resumeTeamPhase(k);
      }

      UI.pauseBtn.textContent = I18N[getLang()].pause;
      UI.pauseBtn.classList.remove("on");
    }
  }

  function resumeTeamPhase(k){
    const t = Game.teams[k];

    // снова запустим decay (очки и подсказка)
    t.decayTickId = setInterval(() => {
      if(!Game.running || Game.paused) return;

      const elapsed = (now() - t.sentenceStartAt) / 1000;
      t.perSentencePoints = clamp(1000 - Math.floor(elapsed) * 10, 0, 1000);

      const stuckFor = (now() - t.lastActionAt) / 1000;
      if(!t.hintAvailable && stuckFor >= 15 && t.phase === "scramble"){
        t.hintAvailable = true;
        showHintButton(k, true);
        setNote(k, "Подсказка доступна: вставит 1 слово (-200).");
      }
    }, 250);

    if(t.phase === "flash"){
      // продолжим flash с текущего индекса
      runFlash(k, t.words, /*resume*/true);
    } else if(t.phase === "scramble"){
      // просто возвращаем управление
      setNote(k, "Продолжай: нажимай слова по порядку.");
    }
  }

  function toggleFreezeTimer(){
    if(!Game.running) return;

    Game.globalFrozen = !Game.globalFrozen;

    if(Game.globalFrozen){
      // фиксируем оставшееся
      Game.frozenRemainingMs = Math.max(0, Game.globalEndAt - now());
      UI.freezeBtn.textContent = "⏱ Время заморожено";
      UI.freezeBtn.classList.add("on");
    } else {
      // восстановим endAt
      Game.globalEndAt = now() + Game.frozenRemainingMs;
      UI.freezeBtn.textContent = I18N[getLang()].freeze;
      UI.freezeBtn.classList.remove("on");
    }

    tickGlobalTimer();
  }

  /* ========= Учитель: пропуск раунда ========= */
  function skipRound(k){
    if(!Game.running) return;
    const t = Game.teams[k];
    stopTeamTimers(k);
    clearZone(k);

    resetCombo(k);
    t.wrongStreak = 0;

    t.idx++;
    startSentence(k);
  }

  /* ========= Игра ========= */
  function startGame(){
    if(Game.running) return;

    if(!totalRounds()){
      UI.setupOverlay.style.display = "flex";
      setNote("A", "Нет текста. В меню вставь текст и нажми «Применить».");
      setNote("B", "Нет текста. В меню вставь текст и нажми «Применить».");
      return;
    }

    Sound.unlock();

    Game.running = true;
    Game.paused = false;
    UI.startBtn.classList.add("disabled");
    UI.openSetupBtn.classList.add("disabled");
    UI.endOverlay.classList.remove("show");

    // сброс состояний
    for(const k of ["A","B"]){
      Game.teams[k] = mkTeamState(k);
      setScore(k);
      setRound(k);
      resetCombo(k);
      clearZone(k);
    }

    // глобальный таймер
    Game.globalFrozen = false;
    UI.freezeBtn.textContent = I18N[getLang()].freeze;
    UI.freezeBtn.classList.remove("on");

    Game.globalEndAt = now() + Game.config.globalSeconds * 1000;
    tickGlobalTimer();
    Game.globalTickId = setInterval(tickGlobalTimer, 200);

    // старт раундов
    startSentence("A");

    if(Game.config.soloMode){
      // В соло режиме B "выключена"
      stopTeamTimers("B");
      clearZone("B");
      setNote("B", "Соло режим: играет только Команда A.");
    } else {
      startSentence("B");
    }
  }

  function endGame(){
    if(!Game.running) return;

    Game.running = false;
    clearInterval(Game.globalTickId);
    Game.globalTickId = 0;

    for(const k of ["A","B"]){
      stopTeamTimers(k);
      showHintButton(k, false);
    }

    UI.startBtn.classList.remove("disabled");
    UI.openSetupBtn.classList.remove("disabled");

    UI.finalA.textContent = fmtInt(Game.teams.A.score);
    UI.finalB.textContent = fmtInt(Game.teams.B.score);

    const a = Game.teams.A.score;
    const b = Game.teams.B.score;

    if(Game.config.soloMode){
      UI.winnerText.textContent = I18N[getLang()].winnerSolo;
    } else {
      const T = I18N[getLang()];
      UI.winnerText.textContent =
        (a>b) ? T.winnerA :
        (b>a) ? T.winnerB :
        T.draw;
    }

    Sound.gameEnd();
    UI.endOverlay.classList.add("show");
  }

  
function startSentence(k){
  if(!Game.running) return;

  const t = Game.teams[k];
  const round = getRoundAt(t.idx);

  if(!round){
    t.phase = "done";
    clearZone(k);
    setNote(k, I18N[getLang()].noteRoundsOver);
    return;
  }

  stopTeamTimers(k);
  clearZone(k);

  t.phase = "flash";

  // common round init
  t.perSentencePoints = 1000;
  t.hintAvailable = false;
  t.sentenceStartAt = now();
  t.lastActionAt = now();
  t.wrongStreak = 0;
  t.flashIndex = 0;
  t.pausedElapsedMs = 0;

  // старт decay (очки + подсказка только для текстового режима)
  t.decayTickId = setInterval(() => {
    if(!Game.running || Game.paused) return;

    const elapsed = (now() - t.sentenceStartAt) / 1000;
    t.perSentencePoints = clamp(1000 - Math.floor(elapsed) * 10, 0, 1000);

    if(isMathMode()) return;

    const stuckFor = (now() - t.lastActionAt) / 1000;
    if(!t.hintAvailable && stuckFor >= 15 && t.phase === "scramble"){
      t.hintAvailable = true;
      showHintButton(k, true);
      setNote(k, "Подсказка доступна: вставит 1 слово (-200).");
    }
  }, 250);

  setRound(k);

  const ms = effectiveFlashMs(t.idx);
  const T = I18N[getLang()];
  if(isMathMode()){
    // math: flash the expression token-by-token (works for easy and hard)
    const expr = String(round.expr || "");
    t.words = expr.split(/\s+/).filter(Boolean);
    t.placed = [];
    showHintButton(k, false);
    setNote(k, `${T.round} ${t.idx+1}: ${T.notePlayMath} ${T.speedLabel}: ${ms}мс.`);
  } else {
    // text
    const sentence = String(round);
    t.words = tokenize(sentence);
    t.placed = new Array(t.words.length).fill(null);

    setNote(k, `${T.round} ${t.idx+1}: ${T.notePlayText} ${T.speedLabel}: ${ms}мс.`);
  }

  runFlash(k, t.words, /*resume*/false);
}

  function runFlash(k, words, resume){
    const z = zFor(k);
    const t = Game.teams[k];
    const flashMs = effectiveFlashMs(t.idx);

    // если не resume — начинаем сначала
    if(!resume) t.flashIndex = 0;

    const step = () => {
      if(!Game.running || Game.paused) return;
      if(t.phase !== "flash") return;

      if(t.flashIndex >= words.length){
        z.flash.classList.remove("show");
        z.flash.textContent = "";
        if(isMathMode()) startMathChoices(k); else startScramble(k);
        return;
      }

      z.flash.textContent = words[t.flashIndex];
      z.flash.classList.add("show");
      setTimeout(() => z.flash.classList.remove("show"), Math.max(120, flashMs - 120));

      t.flashIndex++;
      t.flashTimerId = setTimeout(step, flashMs);
    };

    // запускаем
    step();
  }

  function startScramble(k){
    if(!Game.running) return;

    const t = Game.teams[k];
    t.phase = "scramble";

    const words = t.words.slice();
    buildSlots(k, words);

    // перемешивание
    const seed = (Game.seedBase ^ ((t.idx+1) * 2654435761) ^ (k==="A" ? 0xA5A5A5A5 : 0x5A5A5A5A)) >>> 0;
    const rand = mulberry32(seed);
    const scrambled = shuffle(words, rand);

    buildTiles(k, scrambled);
    attachClickMode(k);

    showHintButton(k, false);
    setNote(k, I18N[getLang()].notePlayText);
  }


function startMathChoices(k){
  if(!Game.running) return;
  const t = Game.teams[k];
  t.phase = "scramble"; // reuse phase name for "answering"

  const round = Game.mathRounds[t.idx];
  const z = zFor(k);

  // build 3 options buttons
  if(z.mathOptions){
    z.mathOptions.innerHTML = "";
    const frag = document.createDocumentFragment();
    for(const val of round.options){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mathBtn";
      b.dataset.value = String(val);
      b.textContent = String(val);
      frag.appendChild(b);
    }
    z.mathOptions.appendChild(frag);
  }

  showHintButton(k, false);
  setNote(k, I18N[getLang()].notePlayMath);

  attachMathMode(k);
}

function attachMathMode(k){
  const z = zFor(k);
  if(!z.mathOptions) return;
  if(z.mathOptions.dataset.bound === "1") return;
  z.mathOptions.dataset.bound = "1";

  z.mathOptions.addEventListener("pointerdown", (ev) => {
    if(!Game.running || Game.paused) return;
    const t = Game.teams[k];
    if(!isMathMode() || t.phase !== "scramble") return;

    const btn = ev.target.closest(".mathBtn");
    if(!btn) return;
    ev.preventDefault();
    Sound.unlock();

    const chosen = Number(btn.dataset.value);
    const round = Game.mathRounds[t.idx];
    t.lastActionAt = now();

    if(chosen === round.answer){
      btn.classList.add("good");
      Sound.correct();
      addCombo(k);
      // quick success
      stopTeamTimers(k);
      setTimeout(() => {
        if(!Game.running || Game.paused) return;
        finishSentence(k);
      }, 260);
    } else {
      btn.classList.add("bad");
      Sound.wrong();
      resetCombo(k);

      t.wrongStreak++;
      if(t.wrongStreak >= 3){
        t.score = Math.max(0, t.score - Game.config.penaltyOn3Wrong);
        setScore(k);
        t.wrongStreak = 0;
        Sound.penalty();
        showFlashMessage(k, `- ${Game.config.penaltyOn3Wrong}`, "#ff3b5f");
      }

      // small feedback and allow retry
      setTimeout(() => btn.classList.remove("bad"), 220);
    }
  }, { passive:false });
}

  function finishSentence(k){
    const t = Game.teams[k];

    // начисление с комбо
    const mult = Game.config.comboEnabled ? t.comboMultiplier : 1.0;
    const gained = Math.floor(t.perSentencePoints * mult);

    t.score += gained;
    setScore(k);

    Sound.roundWin();
    setNote(k, `Готово! +${gained} очков (множитель ${fmtMult(mult)}). Следующий раунд...`);

    t.idx++;
    startSentence(k);
  }

  function doHint(k){
    const t = Game.teams[k];
    if(!Game.running || Game.paused) return;
    if(t.phase !== "scramble") return;
    if(!t.hintAvailable) return;

    const z = zFor(k);
    const nextIndex = t.placed.findIndex(v => v === null);
    if(nextIndex === -1) return;

    const correctWord = t.words[nextIndex];
    const tile = [...z.tiles.querySelectorAll(".tile")].find(el => el.dataset.word === correctWord);

    placeCorrect(k, nextIndex, correctWord, tile);

    t.perSentencePoints = Math.max(0, t.perSentencePoints - 200);
    t.hintAvailable = false;
    showHintButton(k, false);
    t.lastActionAt = now();

    // подсказка сбрасывает серии
    t.wrongStreak = 0;
    resetCombo(k);

    setNote(k, "Подсказка использована (-200). Продолжай!");
    checkComplete(k);
  }

  /* ========= Нажатия вместо перетаскивания ========= */
  function attachClickMode(k){
    const z = zFor(k);
    if(z.tiles.dataset.bound === "1") return;
    z.tiles.dataset.bound = "1";

    z.tiles.addEventListener("pointerdown", (ev) => {
      if(!Game.running || Game.paused) return;
      const t = Game.teams[k];
      if(t.phase !== "scramble") return;

      const tile = ev.target.closest(".tile");
      if(!tile) return;

      ev.preventDefault();
      Sound.unlock();

      const nextIndex = t.placed.findIndex(v => v === null);
      if(nextIndex === -1) return;

      const correctWord = t.words[nextIndex];
      const clickedWord = tile.dataset.word;

      t.lastActionAt = now();

      if(clickedWord === correctWord){
        placeCorrect(k, nextIndex, clickedWord, tile);

        // правильно => комбо растёт, ошибки сброс
        t.wrongStreak = 0;
        Sound.correct();
        addCombo(k);

        checkComplete(k);
      } else {
        // ошибка
        t.wrongStreak++;
        Sound.wrong();
        wrongFeedback(tile);

        // скрытый режим
        hideTilesTemporarily(k);

        // ошибка сбрасывает комбо
        resetCombo(k);

        if(t.wrongStreak >= 3){
          t.score = Math.max(0, t.score - Game.config.penaltyOn3Wrong);
          setScore(k);
          t.wrongStreak = 0;

          Sound.penalty();
          showFlashMessage(k, `Ошибка ×3! -${Game.config.penaltyOn3Wrong}`, "#ff3b5f");
          setNote(k, `Штраф за 3 ошибки подряд: -${Game.config.penaltyOn3Wrong}. Смотри порядок слов.`);
        }
      }
    }, { passive:false });
  }

  function placeCorrect(k, slotIndex, word, tileEl){
    const z = zFor(k);
    const t = Game.teams[k];

    t.placed[slotIndex] = word;

    const slot = z.slots.querySelector(`.slot[data-slot-index="${slotIndex}"]`);
    if(slot){
      slot.textContent = word;
      slot.classList.add("filled", "correct");
    }

    if(tileEl && tileEl.parentNode){
      tileEl.parentNode.removeChild(tileEl);
    }

    pulseSlot(k, slotIndex);
  }

  function checkComplete(k){
    const t = Game.teams[k];
    if(t.placed.every(v => v !== null)){
      stopTeamTimers(k);
      showHintButton(k, false);
      setTimeout(() => {
        if(!Game.running || Game.paused) return;
        finishSentence(k);
      }, 420);
    }
  }

  /* ========= Setup / Reset ========= */

function applySetup(){
  // read UI settings (mode/theme/lang are handled separately)
  if(isMathMode()){
    const n = Number(UI.mathRoundsRange?.value || Game.config.mathRounds || 12);
    Game.config.mathRounds = n;
    Game.mathRounds = buildMathRounds(n);
    Game.sentences = [];

    Game.seedBase = (Date.now() ^ (n * 7331)) >>> 0;

    for(const k of ["A","B"]){
      Game.teams[k] = mkTeamState(k);
      setScore(k);
      setRound(k);
      setCombo(k);
      clearZone(k);
    }

    UI.setupOverlay.style.display = "none";

    const T = I18N[getLang()];
    setNote("A", T.noteMathReady(n));
    setNote("B", T.noteMathReady(n));
    setRound("A"); setRound("B");
    return;
  }

  const text = UI.textInput.value.trim();
  const sentences = splitIntoSentences(text)
    .map(s => s.replace(/\s+/g," ").trim())
    .filter(Boolean)
    .filter(s => tokenize(s).length >= 2);

  Game.sentences = sentences;
  Game.mathRounds = [];
  Game.seedBase = (Date.now() ^ (sentences.length * 1337)) >>> 0;

  for(const k of ["A","B"]){
    Game.teams[k] = mkTeamState(k);
    setScore(k);
    setRound(k);
    setCombo(k);
    clearZone(k);
  }

  UI.setupOverlay.style.display = "none";

  const T = I18N[getLang()];
  if(!Game.sentences.length){
    setNote("A", T.noteNoSentences);
    setNote("B", T.noteNoSentences);
  } else {
    setNote("A", T.noteReady(Game.sentences.length));
    setNote("B", T.noteReady(Game.sentences.length));
    setRound("A"); setRound("B");
  }
}

  function softReset(){
    Game.running = false;
    Game.paused = false;

    clearInterval(Game.globalTickId);
    Game.globalTickId = 0;

    for(const k of ["A","B"]){
      stopTeamTimers(k);
      Game.teams[k] = mkTeamState(k);
      setScore(k);
      setRound(k);
      setCombo(k);
      clearZone(k);
      const T = I18N[getLang()];
      setNote(k, T.noteReset);
    }

    Game.globalFrozen = false;
    UI.freezeBtn.textContent = I18N[getLang()].freeze;
    UI.freezeBtn.classList.remove("on");
    UI.pauseBtn.textContent = I18N[getLang()].pause;
    UI.pauseBtn.classList.remove("on");

    UI.globalTimer.textContent = fmtInt(Game.config.globalSeconds);
    UI.startBtn.classList.remove("disabled");
    UI.openSetupBtn.classList.remove("disabled");
    UI.endOverlay.classList.remove("show");

    // Ensure new random rounds after reset (especially for Math mode)
    if(isMathMode()){
      const n = Number(Game.config.mathRounds || 12);
      Game.mathRounds = buildMathRounds(n);
    } else {
      // rebuild sentence list so start always feels fresh after a reset if custom text changed
      Game.sentences = splitIntoSentences(UI.textInput?.value || "");
    }
  }

  function hardReset(){
    softReset();
    Game.sentences = [];
    UI.textInput.value = "";
    const T = I18N[getLang()];
    setNote("A", T.noteNeedText);
    setNote("B", T.noteNeedText);
    setRound("A"); setRound("B");
    UI.setupOverlay.style.display = "flex";
  }

  /* ========= INIT ========= */
  function setToggle(btn, on){
    btn.classList.toggle("on", !!on);
    btn.textContent = on ? "Вкл" : "Выкл";
  }

  function applySoloUI(){
    document.body.classList.toggle("solo", Game.config.soloMode);

    // Кнопки учителя для B — отключаем, чтобы не путать
    if(UI.skipB){
      UI.skipB.disabled = Game.config.soloMode;
      UI.skipB.style.opacity = Game.config.soloMode ? "0.5" : "1";
      UI.skipB.style.pointerEvents = Game.config.soloMode ? "none" : "auto";
    }
  }

  function initUI(){
    UI.setupOverlay.style.display = "flex";
    UI.globalTimer.textContent = fmtInt(Game.config.globalSeconds);

    // sliders
    const syncSpeed = () => {
      Game.config.baseFlashMs = Number(UI.speedRange.value);
      UI.speedVal.textContent = String(Game.config.baseFlashMs);
    };
    const syncTime = () => {
      Game.config.globalSeconds = Number(UI.timeRange.value);
      UI.timeVal.textContent = String(Game.config.globalSeconds);
      if(!Game.running) UI.globalTimer.textContent = fmtInt(Game.config.globalSeconds);
    };
    const syncPenalty = () => {
      Game.config.penaltyOn3Wrong = Number(UI.penaltyRange.value);
      UI.penaltyVal.textContent = String(Game.config.penaltyOn3Wrong);
    };
    const syncStep = () => {
      Game.config.speedStepMs = Number(UI.speedStepRange.value);
      UI.speedStepVal.textContent = String(Game.config.speedStepMs);
    };

    UI.speedRange.addEventListener("input", syncSpeed);
    UI.timeRange.addEventListener("input", syncTime);
    UI.penaltyRange.addEventListener("input", syncPenalty);
    UI.speedStepRange.addEventListener("input", syncStep);
    syncSpeed(); syncTime(); syncPenalty(); syncStep();

    // presets
    UI.presetSelect.addEventListener("change", () => {
      const v = UI.presetSelect.value;
      if(v === "custom") return;
      UI.textInput.value = PRESETS[v] || "";
    });

    // toggles
    setToggle(UI.superSpeedBtn, Game.config.superSpeed);
    UI.superSpeedBtn.addEventListener("click", () => {
      Game.config.superSpeed = !Game.config.superSpeed;
      setToggle(UI.superSpeedBtn, Game.config.superSpeed);
    });

    setToggle(UI.comboBtn, Game.config.comboEnabled);
    UI.comboBtn.addEventListener("click", () => {
      Game.config.comboEnabled = !Game.config.comboEnabled;
      setToggle(UI.comboBtn, Game.config.comboEnabled);
      // обновим отображение
      setCombo("A"); setCombo("B");
    });

    setToggle(UI.hiddenBtn, Game.config.hiddenMode);
    UI.hiddenBtn.addEventListener("click", () => {
      Game.config.hiddenMode = !Game.config.hiddenMode;
      setToggle(UI.hiddenBtn, Game.config.hiddenMode);
    });

    setToggle(UI.soundBtn, Sound.enabled);
    UI.soundBtn.addEventListener("click", () => {
      Sound.enabled = !Sound.enabled;
      setToggle(UI.soundBtn, Sound.enabled);
      if(Sound.enabled) Sound.unlock();
    });

    // solo mode toggle
    setToggle(UI.soloBtn, Game.config.soloMode);
    UI.soloBtn.addEventListener("click", () => {
      Game.config.soloMode = !Game.config.soloMode;
      setToggle(UI.soloBtn, Game.config.soloMode);
      applySoloUI();
    });
    applySoloUI();


// language / theme / mode (persisted)
if(UI.langSelect){
  UI.langSelect.value = getLang();
  UI.langSelect.addEventListener("change", () => setLang(UI.langSelect.value));
}

// theme
setTheme(getTheme());
if(UI.themeBtn){
  UI.themeBtn.addEventListener("click", () => {
    const next = (getTheme() === "dark") ? "light" : "dark";
    setTheme(next);
  });
}

// mode
if(UI.modeSelect){
  // default: text
  const savedMode = localStorage.getItem("ld_mode");
  setMode(savedMode === "math" ? "math" : "text");
  UI.modeSelect.value = Game.config.mode;
  UI.modeSelect.addEventListener("change", () => {
    if(Game.running) return;
    setMode(UI.modeSelect.value);
    localStorage.setItem("ld_mode", Game.config.mode);
    // small hint in both zones
    const T = I18N[getLang()];
    setNote("A", isMathMode() ? T.notePlayMath : T.noteNeedText);
    if(!Game.config.soloMode) setNote("B", isMathMode() ? T.notePlayMath : T.noteBStart);
  });
} else {
  setMode("text");
}

// math settings
const syncMathRounds = () => {
  if(!UI.mathRoundsRange) return;
  Game.config.mathRounds = Number(UI.mathRoundsRange.value);
  if(UI.mathRoundsVal) UI.mathRoundsVal.textContent = String(Game.config.mathRounds);
};
if(UI.mathRoundsRange){
  UI.mathRoundsRange.value = String(Game.config.mathRounds);
  UI.mathRoundsRange.addEventListener("input", syncMathRounds);
  syncMathRounds();
}

const setOpToggle = (btn, on) => {
  btn.classList.toggle("on", !!on);
  btn.textContent = btn.id === "opPlusBtn" ? "+" : "−";
};

function setDifficulty(d){
  Game.config.mathDifficulty = d;

  // Hard forces + and − on (progression will add × and :)
  if(d === "hard"){
    Game.config.mathPlus = true;
    Game.config.mathMinus = true;
    if(UI.opPlusBtn) setOpToggle(UI.opPlusBtn, true);
    if(UI.opMinusBtn) setOpToggle(UI.opMinusBtn, true);
  }

  syncDifficultyUI();
}

function syncDifficultyUI(){
  // Buttons
  if(UI.diffEasyBtn) setToggle(UI.diffEasyBtn, Game.config.mathDifficulty === "easy");
  if(UI.diffMediumBtn) setToggle(UI.diffMediumBtn, Game.config.mathDifficulty === "medium");
  if(UI.diffHardBtn) setToggle(UI.diffHardBtn, Game.config.mathDifficulty === "hard");

  // Disable op toggles only in hard
  const dim = Game.config.mathDifficulty === "hard";
  if(UI.opPlusBtn){
    UI.opPlusBtn.classList.toggle("disabled", dim);
    UI.opPlusBtn.setAttribute("aria-disabled", dim ? "true" : "false");
  }
  if(UI.opMinusBtn){
    UI.opMinusBtn.classList.toggle("disabled", dim);
    UI.opMinusBtn.setAttribute("aria-disabled", dim ? "true" : "false");
  }
}

if(UI.opPlusBtn){
  setOpToggle(UI.opPlusBtn, Game.config.mathPlus);
  UI.opPlusBtn.addEventListener("click", () => {
    if(Game.config.mathDifficulty === "hard") return;
    Game.config.mathPlus = !Game.config.mathPlus;
    setOpToggle(UI.opPlusBtn, Game.config.mathPlus);
  });
}
if(UI.opMinusBtn){
  setOpToggle(UI.opMinusBtn, Game.config.mathMinus);
  UI.opMinusBtn.addEventListener("click", () => {
    if(Game.config.mathDifficulty === "hard") return;
    Game.config.mathMinus = !Game.config.mathMinus;
    setOpToggle(UI.opMinusBtn, Game.config.mathMinus);
  });
}

if(UI.diffEasyBtn){
  UI.diffEasyBtn.addEventListener("click", () => setDifficulty("easy"));
}
if(UI.diffMediumBtn){
  UI.diffMediumBtn.addEventListener("click", () => setDifficulty("medium"));
}
if(UI.diffHardBtn){
  UI.diffHardBtn.addEventListener("click", () => setDifficulty("hard"));
}

// sync on load
syncDifficultyUI();
// initial language application
applyI18n();

    // menu
    UI.openSetupBtn.addEventListener("click", () => {
      if(Game.running) return;
      UI.setupOverlay.style.display = "flex";
    });
    UI.closeSetupBtn.addEventListener("click", () => UI.setupOverlay.style.display = "none");
    UI.applyBtn.addEventListener("click", applySetup);

    // game controls
    UI.startBtn.addEventListener("click", startGame);
    UI.resetBtn.addEventListener("click", softReset);

    // teacher controls
    UI.pauseBtn.addEventListener("click", () => setPaused(!Game.paused));
    UI.freezeBtn.addEventListener("click", toggleFreezeTimer);
    UI.skipA.addEventListener("click", () => skipRound("A"));
    UI.skipB.addEventListener("click", () => skipRound("B"));

    // hints
    UI.teamA.hintBtn.addEventListener("click", () => doHint("A"));
    UI.teamB.hintBtn.addEventListener("click", () => doHint("B"));

    // end overlay
    UI.closeEndBtn.addEventListener("click", () => UI.endOverlay.classList.remove("show"));
    UI.replayBtn.addEventListener("click", () => { UI.endOverlay.classList.remove("show"); softReset(); startGame(); });
    UI.hardResetBtn.addEventListener("click", hardReset);

    // no page scroll (smartboard) — allow scroll inside menu/tiles/main
    document.addEventListener("touchmove", (e) => {
      // Разрешаем прокрутку внутри: меню и списка плиток и самой игровой области
      const allowScroll = e.target.closest?.(".cardScroll, .tiles, .main");
      if(allowScroll) return;

      // В остальных местах блокируем "ездящий" скролл страницы
      e.preventDefault();
    }, { passive:false });

    // hotkeys (optional)
    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape"){
        if(UI.setupOverlay.style.display === "flex") UI.setupOverlay.style.display = "none";
        if(UI.endOverlay.classList.contains("show")) UI.endOverlay.classList.remove("show");
      }
      if(e.key.toLowerCase() === "s"){ if(!Game.running) startGame(); }
      if(e.key.toLowerCase() === "r"){ softReset(); }
      if(e.key.toLowerCase() === "p"){ if(Game.running) setPaused(!Game.paused); }
    });

    // initial hints
    setNote("A","Открой «Меню», выбери текст (или вставь свой) и нажми «Применить».");
    setNote("B","После показа слов — нажимай плитки снизу по порядку.");
    setCombo("A"); setCombo("B");
  }

  initUI();

  async function tryFullscreen(){
    const el = document.documentElement;
    if(el.requestFullscreen && !document.fullscreenElement){
      try { await el.requestFullscreen(); } catch {}
    }
  }

  tryFullscreen();
})();
