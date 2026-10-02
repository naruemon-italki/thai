/* =========================================================================
   tone-challenge.js  —  Tone Challenge game engine (Thai Beginner Course)
   -------------------------------------------------------------------------
   A drilling game built on the SAME pitch pipeline as the Tone Trainer. The
   learner picks a voice profile (SHARED with the Tone Trainer via
   state.toneProfiles), chooses how many words to drill, then says each prompted
   word into the mic; the app scores each attempt against the word's expected
   tone and tallies a final result.

   ARCHITECTURE — mirrors sentence-builder.js:
   Plain (non-module) script, loaded AFTER the main inline script (so it can see
   the shared globals: state, saveStorage, showView, navigate, tts, playSound,
   haptic, escapeHtml, the win-modal helpers, etc.) and AFTER tone-trainer.js
   (so the window.openToneCalibration hook exists). Everything shares one global
   scope, exactly like the other classic scripts.

   It lives behind its own view (#view-tone-challenge) with two sub-screens
   toggled by tc-mode-setup / tc-mode-game classes on the <main>, and reuses the
   tone-* CSS component classes so it looks identical to the Tone Trainer.

   PROFILE SHARING: profiles are read straight from state.toneProfiles (the same
   array the Tone Trainer fills). Add/recalibrate is delegated to the Tone
   Trainer's calibration modal through window.openToneCalibration(recalId, onDone),
   so there is ONE source of truth for calibration.

   ROUND 2 SCOPE (this file): the full setup menu — profile picker (shared),
   word-count selector, Start/Back wiring — plus the view entry/teardown hooks.
   The actual drilling gameplay (mic loop, scoring, graph, end modal) and the
   bundled WORD LIST are STUBBED here and will be built in Round 3.
   ========================================================================= */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     CONFIG
     ---------------------------------------------------------------------- */
  var TC_COUNTS = [10, 15, 20];     // word-count options per challenge
  var MAX_PROFILES = 5;             // mirror the Tone Trainer cap

  /* ----------------------------------------------------------------------
     RUNTIME STATE (module-local; the persisted bits live on window.state)
     ---------------------------------------------------------------------- */
  var selectedProfileId = null;     // chosen in the picker (resolved on entry)
  var built = false;                // setup controls wired once

  function $(id) { return document.getElementById(id); }

  /* ----------------------------------------------------------------------
     RESULT FEEDBACK  (cosmetic only — no engine state touched)
     ----------------------------------------------------------------------
     Tone Challenge produces a 0..100 score across 5 tiers. We give per-attempt
     feedback by glowing the frame of the pitch-graph box (the "active" surface
     in this mode) in the tier's colour (no scale/expand — same glow language as
     the other game modes, just five colours). The word card stays passive. The
     glow fades in on score and clears on the next word, leaving the graph
     interior clean so the pitch contour stays easy to read.

     Sound landing: the three result sounds have different lead-in silences
     (measured from the files): bingo-correct 0.05s, draw 0.04s, sentence-fail
     0.13s. Each is fired after a small delay of (maxLead - ownLead) so all three
     audible onsets LAND together with the glow appearing. Volumes are NOT set
     here — playSound() applies each sound's configured volume automatically. */
  var TC_FB_LEAD = { correct: 50, draw: 40, fail: 130 }; // ms of pre-sound silence
  var TC_FB_MAXLEAD = 130;                               // = fail (longest)
  var _tcFbStyleInjected = false;
  var _tcFbTimers = [];

  // Inject the tier-glow CSS once. Targets the word card + the graph wrap that
  // wraps #tc-canvas (the 2nd .tone-canvas-wrap, scoped via the game view).
  function tcFbStyle() {
    if (_tcFbStyleInjected) return;
    _tcFbStyleInjected = true;
    // Per-tier: border colour + a soft outer glow (box-shadow ring). Perfect is
    // the brightest/largest halo, easing down to a gentle one for Off, so the
    // glow carries a faint "how well" signal without any fill/height encoding.
    var TIERS = [
      ['perfect', '34,197,94',  '0 0 0 2px rgba(34,197,94,0.95), 0 0 18px 3px rgba(34,197,94,0.55)'],
      ['great',   '74,210,120', '0 0 0 2px rgba(74,210,120,0.9), 0 0 15px 2px rgba(74,210,120,0.45)'],
      ['good',    '190,200,70', '0 0 0 2px rgba(190,200,70,0.9), 0 0 13px 2px rgba(190,200,70,0.4)'],
      ['close',   '240,170,60', '0 0 0 2px rgba(240,170,60,0.95), 0 0 13px 2px rgba(240,170,60,0.42)'],
      ['off',     '225,80,70',  '0 0 0 2px rgba(225,80,70,0.9), 0 0 12px 2px rgba(225,80,70,0.42)']
    ];
    var css =
      // Smooth fade for the glow on the graph frame.
      '#view-tone-challenge .tc-graph-wrap{' +
        'transition:box-shadow 260ms ease,border-color 260ms ease;}';
    for (var i = 0; i < TIERS.length; i++) {
      var name = TIERS[i][0], rgb = TIERS[i][1], shadow = TIERS[i][2];
      css +=
        '#view-tone-challenge .tc-graph-wrap.tc-fb-' + name + '{' +
          'border-color:rgb(' + rgb + ');box-shadow:' + shadow + ';}';
    }
    // Reduced motion: keep the colour change, drop the transition.
    css += '@media (prefers-reduced-motion: reduce){' +
      '#view-tone-challenge .tc-graph-wrap{transition:none;}}';
    var el = document.createElement('style');
    el.id = 'tc-fb-style';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function tcClearFbTimers() {
    for (var i = 0; i < _tcFbTimers.length; i++) clearTimeout(_tcFbTimers[i]);
    _tcFbTimers = [];
  }

  var TC_FB_CLASSES = ['tc-fb-perfect', 'tc-fb-great', 'tc-fb-good', 'tc-fb-close', 'tc-fb-off'];

  // The pitch-graph box for the challenge view. The markup reuses the shared
  // .tone-canvas-wrap class; we tag it once with .tc-graph-wrap so the glow CSS
  // can target it without affecting the Tone Trainer's identical wrap.
  function tcGraphWrap() {
    var canvas = $('tc-canvas');
    if (!canvas) return null;
    var wrap = canvas.closest ? canvas.closest('.tone-canvas-wrap') : canvas.parentNode;
    if (wrap && !wrap.classList.contains('tc-graph-wrap')) wrap.classList.add('tc-graph-wrap');
    return wrap;
  }

  function tcFbTargets() {
    return [tcGraphWrap()];
  }

  // Clear the glow on both frames (called when a new word loads).
  function tcResetFeedback() {
    tcClearFbTimers();
    var els = tcFbTargets();
    for (var i = 0; i < els.length; i++) {
      if (els[i]) els[i].classList.remove.apply(els[i].classList, TC_FB_CLASSES);
    }
  }

  // Glow both frames in the tier colour for a scored attempt. Cosmetic only.
  function tcPaintFeedback(fbSuffix) {
    tcFbStyle();
    var cls = 'tc-fb-' + fbSuffix;
    var els = tcFbTargets();
    for (var i = 0; i < els.length; i++) {
      if (!els[i]) continue;
      els[i].classList.remove.apply(els[i].classList, TC_FB_CLASSES);
      els[i].classList.add(cls);
    }
  }

  /* ----------------------------------------------------------------------
     PROFILE ACCESS (shared with the Tone Trainer)
     ---------------------------------------------------------------------- */
  function getProfiles() {
    var st = window.state;
    return (st && Array.isArray(st.toneProfiles)) ? st.toneProfiles : [];
  }
  function persist() {
    try { if (typeof window.saveStorage === 'function') window.saveStorage(); } catch (e) {}
  }

  /* ----------------------------------------------------------------------
     SETUP / GAME SUB-SCREEN SWITCHING
     ---------------------------------------------------------------------- */
  function setMode(m) {
    var view = $('view-tone-challenge');
    if (!view) return;
    view.classList.toggle('tc-mode-game', m === 'game');
    view.classList.toggle('tc-mode-setup', m === 'setup');
  }

  /* ----------------------------------------------------------------------
     PROFILE PICKER  (mirrors the Tone Trainer's renderProfileList)
     Reuses the same .tone-profile-* / .tone-add-profile markup + CSS so it
     looks identical. Add/Recalibrate delegate to the Tone Trainer's modal via
     window.openToneCalibration, passing a callback that re-renders THIS list.
     ---------------------------------------------------------------------- */
  function renderProfileList() {
    var list = $('tc-profile-list');
    if (!list) return;
    list.innerHTML = '';
    var profiles = getProfiles();

    // Default selection: keep current if still valid, else last-used, else first.
    if (!selectedProfileId || !profiles.some(function (p) { return p.id === selectedProfileId; })) {
      var st = window.state;
      var last = st && st.toneLastProfileId;
      selectedProfileId = (last && profiles.some(function (p) { return p.id === last; }))
        ? last
        : (profiles[0] ? profiles[0].id : null);
    }

    profiles.forEach(function (p) {
      var chip = document.createElement('div');
      chip.className = 'tone-profile-chip' + (p.id === selectedProfileId ? ' selected' : '');

      var avatar = document.createElement('div');
      avatar.className = 'tone-chip-avatar';
      avatar.textContent = (p.name && p.name.charAt(0)) || '?';

      var body = document.createElement('button');
      body.type = 'button';
      body.className = 'tone-chip-body';
      body.style.cssText = 'background:none;border:none;text-align:left;cursor:pointer;color:inherit;';
      body.innerHTML = '<div class="tone-chip-name"></div>' +
                       '<div class="tone-chip-meta">~' + Math.round(p.centerHz) + ' Hz centre</div>';
      body.querySelector('.tone-chip-name').textContent = p.name;
      body.addEventListener('click', function () { selectedProfileId = p.id; renderProfileList(); });

      var recal = document.createElement('button');
      recal.type = 'button';
      recal.className = 'tone-chip-recal';
      recal.textContent = 'Recalibrate';
      recal.addEventListener('click', function (e) { e.stopPropagation(); openCalibration(p.id); });

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'tone-chip-delete';
      del.setAttribute('aria-label', 'Delete profile');
      del.textContent = '\u00D7';
      del.addEventListener('click', function (e) { e.stopPropagation(); deleteProfile(p.id); });

      chip.appendChild(avatar);
      chip.appendChild(body);
      chip.appendChild(recal);
      chip.appendChild(del);
      chip.addEventListener('click', function () { selectedProfileId = p.id; renderProfileList(); });

      list.appendChild(chip);
    });

    if (profiles.length < MAX_PROFILES) {
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'tone-add-profile';
      add.innerHTML = '<span>\uFF0B</span> Add profile';
      add.addEventListener('click', function () { openCalibration(null); });
      list.appendChild(add);
    } else {
      var note = document.createElement('div');
      note.className = 'tone-chip-meta';
      note.style.textAlign = 'center';
      note.textContent = 'Maximum of ' + MAX_PROFILES + ' profiles. Delete one to add another.';
      list.appendChild(note);
    }

    refreshStart();
  }

  // Delegate add/recalibrate to the Tone Trainer's shared calibration modal.
  // When it closes, re-render our list (and re-resolve selection to any new id).
  function openCalibration(recalId) {
    if (typeof window.openToneCalibration !== 'function') {
      // Trainer module didn't load — can't calibrate. Leave a hint in the list.
      var list = $('tc-profile-list');
      if (list) {
        var n = document.createElement('div');
        n.className = 'tone-chip-meta';
        n.style.textAlign = 'center';
        n.textContent = 'Calibration is unavailable right now.';
        list.appendChild(n);
      }
      return;
    }
    window.openToneCalibration(recalId, function () {
      // A new profile may have been saved; prefer selecting the most recent.
      var st = window.state;
      if (st && st.toneLastProfileId &&
          getProfiles().some(function (p) { return p.id === st.toneLastProfileId; })) {
        selectedProfileId = st.toneLastProfileId;
      }
      renderProfileList();
    });
  }

  function deleteProfile(id) {
    var st = window.state;
    if (!st) return;
    st.toneProfiles = getProfiles().filter(function (p) { return p.id !== id; });
    if (st.toneLastProfileId === id) st.toneLastProfileId = null;
    if (selectedProfileId === id) selectedProfileId = null;
    persist();
    renderProfileList();
  }

  /* ----------------------------------------------------------------------
     WORD-COUNT SELECTOR  (10 / 15 / 20, styled like the level-grid)
     ---------------------------------------------------------------------- */
  function renderCountGrid() {
    var root = $('tc-count-grid');
    if (!root) return;
    root.innerHTML = '';
    TC_COUNTS.forEach(function (n) {
      var btn = document.createElement('button');
      btn.className = 'level-btn';
      if (state.tcWordCount === n) btn.classList.add('selected');
      btn.innerHTML =
        '<div class="level-name">' + n + '</div>' +
        '<div class="level-meta"><div class="level-grid-info">words</div></div>';
      btn.addEventListener('click', function () {
        state.tcWordCount = n;
        persist();
        renderCountGrid();
      });
      root.appendChild(btn);
    });
  }

  /* ----------------------------------------------------------------------
     START BUTTON STATE
     ---------------------------------------------------------------------- */
  function refreshStart() {
    var btn = $('tc-start-btn');
    var msg = $('tc-start-msg');
    if (!btn || !msg) return;
    var profiles = getProfiles();
    if (profiles.length === 0) {
      btn.disabled = true;
      msg.textContent = 'Add a voice profile to begin.';
    } else if (!selectedProfileId) {
      btn.disabled = true;
      msg.textContent = 'Select a profile to start.';
    } else {
      btn.disabled = false;
      msg.textContent = '';
    }
  }

  /* ----------------------------------------------------------------------
     MENU WIRING (once)
     ---------------------------------------------------------------------- */
  function wireOnce() {
    if (built) return;
    built = true;

    var start = $('tc-start-btn');
    if (start) {
      start.addEventListener('click', function () {
        if (start.disabled) return;
        startChallenge();
      });
    }

    // Mic button drives per-word capture.
    var mic = $('tc-mic-btn');
    if (mic) mic.addEventListener('click', onMicTap);

    // The in-game "Voice: …" box is now informational only (the profile is fixed
    // for the duration of a run), so it is no longer clickable.

    // How-to accordion(s) in the setup screen. The trainer's wireHowtoAccordion
    // only covers #view-tone, so we wire our own here. The section defaults OPEN
    // until the learner has STARTED a challenge once (state.tcStarted), then
    // defaults CLOSED — applied on every entry by applyHowtoDefaults(). Tapping
    // the header toggles it for the current visit (not persisted).
    var view = $('view-tone-challenge');
    if (view) {
      view.querySelectorAll('.tone-howto-section').forEach(function (section) {
        var header = section.querySelector('.howto-header');
        if (header && !header._tcWired) {
          header._tcWired = true;
          header.addEventListener('click', function () {
            section.classList.toggle('open');
          });
        }
      });
    }

    // Tap-to-hear any Thai text in the view (e.g. the prompted word later).
    if (view && typeof window.wireThaiTapToSpeak === 'function') {
      window.wireThaiTapToSpeak(view, '.th');
    }
  }

  // (Re)apply the how-to accordion default: OPEN until the learner has started a
  // challenge once, CLOSED thereafter. Called on every entry to the view.
  function applyHowtoDefaults() {
    var view = $('view-tone-challenge');
    if (!view) return;
    var open = !(window.state && window.state.tcStarted);
    view.querySelectorAll('.tone-howto-section').forEach(function (section) {
      section.classList.toggle('open', open);
    });
  }

  /* ======================================================================
     WORD LIST  (bundled here, in the same vocab format as the data files)
     ----------------------------------------------------------------------
     Each word carries an explicit `tone` (mid/low/falling/high/rising) — the
     target the learner must produce. `cat` and `lesson` mirror the vocab/
     sentence schema so a future "choose lessons" pool filter drops in easily.
     "Extra" words carry pack:'extra' (lessonless), matching the app convention.
     ====================================================================== */
  var TC_WORDS = [
    // --- Mid ---
    { en: 'come',                th: 'มา',   rom: 'maa',   tone: 'mid', cat: 'Verbs',      lesson: 4 },
    { en: 'to go',               th: 'ไป',   rom: 'bpai',  tone: 'mid', cat: 'Verbs',      lesson: 5 },
    { en: 'to eat',              th: 'กิน',  rom: 'gin',   tone: 'mid', cat: 'Verbs',      lesson: 5 },
    { en: 'to listen',           th: 'ฟัง',  rom: 'fang',  tone: 'mid', cat: 'Verbs',      lesson: 6 },
    { en: 'to be scared',        th: 'กลัว', rom: 'glua',  tone: 'mid', cat: 'Verbs',      lesson: 7 },
    { en: 'year',                th: 'ปี',   rom: 'bpee',  tone: 'mid', cat: 'Nouns',      lesson: 4 },
    { en: 'milk',                th: 'นม',   rom: 'nom',   tone: 'mid', cat: 'Nouns',      lesson: 5 },
    { en: 'fish',                th: 'ปลา',  rom: 'bplaa', tone: 'mid', cat: 'Animals',    lesson: 7 },
    { en: 'teacher',             th: 'ครู',  rom: 'kroo',  tone: 'mid', cat: 'People',     lesson: 8 },
    { en: 'good',                th: 'ดี',   rom: 'dee',   tone: 'mid', cat: 'Adjectives', lesson: 9 },
    { en: 'expensive',           th: 'แพง',  rom: 'paeng',   tone: 'mid', cat: 'Adjectives', lesson: 9 },
	{ en: 'fast',                th: 'เร็ว', rom: 'reo',   tone: 'mid', cat: 'Adjectives', lesson: 11 },
    { en: '1) eye 2) maternal grandfather',                 th: 'ตา',   rom: 'dtaa',  tone: 'mid', cat: 'Body',       pack: 'extra' },
    { en: 'red',                 th: 'แดง',  rom: 'daeng', tone: 'mid', cat: 'Adjectives', pack: 'extra' },
    { en: 'tea',                 th: 'ชา',   rom: 'chaa',  tone: 'mid', cat: 'Food',       pack: 'extra' },
    // --- Low ---
    { en: 'chicken',             th: 'ไก่',  rom: 'gài',   tone: 'low', cat: 'Nouns',      lesson: 5 },
    { en: 'vegetable',           th: 'ผัก',  rom: 'pàk',   tone: 'low', cat: 'Nouns',      lesson: 7 },
	{ en: 'spicy',               th: 'เผ็ด', rom: 'pèt',   tone: 'low', cat: 'Adjectives', lesson: 9 },
    { en: 'cheap',               th: 'ถูก',  rom: 'tòok',  tone: 'low', cat: 'Adjectives', lesson: 9 },
    { en: 'to be at (location)', th: 'อยู่', rom: 'yòo',   tone: 'low', cat: 'Verbs',      lesson: 8 },
    { en: 'to be tired',         th: 'เหนื่อย', rom: 'nèuay', tone: 'low', cat: 'Verbs',   lesson: 7 },
    { en: 'to be angry',         th: 'โกรธ', rom: 'gròht', tone: 'low', cat: 'Verbs',      lesson: 7 },
    { en: 'to want',             th: 'อยาก', rom: 'yàak',  tone: 'low', cat: 'Verbs',      lesson: 15 },
    { en: 'to drink',            th: 'ดื่ม', rom: 'dèum',  tone: 'low', cat: 'Verbs',      lesson: 5 },
	{ en: 'one (1)',             th: 'หนึ่ง', rom: 'nèung', tone: 'low', cat: 'Numbers',   lesson: 3 },
    { en: 'four (4)',            th: 'สี่',  rom: 'sèe',   tone: 'low', cat: 'Numbers',    lesson: 3 },
    { en: 'egg',                 th: 'ไข่',  rom: 'kài',   tone: 'low', cat: 'Nouns',      pack: 'extra' },
    { en: 'old',                 th: 'เก่า', rom: 'gào',   tone: 'low', cat: 'Adjectives', pack: 'extra' },
    { en: 'turtle',              th: 'เต่า', rom: 'dtào',  tone: 'low', cat: 'Animals',    pack: 'extra' },
    { en: 'to be bored',         th: 'เบื่อ', rom: 'bèua', tone: 'low', cat: 'Verbs',      pack: 'extra' },
    // --- Falling ---
    { en: 'can',                 th: 'ได้',  rom: 'dâai',  tone: 'falling', cat: 'Verbs',      lesson: 10 },
    { en: 'home; house',         th: 'บ้าน', rom: 'bâan',  tone: 'falling', cat: 'Nouns',      lesson: 8 },
    { en: 'name',                th: 'ชื่อ', rom: 'chûu',  tone: 'falling', cat: 'Nouns',      lesson: 1 },
	{ en: 'rice; meal',          th: 'ข้าว', rom: 'kâao',  tone: 'falling', cat: 'Nouns',      lesson: 13 },
    { en: 'mother',              th: 'แม่',  rom: 'mâe',   tone: 'falling', cat: 'People',     lesson: 11 },
    { en: 'father',              th: 'พ่อ',  rom: 'pôr',   tone: 'falling', cat: 'People',     lesson: 11 },
    { en: 'older sibling',       th: 'พี่',  rom: 'pêe',   tone: 'falling', cat: 'People',     lesson: 11 },
    { en: 'to like',             th: 'ชอบ',  rom: 'chôop', tone: 'falling', cat: 'Verbs',      lesson: 5 },
    { en: 'to play',             th: 'เล่น', rom: 'lên',   tone: 'falling', cat: 'Verbs',      lesson: 6 },
    { en: 'difficult',           th: 'ยาก',  rom: 'yâak',  tone: 'falling', cat: 'Adjectives', lesson: 9 },
    { en: 'easy',                th: 'ง่าย', rom: 'ngâai', tone: 'falling', cat: 'Adjectives', lesson: 9 },
    { en: 'very',                th: 'มาก',  rom: 'mâak',  tone: 'falling', cat: 'Adverbs',    lesson: 9 },
    { en: 'five',                th: 'ห้า',  rom: 'hâa',   tone: 'falling', cat: 'Numbers',    lesson: 3 },
    { en: 'banana',              th: 'กล้วย', rom: 'glûay', tone: 'falling', cat: 'Food',      pack: 'extra' },
    { en: 'orange',              th: 'ส้ม',  rom: 'sôm',   tone: 'falling', cat: 'Food',       pack: 'extra' },
    // --- High ---
    { en: 'horse',               th: 'ม้า',  rom: 'máa',   tone: 'high', cat: 'Animals',    lesson: 4 },
    { en: 'water',               th: 'น้ำ',  rom: 'náam',  tone: 'high', cat: 'Nouns',      lesson: 5 },
    { en: 'beef',                th: 'เนื้อ',  rom: 'néua',  tone: 'high', cat: 'Nouns',      lesson: 7 },
	{ en: 'hundred (100)',       th: 'ร้อย',  rom: 'rói',  tone: 'high', cat: 'Nouns',      lesson: 3 },
	{ en: 'small',               th: 'เล็ก', rom: 'lék',   tone: 'high', cat: 'Adjectives', lesson: 12 },
    { en: 'slow',                th: 'ช้า', rom: 'cháa',   tone: 'high', cat: 'Adjectives', lesson: 11 },
	{ en: 'younger sibling',     th: 'น้อง', rom: 'nóng',  tone: 'high', cat: 'People',     lesson: 16 },
    { en: 'to love',             th: 'รัก',  rom: 'rák',   tone: 'high', cat: 'Verbs',      lesson: 7 },
    { en: 'to be allergic to',   th: 'แพ้',  rom: 'páe',   tone: 'high', cat: 'Verbs',      lesson: 13 },
	{ en: 'to know',             th: 'รู้',  rom: 'róo',   tone: 'high', cat: 'Verbs',      lesson: 7 },
    { en: 'to buy',              th: 'ซื้อ', rom: 'séu',   tone: 'high', cat: 'Verbs',      lesson: 5 },
    { en: 'car; vehicle',        th: 'รถ',   rom: 'rót',   tone: 'high', cat: 'Nouns',      lesson: 8 },
    { en: 'temple',              th: 'วัด',  rom: 'wát',   tone: 'high', cat: 'Places',     lesson: 10 },
    { en: 'morning',             th: 'เช้า', rom: 'cháo',  tone: 'high', cat: 'Time',       lesson: 15 },
    { en: 'chilli',              th: 'พริก', rom: 'prík',  tone: 'high', cat: 'Food',       pack: 'extra' },
    // --- Rising ---
    { en: 'dog',                 th: 'หมา',  rom: 'măa',   tone: 'rising', cat: 'Animals',    lesson: 4 },
    { en: 'where; which',        th: 'ไหน',  rom: 'năi',   tone: 'rising', cat: 'Function',   lesson: 2 },
    { en: 'or',                  th: 'หรือ',  rom: 'rĕu',   tone: 'rising', cat: 'Function',   lesson: 8 },
	{ en: 'to ask',              th: 'ถาม',  rom: 'tăam',  tone: 'rising', cat: 'Verbs',      lesson: 12 },
    { en: 'beautiful',           th: 'สวย',  rom: 'sŭay',  tone: 'rising', cat: 'Adjectives', lesson: 9 },
    { en: 'cold',                th: 'หนาว',  rom: 'năao',  tone: 'rising', cat: 'Adjectives', lesson: 9 },
	{ en: 'to look for',         th: 'หา',   rom: 'hăa',   tone: 'rising', cat: 'Verbs',      lesson: 15 },
    { en: 'I (male)',            th: 'ผม',   rom: 'pŏm',   tone: 'rising', cat: 'Pronouns',   lesson: 1 },
    { en: 'doctor',              th: 'หมอ',  rom: 'mŏr',   tone: 'rising', cat: 'People',     lesson: 8 },
    { en: 'pork',                th: 'หมู',  rom: 'mŏo',   tone: 'rising', cat: 'Food',       lesson: 7 },
    { en: 'sweet',               th: 'หวาน', rom: 'wăan',  tone: 'rising', cat: 'Adjectives', lesson: 8 },
    { en: 'to sell',             th: 'ขาย',  rom: 'kăai',  tone: 'rising', cat: 'Verbs',      lesson: 8 },
    { en: 'three (3)',           th: 'สาม',  rom: 'săam',  tone: 'rising', cat: 'Numbers',    lesson: 3 },
    { en: 'green',               th: 'เขียว',  rom: 'kĭeow',   tone: 'rising', cat: 'Adjectives', pack: 'extra' },
	{ en: 'hungry',              th: 'หิว',  rom: 'hĭw',   tone: 'rising', cat: 'Adjectives', pack: 'extra' }
  ];

  // Human-readable tone label + Thai class name, mirroring the Tone Trainer.
  var TONE_LABEL = {
    mid:     { en: 'Mid',     th: '\u0E2A\u0E32\u0E21\u0E31\u0E0D' },  // สามัญ
    low:     { en: 'Low',     th: '\u0E40\u0E2D\u0E01' },             // เอก
    falling: { en: 'Falling', th: '\u0E42\u0E17' },                   // โท
    high:    { en: 'High',    th: '\u0E15\u0E23\u0E35' },             // ตรี
    rising:  { en: 'Rising',  th: '\u0E08\u0E31\u0E15\u0E27\u0E32' }  // จัตวา
  };

  /* ----------------------------------------------------------------------
     SCORING TIERS  (points are INTERNAL — the player only ever sees %).
     Per-word percentage -> tier + points. Final score% is points / max%.
     ---------------------------------------------------------------------- */
  var TIERS = [
    { min: 90, label: 'Perfect', cls: 'tc-tier-perfect', points: 5 },
    { min: 75, label: 'Great',   cls: 'tc-tier-great',   points: 4 },
    { min: 60, label: 'Good',    cls: 'tc-tier-good',    points: 3 },
    { min: 40, label: 'Close',   cls: 'tc-tier-close',   points: 2 },
    { min: 0,  label: 'Off',     cls: 'tc-tier-off',     points: 1 }
  ];
  var MAX_POINTS_PER_WORD = 5;

  // Final-rating bands from the overall score%. `level` (1..5) maps to the
  // rating illustration rate{level}.png (1 = lowest … 5 = excellent).
  function finalRating(pct) {
    if (pct >= 90) return { label: 'Excellent', emoji: '\uD83C\uDFC6', level: 5 };   // 🏆
    if (pct >= 75) return { label: 'Great job', emoji: '\u2B50', level: 4 };         // ⭐
    if (pct >= 60) return { label: 'Good',      emoji: '\uD83D\uDC4D', level: 3 };   // 👍
    if (pct >= 40) return { label: 'Keep practicing', emoji: '\uD83D\uDCAA', level: 2 }; // 💪
    return { label: 'Needs work', emoji: '\uD83C\uDF31', level: 1 };                 // 🌱
  }
  function tierFor(pct) {
    for (var i = 0; i < TIERS.length; i++) { if (pct >= TIERS[i].min) return TIERS[i]; }
    return TIERS[TIERS.length - 1];
  }
  // Pass threshold: average "Good" (3 pts) across the run.
  function passThreshold(wordCount) { return 3 * wordCount; }

  /* ======================================================================
     MIC / PITCH PIPELINE
     ----------------------------------------------------------------------
     Tone Challenge owns its OWN thin capture loop + canvas draw (the
     mechanical plumbing), but delegates every accuracy-critical step to the
     shared window.toneDsp toolkit the Tone Trainer exposes, so the two modes
     use the identical acoustic model. Audio never leaves the AnalyserNode.
     ====================================================================== */
  function dsp() { return window.toneDsp || null; }
  function cfg(k, fallback) {
    var d = dsp();
    return (d && d.config && typeof d.config[k] === 'number') ? d.config[k] : fallback;
  }

  // Audio runtime. The mic loop, VAD and pitch reader used to be DUPLICATED here
  // (a near-copy of the trainer's, which meant a capture fix could land in one
  // mode and silently not the other — and the two had already drifted: this file
  // defaulted CLARITY_MIN to 0.8 where the trainer actually used 0.72). The
  // Challenge now drives the SAME shared engine the Tone Trainer does, via
  // window.toneDsp.createCapture(). Only the canvas and game logic live here.
  var capture = null;
  var running = false, starting = false, frozen = false;
  var points = [], trimmedPoints = null, captureCentre = 0;
  // canvas
  var elCanvas = null, elCtx = null, dpr = 1;

  function getCapture() {
    if (!capture) {
      var d = dsp();
      if (!d || !d.createCapture) return null;
      capture = d.createCapture();
    }
    return capture;
  }

  function median(arr) {
    var d = dsp();
    if (d && d.median) return d.median(arr);
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function releaseMic() {
    try { if (capture) capture.release(); } catch (e) {}
    running = false;
  }

  /* ----- Canvas sizing + draw (mirrors the trainer's contour rendering) ----- */
  function sizeCanvas() {
    if (!elCanvas) return;
    var rect = elCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    var w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (elCanvas.width !== w || elCanvas.height !== h) { elCanvas.width = w; elCanvas.height = h; }
  }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  var drawSpan = 18;
  function spanFor(vals) {
    var SPAN = cfg('SEMITONE_SPAN', 18), PAD = 2.5, MAXS = 30;
    var hi = SPAN / 2, lo = -SPAN / 2;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] + PAD > hi) hi = vals[i] + PAD;
      if (vals[i] - PAD < lo) lo = vals[i] - PAD;
    }
    return Math.min(MAXS, 2 * Math.max(hi, -lo));
  }

  function semiToY(semi, h) {
    var half = drawSpan / 2;
    var clamped = Math.max(-half, Math.min(half, semi));
    return h / 2 - (clamped / half) * (h / 2 - h * 0.08);
  }
  function draw() {
    if (!elCtx || !elCanvas) return;
    var w = elCanvas.width, h = elCanvas.height;
    if (w === 0 || h === 0) return;
    elCtx.clearRect(0, 0, w, h);
    var ink = cssVar('--ink', '#2b2418');
    var accent = cssVar('--accent', '#b8893a');
    var border = cssVar('--card-face-border', '#d4b87a');

    var d = dsp();
    var refs = d && d.TONE_REFS;
    var s = state.tcSession;
    var targetTone = (s && s.current) ? s.current.tone : null;
    var ref = (refs && targetTone) ? refs[targetTone] : null;

    // Fit the vertical span to this contour (and the guide shape) before
    // plotting, so a big excursion is shown rather than clipped at the frame.
    (function () {
      var src0 = (frozen && trimmedPoints && trimmedPoints.length >= 2) ? trimmedPoints : points;
      var rr = src0.filter(function (p) { return !p.gap; });
      var pc = (s && s.profile && s.profile.centerHz > 0) ? s.profile.centerHz : 0;
      var c = (frozen && captureCentre > 0) ? captureCentre : (pc || (rr.length ? median(rr.map(function (p) { return p.hz; })) : 0));
      var vals = [];
      if (c > 0) for (var k = 0; k < rr.length; k++) vals.push(12 * Math.log2(rr[k].hz / c));
      if (ref && ref.shape) for (var m2 = 0; m2 < ref.shape.length; m2++) vals.push(ref.shape[m2]);
      drawSpan = spanFor(vals);
    })();

    var gutter = Math.round(38 * dpr), footer = Math.round(16 * dpr);
    var plotW = Math.max(10, w - gutter), plotH = Math.max(10, h - footer);
    var fs = Math.round(11 * dpr);

    // High / low bands.
    elCtx.globalAlpha = 0.07; elCtx.fillStyle = accent;
    elCtx.fillRect(gutter, 0, plotW, semiToY(3.0, plotH));
    elCtx.fillRect(gutter, semiToY(-3.0, plotH), plotW, plotH - semiToY(-3.0, plotH));
    elCtx.globalAlpha = 1;

    // Guide lines + centre line.
    elCtx.strokeStyle = border; elCtx.lineWidth = 1 * dpr;
    var lines = [[3.0, 0.30], [-3.0, 0.30], [0, 0.6]];
    for (var li = 0; li < lines.length; li++) {
      elCtx.globalAlpha = lines[li][1];
      if (lines[li][0] === 0) elCtx.setLineDash([]); else elCtx.setLineDash([3 * dpr, 5 * dpr]);
      var ly = semiToY(lines[li][0], plotH);
      elCtx.beginPath(); elCtx.moveTo(gutter, ly); elCtx.lineTo(w, ly); elCtx.stroke();
    }
    elCtx.setLineDash([]); elCtx.globalAlpha = 1;

    // Axis labels.
    elCtx.fillStyle = cssVar('--ink-soft', '#6b5d44');
    elCtx.font = '600 ' + fs + 'px system-ui, -apple-system, sans-serif';
    elCtx.textAlign = 'left'; elCtx.textBaseline = 'middle'; elCtx.globalAlpha = 0.85;
    elCtx.fillText('High', 2 * dpr, semiToY(5.5, plotH));
    elCtx.fillText('Mid', 2 * dpr, semiToY(0, plotH));
    elCtx.fillText('Low', 2 * dpr, semiToY(-5.5, plotH));
    elCtx.save();
    elCtx.translate(fs * 0.9, plotH / 2); elCtx.rotate(-Math.PI / 2);
    elCtx.textAlign = 'center'; elCtx.globalAlpha = 0.45;
    elCtx.fillText('Pitch', 0, -fs * 1.7);
    elCtx.restore();
    elCtx.textAlign = 'center'; elCtx.textBaseline = 'bottom'; elCtx.globalAlpha = 0.45;
    elCtx.fillText('Time \u2192', gutter + plotW / 2, h - 1 * dpr);
    elCtx.globalAlpha = 1;
    if (ref && ref.shape) {
      elCtx.strokeStyle = accent; elCtx.globalAlpha = 0.32; elCtx.lineWidth = 6 * dpr;
      elCtx.lineCap = 'round'; elCtx.lineJoin = 'round'; elCtx.setLineDash([2 * dpr, 6 * dpr]);
      elCtx.beginPath();
      var n = ref.shape.length;
      for (var i = 0; i < n; i++) {
        var x = gutter + (i / (n - 1)) * plotW, y = semiToY(ref.shape[i], plotH);
        if (i === 0) elCtx.moveTo(x, y); else elCtx.lineTo(x, y);
      }
      elCtx.stroke(); elCtx.setLineDash([]); elCtx.globalAlpha = 1;
    }

    // User contour.
    var source = (frozen && trimmedPoints && trimmedPoints.length >= 2) ? trimmedPoints : points;
    var real = source.filter(function (p) { return !p.gap; });
    if (real.length >= 2) {
      var profileCentre = (s && s.profile && s.profile.centerHz > 0) ? s.profile.centerHz : 0;
      var centre = (frozen && captureCentre > 0) ? captureCentre
        : (profileCentre || median(real.map(function (p) { return p.hz; })) || real[real.length - 1].hz);
      var tEnd = real[real.length - 1].t, tStart = real[0].t;
      var span = Math.max(1, tEnd - tStart);
      elCtx.strokeStyle = ink; elCtx.lineWidth = 3.5 * dpr;
      elCtx.lineCap = 'round'; elCtx.lineJoin = 'round';
      elCtx.beginPath();
      var penDown = false;
      for (var j = 0; j < source.length; j++) {
        var p = source[j];
        if (p.gap) { penDown = false; continue; }
        var semi = 12 * Math.log2(p.hz / centre);
        var xx = gutter + ((p.t - tStart) / span) * plotW, yy = semiToY(semi, plotH);
        if (!penDown) { elCtx.moveTo(xx, yy); penDown = true; } else elCtx.lineTo(xx, yy);
      }
      elCtx.stroke();
    }
  }

  function setStatus(text, cls) {
    var el = $('tc-status');
    if (el) { el.textContent = text; el.className = 'tone-status' + (cls ? ' ' + cls : ''); }
  }
  function showHint(show) {
    var el = $('tc-canvas-hint');
    if (el) el.classList.toggle('hidden-hint', !show);
  }
  function setMicLabel(text, recording) {
    var btn = $('tc-mic-btn');
    if (!btn) return;
    btn.classList.toggle('recording', !!recording);
    var lbl = btn.querySelector('.tone-mic-label');
    if (lbl) lbl.textContent = text;
  }

  // Visually grey out + disable the mic button while input is locked (between a
  // scored attempt and the next word reveal). The tap is already ignored logically
  // via s.locked; this just makes the frozen state obvious so nobody taps a dead
  // button. Cleared in loadWord() when the next word appears.
  function setMicBusy(busy) {
    var btn = $('tc-mic-btn');
    if (!btn) return;
    btn.classList.toggle('busy', !!busy);
    btn.setAttribute('aria-disabled', busy ? 'true' : 'false');
  }

  /* ----- Per-attempt capture lifecycle ----- */
  function onMicTap() {
    var s = state.tcSession;
    if (!s || s.over || s.locked) return;       // ignore taps during the scoring pause
    if (starting) return;                       // mic acquisition already in flight
    if (running) { stopCapture(); return; }
    startCapture();
  }

  async function startCapture() {
    var s = state.tcSession;
    var cap = getCapture();
    if (!cap) { setStatus('Tone engine unavailable \u2014 please reload.', 'error'); return; }
    points = []; frozen = false; trimmedPoints = null; captureCentre = 0;
    starting = true;
    try {
      sizeCanvas();
      showHint(false);
      setMicLabel('Tap to stop', true);
      setStatus('Listening\u2026', 'recording');
      await cap.start({
        // The profile centre lets the tracker resolve octave errors from the
        // very first frame of the word.
        centreHint: (s && s.profile && s.profile.centerHz > 0) ? s.profile.centerHz : 0,
        // One word per capture: use the engine's single-word search band.
        wordMode: true,
        onFrame: onLiveFrame,
        onEnd: onCaptureEnd
      });
      running = true;
    } catch (err) {
      running = false;
      setMicLabel('Tap to speak', false);
      var msg = 'Could not access the microphone.';
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        msg = 'Microphone permission was blocked. Enable it in your browser settings.';
      } else if (err && err.name === 'NotFoundError') {
        msg = 'No microphone was found on this device.';
      }
      setStatus(msg, 'error');
      showHint(true);
      releaseMic();
    } finally {
      starting = false;
    }
  }

  function onLiveFrame(info) {
    points = info.livePoints;
    setStatus(info.inSpeech ? 'Listening\u2026 (speaking)' : 'Listening\u2026', 'recording');
    draw();
  }

  function stopCapture() {
    if (!running) return;
    var cap = getCapture();
    if (cap) cap.stop('manual');
  }

  // The capture finished. Segmentation, smoothing and de-spiking all happen
  // offline in the shared extractContour(), with the whole recording available.
  function onCaptureEnd(result) {
    running = false;
    setMicLabel('Tap to speak', false);

    var s = state.tcSession;
    if (!s || s.over) return;

    var d = dsp();
    // Pass the calibrated centre — without it the octave resolver anchors on the
    // contour's own median, which for a falling or rising tone sits in the middle
    // of the excursion and pushes the genuine peak/trough into the wrong octave.
    var centreHint = (s.profile && s.profile.centerHz > 0) ? s.profile.centerHz : 0;
    var core = (d && d.extractContour) ? d.extractContour(result.frames, result.thresholdRms, centreHint) : null;
    if (core && core.length >= cfg('MIN_CORE_POINTS', 4)) {
      trimmedPoints = core;
      points = core;
      captureCentre = (s.profile && s.profile.centerHz > 0)
        ? s.profile.centerHz : median(core.map(function (p) { return p.hz; }));
      frozen = true;
      draw();
      scoreAttempt(core, captureCentre);
    } else {
      // Not enough clear speech \u2014 let them try this word again (no score).
      setStatus('Didn\u2019t catch clear speech. Tap and try again, a little louder.', '');
      showHint(true);
      draw();
    }
  }

  /* ----------------------------------------------------------------------
     AIDED CENTRE SWEEP (calibration-drift tolerance)
     ----------------------------------------------------------------------
     The level tones (mid / low / high) are judged by the contour's HEIGHT
     relative to the calibrated centre pitch. So if a profile's centre is a
     little off — or the speaker is just a touch louder/quieter than at
     calibration — a perfectly good level tone can read low. The contour
     tones (falling / rising) are judged by SHAPE (net slope, peak/trough),
     which is centre-independent, so they don't need this.

     Fix: for level-tone targets only, re-score the SAME contour against a
     few candidate centres a small distance above/below the real one, and
     keep the best. The candidate offsets are in SEMITONES (a ratio), so the
     tolerance is the same perceptual width for every voice — unlike a fixed
     Hz window, which would over-help low voices and under-help high ones.
     One semitone ≈ 7.7 Hz at 129 Hz, ≈ 13 Hz at 220 Hz.

     To stop this from silently inflating every score (giving each attempt 7
     chances and keeping the luckiest), we subtract a tiny penalty for HOW
     FAR we had to shift to reach the best score. An attempt that's already
     correct at the real centre keeps full marks; one that only looks good
     after maximum help gets a small, bounded haircut. Net effect: real
     calibration drift stops costing points, but a genuinely wrong tone can't
     climb a tier just by borrowing a shifted centre.
     ---------------------------------------------------------------------- */
  // Semitone offsets applied to the calibrated centre. 0 must be included so
  // an unshifted score is always a candidate (a correct attempt never loses).
  var TC_CENTRE_SWEEP_SEMIS = [0, -0.5, 0.5, -1.0, 1.0, -1.5, 1.5];
  // Max % subtracted, reached at the largest |offset| in the sweep above.
  // Small by design: ~2.7% per full semitone of help, so within real
  // calibration error (≈ ±0.7 st for this app's profiles) the cost is < 2%.
  var TC_CENTRE_SWEEP_MAX_PENALTY = 4;
  // Only these targets get the sweep; falling/rising are shape-judged.
  var TC_CENTRE_SWEEP_TONES = { mid: true, low: true, high: true };

  // Returns the same shape as dsp.scoreAttempt: { percent, tone, isTarget,
  // runnerUp, m }. Pure: no DOM, no state writes.
  //
  // ENGINE v2: the shared tone model now allows for calibration error itself
  // (it judges every word as if the centre could be off by about a semitone,
  // see TONE_MODEL.calSigma in tone-trainer.js), so the word is scored ONCE at
  // the real centre. The sweep below is kept only for an older engine. It had
  // a real cost: by taking the best of seven centres it let the wrong tone
  // through — measured on native speakers, a mid word scored 97% on a HIGH
  // target, and 6 of 60 wrong level tones passed.
  function scoreForTarget(d, core, centreHz, target) {
    if (!d || !d.scoreAttempt) return { percent: 0, tone: null, isTarget: false, runnerUp: null, m: null };
    if (d.scoreAttemptHandlesCalibration) return d.scoreAttempt(core, centreHz, target);

    // Contour tones, or a bad centre: original single-shot scoring, untouched.
    if (!TC_CENTRE_SWEEP_TONES[target] || !(centreHz > 0)) {
      return d.scoreAttempt(core, centreHz, target);
    }

    var maxSemi = 0;
    for (var k = 0; k < TC_CENTRE_SWEEP_SEMIS.length; k++) {
      var a = Math.abs(TC_CENTRE_SWEEP_SEMIS[k]);
      if (a > maxSemi) maxSemi = a;
    }

    var best = null, bestAdj = -1;
    for (var i = 0; i < TC_CENTRE_SWEEP_SEMIS.length; i++) {
      var semi = TC_CENTRE_SWEEP_SEMIS[i];
      var candCentre = centreHz * Math.pow(2, semi / 12); // semitones -> Hz
      var r = d.scoreAttempt(core, candCentre, target);
      if (!r || typeof r.percent !== 'number') continue;
      // Shift-distance penalty: 0 at the real centre, full penalty at maxSemi.
      var penalty = maxSemi > 0
        ? (Math.abs(semi) / maxSemi) * TC_CENTRE_SWEEP_MAX_PENALTY
        : 0;
      var adj = r.percent - penalty;
      if (best === null || adj > bestAdj) { best = r; bestAdj = adj; }
    }
    if (!best) return d.scoreAttempt(core, centreHz, target);

    // Report the penalized percent (bounded), but keep the winning candidate's
    // tone/diagnostics so feedback wording and debug stay consistent with it.
    var finalPct = Math.max(0, Math.min(100, bestAdj));
    return { percent: finalPct, tone: best.tone, isTarget: best.isTarget,
             runnerUp: best.runnerUp, m: best.m };
  }

  // Score the current word, show feedback, then advance after a short pause.
  function scoreAttempt(core, centreHz) {
    var s = state.tcSession;
    if (!s || s.over) return;
    var d = dsp();
    var target = s.current.tone;
    var res = scoreForTarget(d, core, centreHz, target);
    var pct = Math.max(0, Math.min(100, Math.round(res.percent)));
    var tier = tierFor(pct);

    // Record the result for this word.
    s.results.push({ word: s.current, percent: pct, tier: tier.label, points: tier.points });
    s.points += tier.points;

    // Feedback: tier name + this-word percentage (NO running points/score shown).
    var big = $('tc-detected');
    if (big) {
      big.textContent = tier.label + '  \u00B7  ' + pct + '%';
      big.className = 'tone-detected show ' + tier.cls;
    }
    setStatus(feedbackLine(pct, target, res), '');

    // Cosmetic feedback: glow both frames in the tier colour (no expand).
    var fbSuffix = tier.cls.replace('tc-tier-', ''); // perfect|great|good|close|off
    tcPaintFeedback(fbSuffix);

    // Result sound — now covers ALL bands (the 40..74 middle uses the Draw sound,
    // previously silent). Each sound is delayed by (maxLead - ownLead) so their
    // audible onsets LAND together with the glow. playSound() sets each volume.
    var soundId, soundLead;
    if (pct >= 75)      { soundId = 'snd-bingo-correct'; soundLead = TC_FB_LEAD.correct; }
    else if (pct >= 40) { soundId = 'snd-draw';          soundLead = TC_FB_LEAD.draw; }
    else                { soundId = 'snd-sentence-fail'; soundLead = TC_FB_LEAD.fail; }
    if (typeof haptic === 'function') {
      if (pct >= 75) haptic(25); else if (pct >= 40) haptic(15); else haptic([20, 40]);
    }
    (function (id, delay) {
      var t = setTimeout(function () {
        if (typeof playSound === 'function') playSound(id);
      }, Math.max(0, delay));
      _tcFbTimers.push(t);
    })(soundId, TC_FB_MAXLEAD - soundLead);

    // Lock input during the read pause, then advance.
    s.locked = true;
    setMicBusy(true);
    s.advanceTimer = setTimeout(function () {
      s.advanceTimer = null;
      if (!state.tcSession || state.tcSession.over) return;
      s.index++;
      if (s.index >= s.queue.length) { endChallenge(); }
      else { loadWord(); }
    }, 2000);
  }

  function feedbackLine(pct, target, res) {
    var name = (TONE_LABEL[target] ? TONE_LABEL[target].en : target).toLowerCase();
    if (pct >= 90) return 'Spot-on ' + name + ' tone!';
    if (pct >= 75) return 'Nice ' + name + ' tone.';
    if (pct >= 60) return 'Good — close to the ' + name + ' tone.';
    if (pct >= 40) return 'Getting there. Aim for a clearer ' + name + ' shape.';
    return 'Not quite the ' + name + ' tone — try again next round.';
  }

  /* ----- Round setup / word rendering ----- */
  function loadWord() {
    var s = state.tcSession;
    if (!s) return;
    s.current = s.queue[s.index];
    s.locked = false;
    frozen = false; trimmedPoints = null; points = []; captureCentre = 0;
    setMicBusy(false);

    // Progress HUD (word X / Y) — no score shown.
    var cur = $('tc-cur'); if (cur) cur.textContent = String(s.index + 1);
    var tot = $('tc-tot'); if (tot) tot.textContent = String(s.queue.length);

    // Word display honours the global DISPLAY setting (both | thai | roman),
    // and ALWAYS shows the English meaning + the target tone name underneath.
    renderWord(s.current);

    // Clear feedback + reset graph/hint.
    var big = $('tc-detected'); if (big) { big.textContent = ''; big.className = 'tone-detected'; }
    tcResetFeedback();
    setStatus('Say the word above.', '');
    showHint(true);
    requestAnimationFrame(function () { sizeCanvas(); draw(); });
  }

  function renderWord(w) {
    var mode = state.displayMode; // 'both' | 'thai' | 'roman'
    var th = $('tc-word-th'), rom = $('tc-word-rom'), en = $('tc-word-en');
    var showTh = (mode === 'both' || mode === 'thai');
    var showRom = (mode === 'both' || mode === 'roman');
    if (!showTh && !showRom) showTh = true; // never show nothing
    if (th) th.textContent = showTh ? w.th : '';
    if (rom) rom.textContent = showRom ? w.rom : '';
    // English meaning only (clean, on its own line).
    if (en) en.textContent = w.en;
    // Target tone shown briefly in the card's top-right corner (Mid / Low /
    // Falling / High / Rising) — no Thai class name, no the word "tone".
    var corner = $('tc-word-tone-corner');
    if (corner) {
      var lbl = TONE_LABEL[w.tone];
      corner.textContent = lbl ? lbl.en : w.tone;
    }
  }

  /* ----- Start / end ----- */
  function startChallenge() {
    var profiles = getProfiles();
    var active = profiles.find(function (p) { return p.id === selectedProfileId; }) || null;
    if (!active) { refreshStart(); return; }

    var st = window.state;
    if (st) {
      st.toneLastProfileId = active.id;
      // First challenge started ever: flag it so future visits default the
      // how-to accordion to CLOSED. One-time, persisted.
      if (!st.tcStarted) st.tcStarted = true;
      persist();
    }

    var nameEl = $('tc-active-name');
    if (nameEl) nameEl.textContent = active.name;

    // Build a shuffled queue of N words (capped at the list size).
    var n = Math.min(state.tcWordCount, TC_WORDS.length);
    var queue = shuffle(TC_WORDS.slice()).slice(0, n);

    state.gameMode = 'tonechallenge';
    state.tcSession = {
      profile: active,
      queue: queue,
      index: 0,
      current: null,
      results: [],      // [{ word, percent, tier, points }]
      points: 0,
      locked: false,
      over: false,
      advanceTimer: null
    };

    // Resolve the canvas now that the view exists.
    elCanvas = $('tc-canvas');
    // Give the in-game surface more room on a wide screen. The stylesheet rule
    // itself is installed by the trainer module (shared); here we just tag the
    // play columns of the Challenge's game sub-screen.
    (function () {
      var game = document.querySelector('.tc-game');
      if (!game || !elCanvas) return;
      var wrap = elCanvas.closest ? elCanvas.closest('.menu-section') : null;
      while (wrap && wrap.classList) {
        wrap.classList.add('tone-play-wide');
        var nx = wrap.nextElementSibling;
        wrap = (nx && nx.classList && nx.classList.contains('menu-section')) ? nx : null;
      }
      // ...and the prompted word card above it, so the column reads as one block.
      var card = game.querySelector('.tc-word-card');
      var cw = card && card.closest ? card.closest('.menu-section') : null;
      if (cw) cw.classList.add('tone-play-wide');
    })();
    elCtx = elCanvas ? elCanvas.getContext('2d') : null;

    if (typeof playSound === 'function') playSound('snd-start');
    if (typeof haptic === 'function') haptic(25);

    setMode('game');
    // Start the in-game screen at the top (the view is its own scroll container;
    // otherwise it keeps the setup screen's scroll offset and appears mid-page).
    var gv = $('view-tone-challenge');
    if (gv) gv.scrollTop = 0;
    loadWord();
  }

  // Replay with the SAME profile + count (called by the shared "Play Again").
  window.replayToneChallenge = function () {
    // Re-resolve selection to the last-used profile, then start fresh.
    var st = window.state;
    if (st && st.toneLastProfileId) selectedProfileId = st.toneLastProfileId;
    startChallenge();
  };

  function endChallenge() {
    var s = state.tcSession;
    if (!s) return;
    s.over = true;
    if (s.advanceTimer) { clearTimeout(s.advanceTimer); s.advanceTimer = null; }
    if (running) { releaseMic(); }
    if (window.tts && window.tts.supported) { try { window.speechSynthesis.cancel(); } catch (e) {} }

    var wordCount = s.queue.length;
    var maxPoints = MAX_POINTS_PER_WORD * wordCount;
    var scorePct = maxPoints > 0 ? Math.round((s.points / maxPoints) * 100) : 0;
    var passed = s.points >= passThreshold(wordCount);
    var rating = finalRating(scorePct);

    // Tally tiers + collect the trouble words (Close / Off).
    var tierCounts = { Perfect: 0, Great: 0, Good: 0, Close: 0, Off: 0 };
    var trouble = [];
    s.results.forEach(function (r) {
      tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1;
      if (r.tier === 'Close' || r.tier === 'Off') trouble.push(r.word);
    });

    // Persist counters: every finished run counts (state.stats.tcFinished, with
    // the other *Finished counters); a PASS counts as a "win" (state.tcWins,
    // top-level like sentenceWins) and drives the landmarks.
    if (!state.stats) state.stats = {};
    if (!Number.isFinite(state.stats.tcFinished)) state.stats.tcFinished = 0;
    if (!Number.isFinite(state.tcWins)) state.tcWins = 0;
    state.stats.tcFinished += 1;

    var prevWins = state.tcWins;
    var unlockedBadge = null;
    if (passed) {
      var nextWins = prevWins + 1;
      state.tcWins = nextWins;
      if (typeof toneChallengeBadgeUnlockedBy === 'function') {
        unlockedBadge = toneChallengeBadgeUnlockedBy(prevWins, nextWins);
      }
    }
    persist();

    /* Log this run for the private statistics feed.

       WHY THE PER-TONE BREAKDOWN. A single final score says a run went badly
       but not WHY. Every TC_WORDS entry carries the tone it is testing, and
       s.results holds the percentage scored on each word, so the two together
       answer the question that actually matters: which of the five tones do
       learners lose points on? Aggregated across every run by every student,
       that distinguishes "rising is genuinely hard" from "the detector is
       mis-scoring rising", which a final score can never show.

       Sums and counts are sent rather than an average, so the Worker can pool
       runs of different lengths without weighting a 10-word run the same as a
       20-word one. Averaging here and again there would be wrong.

       Entirely best-effort: statsLogSession only writes to localStorage, is
       guarded internally, and is checked for existence first so this file stays
       loadable on its own. Nothing about the end of a run depends on it. */
    try {
      if (typeof statsLogSession === 'function') {
        var tones = {};
        s.results.forEach(function (r) {
          var t = r && r.word && r.word.tone;
          if (!t) return;
          if (!tones[t]) tones[t] = { n: 0, sum: 0 };
          tones[t].n += 1;
          tones[t].sum += (typeof r.percent === 'number' ? r.percent : 0);
        });
        statsLogSession({
          mode: 'tonechallenge',
          result: passed ? 'pass' : 'fail',
          scoreYou: scorePct,          // final score %
          scoreThem: null,             // no opponent in this mode
          detail: {
            words: wordCount,
            rating: (rating && rating.label) ? rating.label : '',
            tiers: tierCounts,
            tones: tones
          }
        });
      }
    } catch (e) {}

    // Sound + haptic. A pass that unlocked a NEW landmark uses the big win sound;
    // an ordinary pass uses the milder cue (mirrors the other modes).
    if (passed) {
      if (typeof playSound === 'function') playSound(unlockedBadge ? 'snd-win' : 'snd-win-2');
      if (typeof haptic === 'function') haptic(unlockedBadge ? 60 : 50);
    } else {
      if (typeof playSound === 'function') playSound('snd-lose');
      if (typeof haptic === 'function') haptic(50);
    }

    // Tone Master achievement: did this run finish at 95%+? Set the transient
    // flag (mirrors Memory Master's _memoryMasterWin) so the achievement check
    // inside showEndModal() can read it, then clear it right after. Not persisted.
    state._toneMasterWin = (scorePct >= 95);
    showEndModal(scorePct, passed, rating, tierCounts, trouble, wordCount, unlockedBadge);
    state._toneMasterWin = false;
  }

  // Drive the shared #win-modal shell (same approach as Sentence Builder).
  function showEndModal(scorePct, passed, rating, tierCounts, trouble, wordCount, unlockedBadge) {
    // The rating illustration + label + score read as ONE unit inside the
    // scrollable card (below), so the pinned header stays neutral and compact —
    // this keeps the modal short enough for narrow phones and short landscape.
    var title = $('win-title');
    var subtitle = $('win-subtitle');
    if (title) title.textContent = passed ? 'You passed!' : 'Not passed yet';
    if (typeof setEndThaiLine === 'function') setEndThaiLine('win-title-thai', passed ? 'passed' : 'notpassed');
    if (subtitle) { subtitle.textContent = ''; subtitle.classList.add('hidden'); }
    if (typeof setEndThaiLine === 'function') setEndThaiLine('win-subtitle-thai', null);

    // Hide CPU/memory-specific bits.
    hideEl('cpu-result-line'); hideEl('cpu-score-label'); hideEl('win-stats');
    hideEl('cpu-scoreboard'); hideEl('cpu-end-portrait'); hideEl('end-dialogue');
    var box = $('win-modal-box'); if (box) box.classList.remove('cpu-modal');

    // Build the whole result card in the record-badge slot (free-form container).
    var wrap = $('record-badge-wrap');
    if (wrap) {
      var lvl = (rating && rating.level) ? rating.level : 1;
      var ratingClass = 'tc-rate-' + lvl;

      // Hero: rating illustration + label + big score, as one centered unit.
      var heroHtml =
        '<div class="tc-end-hero ' + ratingClass + '">' +
          '<img class="tc-end-img" src="images/rate' + lvl + '.png" ' +
               'alt="' + escapeHtml(rating.label) + '" ' +
               'onerror="this.style.display=\'none\'">' +
          '<div class="tc-end-rating">' + escapeHtml(rating.label) + '</div>' +
          '<div class="tc-end-score">' + scorePct + '%</div>' +
          '<div class="tc-end-sub">' + (passed ? 'Passed' : 'Keep practicing') +
            ' \u00B7 ' + wordCount + ' words</div>' +
        '</div>';

      // Landmark-unlock banner (same markup/look as the other modes), shown below
      // the hero when this pass crossed a new landmark threshold.
      var bannerHtml = '';
      if (unlockedBadge) {
        var winsText = unlockedBadge.threshold === 1 ? '1 win' : (unlockedBadge.threshold + ' wins');
        bannerHtml =
          '<div class="record-badge tier-' + unlockedBadge.id + '">' +
            unlockedBadge.emoji + ' ' + winsText + ' \u2014 ' +
            escapeHtml(unlockedBadge.label) + ' landmark unlocked! ' + unlockedBadge.emoji +
          '</div>';
      }

      var order = [
        { key: 'Perfect', cls: 'tc-tier-perfect' },
        { key: 'Great',   cls: 'tc-tier-great' },
        { key: 'Good',    cls: 'tc-tier-good' },
        { key: 'Close',   cls: 'tc-tier-close' },
        { key: 'Off',     cls: 'tc-tier-off' }
      ];
      var rows = order.map(function (o) {
        var c = tierCounts[o.key] || 0;
        return '<div class="tc-tier-row ' + o.cls + '">' +
                 '<span class="tc-tier-name">' + o.key + '</span>' +
                 '<span class="tc-tier-count">' + c + '</span>' +
               '</div>';
      }).join('');

      var troubleHtml = '';
      if (trouble.length) {
        var items = trouble.map(function (w) {
          var bits = escapeHtml(w.th) + ' <span class="tc-rev-rom">' + escapeHtml(w.rom) + '</span>' +
                     ' <span class="tc-rev-en">' + escapeHtml(w.en) + '</span>';
          return '<li>' + bits + '</li>';
        }).join('');
        troubleHtml = '<div class="tc-review">' +
            '<div class="tc-review-title">Words to review</div>' +
            '<ul class="tc-review-list">' + items + '</ul>' +
          '</div>';
      } else {
        troubleHtml = '<div class="tc-review tc-review-clean">No trouble words — nicely done!</div>';
      }

      wrap.innerHTML =
        '<div class="tc-end">' +
          heroHtml +
          bannerHtml +
          '<div class="tc-tier-grid">' + rows + '</div>' +
          troubleHtml +
        '</div>';
    }

    // Current-rank line (like Solo / Sentence Builder): highest landmark + wins.
    // Reuses the shared #solo-end-rank element. Shown only once a landmark exists.
    var rankEl = $('solo-end-rank');
    if (rankEl) {
      var curBadge = (typeof getToneChallengeBadge === 'function')
        ? getToneChallengeBadge(state.tcWins || 0) : null;
      if (curBadge) {
        var w = state.tcWins || 0;
        rankEl.innerHTML = 'Current rank: <strong>' + escapeHtml(curBadge.label) + '</strong> \u00B7 ' +
                           w + ' win' + (w === 1 ? '' : 's');
        rankEl.classList.remove('hidden');
      } else {
        rankEl.classList.add('hidden');
      }
    }

    var modal = $('win-modal');
    if (modal) modal.classList.remove('hidden');

    if (typeof checkAchievements === 'function') { try { checkAchievements(true); } catch (e) {} }
  }

  function hideEl(id) { var el = $(id); if (el) el.classList.add('hidden'); }

  /* ----------------------------------------------------------------------
     ENTRY / TEARDOWN HOOKS
     ---------------------------------------------------------------------- */
  window.enterToneChallenge = function () {
    wireOnce();
    applyHowtoDefaults();         // re-apply open/closed default each entry
    // If a stale session lingers (shouldn't), clear it.
    if (state.tcSession && !state.tcSession.over) { /* leave; navigate teardown handles */ }
    selectedProfileId = null;     // re-resolve to last-used on each entry
    setMode('setup');             // always land on the profile picker
    renderProfileList();
    renderCountGrid();
  };

  window.teardownToneChallenge = function () {
    // Stop any live capture + release the mic; cancel the advance timer.
    releaseMic();
    setMicLabel('Tap to speak', false);
    var s = state.tcSession;
    if (s && s.advanceTimer) { clearTimeout(s.advanceTimer); s.advanceTimer = null; }
    tcClearFbTimers();
    state.tcSession = null;
    frozen = false; trimmedPoints = null; points = [];
    if (window.tts && window.tts.supported) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  };

  // Keep the contour crisp on rotation/resize while in the game.
  window.addEventListener('resize', function () {
    var view = $('view-tone-challenge');
    if (view && !view.classList.contains('hidden') && view.classList.contains('tc-mode-game')) {
      sizeCanvas(); draw();
    }
  });
})();
