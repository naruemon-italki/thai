/* =========================================================================
   sentence-builder.js  —  Sentence Builder game engine (Thai Beginner Course)
   -------------------------------------------------------------------------
   ENGINE + UI + CHECK LOGIC for the Sentence Builder mode. Rarely edited.

   Loaded AFTER the main inline script (so it can see shared globals: state,
   showView, navigate, tts, playSound, haptic, shuffle, escapeHtml, saveStorage,
   checkAchievements, the win-modal helpers, plus the special-pack helpers
   isPackLesson / isPackUnlocked / lessonLabel / packName) and AFTER sentences.js
   (so the global `sentences` array exists). Plain script, no modules — everything
   shares one global scope, exactly like vocab-data.js / grammar-data.js.

   This file is self-contained behind state.gameMode === 'sentence' and its own
   two views (#view-sentence menu, #view-sentence-game board). It reuses existing
   systems rather than duplicating them:
     - Thai TTS via the global `tts` object (+ the same availability gate)
     - the shared win-modal shell (#win-modal) for the end screen
     - the menu CSS classes (cat-chip / toggle-opt / level-grid / start-btn ...)
       so the menu looks identical to Audio Bingo without sharing its vocab-pool
       logic.

   ROUND 1 SCOPE: the full menu (Sentence Pool lesson chips, Lives, Spoken
   Answer, Sentences-per-session, Start) is implemented and wired. The actual
   gameplay (startSentenceGame / teardownSentence) is stubbed and will be built
   in Round 2.

   TRAP WORDS: a sentence may carry an optional `traps` field (see sentences.js)
   — extra WRONG words mixed into the pool. They are validated every round by
   sentenceTraps(); anything malformed or doubtful is simply dropped, so the
   sentence then plays exactly as it would without traps.

   RECORDED SENTENCES: a sentence whose Thai words joined with no spaces
   (th.join('')) are linked in PHRASE_AUDIO (vocab-data.js) is spoken from that
   mp3 at normal speed, with Thai TTS as the fallback — see the RECORDED
   SENTENCES section below. Run checkSentenceAudio() in the browser console to
   audit recordings and traps for every sentence.
   ========================================================================= */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     DATA ACCESS HELPERS (read-only over the global `sentences` array)
     ---------------------------------------------------------------------- */

  // Safe accessor — never throw if sentences.js failed to load for any reason.
  function allSentences() {
    return (typeof sentences !== 'undefined' && Array.isArray(sentences)) ? sentences : [];
  }

  // Highest lesson the current edition includes. In the slim edition the inline
  // script exposes window.EDITION_MAX_LESSON = 10; in the full edition it is
  // Infinity (or undefined on very old builds → treat as no cap). Sentence
  // Builder mirrors the same rule the rest of the app applies to vocabulary, so
  // a slim build only ever offers Lessons 1–10 here too.
  function editionMaxLesson() {
    var v = (typeof window !== 'undefined') ? window.EDITION_MAX_LESSON : undefined;
    return (typeof v === 'number' && isFinite(v)) ? v : Infinity;
  }

  /* ---- Special packs (standalone mini-lessons, `less: 101` and up) ----------
     The main inline script declares SPECIAL_PACK_MIN / isPackLesson /
     isPackUnlocked / lessonLabel as top-level `const`/`function` in a CLASSIC
     script. Those create SCRIPT-SCOPE bindings, which are visible to this file
     as bare identifiers but are NOT properties of `window` — so they must be
     probed with `typeof x === 'function'`, never as `window.x` (which would be
     undefined and silently hide every pack). Contrast window.EDITION_MAX_LESSON
     above, which works only because it is explicitly ASSIGNED to window.

     Each helper degrades safely if the main script ever stops exporting it. */
  function sbIsPackLesson(n) {
    if (typeof isPackLesson === 'function') return isPackLesson(n);
    return typeof n === 'number' && isFinite(n) && n >= 100;
  }
  function sbIsPackUnlocked(n) {
    if (typeof isPackUnlocked === 'function') return isPackUnlocked(n);
    return false;   // fail CLOSED: never reveal pack content we can't verify
  }
  // "Lesson 3" for a course lesson, "Favorites" for a special pack.
  function sbLessonLabel(n) {
    if (sbIsPackLesson(n) && typeof lessonLabel === 'function') return lessonLabel(n);
    if (sbIsPackLesson(n) && typeof packName === 'function') return packName(n);
    return 'Lesson ' + n;
  }

  // True if a lesson number is allowed right now.
  //   • Special pack (>= 100): gated by its OWN unlock code, never by the course
  //     ceiling. Checked FIRST — a pack id is always numerically above the
  //     ceiling, so the `<=` compare below would hide it permanently.
  //   • Course lesson: capped by the edition / unlocked ceiling as before.
  function lessonAllowedByEdition(lessonNum) {
    if (sbIsPackLesson(lessonNum)) return sbIsPackUnlocked(lessonNum);
    return lessonNum <= editionMaxLesson();
  }

  // Sorted list of distinct lesson keys that actually exist in the data AND are
  // currently unlocked. Because special packs use ids >= 100, the plain numeric
  // sort places them AFTER every course lesson automatically — no matter how
  // high the student's ceiling rises.
  function getAllSbLessons() {
    const set = new Set();
    allSentences().forEach(s => {
      if (typeof s.less === 'number' && lessonAllowedByEdition(s.less)) set.add(s.less);
    });
    return [...set].sort((a, b) => a - b);
  }

  // How many sentences each lesson contributes: { lessonNumber: count }.
  // Filtered to match getAllSbLessons() (edition cap + pack unlocks).
  function sbLessonCounts() {
    const counts = {};
    allSentences().forEach(s => {
      if (typeof s.less === 'number' && lessonAllowedByEdition(s.less)) {
        counts[s.less] = (counts[s.less] || 0) + 1;
      }
    });
    return counts;
  }

  // The currently-selected lessons, validated against lessons that exist.
  // Falls back to "all lessons" if the stored selection is null/empty/stale.
  function getSelectedLessons() {
    const available = getAllSbLessons();
    const stored = Array.isArray(state.sbLessons) ? state.sbLessons : null;
    if (!stored) return available.slice();
    const valid = stored.filter(n => available.includes(n));
    return valid.length ? valid : available.slice();
  }

  // The pool of sentences matching the current lesson selection.
  function sbPool() {
    const sel = new Set(getSelectedLessons());
    return allSentences().filter(s => sel.has(s.less));
  }

  function sbPoolSize() {
    return sbPool().length;
  }

  // The session-length options. The "count" is how many sentences a session
  // plays; a session is capped at the pool size if the pool is smaller.
  var SB_TARGETS = [10, 15, 20];

  /* ----------------------------------------------------------------------
     MENU RENDERING
     ---------------------------------------------------------------------- */

  // Lesson chips for the Sentence Pool selector. Mirrors the look of the vocab
  // lesson chips (same .cat-chip markup) but is driven entirely by `sentences`.
  // Special packs (less >= 100) render their name ("Favorites") instead of
  // "Lesson 101", and sort after every course lesson.
  function renderSbLessonChips() {
    var root = document.getElementById('sb-lesson-chips');
    if (!root) return;
    root.innerHTML = '';
    var counts = sbLessonCounts();
    var selected = new Set(getSelectedLessons());
    getAllSbLessons().forEach(function (lessonNum) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cat-chip' + (selected.has(lessonNum) ? ' selected' : '');
      chip.dataset.sbLesson = String(lessonNum);
      chip.innerHTML =
        '<span class="cat-check">' + (selected.has(lessonNum) ? '\u2713' : '') + '</span>' +
        '<span class="cat-name">' + escapeHtml(sbLessonLabel(lessonNum)) + '</span>' +
        '<span class="cat-count">' + (counts[lessonNum] || 0) + '</span>';
      chip.addEventListener('click', function () { toggleSbLesson(lessonNum); });
      root.appendChild(chip);
    });
  }

  function toggleSbLesson(lessonNum) {
    var current = getSelectedLessons();
    var idx = current.indexOf(lessonNum);
    if (idx >= 0) {
      // Don't allow deselecting the last remaining lesson — keep at least one.
      if (current.length <= 1) return;
      current.splice(idx, 1);
    } else {
      current.push(lessonNum);
    }
    current.sort(function (a, b) { return a - b; });
    state.sbLessons = current;
    saveStorage();
    renderSbLessonChips();
    updateSbPoolCounter();
    renderSbTargetGrid();
    refreshSbStartButton();
  }

  function updateSbPoolCounter() {
    var el = document.getElementById('sb-pool-count');
    if (!el) return;
    var size = sbPoolSize();
    el.textContent = size;
    var counter = el.closest('.pool-counter');
    if (counter) {
      // Mark invalid if the pool can't even fill the smallest session length.
      var minTarget = Math.min.apply(null, SB_TARGETS);
      counter.classList.toggle('invalid', size < minTarget);
    }
  }

  function renderSbLivesToggle() {
    var root = document.getElementById('sb-lives-toggle');
    if (!root) return;
    root.querySelectorAll('[data-sb-lives]').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.sbLives) === state.sbLives);
    });
  }

  function renderSbAutoTtsToggle() {
    var root = document.getElementById('sb-autotts-toggle');
    if (!root) return;
    root.querySelectorAll('[data-sb-autotts]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.sbAutotts === state.sbAutoTts);
    });
  }

  function renderSbEngHintToggle() {
    var root = document.getElementById('sb-enghint-toggle');
    if (!root) return;
    root.querySelectorAll('[data-sb-enghint]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.sbEnghint === state.sbEngHint);
    });
  }

  // Next Sentence: 'tap' (default) or 'auto' — see RESULT PANEL below.
  function renderSbAdvanceToggle() {
    var root = document.getElementById('sb-advance-toggle');
    if (!root) return;
    var mode = sbAdvanceMode();
    root.querySelectorAll('[data-sb-advance]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.sbAdvance === mode);
    });
  }

  // The 10 / 15 / 20 selector, styled like the level-grid in other menus.
  // An option that exceeds the current pool size is shown disabled with a note,
  // and the session will be capped to the pool if a smaller option is chosen.
  function renderSbTargetGrid() {
    var root = document.getElementById('sb-target-grid');
    if (!root) return;
    root.innerHTML = '';
    var poolSize = sbPoolSize();
    SB_TARGETS.forEach(function (n) {
      var btn = document.createElement('button');
      btn.className = 'level-btn';
      if (state.sbTarget === n) btn.classList.add('selected');
      var tooBig = poolSize < n;
      if (tooBig) btn.classList.add('disabled');
      btn.innerHTML =
        '<div class="level-name">' + n + '</div>' +
        '<div class="level-meta">' +
          '<div class="level-grid-info">sentences</div>' +
          (tooBig
            ? '<div class="level-warning">pool has only ' + poolSize + '</div>'
            : '') +
        '</div>';
      btn.addEventListener('click', function () {
        if (tooBig) return;
        state.sbTarget = n;
        saveStorage();
        renderSbTargetGrid();
        refreshSbStartButton();
      });
      root.appendChild(btn);
    });
  }

  function refreshSbStartButton() {
    var btn = document.getElementById('sb-start');
    var msg = document.getElementById('sb-start-msg');
    if (!btn || !msg) return;

    var poolSize = sbPoolSize();
    var target = state.sbTarget;
    var enabled = true;
    var message = '';

    // Need a valid target selection whose requirement the pool can meet.
    if (SB_TARGETS.indexOf(target) === -1) {
      enabled = false;
      message = 'Choose how many sentences to play.';
    } else if (poolSize < Math.min.apply(null, SB_TARGETS)) {
      enabled = false;
      message = 'Not enough sentences in pool. Add more lessons.';
    } else if (poolSize < target) {
      // The chosen length is bigger than the pool — nudge them to pick a smaller
      // length or add lessons. (We don't silently shrink without telling them.)
      enabled = false;
      message = 'Pool has only ' + poolSize + ' sentences. Pick a smaller length or add lessons.';
    }

    btn.disabled = !enabled;
    msg.textContent = message;
  }

  // Public entry point called by navigate('sentence').
  function renderSentenceMenu() {
    renderSbLessonChips();
    updateSbPoolCounter();
    renderSbEngHintToggle();
    renderSbLivesToggle();
    renderSbAutoTtsToggle();
    renderSbAdvanceToggle();
    renderSbTargetGrid();
    refreshSbStartButton();
  }

  /* ----------------------------------------------------------------------
     MENU EVENT WIRING (toggles + start button)
     These are bound once at load. The chips/target buttons bind their own
     handlers on each render (above), since they're rebuilt dynamically.
     ---------------------------------------------------------------------- */

  function wireSbMenu() {
    // Lives toggle
    var lives = document.getElementById('sb-lives-toggle');
    if (lives) {
      lives.querySelectorAll('[data-sb-lives]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var n = Number(btn.dataset.sbLives);
          if (n === 1 || n === 2 || n === 3) {
            state.sbLives = n;
            saveStorage();
            renderSbLivesToggle();
          }
        });
      });
    }

    // Spoken Answer (auto-TTS) toggle
    var auto = document.getElementById('sb-autotts-toggle');
    if (auto) {
      auto.querySelectorAll('[data-sb-autotts]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = btn.dataset.sbAutotts;
          if (v === 'on' || v === 'off') {
            state.sbAutoTts = v;
            saveStorage();
            renderSbAutoTtsToggle();
          }
        });
      });
    }

    // English Hint toggle
    var eng = document.getElementById('sb-enghint-toggle');
    if (eng) {
      eng.querySelectorAll('[data-sb-enghint]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = btn.dataset.sbEnghint;
          if (v === 'on' || v === 'off') {
            state.sbEngHint = v;
            saveStorage();
            renderSbEngHintToggle();
          }
        });
      });
    }

    // Next Sentence toggle: wait for a tap (default) or move on automatically.
    var adv = document.getElementById('sb-advance-toggle');
    if (adv) {
      adv.querySelectorAll('[data-sb-advance]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = btn.dataset.sbAdvance;
          if (v === 'auto' || v === 'tap') {
            state.sbAdvance = v;
            saveStorage();
            renderSbAdvanceToggle();
          }
        });
      });
    }

    // Start button — through the How to play guide the first time. The guide
    // lives in index.html; if it isn't there (e.g. an older cached index.html),
    // the game starts exactly as before.
    var start = document.getElementById('sb-start');
    if (start) {
      start.addEventListener('click', function () {
        if (start.disabled) return;
        if (typeof window.startSentenceWithGuide === 'function') {
          window.startSentenceWithGuide(startSentenceGame);
        } else {
          startSentenceGame();
        }
      });
    }

    // Tap-to-hear on the Thai subtitle line of the Sentence Builder menu,
    // matching the other static menus.
    if (typeof wireThaiTapToSpeak === 'function') {
      var view = document.getElementById('view-sentence');
      if (view) wireThaiTapToSpeak(view, '.screen-rom .th');
    }
  }

  /* ----------------------------------------------------------------------
     TRAP WORDS (optional `traps` field on a sentence record)
     ----------------------------------------------------------------------
       traps: { th: ["ฉัน", "ค่ะ"], rom: ["chăn", "kâ"] }

     Extra WRONG words shuffled into the pool alongside the real ones. The
     number of slots is still th.length, so the player has to leave the traps
     out. Answer checking does not change at all: a trap in a slot simply makes
     the placed sequence wrong.

     FAIL-SAFE BY CONSTRUCTION. Everything doubtful is dropped here, and a
     sentence left with no usable traps plays exactly as it always has:
       • `traps` missing, or not shaped { th: [...], rom: [...] }  → no traps
       • th and rom lists of different lengths → no traps for this sentence
         (there is no way to tell which romanization belongs to which word)
       • a trap with empty Thai or romanization → that trap skipped (in the
         romanization-only display it would be a blank chip)
       • a trap identical to a real word of the sentence, or of any answers[]
         ordering → skipped (checking is string-based, so it would just be
         interchangeable with the real word — not a trap at all)
       • the same trap listed twice → kept once
       • more than SB_MAX_TRAPS → the rest skipped (protects the layout)

     `problems` (optional array) collects a readable note for every skip; only
     checkSentenceAudio() passes one. Gameplay never needs the reasons. */
  var SB_MAX_TRAPS = 6;

  function sentenceTraps(sent, problems) {
    var out = [];
    function note(msg) { if (problems) problems.push(msg); }
    try {
      if (!sent || sent.traps == null) return out;
      var t = sent.traps;
      if (typeof t !== 'object' || !Array.isArray(t.th) || !Array.isArray(t.rom)) {
        note('traps must look like { th: [...], rom: [...] } \u2014 all traps ignored');
        return out;
      }
      if (t.th.length !== t.rom.length) {
        note('traps.th has ' + t.th.length + ' word(s) but traps.rom has ' +
             t.rom.length + ' \u2014 all traps ignored');
        return out;
      }
      // Every Thai word that can legitimately sit in a slot for this sentence.
      var real = new Set();
      var addReal = function (list) {
        if (!Array.isArray(list)) return;
        list.forEach(function (w) { if (typeof w === 'string') real.add(w.trim()); });
      };
      addReal(sent.th);
      if (Array.isArray(sent.answers)) sent.answers.forEach(addReal);

      var seen = new Set();
      for (var i = 0; i < t.th.length; i++) {
        var th = (typeof t.th[i] === 'string') ? t.th[i].trim() : '';
        var rom = (typeof t.rom[i] === 'string') ? t.rom[i].trim() : '';
        if (!th || !rom) {
          note('trap #' + (i + 1) + ' has empty Thai or romanization \u2014 skipped');
          continue;
        }
        if (real.has(th)) {
          note('trap "' + th + '" is also a real word of this sentence \u2014 skipped');
          continue;
        }
        if (seen.has(th)) {
          note('trap "' + th + '" is listed twice \u2014 used once');
          continue;
        }
        if (out.length >= SB_MAX_TRAPS) {
          note('more than ' + SB_MAX_TRAPS + ' traps \u2014 "' + th + '" and any after it skipped');
          break;
        }
        seen.add(th);
        out.push({ th: th, rom: rom });
      }
    } catch (e) {
      return [];   // traps are an enhancement only — never let them break a round
    }
    return out;
  }

  /* ----------------------------------------------------------------------
     GAMEPLAY
     ----------------------------------------------------------------------
     Session shape (state.sentenceSession):
       {
         queue:       [sentence, ...]   // the sentences to play this session, in order
         index:       Number            // which sentence we're on (0-based)
         target:      Number            // total sentences in the session
         done:        Number            // sentences completed correctly (HUD counter)
         lives:       Number            // remaining lives
         livesMax:    Number
         over:        Boolean           // true once the end modal is shown
         // per-sentence runtime (rebuilt each round):
         current:     sentence          // the active record
         tokens:      [{th,rom,uid}]    // word tokens in ORIGINAL order (for listen),
                                        // then any trap words ({..., trap: true})
         pool:        [uid, ...]        // uids still available to place (in shuffled order)
         bankOrder:   [uid, ...]        // board v2: each word's fixed place in the word
                                        // list this round (display only, see GAME BOARD)
         slots:       [uid|null, ...]   // one cell per word; uid placed there, or null
         locked:      Boolean           // true while a check animation is running
       }

     Answer checking is STRING-BASED on the displayed Thai word sequence, so
     duplicate words are interchangeable automatically (any "kong" satisfies any
     "kong" position). We compare the placed th-strings against the canonical
     th[] order OR any ordering in answers[].
     ---------------------------------------------------------------------- */

  var _sbUid = 0;          // monotonic id for word tokens (unique even for dupes)
  var _sbClearTimer = null; // pending advance/reset timeout
  var _sbSpeakSafetyTimer = null; // safety cap while waiting for TTS to finish
  var _sbSpeakDelayTimer = null;  // gap before TTS starts (so SFX is heard first)
  var SB_SPEAK_DELAY = 400;       // ms to wait after the SFX before speaking
  var _sbCheckTimer = null;       // board v2: the last word landing before the check

  // Clean up any running session. Safe to call anytime (idempotent).
  function teardownSentence() {
    // Stop any sentence audio FIRST (recording or TTS): stopping a recording
    // reports "finished" straight away, and any timer that report schedules is
    // then cleared just below instead of outliving the session.
    stopSentenceAudio();
    if (_sbClearTimer) { clearTimeout(_sbClearTimer); _sbClearTimer = null; }
    if (_sbSpeakSafetyTimer) { clearTimeout(_sbSpeakSafetyTimer); _sbSpeakSafetyTimer = null; }
    if (_sbSpeakDelayTimer) { clearTimeout(_sbSpeakDelayTimer); _sbSpeakDelayTimer = null; }
    if (_sbCheckTimer) { clearTimeout(_sbCheckTimer); _sbCheckTimer = null; }
    _sbBoard = null;
    _sbPendingGo = null;
    _sbProceed = null;
    hideSheet();
    closeAaPop();
    state.sentenceSession = null;
  }

  function startSentenceGame() {
    var pool = sbPool();
    if (pool.length < Math.min.apply(null, SB_TARGETS)) return;
    var target = Math.min(state.sbTarget, pool.length);

    teardownSentence();
    state.gameMode = 'sentence';

    // Choose `target` distinct sentences for the session, in random order.
    var queue = shuffle(pool).slice(0, target);

    // Get THIS session's sentence recordings moving ahead of the background
    // download queue (fire-and-forget; see primeSentenceAudio).
    primeSentenceAudio(queue);

    state.sentenceSession = {
      queue: queue,
      index: 0,
      target: target,
      done: 0,
      lives: state.sbLives,
      livesMax: state.sbLives,
      over: false,
      current: null,
      tokens: [],
      pool: [],
      slots: [],
      locked: false,
      // When English Hint is OFF, the player can tap "Show English sentence" to
      // reveal the meaning for the CURRENT sentence only. Reset every round so a
      // reveal never spoils the next one. Ignored entirely when the hint is ON.
      revealEn: false
    };

    if (typeof playSound === 'function') playSound('snd-start');
    if (typeof haptic === 'function') haptic(25);

    // Enter the game view via the inline-script helper (keeps currentView writes
    // and the back-button history guard in one place).
    if (typeof enterSentenceGameView === 'function') {
      enterSentenceGameView();
    } else {
      showView('sentence-game');
    }

    updateSentenceHud();
    loadSentenceRound();
  }

  // True if a sentence game is the active, non-finished game on screen.
  function isSentenceActive() {
    var s = state.sentenceSession;
    var gv = document.getElementById('view-sentence-game');
    return !!s && !s.over && currentViewIsSentenceGame() && gv && !gv.classList.contains('hidden');
  }

  // We can't read the inline script's `currentView` directly here without
  // relying on cross-script binding; the engine only enters the game via
  // enterSentenceGameView(), and teardownSentence() runs on every exit. As a
  // robust proxy, treat the game as active while the session exists and the
  // game view is visible. (Kept as a helper for readability.)
  function currentViewIsSentenceGame() {
    var gv = document.getElementById('view-sentence-game');
    return gv && !gv.classList.contains('hidden');
  }

  // Build the per-sentence runtime (tokens, shuffled pool, empty slots) and render.
  function loadSentenceRound() {
    var s = state.sentenceSession;
    if (!s) return;
    var sent = s.queue[s.index];
    s.current = sent;
    s.locked = false;
    s.revealEn = false; // hide the English again for each new sentence

    // Tokens in ORIGINAL order. Each gets a unique id so duplicate words are
    // independent buttons that move alone. th/rom linked by index.
    s.tokens = sent.th.map(function (th, i) {
      return { uid: ++_sbUid, th: th, rom: (sent.rom && sent.rom[i] != null) ? sent.rom[i] : '' };
    });

    // Trap words (optional), appended after the real words and flagged. They
    // only ever live in the pool: slots are still one per REAL word (below),
    // and resetCurrentSentence() rebuilds the pool from every token, so traps
    // come back with the real words after a wrong answer.
    sentenceTraps(sent).forEach(function (t) {
      s.tokens.push({ uid: ++_sbUid, th: t.th, rom: t.rom, trap: true });
    });

    // Pool starts as all tokens, shuffled. Slots all empty.
    s.pool = shuffle(s.tokens.map(function (t) { return t.uid; }));
    // Defensive: if the shuffle happens to equal the solved order, reshuffle once
    // or twice so the puzzle never starts pre-solved (only matters for short ones).
    var tries = 0;
    while (tries < 4 && poolMatchesSolved(s)) { s.pool = shuffle(s.pool); tries++; }

    s.slots = sent.th.map(function () { return null; });

    renderSentenceRound();
  }

  // True if the pool order (as if placed left-to-right) already equals a correct
  // answer — used only to avoid starting a puzzle pre-solved.
  // Trap words are left out before comparing: they are never part of an answer,
  // so "the real words already sit in order" is what counts. With no traps this
  // is exactly the original check.
  function poolMatchesSolved(s) {
    var realCount = 0;
    s.tokens.forEach(function (t) { if (!t.trap) realCount++; });
    if (realCount <= 1) return false;
    var byUid = {};
    s.tokens.forEach(function (t) { byUid[t.uid] = t; });
    var seq = [];
    s.pool.forEach(function (uid) {
      var t = byUid[uid];
      if (t && !t.trap) seq.push(t.th);
    });
    return matchesAnyAnswer(seq, s.current);
  }

  function tokenByUid(uid) {
    var s = state.sentenceSession;
    if (!s) return null;
    for (var i = 0; i < s.tokens.length; i++) {
      if (s.tokens[i].uid === uid) return s.tokens[i];
    }
    return null;
  }

  // Build the inner HTML for a word chip (honors the global DISPLAY setting).
  function wordChipInner(tok) {
    var mode = state.displayMode; // 'both' | 'thai' | 'roman'
    var parts = [];
    if (mode === 'both' || mode === 'thai') {
      parts.push('<span class="sb-th">' + escapeHtml(tok.th) + '</span>');
    }
    if (mode === 'both' || mode === 'roman') {
      parts.push('<span class="sb-rom">' + escapeHtml(tok.rom) + '</span>');
    }
    if (parts.length === 0) {
      parts.push('<span class="sb-th">' + escapeHtml(tok.th) + '</span>');
    }
    return parts.join('');
  }

  /* ----------------------------------------------------------------------
     GAME BOARD (v2) — the play surface
     ----------------------------------------------------------------------
     The board is built ONCE per round (renderSentenceRound) and afterwards is
     only updated in place. Each word is one persistent <button class="sb-tile">
     that moves between its OWN place in the word list (.sb-berth) and a spot in
     the sentence (.sb-well). Every move is animated with FLIP (measure, move,
     animate the difference: sbFlip), and nothing is re-rendered on a tap, so
     nothing else on the board moves:
       • the word list never reflows: a word's place stays behind as a hollow;
       • wells are exactly as tall as words, and reserveLines() sets the
         sentence area to its FINISHED height up front, so it never grows;
       • fitBoard() shrinks the words (--sb-fit) only when a round would not
         otherwise fit on screen, and scales them up (--sb-boost) on large
         screens. The three layouts (phone upright / phone sideways / large
         screen) are pure CSS in index.html ("SENTENCE BUILDER — GAME BOARD
         (v2)"); sbLayoutMode() mirrors their media queries one-to-one.

     The game logic is unchanged: s.slots / s.pool / s.tokens mean exactly what
     they meant before, and checking is still string-based — the board only
     mirrors them. DOM references are kept here in _sbBoard (never in state),
     keyed by token uid, and rebuilt by every renderSentenceRound(). Animation
     is an enhancement only: with "reduce motion", or a browser without the Web
     Animations API, every move is simply instant.
     ---------------------------------------------------------------------- */
  var _sbBoard = null;   // { tiles: {uid: button}, berths: {uid: span}, wells: [span] }
  var SB_LAND_MS = 340;  // fallback wait for the last word to land before the check

  var SB_EYE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
  // Speaker badge inside every word; shown by CSS only while tts marks the
  // word .speaking (press and hold).
  var SB_SPK_HTML = '<span class="sb-tile-spk" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></span>';

  function sbReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  // The inside of the English question card. When English Hint is OFF, the
  // meaning is not shown up front; "Show English sentence" reveals it for THIS
  // sentence only (s.revealEn, reset every round so it never spoils the next).
  function questionInner(s, animate) {
    var showEn = (state.sbEngHint !== 'off') || s.revealEn;
    // Aa: the word-size popover (part 2). Only offered when the page has it.
    var aa = document.getElementById('sb-aa-pop')
      ? '<button type="button" class="sb-q-aa" id="sb-aa-btn" aria-label="Word size" aria-haspopup="dialog" aria-controls="sb-aa-pop" aria-expanded="false">A<small>a</small></button>'
      : '';
    if (showEn) {
      return '<div class="sb-q-label">Build this sentence in Thai</div>' +
             '<p class="sb-q-en' + (animate ? ' sb-q-in' : '') + '">' + escapeHtml(s.current.en) + '</p>' + aa;
    }
    return '<div class="sb-q-label">Put the words in the right order</div>' +
           '<button type="button" class="sb-q-show" id="sb-reveal-en">' + SB_EYE_SVG + 'Show English sentence</button>' + aa;
  }

  // This round's fixed order of places in the word list: every token exactly
  // once. Kept while still valid for this round's tokens; otherwise rebuilt as
  // the current pool order followed by any words already placed.
  function currentBankOrder(s) {
    var all = s.tokens.map(function (t) { return t.uid; });
    var bo = s.bankOrder;
    if (Array.isArray(bo) && bo.length === all.length &&
        all.every(function (u) { return bo.indexOf(u) !== -1; })) {
      return bo;
    }
    var order = s.pool.slice();
    s.slots.forEach(function (u) { if (u != null && order.indexOf(u) === -1) order.push(u); });
    all.forEach(function (u) { if (order.indexOf(u) === -1) order.push(u); });
    s.bankOrder = order;
    return order;
  }

  // Build the whole board for the current round from the session state:
  // question card, sentence wells, and the word list. Honours the global
  // Display setting (Thai + romanization / Thai / romanization).
  function renderSentenceRound() {
    var s = state.sentenceSession;
    var host = document.getElementById('sb-game-root');
    if (!s || !host) return;

    closeAaPop();
    if (typeof s.startedAt !== 'number') s.startedAt = Date.now();   // part 4: Time stat
    var single = (state.displayMode !== 'both') ? ' sb-single' : '';
    var display = (state.displayMode === 'thai' || state.displayMode === 'roman') ? state.displayMode : 'both';
    var order = currentBankOrder(s);

    var html = '<div class="sb-play" id="sb-play" data-display="' + display + '">';
    html += '<div class="sb-board">';
    html += '<section class="sb-q" id="sb-q">' + questionInner(s, false) + '</section>';
    html += '<div class="sb-lines" id="sb-lines" role="group" aria-label="Your sentence">';
    s.slots.forEach(function (uid, i) {
      html += '<span class="sb-well sb-empty sb-enter" data-slot="' + i + '" style="--i:' + i + '"></span>';
    });
    html += '</div></div>';
    html += '<div class="sb-spacer" aria-hidden="true"></div>';
    html += '<div class="sb-tray"><div class="sb-bank" id="sb-bank" role="group" aria-label="Words">';
    order.forEach(function (uid, i) {
      var tok = tokenByUid(uid);
      if (!tok) return;
      html += '<span class="sb-berth" data-berth="' + uid + '">' +
                '<span class="sb-tile sb-sizer' + single + '" aria-hidden="true">' + wordChipInner(tok) + '</span>' +
                '<button type="button" class="sb-tile sb-enter' + single + '" data-uid="' + uid + '" style="--i:' + i + '">' +
                  wordChipInner(tok) + SB_SPK_HTML +
                '</button>' +
              '</span>';
    });
    html += '</div></div></div>';

    host.innerHTML = html;
    host.scrollTop = 0;

    // Collect the references, then put any already-placed words into their
    // wells (only after a fallback re-render mid-round; a round starts empty).
    var board = { tiles: {}, berths: {}, wells: [] };
    host.querySelectorAll('.sb-well').forEach(function (w) { board.wells.push(w); });
    host.querySelectorAll('.sb-berth').forEach(function (b) {
      var uid = Number(b.getAttribute('data-berth'));
      board.berths[uid] = b;
      var t = b.querySelector('button.sb-tile');
      if (t) board.tiles[uid] = t;
    });
    _sbBoard = board;
    s.slots.forEach(function (uid, i) {
      if (uid == null) return;
      var t = board.tiles[uid], w = board.wells[i], b = board.berths[uid];
      if (!t || !w || !b) return;
      w.classList.remove('sb-empty');
      w.appendChild(t);
      b.classList.add('sb-away');
    });
    // Drop the "dealt in" animation class once it has played, so it can never
    // replay later (for example when a word is moved).
    host.querySelectorAll('.sb-enter').forEach(function (el) {
      el.addEventListener('animationend', function () { el.classList.remove('sb-enter'); }, { once: true });
    });

    markNextWell();
    wireRoundEvents();
    fitBoard();
  }

  // Swap ONLY the question card to the revealed English, in place. Used on a
  // correct answer when English Hint is off (so the meaning appears without
  // touching the green words), and by "Show English sentence".
  // Safe no-op if the card isn't present.
  function revealPromptEnglish() {
    var s = state.sentenceSession;
    if (!s || !s.current) return;
    var q = document.getElementById('sb-q');
    if (!q) return;
    q.innerHTML = questionInner(s, true);
  }

  // Highlight the spot the next tapped word will drop into (none while locked).
  function markNextWell() {
    var s = state.sentenceSession, b = _sbBoard;
    if (!s || !b) return;
    var n = s.locked ? -1 : s.slots.indexOf(null);
    b.wells.forEach(function (w, i) { w.classList.toggle('sb-next', i === n); });
  }

  // Attach handlers to the freshly-rendered round (delegated on host).
  // - A quick tap places (from pool) or returns (from slot) a word.
  // - A press-and-hold (~600ms) on a word speaks JUST that word in Thai, if a
  //   Thai voice exists. The hold suppresses the click that follows so it does
  //   NOT also place/return the word. No voice on device => nothing happens.
  function wireRoundEvents() {
    var host = document.getElementById('sb-game-root');
    if (!host) return;

    var HOLD_MS = 600;
    var MOVE_CANCEL = 10; // px of movement that cancels a hold (treat as scroll)

    var holdTimer = null;
    var holdUid = null;
    var longFired = false;   // a hold just spoke a word; swallow the next click
    var startX = 0, startY = 0;
    var pressedEl = null;

    function clearHold() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      holdUid = null;
      if (pressedEl) { pressedEl.classList.remove('sb-holding', 'sb-pressing'); pressedEl = null; }
    }

    function ttsWordAvailable() {
      return tts && tts.supported && tts.bingoAudioAvailable && tts.bingoAudioAvailable();
    }

    // The recording of one word (VOCAB / PHRASE_AUDIO, via the app's shared
    // resolver), or '' when it has none. Only consulted when there is NO Thai
    // voice: with a Thai voice, tts.speak() already prefers the recording.
    // Like every recording in the app, it needs a speech engine of some kind
    // (any language) to be present.
    function wordRecordingUrl(th) {
      try {
        if (!th || !(tts && tts.supported)) return '';
        if (typeof voiceAudioUrl !== 'function') return '';
        return voiceAudioUrl(th) || '';
      } catch (e) { return ''; }
    }

    host.onpointerdown = function (e) {
      var s = state.sentenceSession;
      if (!s || s.over || s.locked) return;
      // Only left button / touch / pen.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var word = e.target.closest('button.sb-tile');
      if (!word) return;
      // A hold needs something to play. With a Thai voice, any word can be
      // heard (exactly as before). Without one, only a word that has its own
      // recording can — for any other word, long-press just no-ops as before.
      if (!ttsWordAvailable()) {
        var t0 = tokenByUid(Number(word.dataset.uid));
        if (!t0 || !wordRecordingUrl(t0.th)) return;
      }

      holdUid = Number(word.dataset.uid);
      pressedEl = word;
      startX = e.clientX; startY = e.clientY;
      longFired = false;
      word.classList.add('sb-pressing');   // board v2: the "keep holding" bar

      holdTimer = setTimeout(function () {
        holdTimer = null;
        var s2 = state.sentenceSession;
        if (!s2 || s2.over || s2.locked) { clearHold(); return; }
        var tok = tokenByUid(holdUid);
        if (tok && tok.th) {
          longFired = true; // suppress the click that will follow this hold
          if (pressedEl) { pressedEl.classList.remove('sb-pressing'); pressedEl.classList.add('sb-holding'); }
          if (ttsWordAvailable()) {
            try { tts.speak(tok.th, pressedEl || null, { rate: 0.8 }); } catch (e2) {}
          } else {
            // No Thai voice: play the word's recording with no TTS fallback,
            // at the same pace a Thai-voice device plays it (rate 0.8 is
            // converted for recordings exactly as tts.speak() converts it).
            playRecordingOnly(wordRecordingUrl(tok.th), pressedEl || null, null, null, 0.8);
          }
          if (typeof haptic === 'function') haptic(12);
        }
      }, HOLD_MS);
    };

    host.onpointermove = function (e) {
      if (!holdTimer && !pressedEl) return;
      if (holdUid == null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if ((dx * dx + dy * dy) > (MOVE_CANCEL * MOVE_CANCEL)) {
        // Moved too far — this is a scroll/drag, not a hold. Cancel the timer
        // but keep `longFired` false so a normal click can still register.
        clearHold();
      }
    };

    function endPress() {
      // The pressed-state cue clears, but we keep `longFired` until the click
      // handler consumes it (the click fires right after pointerup).
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      holdUid = null;
      if (pressedEl) { pressedEl.classList.remove('sb-holding', 'sb-pressing'); pressedEl = null; }
    }
    host.onpointerup = endPress;
    host.onpointercancel = function () { endPress(); longFired = false; };

    host.onclick = function (e) {
      var s = state.sentenceSession;
      if (!s || s.over) return;

      // "Show English sentence" (English Hint off): reveals the meaning of THIS
      // sentence only (s.revealEn is reset every round). Updated in place, so
      // the words on the board do not move.
      if (e.target.closest('#sb-reveal-en')) {
        s.revealEn = true;
        if (typeof haptic === 'function') haptic(8);
        revealPromptEnglish();
        scheduleFit();
        return;
      }
      // Aa: open / close the word-size popover.
      var aaBtn = e.target.closest('#sb-aa-btn');
      if (aaBtn) {
        toggleAaPop(aaBtn);
        return;
      }
      if (s.locked) return;

      var word = e.target.closest('button.sb-tile');
      if (!word) return;

      // If this click is the tail of a long-press, swallow it (don't place/return).
      if (longFired) { longFired = false; return; }

      var uid = Number(word.dataset.uid);
      if (s.slots.indexOf(uid) === -1) {
        placeWord(uid);
      } else {
        returnWord(uid);
      }
    };
  }

  // Place a pooled word into the NEXT empty slot. Auto-checks when full: the
  // board locks at once, and the check runs as the last word lands.
  function placeWord(uid) {
    var s = state.sentenceSession;
    if (!s || s.locked) return;
    var pi = s.pool.indexOf(uid);
    if (pi === -1) return;
    var slotIdx = s.slots.indexOf(null);
    if (slotIdx === -1) return; // all full (shouldn't happen — we auto-check)

    s.pool.splice(pi, 1);
    s.slots[slotIdx] = uid;

    if (typeof playSound === 'function') playSound('snd-sentence-put');
    if (typeof haptic === 'function') haptic(8);

    var flightMs = moveTileToWell(uid, slotIdx);

    // Auto-check when the last slot fills.
    if (s.slots.indexOf(null) === -1) {
      s.locked = true;          // no more taps while the last word lands
      markNextWell();
      if (_sbCheckTimer) { clearTimeout(_sbCheckTimer); _sbCheckTimer = null; }
      var wait = sbReducedMotion() ? 0 : Math.min(600, (flightMs > 0 ? flightMs : SB_LAND_MS) + 20);
      _sbCheckTimer = setTimeout(function () {
        _sbCheckTimer = null;
        if (state.sentenceSession !== s || s.over) return;   // session ended meanwhile
        checkSentence(true);
      }, wait);
    }
  }

  // Return a placed word back to its own place in the word list.
  function returnWord(uid) {
    var s = state.sentenceSession;
    if (!s || s.locked) return;
    var slotIdx = s.slots.indexOf(uid);
    if (slotIdx === -1) return;
    s.slots[slotIdx] = null;
    // Put it back into the pool (append; the word list keeps its own places).
    if (s.pool.indexOf(uid) === -1) s.pool.push(uid);

    if (typeof playSound === 'function') playSound('snd-sentence-remove');
    if (typeof haptic === 'function') haptic(8);

    moveTileHome(uid, slotIdx);
  }

  // The word buttons currently in the sentence, in slot order.
  function placedTiles(s) {
    var b = _sbBoard, out = [];
    if (!b || !s) return out;
    s.slots.forEach(function (uid) { var t = b.tiles[uid]; if (t) out.push(t); });
    return out;
  }

  // Fly a word from its place in the list into sentence well `slotIdx`.
  // Returns how long the flight takes (ms), 0 if instant. If the board is
  // somehow missing, the round is simply rebuilt from the state.
  function moveTileToWell(uid, slotIdx) {
    var b = _sbBoard;
    var tile = b && b.tiles[uid], well = b && b.wells[slotIdx], berth = b && b.berths[uid];
    if (!tile || !well || !berth) { renderSentenceRound(); return 0; }
    var others = b.wells.filter(function (w) { return w !== well; });
    return sbFlip([tile].concat(others), function () {
      well.classList.remove('sb-empty', 'sb-next', 'sb-enter');
      well.appendChild(tile);
      berth.classList.add('sb-away');
      markNextWell();
    }, [tile], 0);
  }

  // Fly a word from sentence well `slotIdx` back to its own place in the list.
  function moveTileHome(uid, slotIdx) {
    var b = _sbBoard;
    var tile = b && b.tiles[uid], well = b && b.wells[slotIdx], berth = b && b.berths[uid];
    if (!tile || !well || !berth) { renderSentenceRound(); return 0; }
    return sbFlip([tile].concat(b.wells), function () {
      well.classList.add('sb-empty');
      berth.appendChild(tile);
      berth.classList.remove('sb-away');
      markNextWell();
    }, [tile], 0);
  }

  // After a wrong answer (resetCurrentSentence has already emptied the slots
  // and reshuffled the pool into s.bankOrder): every word flies to its place in
  // the NEW order, so the reshuffle is visible instead of a sudden redraw.
  function reshuffleBoard() {
    var s = state.sentenceSession, b = _sbBoard;
    var bank = document.getElementById('sb-bank');
    if (!s || !b || !bank || !Array.isArray(s.bankOrder) || b.wells.length !== s.slots.length) {
      renderSentenceRound();
      return;
    }
    var order = s.bankOrder;
    var tiles = [];
    for (var i = 0; i < order.length; i++) {
      var t = b.tiles[order[i]];
      if (!t || !b.berths[order[i]]) { renderSentenceRound(); return; }
      tiles.push(t);
    }
    var lines = document.getElementById('sb-lines');
    if (lines) lines.classList.remove('sb-jolt');
    sbFlip(tiles.concat(b.wells), function () {
      b.wells.forEach(function (w) { w.classList.add('sb-empty'); });
      order.forEach(function (uid) {
        var berth = b.berths[uid], tile = b.tiles[uid];
        tile.classList.remove('sb-ok', 'sb-bad', 'sb-trap-out');
        berth.classList.remove('sb-away');
        if (tile.parentNode !== berth) berth.appendChild(tile);
        bank.appendChild(berth);   // moves the place to its spot in the new order
      });
      markNextWell();
    }, tiles, 14);
  }

  /* FLIP: record where `tracked` elements are, run `mutate` (which moves them
     in the DOM), then animate each one from its old spot to its new one.
     `flyers` get a lifted arc (the moving words); everything else slides.
     `stagger` (ms) delays each flyer after the previous one. Returns the
     longest flyer flight in ms (0 when nothing animates). Never throws: if
     anything goes wrong the DOM is still moved, just without animation. */
  function sbFlip(tracked, mutate, flyers, stagger) {
    var animate = !sbReducedMotion() && tracked.length > 0 &&
                  typeof tracked[0].animate === 'function';
    var first = [];
    if (animate) {
      try {
        tracked.forEach(function (el) {
          first.push(el.getBoundingClientRect());
          if (typeof el.getAnimations === 'function') {
            el.getAnimations().forEach(function (a) { if (a.id === 'sb-flip') a.cancel(); });
          }
        });
      } catch (e) { animate = false; }
    }
    mutate();
    if (!animate || first.length !== tracked.length) return 0;

    var longest = 0;
    var flyerIndex = 0;
    tracked.forEach(function (el, i) {
      try {
        var isFlyer = !!flyers && flyers.indexOf(el) !== -1;
        var delay = isFlyer ? (stagger || 0) * (flyerIndex++) : 0;
        var a = first[i], r = el.getBoundingClientRect();
        var dx = a.left - r.left, dy = a.top - r.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        var anim;
        if (isFlyer) {
          var dist = Math.sqrt(dx * dx + dy * dy);
          var dur = Math.round(Math.min(470, 250 + dist * 0.32));
          var lift = Math.min(26, 6 + dist * 0.06);
          el.classList.add('sb-flying');
          anim = el.animate([
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)' },
            { transform: 'translate(' + (dx * 0.42) + 'px,' + (dy * 0.42 - lift) + 'px) scale(1.07)', offset: 0.42 },
            { transform: 'translate(0px,0px) scale(1)' }
          ], { duration: dur, delay: delay, easing: 'cubic-bezier(.3,.7,.25,1)', fill: 'backwards' });
          var land = function () { el.classList.remove('sb-flying'); };
          anim.onfinish = land;
          anim.oncancel = land;
          longest = Math.max(longest, delay + dur);
        } else {
          anim = el.animate([
            { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
            { transform: 'none' }
          ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
        anim.id = 'sb-flip';
      } catch (e) {}
    });
    return longest;
  }

  /* ----- Fitting the board to the screen -----
     sbLayoutMode() must match the media queries of the three layouts in the
     "SENTENCE BUILDER — GAME BOARD (v2)" CSS block in index.html. */
  function sbLayoutMode() {
    try {
      if (window.matchMedia('(orientation: landscape) and (max-height: 540px)').matches) return 'split';
      if (window.matchMedia('(min-width: 700px) and (min-height: 541px), (min-width: 700px) and (orientation: portrait)').matches) return 'center';
    } catch (e) {}
    return 'dock';
  }

  // Reserve the sentence area's FINISHED height up front (the tallest of every
  // accepted word order, measured off-screen), so it never grows while filling.
  function reserveLines() {
    var s = state.sentenceSession;
    var lines = document.getElementById('sb-lines');
    if (!s || !s.current || !lines || !lines.parentNode) return;
    lines.style.minHeight = '';
    var w = lines.getBoundingClientRect().width;
    var maxH = lines.offsetHeight;
    var single = (state.displayMode !== 'both') ? ' sb-single' : '';
    var orders = [s.current.th].concat(Array.isArray(s.current.answers) ? s.current.answers : []);
    orders.forEach(function (order) {
      if (!Array.isArray(order)) return;
      var html = '';
      order.forEach(function (th) {
        var tok = null;
        for (var i = 0; i < s.tokens.length; i++) {
          if (!s.tokens[i].trap && s.tokens[i].th === th) { tok = s.tokens[i]; break; }
        }
        html += '<span class="sb-well"><span class="sb-tile' + single + '">' +
                wordChipInner(tok || { th: String(th), rom: '' }) + '</span></span>';
      });
      var probe = document.createElement('div');
      probe.className = 'sb-lines';
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;width:' + w + 'px';
      probe.innerHTML = html;
      lines.parentNode.appendChild(probe);
      maxH = Math.max(maxH, probe.offsetHeight);
      probe.parentNode.removeChild(probe);
    });
    lines.style.minHeight = Math.ceil(maxH) + 'px';
  }

  function boardOverflows(play, mode) {
    if (play.scrollHeight > play.clientHeight + 1) return true;
    if (mode === 'split') {
      var board = play.querySelector('.sb-board');
      var tray = play.querySelector('.sb-tray');
      if (board && board.scrollHeight > board.clientHeight + 1) return true;
      if (tray && tray.scrollHeight > tray.clientHeight + 1) return true;
    }
    return false;
  }

  // Size the words for this screen: a little bigger on large screens
  // (--sb-boost, up to 1.3×), and smaller only if the round would otherwise
  // need scrolling (--sb-fit, down to 0.64×). The Text slider still applies.
  function fitBoard() {
    try {
      var s = state.sentenceSession;
      var host = document.getElementById('sb-game-root');
      var play = document.getElementById('sb-play');
      if (!s || !s.current || !host || !play) return;
      if (!host.clientHeight || !host.clientWidth) return;   // view not on screen
      var mode = sbLayoutMode();
      var boost = 1;
      if (mode === 'center') {
        boost = Math.max(1, Math.min(host.clientWidth / 680, host.clientHeight / 600, 1.3));
      }
      play.style.setProperty('--sb-boost', String(Math.round(boost * 100) / 100));
      var f = 1;
      play.style.setProperty('--sb-fit', '1');
      reserveLines();
      while (boardOverflows(play, mode) && f > 0.64) {
        f = Math.round((f - 0.04) * 100) / 100;
        play.style.setProperty('--sb-fit', String(f));
        reserveLines();
      }
      measureTray();
      sbHudDensity();
    } catch (e) {}
  }

  var _sbFitRaf = 0;
  function scheduleFit() {
    try {
      if (_sbFitRaf) cancelAnimationFrame(_sbFitRaf);
      _sbFitRaf = requestAnimationFrame(function () {
        _sbFitRaf = 0;
        var s = state.sentenceSession;
        if (s && !s.over) fitBoard();
      });
    } catch (e) {}
  }

  // Wired once at load: refit on any size change of the play area (rotation,
  // window resize, top bar hidden/shown), on the Text slider, and once the
  // fonts have loaded (their real widths decide how the words wrap).
  function wireSbBoardFit() {
    try {
      var host = document.getElementById('sb-game-root');
      if (host && typeof ResizeObserver === 'function') {
        new ResizeObserver(scheduleFit).observe(host);
      } else {
        window.addEventListener('resize', scheduleFit);
      }
      var slider = document.getElementById('sb-text-slider');
      if (slider) slider.addEventListener('input', scheduleFit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFit);
    } catch (e) {}
  }

  /* ----------------------------------------------------------------------
     RESULT PANEL (board v2, part 2)
     ----------------------------------------------------------------------
     After every check a panel slides in (#sb-sheet in index.html):
       • correct — "Correct!", a short Thai phrase (tap to hear), and the sentence
         exactly as the student built it (their word order: Thai written
         without spaces, then the romanization), following the Display setting;
       • wrong   — "Not quite" and what happens next (try again / last heart).
     Its button always moves on at once. What happens without a tap depends on
     the "Next Sentence" setting (state.sbAdvance):
       • 'tap' (the default since part 5) — the panel stays until Continue is
         tapped. The sentence is still read aloud as before, and a speaker
         button replays it;
       • 'auto' — exactly as before: the game moves on by itself once the
         sentence has been read aloud (or after the short pause).
     The reading itself is still afterOptionalSpeak(); awaitNext() only decides
     who calls `next`. sbContinueNow() ends a pending reading/pause for good
     (its "go" is run once, so none of its timers can fire later) and then
     moves on. Everything here is optional: without #sb-sheet in the page (an
     older cached index.html) the game simply runs as it did before. */
  var _sbPendingGo = null;   // the "go" of the reading/pause in progress (afterOptionalSpeak)
  var _sbProceed = null;     // what the panel's button does right now (null: nothing pending)
  var _sbSheetTimer = null;  // short beat before the panel slides in

  /* Pauses after each answer (part 3), following the Speed setting in
     Settings like the app's other games:
       afterRead       — after the sentence has been read aloud (was 250ms);
       correct / wrong — when nothing is read (Spoken Answer off, or nothing
                         can be heard on this device).
     English Hint off adds 1s to `correct`, so the revealed English can be
     read too (as before). 'Tap to continue' waits for the tap regardless. */
  var SB_PAUSES = {
    fast:   { afterRead: 900,  correct: 1200, wrong: 1300 },
    medium: { afterRead: 1300, correct: 1500, wrong: 1600 },
    slow:   { afterRead: 2000, correct: 2200, wrong: 2300 }
  };
  function sbPause(kind) {
    var p = SB_PAUSES[state.speed] || SB_PAUSES.medium;
    return p[kind];
  }

  /* The short phrase under the panel's title (part 5), picked at random for
     each panel (never the same one twice in a row) and shown in Thai,
     romanization and English. Each entry: [Thai, romanization, English].
     Tapping it says the Thai through the app's usual tts.speak() rule: its
     recording when one exists (link it in PHRASE_AUDIO in vocab-data.js,
     keyed by the Thai exactly as written here; a course word with the same
     Thai and its own recording is used first, as everywhere in the app),
     otherwise the Thai voice. On a device that can do neither it is shown as
     plain text, without the speaker. */
  var SB_PHRASES = {
    // Correct answers.
    ok: [
      ['ดีมาก', 'dee mâak', 'Very good!'],
      ['เก่งมาก', 'gèng mâak', 'You’re very good!'],
      ['ถูกต้อง', 'tòok dtông', 'Correct!'],
      ['ถูกแล้ว', 'tòok láew', 'That’s right!'],
      ['ใช่เลย', 'châi loie', 'Exactly!'],
      ['เยี่ยมมาก', 'yîam mâak', 'Excellent!'],
      ['สุดยอด', 'sùt yôt', 'Awesome!'],
      ['ดีเลย', 'dee loie', 'Great!'],
      ['ทำได้ดีมาก', 'tam dâai dee mâak', 'Great job!'],
      ['เป๊ะเลย', 'bpé loie', 'Perfect!'],
      ['ฉลาดมาก', 'chà-làat mâak', 'You’re very smart!']
    ],
    // Wrong, with a heart left (the sentence comes back to try again).
    retry: [
      ['เกือบแล้ว', 'gèuap láew', 'Almost!'],
      ['ไม่เป็นไร', 'mâi bpen rai', 'No problem!'],
      ['สู้ๆ', 'sôo sôo', 'Keep going!'],
      ['ลองอีกครั้ง', 'long èek kráng', 'Try once more!'],
      ['ลองใหม่', 'long mài', 'Try again!'],
      ['ยังไม่ถูกนะ', 'yang mâi tòok ná', 'Not quite right!']
    ],
    // Wrong on the last heart: the game is over, so not the "try again" ones.
    over: [
      ['เกือบแล้ว', 'gèuap láew', 'Almost!'],
      ['ไม่เป็นไร', 'mâi bpen rai', 'No problem!'],
      ['สู้ๆ', 'sôo sôo', 'Keep going!'],
      ['ยังไม่ถูกนะ', 'yang mâi tòok ná', 'Not quite right!']
    ]
  };
  var _sbPhraseLast = {};   // kind -> the index shown last time (no repeat in a row)
  var SB_PHRASE_SPEAKER = '<span class="sb-sheet-say-icon" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24" focusable="false"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></span>';

  function sbPickPhrase(kind) {
    var list = SB_PHRASES[kind] || SB_PHRASES.retry;
    var n = list.length;
    var i = Math.floor(Math.random() * n);
    if (n > 1 && i === _sbPhraseLast[kind]) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
    _sbPhraseLast[kind] = i;
    return list[i];
  }

  // Can this phrase be heard here (Thai voice, or its recording)?
  function sbPhraseAudible(th) {
    try {
      if (typeof tts === 'undefined' || !(tts && tts.supported)) return false;
      return sbThaiVoiceUsable() || !!(typeof voiceAudioUrl === 'function' && voiceAudioUrl(th));
    } catch (e) { return false; }
  }

  // The phrase line: a button that says it when it can be heard, else text.
  function sbPhraseHtml(p) {
    var text = '<span class="sb-sheet-thline" lang="th">' + escapeHtml(p[0]) + '</span> ' +
               '<i>' + escapeHtml(p[1]) + '</i> ' +
               '<span class="sb-sheet-en">(' + escapeHtml(p[2]) + ')</span>';
    if (!sbPhraseAudible(p[0])) return '<span class="sb-sheet-phrase">' + text + '</span>';
    return '<button type="button" class="sb-sheet-phrase sb-sheet-say" data-th="' + escapeHtml(p[0]) + '" title="Tap to hear">' +
             SB_PHRASE_SPEAKER + '<span class="sb-sheet-say-text">' + text + '</span>' +
           '</button>';
  }

  // Tap on the phrase: say it (stops whatever this game is saying first,
  // as every tts.speak() does).
  function sbSayPhrase(btn) {
    try {
      var th = btn && btn.getAttribute('data-th');
      if (!th || typeof tts === 'undefined' || !(tts && tts.supported)) return;
      tts.speak(th, btn);
      if (typeof haptic === 'function') haptic(12);
    } catch (e) {}
  }
  var SB_ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 12.5l4.2 4.2L18.5 7.8"/></svg>';
  var SB_ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  var SB_SPEAKER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';

  // 'tap' (the default) unless the student chose 'auto'. Without the panel
  // in the page (an older cached index.html) there is no Continue to tap, so
  // the game then moves on by itself, as it always did.
  function sbAdvanceMode() {
    if (state.sbAdvance === 'auto') return 'auto';
    return document.getElementById('sb-sheet') ? 'tap' : 'auto';
  }

  // Can the current sentence be heard at all (the rule speakWholeSentence uses)?
  function sbSentenceAudible() {
    try {
      var s = state.sentenceSession;
      if (!s || !s.current) return false;
      if (typeof tts === 'undefined' || !(tts && tts.supported)) return false;
      return sbThaiVoiceUsable() || !!sentenceToSpeak(s).url;
    } catch (e) { return false; }
  }

  // kind: 'ok' | 'retry' (wrong, a heart left) | 'over' (wrong, last heart)
  function sheetHtml(kind, tapMode) {
    var s = state.sentenceSession;
    var d = state.displayMode;
    var ok = (kind === 'ok');
    var thai, title, note = '', body = '', cta;
    if (ok) {
      thai = sbPickPhrase('ok');
      title = 'Correct!';
      // The sentence exactly as the student built it — their word order.
      var toks = s.slots.map(function (uid) { return tokenByUid(uid); }).filter(Boolean);
      if (d !== 'roman') {
        body += '<div class="sb-sheet-th" lang="th">' +
                escapeHtml(toks.map(function (t) { return t.th; }).join('')) + '</div>';
      }
      if (d !== 'thai') {
        body += '<div class="sb-sheet-rom">' +
                escapeHtml(toks.map(function (t) { return t.rom; }).join(' ')) + '</div>';
      }
      cta = (s.index + 1 >= s.queue.length) ? 'See results' : 'Continue';
    } else if (kind === 'retry') {
      thai = sbPickPhrase('retry');
      title = 'Not quite';
      note = 'You lost a heart. The words will be shuffled, so try this sentence again.';
      cta = 'Try again';
    } else {
      thai = sbPickPhrase('over');
      title = 'Not quite';
      note = 'That was your last heart.';
      cta = 'See results';
    }
    var replay = (tapMode && sbSentenceAudible())
      ? '<button type="button" class="sb-sheet-replay" aria-label="Hear the sentence again">' + SB_SPEAKER_SVG + '</button>'
      : '';
    return '<div class="sb-sheet-inner">' +
             '<div class="sb-sheet-head">' +
               '<span class="sb-sheet-icon" aria-hidden="true">' + (ok ? SB_ICON_OK : SB_ICON_X) + '</span>' +
               '<div class="sb-sheet-titles">' +
                 '<div class="sb-sheet-title">' + title + '</div>' +
                 '<div class="sb-sheet-sub">' + sbPhraseHtml(thai) +
                   (note ? '<span class="sb-sheet-note">' + note + '</span>' : '') +
                 '</div>' +
               '</div>' +
               replay +
             '</div>' +
             (body ? '<div class="sb-sheet-body">' + body + '</div>' : '') +
             '<button type="button" class="sb-sheet-cta">' + cta + '</button>' +
           '</div>';
  }

  // Where the word tray is, so the panel can cover exactly that area.
  function measureTray() {
    try {
      var view = document.getElementById('view-sentence-game');
      var tray = document.querySelector('#sb-game-root .sb-tray');
      if (!view || !tray) return;
      var vr = view.getBoundingClientRect(), tr = tray.getBoundingClientRect();
      view.style.setProperty('--sb-tray-h', Math.max(170, Math.round(vr.bottom - tr.top)) + 'px');
      view.style.setProperty('--sb-tray-w', Math.max(0, Math.round(vr.right - tr.left)) + 'px');
    } catch (e) {}
  }

  function showSheet(kind) {
    var sheet = document.getElementById('sb-sheet');
    if (!sheet) return;
    if (_sbSheetTimer) { clearTimeout(_sbSheetTimer); _sbSheetTimer = null; }
    var s = state.sentenceSession;
    sheet.className = 'sb-sheet ' + (kind === 'ok' ? 'sb-sheet-ok' : 'sb-sheet-bad');
    sheet.innerHTML = sheetHtml(kind, sbAdvanceMode() === 'tap');
    measureTray();
    closeAaPop();
    // A short beat first, so the green wave / red shake is seen on the words.
    _sbSheetTimer = setTimeout(function () {
      _sbSheetTimer = null;
      if (!s || state.sentenceSession !== s || s.over || !_sbProceed) return;
      sheet.classList.add('sb-open');
      var btn = sheet.querySelector('.sb-sheet-cta');
      if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) {} }
    }, sbReducedMotion() ? 0 : 260);
  }

  function hideSheet() {
    if (_sbSheetTimer) { clearTimeout(_sbSheetTimer); _sbSheetTimer = null; }
    var sheet = document.getElementById('sb-sheet');
    if (!sheet) return;
    try {
      if (document.activeElement && sheet.contains(document.activeElement)) document.activeElement.blur();
    } catch (e) {}
    sheet.classList.remove('sb-open');
  }

  // After a check: show the panel, read the sentence exactly as before
  // (afterOptionalSpeak), then run `next` — by itself ('auto') or only from the
  // panel's button ('tap'). `next` runs at most once.
  function awaitNext(kind, fallbackDelay, next) {
    var done = false;
    function proceed() {
      if (done) return;
      done = true;
      if (_sbProceed === proceed) _sbProceed = null;
      hideSheet();
      next();
    }
    _sbProceed = proceed;
    showSheet(kind);
    if (sbAdvanceMode() === 'tap') {
      afterOptionalSpeak(true, fallbackDelay, function () {});   // read it, then wait for the tap
    } else {
      afterOptionalSpeak(true, fallbackDelay, proceed);           // unchanged: moves on by itself
    }
  }

  // The panel's button (or Enter): stop the reading, end the pending wait for
  // good, and move on now.
  function sbContinueNow() {
    var proceed = _sbProceed;
    if (!proceed) return;
    var go = _sbPendingGo;
    _sbPendingGo = null;
    stopSentenceAudio();
    if (go) go();       // runs once: clears its timers, so nothing of it can fire later
    proceed();          // no-op if `go` already moved on
  }

  // Speaker button ('tap' mode only): hear the sentence again.
  function sbReplaySentence(btn) {
    if (!_sbProceed) return;
    try { speakWholeSentence(btn || null, {}); } catch (e) {}
  }

  /* ----- Word size popover (the Aa button on the question card) ----- */
  function closeAaPop() {
    var pop = document.getElementById('sb-aa-pop');
    if (pop) pop.classList.remove('sb-open');
    var btn = document.getElementById('sb-aa-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleAaPop(btn) {
    var pop = document.getElementById('sb-aa-pop');
    var view = document.getElementById('view-sentence-game');
    if (!pop || !btn || !view) return;
    if (pop.classList.contains('sb-open')) { closeAaPop(); return; }
    pop.classList.add('sb-open');
    btn.setAttribute('aria-expanded', 'true');
    try {
      var vr = view.getBoundingClientRect(), r = btn.getBoundingClientRect();
      var w = pop.offsetWidth;
      var left = Math.max(8, Math.min(vr.width - w - 8, r.right - vr.left - w));
      pop.style.left = Math.round(left) + 'px';
      pop.style.top = Math.round(r.bottom - vr.top + 8) + 'px';
    } catch (e) {}
  }

  // Wired once at load. All of it is inert unless a Sentence Builder round is
  // on screen.
  function wireSbPanels() {
    try {
      var sheet = document.getElementById('sb-sheet');
      if (sheet) {
        sheet.addEventListener('click', function (e) {
          if (e.target.closest('.sb-sheet-cta')) { sbContinueNow(); return; }
          var rp = e.target.closest('.sb-sheet-replay');
          if (rp) { sbReplaySentence(rp); return; }
          var say = e.target.closest('.sb-sheet-say');
          if (say) sbSayPhrase(say);
        });
      }
      // Tap anywhere else closes the word-size popover.
      document.addEventListener('pointerdown', function (e) {
        var pop = document.getElementById('sb-aa-pop');
        if (!pop || !pop.classList.contains('sb-open')) return;
        if (pop.contains(e.target) || e.target.closest('#sb-aa-btn')) return;
        closeAaPop();
      });
      window.addEventListener('resize', closeAaPop);
      // Keys, checked BEFORE the app's global Escape/Backspace handler, and
      // only while this game's popover or result panel is up:
      //   • Escape closes the popover (instead of asking to quit the game);
      //   • Enter / Space continue from the result panel.
      window.addEventListener('keydown', function (e) {
        var pop = document.getElementById('sb-aa-pop');
        if (e.key === 'Escape' && pop && pop.classList.contains('sb-open')) {
          e.preventDefault();
          e.stopPropagation();
          closeAaPop();
          var btn = document.getElementById('sb-aa-btn');
          if (btn) { try { btn.focus({ preventScroll: true }); } catch (e2) {} }
          return;
        }
        if ((e.key === 'Enter' || e.key === ' ') && _sbProceed) {
          var sh = document.getElementById('sb-sheet');
          if (!sh || !sh.classList.contains('sb-open')) return;
          var ae = document.activeElement;
          if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
          if (ae && ae.tagName === 'BUTTON' && sh.contains(ae)) return;   // the button handles it itself
          e.preventDefault();
          sbContinueNow();
        }
      }, true);
    } catch (e) {}
  }

  /* ----- Answer checking (string-based; duplicate-safe) ----- */

  // The Thai-string sequence currently in the slots.
  function placedSequence(s) {
    return s.slots.map(function (uid) {
      var t = tokenByUid(uid);
      return t ? t.th : null;
    });
  }

  // True if `seq` (array of th strings) matches the canonical order or any
  // listed answers[] ordering. Compared by value, so duplicates are handled.
  function matchesAnyAnswer(seq, sent) {
    if (arraysEqual(seq, sent.th)) return true;
    if (Array.isArray(sent.answers)) {
      for (var i = 0; i < sent.answers.length; i++) {
        if (arraysEqual(seq, sent.answers[i])) return true;
      }
    }
    return false;
  }

  function arraysEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
    return true;
  }

  // `landed` is true when placeWord() has already locked the board while the
  // last word landed (board v2); the check then runs on that locked board.
  function checkSentence(landed) {
    var s = state.sentenceSession;
    if (!s || (s.locked && landed !== true)) return;
    s.locked = true;
    markNextWell();

    var seq = placedSequence(s);
    var correct = matchesAnyAnswer(seq, s.current);
    // Part 3: when a correct answer is in another accepted order, the reading
    // follows the student's own order (see sentenceToSpeak). Wrong answers
    // keep the standard order, which is the hint.
    s.spokenOrder = (correct && !arraysEqual(seq, s.current.th)) ? seq.slice() : null;
    // Part 4: remember how this sentence went, for the results list.
    sbNoteResult(s, correct);
    var linesEl = document.getElementById('sb-lines');

    if (correct) {
      // A green wave across the placed words, left to right.
      placedTiles(s).forEach(function (t, i) {
        t.style.setProperty('--i', String(i));
        t.classList.add('sb-ok');
      });
      // Any trap words still in the word list are finished with too: strike
      // them out so the solved sentence stands alone.
      markLeftoverTraps();
      if (typeof playSound === 'function') playSound('snd-bingo-correct');
      if (typeof haptic === 'function') haptic(30);

      s.done++;
      updateSentenceHud();

      var isLast = (s.index + 1 >= s.queue.length);

      // When the English Hint is OFF, reveal the English meaning of the sentence
      // the player just solved (same as tapping "Show English sentence"), so they
      // can confirm what they built. We update ONLY the prompt area in place so the
      // green "correct" animation on the slots is left untouched. The reveal is for
      // THIS solved sentence only — loadSentenceRound() resets s.revealEn for the
      // next one, so it never spoils the upcoming sentence.
      var hintOff = (state.sbEngHint === 'off');
      if (hintOff) {
        s.revealEn = true;
        revealPromptEnglish();
      }

      // Advance timing. With Spoken Answer ON, afterOptionalSpeak waits for the
      // spoken sentence to finish (unchanged). With it OFF, we use a timed delay;
      // when the hint is OFF we extend that delay by ~1s so there's time to read
      // the freshly-revealed English before the next sentence appears.
      // (Result panel: longer pauses that follow Speed — see SB_PAUSES.)
      var correctDelay = sbPause('correct') + (hintOff ? 1000 : 0);

      // On a correct answer the board stays frozen (s.locked is true) while the
      // sentence is read aloud; only once TTS finishes (or the safety timer
      // fires) do we advance to the next sentence — or show the win modal if
      // this was the last one. With Spoken Answer off, this is just a short beat.
      // Result panel: see awaitNext() (moves on by itself, or on Continue).
      awaitNext('ok', correctDelay, function () {
        if (!state.sentenceSession || state.sentenceSession.over) return;
        if (isLast) {
          endSentenceGame(true);
        } else {
          s.index++;
          loadSentenceRound();
        }
      });
    } else {
      // Wrong: lose a life.
      s.lives = Math.max(0, s.lives - 1);
      updateSentenceHud();

      placedTiles(s).forEach(function (t) { t.classList.add('sb-bad'); });
      if (linesEl) {
        linesEl.classList.remove('sb-jolt');
        void linesEl.offsetWidth;   // restart the shake
        linesEl.classList.add('sb-jolt');
      }
      if (typeof haptic === 'function') haptic([20, 40, 20]);

      var lostAll = (s.lives <= 0);

      if (!lostAll) {
        // Still have a life: play the "wrong (try again)" cue, optionally read
        // the sentence as a hint, then reshuffle this sentence to retry.
        if (typeof playSound === 'function') playSound('snd-sentence-fail');
        awaitNext('retry', sbPause('wrong'), function () {
          if (!state.sentenceSession || state.sentenceSession.over) return;
          resetCurrentSentence();
        });
      } else {
        // Fatal miss → loss. Do NOT play the per-sentence fail sound; the loss
        // modal carries its own (snd-lose). If Spoken Answer is on, still read
        // the sentence first and delay the modal until speech finishes (+250ms).
        awaitNext('over', sbPause('wrong'), function () {
          if (!state.sentenceSession || state.sentenceSession.over) return;
          endSentenceGame(false);
        });
      }
    }
  }

  // Put every word back and reshuffle (after a wrong answer, with lives left).
  function resetCurrentSentence() {
    var s = state.sentenceSession;
    if (!s) return;
    s.locked = false;
    // Rebuild pool from all tokens, reshuffled; clear slots.
    s.pool = shuffle(s.tokens.map(function (t) { return t.uid; }));
    var tries = 0;
    while (tries < 4 && poolMatchesSolved(s)) { s.pool = shuffle(s.pool); tries++; }
    s.slots = s.current.th.map(function () { return null; });
    // Board v2: every word flies back to its place in the NEW shuffle.
    s.bankOrder = s.pool.slice();
    reshuffleBoard();
  }

  // After a correct answer, strike out (and make inert) every word still in the
  // word list. Only called on a correct answer, when the list can only hold
  // trap words — every real word is in the sentence. Their places are kept, so
  // nothing jumps; loadSentenceRound() replaces the whole board for the next
  // sentence, so nothing here needs undoing.
  function markLeftoverTraps() {
    try {
      var s = state.sentenceSession, b = _sbBoard;
      if (!s || !b) return;
      var calm = sbReducedMotion();
      s.pool.forEach(function (uid, k) {
        var t = b.tiles[uid];
        if (!t) return;
        t.setAttribute('aria-hidden', 'true');
        t.setAttribute('tabindex', '-1');
        setTimeout(function () { t.classList.add('sb-trap-out'); }, calm ? 0 : 240 + k * 90);
      });
    } catch (e) {}
  }

  /* ----------------------------------------------------------------------
     RECORDED SENTENCES
     ----------------------------------------------------------------------
     A sentence can have a real voice recording. It is linked in PHRASE_AUDIO
     (vocab-data.js) under the sentence's Thai words joined with NO spaces:

         th: ["ผม", "ชื่อ", "เจมส์", "ครับ"]
         → { th: 'ผมชื่อเจมส์ครับ', audio: 'pom-chuu-james-krap.mp3' }

     The file lives in ./audio/voice/. The app's shared resolver (voiceAudioUrl
     in index.html) does the lookup, so every rule it already has applies here
     for free: a VOCAB word with the same text wins, two different files for the
     same text means "no recording", and the background warm-up downloads every
     linked file for offline use without any extra wiring.

     WHAT PLAYS (only when Spoken Answer is on — unchanged trigger points):
       Thai voice + recording      → the mp3 at SB_AUDIO_RATE (1.0 = as
                                     recorded); if the file is missing, broken
                                     or too slow to start → Thai TTS at
                                     SB_TTS_RATE. This is tts.speak()'s own
                                     built-in behaviour — the same call shape
                                     Audio Bingo uses.
       Thai voice, no recording    → Thai TTS at SB_TTS_RATE (as before).
       NO Thai voice + recording   → the mp3 at SB_AUDIO_RATE; if the file
                                     fails → silence and the usual timed pause.
                                     Deliberately NOT routed through
                                     tts.speak(): its fallback is Thai TTS, which
                                     on a device without a Thai voice can mean a
                                     non-Thai voice mangling the text. The
                                     recording is handed to the same player
                                     (tts.playRecording) with no TTS fallback.
       NO Thai voice, no recording → silence and the timed pause (as before).
       No speech engine at all     → silence and the timed pause (as before, and
                                     the same rule as the rest of the app).
     ---------------------------------------------------------------------- */
  var SB_AUDIO_RATE = 1.0;              // recordings: normal speed, as recorded
  var SB_TTS_RATE = 0.8;                // TTS: the learner pace used before recordings
  var SB_SPEAK_SAFETY_TTS_MS = 6000;    // "TTS never reported finishing" cap (unchanged)
  var SB_SPEAK_SAFETY_REC_MS = 12000;   // same cap when a recording is involved

  // The PHRASE_AUDIO key for a sentence: its Thai words joined with no spaces.
  // This is exactly the text TTS has always been given for the sentence.
  function sentenceAudioKey(sent) {
    try {
      if (!sent || !Array.isArray(sent.th) || !sent.th.length) return '';
      return sent.th.join('');
    } catch (e) { return ''; }
  }

  // Playable URL of a sentence's recording, or '' when there is none (the
  // ordinary case) or the app's resolver is unavailable.
  function sentenceAudioUrl(sent) {
    try {
      if (typeof voiceAudioUrl !== 'function') return '';
      var key = sentenceAudioKey(sent);
      if (!key) return '';
      return voiceAudioUrl(key) || '';
    } catch (e) { return ''; }
  }

  // The same "is a Thai voice usable?" rule this engine has always applied
  // (optimistic while the browser is still loading its voice list).
  function sbThaiVoiceUsable() {
    try {
      if (typeof tts === 'undefined' || !tts || !tts.supported) return false;
      if (typeof tts.bingoAudioAvailable !== 'function') return true;
      return !!tts.bingoAudioAvailable();
    } catch (e) { return false; }
  }

  // Stop whatever this engine may be saying — a recording or TTS. Uses the
  // app's tts.cancelCurrent() (which stops both, exactly as Connect Pairs does),
  // falling back to the old speechSynthesis.cancel() if it is ever missing.
  function stopSentenceAudio() {
    try {
      if (typeof tts === 'undefined' || !tts || !tts.supported) return;
      if (typeof tts.cancelCurrent === 'function') { tts.cancelCurrent(); return; }
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  /* Ask the service worker to download this session's sentence recordings
     ahead of everything else in its queue (the same helper Audio Bingo uses).
     Sentences without a recording are skipped by primeWordAudio itself.
     Skipped entirely when Spoken Answer is off or the device has no speech
     engine, since nothing would play them — no data spent for nothing.
     Fire-and-forget: no service worker / offline means it simply does nothing. */
  function primeSentenceAudio(queue) {
    try {
      if (state.sbAutoTts !== 'on') return;
      if (typeof tts === 'undefined' || !tts || !tts.supported) return;
      if (typeof primeWordAudio !== 'function') return;
      if (!Array.isArray(queue)) return;
      var words = [];
      queue.forEach(function (sent) {
        var key = sentenceAudioKey(sent);
        if (key) words.push({ th: key });
      });
      if (words.length) primeWordAudio(words);
    } catch (e) {}
  }

  /* Play a recording with NO speech-synthesis fallback (devices without a Thai
     voice). Mirrors what tts.speak() does before playing — hold the output
     device open, stop anything already sounding — then hands the file to the
     app's own player. `onFail` fires if the file cannot be played; `onDone`
     when it finishes (or is stopped). Returns true only if playback was
     actually handed to the player.
     `ttsRate` (optional): pass the TTS-style rate a tts.speak() call would have
     used (e.g. 0.8 for a held word) and the player converts it exactly as
     tts.speak() does, so the recording sounds the same on every device.
     Omitted — as for whole sentences — the recording plays at SB_AUDIO_RATE. */
  function playRecordingOnly(url, btnEl, onDone, onFail, ttsRate) {
    try {
      if (!url) return false;
      if (typeof tts.playRecording !== 'function') return false;
      if (typeof tts.cancelCurrent !== 'function') return false;
      try {
        if (typeof audioReady !== 'undefined' && audioReady &&
            typeof audioReady.noteAudio === 'function') audioReady.noteAudio();
      } catch (e) {}
      tts.cancelCurrent();
      var playOpts = (typeof ttsRate === 'number' && ttsRate > 0)
        ? { rate: ttsRate, onDone: onDone || null }
        : { audioRate: SB_AUDIO_RATE, onDone: onDone || null };
      return tts.playRecording(url, btnEl || null, playOpts,
        function () { if (onFail) onFail(); else if (onDone) onDone(); }
      ) === true;
    } catch (e) {
      return false;
    }
  }

  /* Which sentence to read aloud, and its recording (part 3). Normally the
     sentence as written in sentences.js (th[] order), exactly as before.
     After a CORRECT answer built in another accepted order (s.spokenOrder,
     set by checkSentence) it follows the student's own order, so what they
     hear matches what they built and what the result panel shows:
       1. a recording of their own order, if one is linked in PHRASE_AUDIO;
       2. otherwise the sentence's own recording, if it has one;
       3. otherwise Thai TTS of their own order.
     Returns { text, url } (url '' when there is no recording). */
  function sentenceToSpeak(s) {
    var text = s.current.th.join('');
    var url = sentenceAudioUrl(s.current);
    try {
      if (Array.isArray(s.spokenOrder) && s.spokenOrder.length) {
        var own = s.spokenOrder.join('');
        if (own && own !== text) {
          var ownUrl = (typeof voiceAudioUrl === 'function') ? (voiceAudioUrl(own) || '') : '';
          if (ownUrl) return { text: own, url: ownUrl };
          if (!url) return { text: own, url: '' };
        }
      }
    } catch (e) {}
    return { text: text, url: url };
  }

  /* ----- Speak the full current sentence (recording or Thai TTS) -----
     Returns a truthy value if audio was actually started, so callers can decide
     whether to wait for it: 'rec' when a recording is involved, 'tts' when it is
     speech synthesis only; false when nothing could be started.
     `opts.onDone` fires once when the audio finishes (or errors, or is stopped).
     `opts.onFail` fires instead if a recording could not be played AND there is
     no Thai voice to fall back on — i.e. nothing was heard. -----*/
  function speakWholeSentence(btnEl, opts) {
    opts = opts || {};
    var s = state.sentenceSession;
    if (!s || !s.current) return false;
    if (typeof tts === 'undefined' || !(tts && tts.supported)) return false;
    // Join the ORIGINAL Thai word order into one utterance. Thai is written
    // without spaces between words; joining plainly reads most naturally.
    // (This is also the PHRASE_AUDIO key — see sentenceAudioKey.)
    // Part 3: after a correct answer in another accepted order, the student's
    // own order instead (see sentenceToSpeak).
    var toSpeak = sentenceToSpeak(s);
    var phrase = toSpeak.text;
    var url = toSpeak.url;

    if (sbThaiVoiceUsable()) {
      // tts.speak plays the recording when there is one (at audioRate) and
      // falls back to Thai TTS (at rate) by itself; with no recording it is
      // plain TTS exactly as before.
      try {
        tts.speak(phrase, btnEl || null, {
          rate: SB_TTS_RATE,
          audioRate: SB_AUDIO_RATE,
          onDone: opts.onDone || null
        });
        return url ? 'rec' : 'tts';
      } catch (e) {
        return false; // TTS is enhancement only
      }
    }

    // No Thai voice: a recording is the only way this sentence can be heard.
    // Without one, don't claim we spoke (the caller falls back to a delay).
    if (url && playRecordingOnly(url, btnEl, opts.onDone || null, opts.onFail || null)) {
      return 'rec';
    }
    return false;
  }

  /* Run `next` after optionally speaking the current sentence.
     - If autoTTS is on AND the sentence can be heard (Thai voice, or a
       recording): speak, then run `next` ~250ms after it ends (with a safety
       cap so a missing onDone can't hang it).
     - Otherwise: run `next` after `fallbackDelay` ms.
     Used so the final sentence (win or fatal loss) finishes being read before
     the end modal appears.

     SESSION-BOUND. Each wait remembers the session it was started for. If that
     session has ended (the player left, or restarted) by the time any of its
     callbacks fire — for example the "finished" report of a recording that was
     stopped on exit — the callback does nothing at all: it never advances a
     round and never touches the timers of a newer game. */
  function afterOptionalSpeak(doSpeak, fallbackDelay, next) {
    var ran = false;
    var mySession = state.sentenceSession;
    function stale() { return state.sentenceSession !== mySession; }
    function clearTimers() {
      if (_sbSpeakSafetyTimer) { clearTimeout(_sbSpeakSafetyTimer); _sbSpeakSafetyTimer = null; }
      if (_sbClearTimer) { clearTimeout(_sbClearTimer); _sbClearTimer = null; }
      if (_sbSpeakDelayTimer) { clearTimeout(_sbSpeakDelayTimer); _sbSpeakDelayTimer = null; }
    }
    function go() {
      if (ran) return;
      ran = true;
      if (_sbPendingGo === go) _sbPendingGo = null;
      if (stale()) return;   // leftover from an ended session — hands off
      clearTimers();
      next();
    }
    _sbPendingGo = go;       // result panel: Continue can end this wait now

    if (doSpeak && state.sbAutoTts === 'on') {
      // Brief gap so the just-played correct/wrong SFX is heard before the spoken
      // sentence begins (they're short cues — avoids overlap).
      _sbSpeakDelayTimer = setTimeout(function () {
        if (stale()) return;
        _sbSpeakDelayTimer = null;
        if (ran) return;
        var speakStartedAt = Date.now();
        var started = speakWholeSentence(null, {
          onDone: function () {
            // Pause after speech (follows Speed — see SB_PAUSES), then proceed.
            if (ran || stale()) return;
            _sbClearTimer = setTimeout(go, sbPause('afterRead'));
          },
          onFail: function () {
            // A recording could not play and there is no Thai voice to fall
            // back on, so nothing was heard: finish the same timed pause a
            // silent device has always had (accounting for time already spent).
            if (ran || stale()) return;
            var waited = Date.now() - speakStartedAt;
            _sbClearTimer = setTimeout(go,
              Math.max(250, fallbackDelay - SB_SPEAK_DELAY - waited));
          }
        });
        if (started) {
          // Safety net: if onDone never fires (some engines), don't hang forever.
          // A recording gets a longer cap, and if the cap is ever reached the
          // recording is stopped first so it cannot talk over the next sentence.
          var isRec = (started === 'rec');
          _sbSpeakSafetyTimer = setTimeout(function () {
            if (ran || stale()) return;
            if (isRec) stopSentenceAudio();
            go();
          }, isRec ? SB_SPEAK_SAFETY_REC_MS : SB_SPEAK_SAFETY_TTS_MS);
        } else {
          // Could not actually speak (no voice) — use the timed fallback,
          // accounting for the delay we already waited.
          _sbClearTimer = setTimeout(go, Math.max(0, fallbackDelay - SB_SPEAK_DELAY));
        }
      }, SB_SPEAK_DELAY);
      return;
    }
    _sbClearTimer = setTimeout(go, fallbackDelay);
  }

  /* ----------------------------------------------------------------------
     RESULTS (end-of-game popup, part 4)
     ----------------------------------------------------------------------
     checkSentence() notes how each sentence went (sbNoteResult: mistakes, and
     whether it was solved). endSentenceGame() then adds, below the usual
     title, four stats and the list of the sentences the student saw this
     session — the standard order in Thai, romanization and English, each with
     a speaker button when it can be heard. Sentences with mistakes are marked
     "Needs practice"; after a loss, the last one is marked "Not solved".
     The list goes into the shared popup's #record-badge-wrap slot (like Audio
     Bingo's missed words); the popup takes its larger, two-column shape from
     CSS that applies only while the list is there ("SENTENCE BUILDER —
     RESULTS" in index.html). wireSbResults() empties the slot again as soon
     as the popup closes, so the list can never appear in another game's
     popup. Everything here is optional: if anything fails, the popup simply
     shows what it always showed. */
  var _sbEndSents = [];   // the sentences in the open results list (speaker buttons)

  function sbNoteResult(s, correct) {
    try {
      if (!Array.isArray(s.results)) s.results = [];
      var r = s.results[s.index];
      if (!r || r.sent !== s.current) r = s.results[s.index] = { sent: s.current, misses: 0, solved: false };
      if (correct) r.solved = true; else r.misses++;
    } catch (e) {}
  }

  // Can this sentence be heard on this device (Thai voice, or its recording)?
  function sbCanSay(sent) {
    try {
      if (typeof tts === 'undefined' || !(tts && tts.supported)) return false;
      return sbThaiVoiceUsable() || !!sentenceAudioUrl(sent);
    } catch (e) { return false; }
  }

  // Read one listed sentence aloud: through tts.speak when there is a Thai
  // voice (which prefers the recording by itself), else its recording only.
  function sbSaySentence(sent, btn) {
    try {
      if (!sent || !Array.isArray(sent.th)) return;
      if (typeof tts === 'undefined' || !(tts && tts.supported)) return;
      if (sbThaiVoiceUsable()) {
        tts.speak(sent.th.join(''), btn || null, { rate: SB_TTS_RATE, audioRate: SB_AUDIO_RATE });
        return;
      }
      var url = sentenceAudioUrl(sent);
      if (url) playRecordingOnly(url, btn || null, null, null);
    } catch (e) {}
  }

  function sbResultsHtml(s, won) {
    var rows = (Array.isArray(s.results) ? s.results : []).filter(Boolean);
    if (!rows.length) return '';
    var firstTry = 0, mistakes = 0, practice = 0;
    rows.forEach(function (r) {
      if (r.solved && !r.misses) firstTry++;
      mistakes += r.misses;
      if (r.misses || !r.solved) practice++;
    });
    var secs = (typeof s.startedAt === 'number') ? Math.max(0, Math.round((Date.now() - s.startedAt) / 1000)) : null;
    var time = (secs == null) ? '–' : (Math.floor(secs / 60) + ':' + (secs % 60 < 10 ? '0' : '') + (secs % 60));
    function stat(value, label) {
      return '<div class="stat-box"><div class="stat-value">' + escapeHtml(String(value)) + '</div>' +
             '<div class="stat-label">' + label + '</div></div>';
    }
    var html = '<div class="stats-row sb-end-stats">' +
                 stat(firstTry, 'First try') +
                 stat(mistakes, mistakes === 1 ? 'Mistake' : 'Mistakes') +
                 stat(s.lives, s.lives === 1 ? 'Heart left' : 'Hearts left') +
                 stat(time, 'Time') +
               '</div>';
    html += '<div class="sb-end-panel">' +
              '<div class="sb-end-head"><span class="sb-end-head-title">Your sentences</span>' +
                (practice
                  ? '<span class="sb-end-head-note">' + practice + ' to practise</span>'
                  : '<span class="sb-end-head-note sb-end-good">All right first time!</span>') +
              '</div>' +
              '<ol class="sb-end-list">';
    _sbEndSents = [];
    rows.forEach(function (r, i) {
      var sent = r.sent || {};
      var th = Array.isArray(sent.th) ? sent.th : [];
      var rom = Array.isArray(sent.rom) ? sent.rom.filter(function (x) { return typeof x === 'string' && x; }) : [];
      var kind = !r.solved ? 'fail' : (r.misses ? 'miss' : 'ok');
      var tag = (kind === 'fail') ? 'Not solved · practise this one'
              : (kind === 'miss') ? ('Needs practice · ' + r.misses + (r.misses === 1 ? ' mistake' : ' mistakes'))
              : '';
      _sbEndSents.push(sent);
      html += '<li class="sb-end-item sb-end-' + kind + '">' +
                '<span class="sb-end-num" aria-hidden="true">' + (i + 1) + '</span>' +
                '<div class="sb-end-text">' +
                  '<div class="sb-end-th" lang="th">' + escapeHtml(th.join('')) + '</div>' +
                  (rom.length ? '<div class="sb-end-rom">' + escapeHtml(rom.join(' ')) + '</div>' : '') +
                  (sent.en ? '<div class="sb-end-en">' + escapeHtml(sent.en) + '</div>' : '') +
                  (tag ? '<span class="sb-end-tag">' + tag + '</span>' : '') +
                '</div>' +
                (sbCanSay(sent)
                  ? '<button type="button" class="sb-end-say" data-sb-say="' + i + '" aria-label="Hear this sentence">' + SB_SPEAKER_SVG + '</button>'
                  : '<span></span>') +
              '</li>';
    });
    html += '</ol></div>';
    return html;
  }

  // Wired once at load: the speaker buttons, and emptying the slot when the
  // shared popup closes (so the list never shows in another game's popup).
  function wireSbResults() {
    try {
      document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.sb-end-say') : null;
        if (!btn) return;
        var sent = _sbEndSents[Number(btn.getAttribute('data-sb-say'))];
        if (sent) sbSaySentence(sent, btn);
      });
      var modal = document.getElementById('win-modal');
      if (modal && typeof MutationObserver === 'function') {
        new MutationObserver(function () {
          if (!modal.classList.contains('hidden')) return;
          var slot = document.getElementById('record-badge-wrap');
          if (slot && slot.querySelector('.sb-end')) slot.innerHTML = '';
          _sbEndSents = [];
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (e) {}
  }

  /* ----- End of game (reuses the shared win-modal shell) ----- */
  function endSentenceGame(won) {
    var s = state.sentenceSession;
    if (!s) return;
    s.over = true;
    if (_sbClearTimer) { clearTimeout(_sbClearTimer); _sbClearTimer = null; }
    stopSentenceAudio();

    // Count a finished session (win or lose), mirroring the other modes.
    if (!state.stats) state.stats = {};
    state.stats.sentenceFinished = (state.stats.sentenceFinished || 0) + 1;

    // On a win, bump the win counter and detect whether this win unlocked a new
    // landmark (drives the big-win sound + the unlock pill). Mirrors Connect/Bingo.
    var unlockedBadge = null;
    if (won) {
      var prevWins = state.sentenceWins || 0;
      var nextWins = prevWins + 1;
      state.sentenceWins = nextWins;
      if (typeof sentenceBadgeUnlockedBy === 'function') {
        unlockedBadge = sentenceBadgeUnlockedBy(prevWins, nextWins);
      }
    }
    try { saveStorage(); } catch (e) {}

    // Sound + haptic. A win that unlocked a new landmark uses the "big" win
    // sound; an ordinary win uses the milder cue (mirrors Audio Bingo / Connect).
    if (won) {
      playSound(unlockedBadge ? 'snd-win' : 'snd-win-2');
      haptic(unlockedBadge ? 60 : 50);
    } else {
      playSound('snd-lose');
      haptic(50);
    }

    // Drive the shared #win-modal. Mirrors endBingoGame()'s use of the shell.
    var title = document.getElementById('win-title');
    var subtitle = document.getElementById('win-subtitle');
    if (title) title.textContent = won ? '\uD83C\uDF89 You won!' : '\uD83D\uDCDA You lost!';
    if (typeof setEndThaiLine === 'function') setEndThaiLine('win-title-thai', won ? 'win' : 'lose');
    if (subtitle) {
      subtitle.textContent = won
        ? 'You built all ' + s.target + ' sentences!'
        : 'Out of lives — you built ' + s.done + ' of ' + s.target + '.';
      subtitle.classList.remove('lead', 'hidden');
    }
    var resultLine = document.getElementById('cpu-result-line');
    if (resultLine) resultLine.classList.add('hidden');
    var scoreLabel = document.getElementById('cpu-score-label');
    if (scoreLabel) scoreLabel.classList.add('hidden');
    if (typeof setEndThaiLine === 'function') setEndThaiLine('win-subtitle-thai', null);

    // Landmark-unlock banner (reuses the record-badge slot, like Connect/Bingo).
    var badgeWrap = document.getElementById('record-badge-wrap');
    if (badgeWrap) {
      var banner = '';
      if (unlockedBadge) {
        var winsText = unlockedBadge.threshold === 1 ? '1 win' : (unlockedBadge.threshold + ' wins');
        banner =
          '<div class="record-badge tier-' + unlockedBadge.id + '">' +
            unlockedBadge.emoji + ' ' + winsText + ' \u2014 ' +
            escapeHtml(unlockedBadge.label) + ' landmark unlocked! ' + unlockedBadge.emoji +
          '</div>';
      }
      // Part 4: the stats + this session's sentences (see RESULTS). If that
      // fails for any reason, the popup shows just the banner, as before.
      var resultsHtml = '';
      try { resultsHtml = sbResultsHtml(s, won); } catch (e) { resultsHtml = ''; }
      badgeWrap.innerHTML = resultsHtml ? '<div class="sb-end">' + banner + resultsHtml + '</div>' : banner;
    }

    // Current-rank line (like Solo / Connect): highest landmark + total wins.
    // Reuses the shared #solo-end-rank element. Shown only once a landmark exists.
    var rankEl = document.getElementById('solo-end-rank');
    if (rankEl) {
      var curBadge = (typeof getSentenceBadge === 'function')
        ? getSentenceBadge(state.sentenceWins || 0) : null;
      if (curBadge) {
        var w = state.sentenceWins || 0;
        rankEl.innerHTML = 'Current rank: <strong>' + escapeHtml(curBadge.label) + '</strong> \u00B7 ' +
                           w + ' win' + (w === 1 ? '' : 's');
        rankEl.classList.remove('hidden');
      } else {
        rankEl.classList.add('hidden');
      }
    }

    // Hide the memory/CPU-specific modal sections (same set endBingoGame hides).
    hideEl('win-stats');
    hideEl('cpu-scoreboard');
    hideEl('cpu-end-portrait');
    hideEl('end-dialogue');
    var box = document.getElementById('win-modal-box');
    if (box) box.classList.remove('cpu-modal');
    var modal = document.getElementById('win-modal');
    if (modal) modal.classList.remove('hidden');

    // Achievement check (Star Student can unlock here once a Sentence Builder
    // landmark exists alongside the others). sentenceWins is already bumped.
    if (typeof checkAchievements === 'function') {
      try { checkAchievements(true); } catch (e) {}
    }
  }

  function hideEl(id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); }

  // Render the progress bar + hearts + sentences-done counter in the shared top
  // HUD (board v2, part 2): one segment per sentence (the current one outlined)
  // and drawn hearts; when a life is lost, that heart visibly breaks.
  var _sbHudFor = null;   // the session the HUD was last drawn for
  var SB_HEART_SVG = '<svg class="sb-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  function updateSentenceHud() {
    var s = state.sentenceSession;
    if (!s) return;
    var fresh = (_sbHudFor !== s);
    _sbHudFor = s;
    var hearts = document.getElementById('sb-hearts');
    if (hearts) {
      if (fresh || hearts.children.length !== s.livesMax) {
        var html = '';
        for (var i = 0; i < s.livesMax; i++) html += SB_HEART_SVG;
        hearts.innerHTML = html;
        hearts.setAttribute('data-lives', String(s.lives));
      }
      var before = Number(hearts.getAttribute('data-lives'));
      for (var h = 0; h < hearts.children.length; h++) {
        hearts.children[h].classList.toggle('sb-heart-lost', h >= s.lives);
      }
      if (!fresh && s.lives < before && hearts.children[s.lives]) {
        var broken = hearts.children[s.lives];
        broken.classList.remove('sb-heart-break');
        void broken.getBoundingClientRect();   // restart the animation
        broken.classList.add('sb-heart-break');
      }
      hearts.setAttribute('data-lives', String(s.lives));
      hearts.setAttribute('aria-label', s.lives + ' of ' + s.livesMax + ' hearts left');
    }
    var bar = document.getElementById('sb-progress');
    if (bar) {
      if (fresh || bar.children.length !== s.target) {
        var segs = '';
        for (var k = 0; k < s.target; k++) segs += '<span class="sb-hud-seg"></span>';
        bar.innerHTML = segs;
        bar.classList.toggle('sb-many', s.target > 12);
        bar.setAttribute('aria-valuemax', String(s.target));
      }
      for (var j = 0; j < bar.children.length; j++) {
        bar.children[j].classList.toggle('sb-done', j < s.done);
        bar.children[j].classList.toggle('sb-now', j === s.done);
      }
      bar.setAttribute('aria-valuenow', String(s.done));
      sbHudDensity();
    }
    var cur = document.getElementById('sb-cur');
    var tot = document.getElementById('sb-tot');
    if (cur) cur.textContent = s.done;
    if (tot) tot.textContent = s.target;
  }

  // Separate segments while each is at least ~7px wide; otherwise one
  // continuous bar (long sessions on narrow phones). Re-checked on resize.
  function sbHudDensity() {
    try {
      var bar = document.getElementById('sb-progress');
      if (!bar || !bar.children.length) return;
      var w = bar.getBoundingClientRect().width;
      if (!w) return;   // HUD not on screen
      var n = bar.children.length;
      bar.classList.toggle('sb-continuous', (w - (n - 1) * 3) / n < 7);
    } catch (e) {}
  }

  /* ----------------------------------------------------------------------
     DEV TOOL: checkSentenceAudio()
     ----------------------------------------------------------------------
     Run checkSentenceAudio() in the browser console. Read-only; it changes
     nothing. It reports, for EVERY sentence in sentences.js (locked lessons
     included):
       • which sentences have a playable recording, and which of those get it
         from a VOCAB word with the same Thai text (VOCAB always wins);
       • sentences named in PHRASE_AUDIO that still have NO playable recording
         (two different files for the same text — see checkVoiceAudio());
       • every sentence without a recording, as a ready-to-paste
         PHRASE_AUDIO line with the exact key (just fill in the filename);
       • every trap problem (the reason each trap was ignored).
     Whether the linked files are actually reachable on the server is checked
     by the app's existing checkVoiceAudio(), which covers PHRASE_AUDIO too. */
  function checkSentenceAudio() {
    var list = allSentences();
    var vocabKeys = new Set();
    var phraseKeys = new Set();
    try {
      if (typeof VOCAB !== 'undefined' && Array.isArray(VOCAB)) {
        VOCAB.forEach(function (w) {
          if (w && typeof w.th === 'string' && typeof w.audio === 'string' && w.audio.trim()) {
            vocabKeys.add(w.th.trim());
          }
        });
      }
    } catch (e) {}
    try {
      if (typeof PHRASE_AUDIO !== 'undefined' && Array.isArray(PHRASE_AUDIO)) {
        PHRASE_AUDIO.forEach(function (p) {
          if (p && typeof p.th === 'string' && typeof p.audio === 'string' && p.audio.trim()) {
            phraseKeys.add(p.th.trim());
          }
        });
      }
    } catch (e) {}

    function esc(str) { return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
    function label(sent) {
      var where = (typeof sent.less === 'number') ? sbLessonLabel(sent.less) : 'no lesson';
      return where + ' \u2014 ' + (sent.en || '(no English)');
    }

    var recorded = 0;
    var fromVocab = [];
    var linkedButSilent = [];
    var missing = [];
    var trapIssues = [];
    var withTraps = 0;
    var seenMissing = new Set();

    list.forEach(function (sent) {
      if (!sent) return;
      var key = sentenceAudioKey(sent);
      if (key) {
        var url = sentenceAudioUrl(sent);
        var k = key.trim();
        if (url) {
          recorded++;
          if (vocabKeys.has(k)) fromVocab.push(label(sent) + '  [' + k + ']');
        } else if (phraseKeys.has(k) || vocabKeys.has(k)) {
          linkedButSilent.push(label(sent) + '  [' + k + ']');
        } else if (!seenMissing.has(k)) {
          seenMissing.add(k);
          missing.push("  { th: '" + esc(k) + "', audio: '' },   // " + label(sent));
        }
      }
      var problems = [];
      var usable = sentenceTraps(sent, problems);
      if (usable.length) withTraps++;
      if (problems.length) {
        trapIssues.push(label(sent) + '\n      - ' + problems.join('\n      - '));
      }
    });

    console.log('Sentence Builder audio check \u2014 ' + list.length + ' sentences, ' +
                recorded + ' with a recording, ' + withTraps + ' with traps.');
    if (fromVocab.length) {
      console.info('Recording comes from a VOCAB word with the same text (' + fromVocab.length + '):\n  ' +
                   fromVocab.join('\n  '));
    }
    if (linkedButSilent.length) {
      console.warn('Linked but NOT playable \u2014 conflicting files for the same text, see checkVoiceAudio() (' +
                   linkedButSilent.length + '):\n  ' + linkedButSilent.join('\n  '));
    }
    if (missing.length) {
      console.log('No recording yet (' + missing.length + '). Paste into PHRASE_AUDIO and fill in the filename:\n' +
                  missing.join('\n'));
    } else {
      console.log('Every sentence has a recording.');
    }
    if (trapIssues.length) {
      console.warn('Trap problems (' + trapIssues.length + ' sentence(s)):\n  ' + trapIssues.join('\n  '));
    } else {
      console.log('No trap problems found.');
    }
    console.log('To check that the linked files are reachable, run checkVoiceAudio().');

    return {
      sentences: list.length,
      recorded: recorded,
      withTraps: withTraps,
      missing: missing.length,
      fromVocab: fromVocab.length,
      linkedButSilent: linkedButSilent.length,
      trapIssues: trapIssues.length
    };
  }

  /* ----------------------------------------------------------------------
     EXPORTS — expose the hooks the inline script calls by name.
     (Plain globals, matching the rest of the app's no-modules architecture.)
     ---------------------------------------------------------------------- */
  window.renderSentenceMenu = renderSentenceMenu;
  window.startSentenceGame  = startSentenceGame;
  window.teardownSentence   = teardownSentence;
  window.updateSentenceHud  = updateSentenceHud;
  window.checkSentenceAudio = checkSentenceAudio;   // console dev tool (read-only)

  // Wire the static menu controls once the DOM is ready. The script is injected
  // at the end of <body>, so the elements already exist, but guard anyway.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireSbMenu);
    document.addEventListener('DOMContentLoaded', wireSbBoardFit);
    document.addEventListener('DOMContentLoaded', wireSbPanels);
    document.addEventListener('DOMContentLoaded', wireSbResults);
  } else {
    wireSbMenu();
    wireSbBoardFit();
    wireSbPanels();
    wireSbResults();
  }
})();
