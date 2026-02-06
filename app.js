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
      note: $("#noteA")
    },
    teamB: {
      flash: $("#flashB"),
      slots: $("#slotsB"),
      tiles: $("#tilesB"),
      score: $("#scoreB"),
      round: $("#roundB"),
      combo: $("#comboB"),
      hintBtn: $("#hintB"),
      note: $("#noteB")
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
    },
    sentences: [],
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

  /* ========= UI helpers ========= */
  function zFor(k){ return (k==="A") ? UI.teamA : UI.teamB; }
  function setScore(k){ zFor(k).score.textContent = fmtInt(Game.teams[k].score); }
  function setRound(k){
    const t = Game.teams[k];
    zFor(k).round.textContent = Game.sentences.length ? `${t.idx+1}/${Game.sentences.length}` : "—";
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

      UI.pauseBtn.textContent = "⏸ Пауза";
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
      UI.freezeBtn.textContent = "⏱ Заморозить время";
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

    if(!Game.sentences.length){
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
    UI.freezeBtn.textContent = "⏱ Заморозить время";
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
      UI.winnerText.textContent = "Режим: Один игрок — итоговый результат Команды A";
    } else {
      UI.winnerText.textContent =
        (a>b) ? "Победитель: Команда A" :
        (b>a) ? "Победитель: Команда B" :
        "Ничья: идеально ровно!";
    }

    Sound.gameEnd();
    UI.endOverlay.classList.add("show");
  }

  function startSentence(k){
    if(!Game.running) return;

    const t = Game.teams[k];
    const sentence = Game.sentences[t.idx];

    if(!sentence){
      t.phase = "done";
      clearZone(k);
      setNote(k, "Раунды закончились.");
      return;
    }

    stopTeamTimers(k);
    clearZone(k);

    t.phase = "flash";
    t.words = tokenize(sentence);
    t.placed = new Array(t.words.length).fill(null);

    t.perSentencePoints = 1000;
    t.hintAvailable = false;
    t.sentenceStartAt = now();
    t.lastActionAt = now();
    t.wrongStreak = 0;
    t.flashIndex = 0;
    t.pausedElapsedMs = 0;

    // старт decay
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

    setRound(k);

    const ms = effectiveFlashMs(t.idx);
    setNote(k, `Раунд ${t.idx+1}: запомни → потом нажимай по порядку. Скорость: ${ms} мс/слово.`);

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
        startScramble(k);
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
    setNote(k, "Нажимай слова снизу по порядку: 1 → 2 → 3…");
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
    const text = UI.textInput.value.trim();
    const sentences = splitIntoSentences(text)
      .map(s => s.replace(/\s+/g," ").trim())
      .filter(Boolean)
      .filter(s => tokenize(s).length >= 2);

    Game.sentences = sentences;
    Game.seedBase = (Date.now() ^ (sentences.length * 1337)) >>> 0;

    for(const k of ["A","B"]){
      Game.teams[k] = mkTeamState(k);
      setScore(k);
      setRound(k);
      setCombo(k);
      clearZone(k);
    }

    UI.setupOverlay.style.display = "none";

    if(!Game.sentences.length){
      setNote("A", "Не найдено подходящих предложений. Нужно минимум 2 слова в предложении.");
      setNote("B", "Не найдено подходящих предложений. Нужно минимум 2 слова в предложении.");
    } else {
      setNote("A", `Готово: раундов — ${Game.sentences.length}. Нажми «Старт».`);
      setNote("B", `Готово: раундов — ${Game.sentences.length}. Нажми «Старт».`);
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
      setNote(k, "Сброс. Нажми «Старт».");
    }

    Game.globalFrozen = false;
    UI.freezeBtn.textContent = "⏱ Заморозить время";
    UI.freezeBtn.classList.remove("on");
    UI.pauseBtn.textContent = "⏸ Пауза";
    UI.pauseBtn.classList.remove("on");

    UI.globalTimer.textContent = fmtInt(Game.config.globalSeconds);
    UI.startBtn.classList.remove("disabled");
    UI.openSetupBtn.classList.remove("disabled");
    UI.endOverlay.classList.remove("show");
  }

  function hardReset(){
    softReset();
    Game.sentences = [];
    UI.textInput.value = "";
    setNote("A","Открой «Меню», вставь текст и нажми «Применить».");
    setNote("B","Открой «Меню», вставь текст и нажми «Применить».");
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
