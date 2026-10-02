/*
  © 2026 Naruemon Rintha. All rights reserved.

  ---------------------------------------------------------------------------
  ROMANIZER  ("Thai to English" menu)
  ---------------------------------------------------------------------------
  A self-contained tool that turns Thai script into the app's Paiboon+ style
  romanization. Runs fully offline against a bundled dictionary (ROM_DICT,
  defined in romanizer-dict.js, which MUST load before this file).

  Integration is deliberately minimal and mirrors the other separately-loaded
  engines (sentence-builder.js, tone-*.js):
    • index.html adds ONE menu button (data-goto="romanizer"), ONE empty
      <main id="view-romanizer">, one entry in VIEW_IDS, and one branch in
      navigate() that calls window.renderRomanizer().
    • Everything else — the click sound, the back-button/history handling — is
      provided by the existing app machinery (data-goto + showView/syncHistory),
      so this file adds none of that.

  It reuses the app's shared globals: tts (Thai TTS), and the app's CSS design
  tokens/classes for a look identical to the rest of the app.

  PHASE 1 scope: romanization output only. The per-word breakdown (Thai + rom +
  English meanings) is fully scaffolded here but hidden — see buildTokens(),
  which already returns { thai, rom, meanings }, and renderBreakdown(), which is
  ready to switch on once a meanings source (romanizer-meanings.js) is added.
  ---------------------------------------------------------------------------
*/

(function () {
  'use strict';

  // ---- Feature flag: the word-by-word English breakdown -------------------
  // Enabled in Phase 2: meanings come from ROM_MEANINGS (romanizer-meanings.js).
  var BREAKDOWN_ENABLED = true;

  // ---- User options (set from the checkboxes; read when "Go" is pressed) ---
  // Both default OFF so behavior is identical to before unless the user opts in.
  //   _optRomanizeNumbers: romanize standalone digit runs per-digit (8 -> bpàet).
  //     "555" always stays a dictionary hit (hahaha) regardless, since it's far
  //     more commonly the internet-slang laugh than a literal number.
  //   _optLineBreakPhrases: render a space BETWEEN two Thai phrases as a newline
  //     instead of " · ", so long multi-sentence pastes separate cleanly.
  var _optRomanizeNumbers = false;
  var _optLineBreakPhrases = false;
  //   _optLineKeepThai: like line-break phrases, but also prints the original
  //     Thai of each block on the line below its romanization, with a blank line
  //     between blocks (for building reading-practice materials). Mutually
  //     exclusive with _optLineBreakPhrases (the UI enforces this).
  var _optLineKeepThai = false;

  // Per-digit romanization for Arabic and Thai numerals (Paiboon+ style),
  // used only when _optRomanizeNumbers is on.
  var DIGIT_ROM = {
    '0': 'sŏon', '1': 'nèung', '2': 'sŏng', '3': 'săam', '4': 'sèe',
    '5': 'hâa', '6': 'hòk', '7': 'jèt', '8': 'bpàet', '9': 'gâo',
    '\u0E50': 'sŏon', '\u0E51': 'nèung', '\u0E52': 'sŏng', '\u0E53': 'săam',
    '\u0E54': 'sèe', '\u0E55': 'hâa', '\u0E56': 'hòk', '\u0E57': 'jèt',
    '\u0E58': 'bpàet', '\u0E59': 'gâo'
  };
  function isDigitStr(s) { return /^[0-9\u0E50-\u0E59]+$/.test(s); }
  // Romanize a pure-digit run per-digit, e.g. "80" -> "bpàet sŏon". Used for codes,
  // IDs, and the fractional part of decimals (read digit by digit after "jùt").
  function romanizeDigits(run) {
    var parts = [];
    for (var i = 0; i < run.length; i++) {
      parts.push(DIGIT_ROM[run[i]] || run[i]);
    }
    return parts.join(' ');
  }

  // ---- Thai cardinal number reader ---------------------------------------
  // Reads a number the way Thai actually says it (142 -> nèung-rói-sèe-sìp-sŏng,
  // "one hundred forty-two") instead of digit by digit. Uses the standard rules:
  // place words สิบ/ร้อย/พัน/หมื่น/แสน within each 6-digit group, ล้าน between groups;
  // ยี่สิบ for 20; the tens "1" is bare สิบ; a units "1" after any higher digit is เอ็ด.
  var NUM_UNIT = ['sŏon','nèung','sŏng','săam','sèe','hâa','hòk','jèt','bpàet','gâo'];
  var NUM_PLACE = ['', 'sìp', 'rói', 'pan', 'mèun', 'săen']; // 10^0..10^5
  // Convert any Thai numerals in a string to Arabic so the reader works on both.
  function toArabicDigits(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c >= '\u0E50' && c <= '\u0E59') out += String.fromCharCode(c.charCodeAt(0) - 0x0E50 + 48);
      else out += c;
    }
    return out;
  }
  // Read one group of up to 6 digits; returns an array of syllables (may be empty).
  function readNumGroup(numStr) {
    var s = numStr.replace(/^0+/, '');
    if (s === '') return [];
    var len = s.length, out = [];
    for (var idx = 0; idx < len; idx++) {
      var d = +s[idx], place = len - 1 - idx;
      if (d === 0) continue;
      if (place === 1) {                       // tens
        if (d === 1) out.push('sìp');
        else if (d === 2) out.push('yêe-sìp');
        else { out.push(NUM_UNIT[d]); out.push('sìp'); }
      } else if (place === 0) {                // units
        if (d === 1 && len >= 2) out.push('èt');
        else out.push(NUM_UNIT[d]);
      } else {                                 // hundreds..hundred-thousands
        out.push(NUM_UNIT[d]); out.push(NUM_PLACE[place]);
      }
    }
    return out;
  }
  // Read a pure integer digit string as a Thai cardinal (hyphen-joined syllables).
  function readCardinal(digits) {
    digits = digits.replace(/^0+/, '');
    if (digits === '') return 'sŏon';
    var groups = [], s = digits;
    while (s.length > 6) { groups.unshift(s.slice(-6)); s = s.slice(0, -6); }
    groups.unshift(s);
    var parts = [];
    for (var g = 0; g < groups.length; g++) {
      if (!/^0+$/.test(groups[g])) parts = parts.concat(readNumGroup(groups[g]));
      if (g < groups.length - 1) parts.push('láan');
    }
    return parts.join('-');
  }
  // Decide cardinal vs. digit-by-digit for an integer string: a leading zero (007) or
  // a very long run (> 7 digits, likely an ID/phone) reads digit by digit; else cardinal.
  function readIntSmart(digits) {
    if (digits === '') return '';
    if (digits.length > 1 && digits[0] === '0') return romanizeDigits(digits);
    if (digits.length > 7) return romanizeDigits(digits);
    return readCardinal(digits);
  }
  // Public entry: romanize a number run (Arabic or Thai numerals), handling a decimal
  // point (read integer as cardinal, then "jùt", then the fraction digit by digit) and
  // thousands-separator commas (stripped only when they form clean groups of three).
  function readThaiNumber(run) {
    var a = toArabicDigits(run);
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(a)) a = a.replace(/,/g, '');
    var dot = a.indexOf('.');
    if (dot >= 0) {
      var intPart = a.slice(0, dot).replace(/[^0-9]/g, '');
      var fracPart = a.slice(dot + 1).replace(/[^0-9]/g, '');
      var intR = (intPart === '' ? 'sŏon' : readIntSmart(intPart));
      return intR + ' jùt ' + romanizeDigits(fracPart);
    }
    return readIntSmart(a.replace(/[^0-9]/g, ''));
  }

  // ---- Dictionary access --------------------------------------------------
  // ROM_DICT: { "<thai word>": "<paiboon rom>" }, provided by romanizer-dict.js.
  // ROM_MEANINGS (optional, future): { "<thai word>": ["meaning 1", ...] }.
  function dict() { return (typeof ROM_DICT !== 'undefined') ? ROM_DICT : null; }
  function meaningsData() { return (typeof ROM_MEANINGS !== 'undefined') ? ROM_MEANINGS : null; }

  // Count of entries that actually have an English meaning (non-empty after the
  // @@note item is stripped). Used for the header's "Total: x words" line.
  var _meaningCount = -1;
  function countMeaningEntries() {
    if (_meaningCount >= 0) return _meaningCount;
    var m = meaningsData();
    var n = 0;
    if (m) {
      for (var k in m) {
        var real = realMeanings(m[k]);
        if (real && real.length) n++;
      }
    }
    _meaningCount = n;
    return n;
  }
  // Thousands-separated integer for display (e.g. 17591 -> "17,591").
  function formatCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Longest single-word key length, computed once, to bound the match window.
  var _maxKeyLen = 0;
  function maxKeyLen() {
    if (_maxKeyLen) return _maxKeyLen;
    var d = dict();
    if (!d) return 1;
    var m = 1;
    for (var k in d) { if (k.indexOf(' ') === -1 && k.length > m) m = k.length; }
    _maxKeyLen = m;
    return m;
  }

  // ---- Spaced (multi-word) dictionary keys --------------------------------
  // A small number of dictionary keys contain internal spaces — full names
  // (สมรักษ์ คำสิงห์), multi-word phrases (ยินดีด้วย คุณชนะแล้ว), and a few loan
  // phrases (เฟซบุ๊ก เมสเซนเจอร์). The pure-Thai tokenizer (buildTokens) already
  // matches these atomically once it RECEIVES the whole span (greedy slice includes
  // the space). The only reason they don't match in practice is that the mixed-input
  // layer (buildMixedTokens) breaks a Thai run at the first whitespace, so buildTokens
  // never sees the space. To fix that safely, buildMixedTokens extends a Thai run
  // across a space ONLY when doing so stays inside a real spaced key — decided by the
  // prefix set below. Built lazily, once, like the other dictionary-derived caches.
  //
  //   _spacedKeySet    : Set of every dict key containing a space.
  //   _spacedPrefixSet : Set of every space-terminated prefix of such a key, e.g.
  //                      "สมรักษ์ คำสิงห์" contributes "สมรักษ์ " (so a run that has
  //                      reached "สมรักษ์" followed by a space is known to possibly
  //                      continue into a spaced key and should absorb the space).
  //   _maxSpacedKeyLen : longest spaced key length (bounds nothing today but documents
  //                      the intent and future-proofs the cap logic in buildMixedTokens).
  var _spacedBuilt = false, _spacedKeySet = null, _spacedPrefixSet = null, _maxSpacedKeyLen = 0;
  function buildSpacedKeyIndex() {
    if (_spacedBuilt) return;
    _spacedBuilt = true;
    _spacedKeySet = Object.create(null);
    _spacedPrefixSet = Object.create(null);
    _maxSpacedKeyLen = 0;
    var d = dict();
    if (!d) return;
    for (var k in d) {
      if (k.indexOf(' ') === -1) continue;
      _spacedKeySet[k] = 1;
      if (k.length > _maxSpacedKeyLen) _maxSpacedKeyLen = k.length;
      // Register each space-terminated prefix (up to and including every internal space).
      for (var p = 0; p < k.length; p++) {
        if (k[p] === ' ') _spacedPrefixSet[k.slice(0, p + 1)] = 1;
      }
    }
  }
  // True if `s` (a run ending right before a space) plus that space is a prefix of
  // some spaced dictionary key — i.e. "s " could still grow into a spaced key.
  function isSpacedKeyPrefix(s) {
    buildSpacedKeyIndex();
    return _spacedPrefixSet[s + ' '] === 1;
  }

  // ---- Character helpers --------------------------------------------------
  function isThaiChar(ch) {
    var c = ch.charCodeAt(0);
    return c >= 0x0E00 && c <= 0x0E7F;
  }

  // A Thai character that can NEVER begin a syllable. If greedy longest-match leaves
  // one of these stranded at the very start of the remaining text, the match provably
  // consumed a consonant that belongs to the NEXT syllable — so we reject that match
  // length and back off to a shorter one. This is a linguistic invariant (these marks
  // and trailing vowels only ever attach to a preceding consonant), so it never fires
  // on a correct segmentation. Covers: the above/below vowels + tone/diacritic marks
  // (U+0E31, U+0E34–0E3A, U+0E47–0E4E) and the trailing base vowels สระอา/อำ/อะ and
  // ลากข้าง — า ำ ะ ๅ (U+0E32, U+0E33, U+0E30, U+0E45). Leading vowels เ แ โ ใ ไ
  // (U+0E40–0E44) DO start syllables and are deliberately excluded.
  function cantStartSyllable(ch) {
    var c = ch.charCodeAt(0);
    return c === 0x0E31 || (c >= 0x0E34 && c <= 0x0E3A) || (c >= 0x0E47 && c <= 0x0E4E) ||
           c === 0x0E32 || c === 0x0E33 || c === 0x0E30 || c === 0x0E45;
  }

  // ---- Reverse (English -> Thai) search index -----------------------------
  // Built lazily from ROM_MEANINGS. We index each meaning string so that an
  // English query can find every Thai word whose meanings contain it.
  //   _revWord : { "<english word>": Set(thai) }      whole-word postings
  //   _revEntries : [ { thai, rom, meanings, hay } ]  for phrase/substring scan
  // Words to ignore in whole-word indexing (too generic to be useful on their own).
  var REV_STOP = {
    'a':1,'an':1,'the':1,'to':1,'of':1,'and':1,'or':1,'in':1,'on':1,'at':1,
    'for':1,'with':1,'as':1,'be':1,'is':1,'are':1,'by':1,'e':1,'g':1,'i':1
  };
  var _revBuilt = false;
  var _revWord = null;      // Map: english word -> array of thai keys
  var _revEntries = null;   // array of { thai, meanings[], hay }
  var _freqRank = null;     // Map: thai -> frequency index (lower = more common)
  var FREQ_FLOOR = 50;      // minimum boost for any word present in ROM_FREQ (see freqBoost)

  function stripTags(s) {
    // Remove trailing register/POS tags like "(noun)", "(vulgar)", "(slang)"
    // and bracketed usage notes, so they don't pollute matching.
    return s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
  }

  function buildReverseIndex() {
    if (_revBuilt) return;
    _revBuilt = true;
    _revWord = Object.create(null);
    _revEntries = [];
    // Frequency-priority map: common words get a positive boost so they rank
    // above obscure ones that happen to share a gloss word.
    _freqRank = Object.create(null);
    if (typeof ROM_FREQ !== 'undefined' && ROM_FREQ && ROM_FREQ.length) {
      for (var fi = 0; fi < ROM_FREQ.length; fi++) _freqRank[ROM_FREQ[fi]] = fi;
    }
    var m = meaningsData();
    var d = dict();
    if (!m) return;
    for (var thai in m) {
      var meanings = realMeanings(m[thai]);
      if (!meanings || !meanings.length) continue;
      var joined = meanings.join(' ; ').toLowerCase();
      // Collapse every run of non-alphanumeric chars (punctuation like ; , ? ( )
      // and symbols) to a single space so they act as WORD BOUNDARIES. Without
      // this, a gloss like "can; be able to" stores "can;" — and the word-bounded
      // search for " can " (space on both sides) misses it. Padding with spaces on
      // both ends keeps the first/last word matchable too.
      var hay = ' ' + stripTags(joined).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
      _revEntries.push({ thai: thai, meanings: meanings, hay: hay });
      // whole-word postings
      var words = hay.split(/[^a-z0-9]+/);
      var seen = Object.create(null);
      for (var i = 0; i < words.length; i++) {
        var wd = words[i];
        if (!wd || wd.length < 2 || REV_STOP[wd] || seen[wd]) continue;
        seen[wd] = 1;
        (_revWord[wd] || (_revWord[wd] = [])).push(thai);
      }
    }
  }

  // Frequency boost for a Thai word: common words (low index in ROM_FREQ) get a
  // larger positive boost; unlisted words get 0.
  function freqBoost(thai) {
    if (!_freqRank) return 0;
    var r = _freqRank[thai];
    if (r === undefined) return 0;
    // index 0 (most common) -> ~300 boost, tapering with rank. The original curve
    // (300 - r/10) reaches 0 at index 3000, which left the later-appended common
    // words (reduplications, loanwords, everyday spellings; indices ~2900+) with
    // no boost. A small floor (FREQ_FLOOR) ensures every word that made it into
    // ROM_FREQ — including those curated additions — gets a modest, consistent
    // lift over unlisted words, without disturbing the ordering of the top core.
    return Math.max(FREQ_FLOOR, 300 - r / 10);
  }

  // Search the reverse index for an English query (single word or phrase).
  // Returns a ranked, de-duplicated array of thai keys (best matches first).
  function reverseSearch(query, limit) {
    buildReverseIndex();
    if (!_revEntries) return [];
    var q = String(query || '').toLowerCase().trim();
    q = q.replace(/\s+/g, ' ');
    if (!q) return [];
    limit = limit || 15;

    var scores = Object.create(null);   // thai -> best score (higher = better)
    function bump(thai, score) {
      if (scores[thai] === undefined || score > scores[thai]) scores[thai] = score;
    }

    var d = dict();
    var isPhrase = q.indexOf(' ') !== -1;
    var phrasePadded = ' ' + q + ' ';

    // Pass over all entries for phrase / substring / word-boundary matches.
    for (var i = 0; i < _revEntries.length; i++) {
      var e = _revEntries[i];
      var hay = e.hay;
      var idx = hay.indexOf(phrasePadded);
      if (idx !== -1) {
        // Whole-phrase, word-bounded match. Prefer shorter meanings (more precise)
        // and earlier position (usually the primary sense), plus a frequency boost
        // so everyday words outrank obscure ones sharing the gloss.
        var score = 1000 - Math.min(idx, 300) - Math.min(e.hay.length, 400) / 100 + freqBoost(e.thai);
        bump(e.thai, score);
        continue;
      }
      // Substring match anywhere (weaker) — only for single-word queries to
      // avoid noisy partial-phrase hits.
      if (!isPhrase && hay.indexOf(q) !== -1) {
        bump(e.thai, 200 - Math.min(e.hay.length, 400) / 100 + freqBoost(e.thai));
      }
    }

    var results = Object.keys(scores).sort(function (a, b) {
      return scores[b] - scores[a];
    });
    return results.slice(0, limit);
  }

  // ---- Core: turn Thai text into a list of structured tokens --------------
  // Each token is one of:
  //   { type:'word',  thai, rom, meanings:[] }   a dictionary hit
  //   { type:'unknown', thai, rom:null }         a Thai run with no dict match
  //   { type:'space', text }                     run of spaces/tabs (soft break)
  //   { type:'newline', text }                   run containing >=1 line break (hard break)
  //   { type:'punct', text }                     sentence punctuation (hard break)
  //   { type:'raw',   text }                     other non-Thai (latin/digits)
  // The { thai, rom, meanings } shape drives both the romanization output and
  // the per-word English breakdown.
  // Greedy longest-match length at position i, applying the same rules as the main
  // tokenizer loop: honor cantStartSyllable back-off, cap by maxKeyLen. Returns the
  // number of characters the greedy matcher would consume as one dict word here, or
  // 0 if no dictionary word matches at i. Used by the strand-aware back-off below.
  function dictMatchLenAt(d, text, i, n, cap) {
    var upper = Math.min(cap, n - i);
    for (var L = upper; L >= 1; L--) {
      var cand = text.slice(i, i + L);
      if (Object.prototype.hasOwnProperty.call(d, cand)) {
        if (i + L < n && cantStartSyllable(text[i + L])) continue;
        return L;
      }
    }
    return 0;
  }

  // Count stranded Thai characters produced by a plain greedy parse of text[i..n).
  // A "strand" is a Thai character at a position where no dictionary word matches, so
  // it would render as an [unknown] fragment. Non-Thai chars are ignored (they are not
  // Thai strands). This is used to decide whether backing off to a shorter match at an
  // over-consumption point yields a STRICTLY better (less-stranded) segmentation.
  function tailThaiStrandCount(d, text, i, n, cap) {
    var count = 0;
    while (i < n) {
      var ch = text[i];
      if (!isThaiChar(ch)) { i += 1; continue; }
      var L = dictMatchLenAt(d, text, i, n, cap);
      if (L > 0) { i += L; }
      else { count += 1; i += 1; }
    }
    return count;
  }

  // ---- Option B: frequency-aware trap-fix for greedy over-segmentation ----
  // Greedy longest-match can pick a rare longer key that steals a consonant from
  // the next syllable (ขอก+ลับ instead of ขอ+กลับ). The parse is "clean" (nothing
  // stranded), so the strand back-off above never fires. This post-pass detects
  // such a span — where greedy used a RARE word and a clearly-more-common
  // alternative covers the exact same characters — and re-segments just that span,
  // using the dictionary's frequency ranking (insertion order; earlier key = more
  // common) as the signal. It is deliberately conservative: it changes well under
  // 1% of real input, never introduces new [unknown] fragments (the DP only
  // accepts full dictionary covers), and requires a large frequency gap before
  // acting. Validated on a large newmm-referenced corpus at ~15:1 win:regression,
  // with the only "regressions" being transliterated proper-name fragments that no
  // segmenter parses meaningfully. Applied to buildTokens' output so BOTH the
  // romanization line and the word-by-word breakdown benefit from one change point.
  //
  // Word "rank" = index in ROM_DICT insertion order, computed once. Absent word
  // ranks as the key count (max). Lower = more common.
  var _romRank = null, _romNKeys = 0;
  function romRank(w) {
    if (!_romRank) {
      _romRank = Object.create(null);
      var d = dict(); var idx = 0;
      if (d) { for (var k in d) { if (!(k in _romRank)) _romRank[k] = idx; idx++; } }
      _romNKeys = idx;
    }
    var r = _romRank[w];
    return (r === undefined) ? _romNKeys : r;
  }

  // Thresholds — the entire safety envelope (tuned on a newmm-referenced corpus).
  //   TRAP_RARE_MIN  : greedy word must be at least this rank (rare) to be suspect.
  //   TRAP_COMMON_MAX: the alternative's worst (rarest) word must be below this.
  //   TRAP_GAP       : and be at least this many ranks more common than greedy's.
  //   TRAP_LAMBDA    : per-extra-char bonus in the cost, resists over-splitting.
  // TRAP_RARE_MIN was lowered 8000 -> 4000 so it matches TRAP_COMMON_MAX/TRAP_GAP.
  // At 8000 the gate excluded the single most damaging trap in the dictionary:
  // การก (rank 7760, "grammatical agent"), which stole the ก from every following
  // ก-cluster word (การ+กลับ -> การก|ลับ, การ+กระจาย -> การก|ระ|จาย, ...). การ is the
  // second most common word in Thai and the universal nominaliser, so this misfired
  // constantly. 241 further keys share the same one-consonant-steal shape and sit in
  // the same 4000-8000 band. Measured over 2,550,409 adjacent-word-pair segmentations:
  // 1,065 fixed, 0 regressions - the set of correctly segmented pairs at 4000 is a
  // strict superset of the set at 8000. The safety work is done by the other three
  // guards (the steal fingerprint, TRAP_COMMON_MAX, TRAP_GAP) plus the rule that a
  // span which is itself a dictionary key is never re-segmented; TRAP_RARE_MIN only
  // decides what gets *examined*, so lowering it cannot by itself unmake a good parse.
  var TRAP_RARE_MIN = 4000, TRAP_COMMON_MAX = 4000, TRAP_GAP = 4000, TRAP_LAMBDA = 3.0;

  // Greedy longest-match segmentation of a pure-Thai string, mirroring the inner
  // matcher below (longest match + cantStartSyllable back-off). Returns an array of
  // { w, start, len }; w is null for an unmatched single char.
  function bGreedyPieces(s) {
    var d = dict(), n = s.length, cap = maxKeyLen(), out = [], i = 0;
    while (i < n) {
      var m = null, ml = 0, upper = Math.min(cap, n - i);
      for (var L = upper; L >= 1; L--) {
        var cand = s.slice(i, i + L);
        if (Object.prototype.hasOwnProperty.call(d, cand)) {
          if (i + L < n && cantStartSyllable(s[i + L])) continue;
          m = cand; ml = L; break;
        }
      }
      if (!m) { out.push({ w: null, start: i, len: 1 }); i += 1; }
      else { out.push({ w: m, start: i, len: ml }); i += ml; }
    }
    return out;
  }

  // Frequency-cost DP over span s[a,b): minimize sum(log(rank+2)) - LAMBDA*(len-1),
  // staying clean (no cantStartSyllable violations, dict words only). Returns
  // { seg:[words], worst:maxRank } or null if the span can't be fully covered.
  function bDpSpan(s, a, b) {
    var d = dict(), cap = maxKeyLen(), len = b - a;
    var best = new Array(len + 1); best[0] = { cost: 0, worst: -1, seg: [] };
    for (var p = 0; p < len; p++) {
      if (!best[p]) continue;
      var i = a + p, upper = Math.min(cap, b - i);
      for (var L = upper; L >= 1; L--) {
        var w = s.slice(i, i + L);
        if (Object.prototype.hasOwnProperty.call(d, w)) {
          if (i + L < b && cantStartSyllable(s[i + L])) continue;
          var q = p + L, rr = romRank(w);
          var cost = best[p].cost + Math.log(rr + 2) - TRAP_LAMBDA * (L - 1);
          if (!best[q] || cost < best[q].cost) {
            best[q] = { cost: cost, worst: Math.max(best[p].worst, rr), seg: best[p].seg.concat([w]) };
          }
        }
      }
    }
    return best[len] || null;
  }

  // Given a pure-Thai string, return a NEW array of word strings (the trap-fixed
  // segmentation) or null if nothing qualifies. Only fires when greedy used a rare
  // word AND a clean, clearly-more-common cover of the same span exists.
  function bTrapFixWords(s) {
    var pieces = bGreedyPieces(s);
    var hasRare = false;
    for (var t = 0; t < pieces.length; t++) {
      if (pieces[t].w && romRank(pieces[t].w) >= TRAP_RARE_MIN) { hasRare = true; break; }
    }
    if (!hasRare) return null;

    var out = [], changed = false, idx = 0;
    while (idx < pieces.length) {
      var pc = pieces[idx];
      if (!pc.w) { out.push(s[pc.start]); idx++; continue; }
      if (romRank(pc.w) < TRAP_RARE_MIN) { out.push(pc.w); idx++; continue; }

      // Character-stealing signature (the exact ขอก/ปลาก fingerprint): the rare
      // greedy piece is only a genuine over-consumption if dropping its LAST
      // character leaves a valid dictionary key AND that last character begins a
      // valid word with what follows — i.e. greedy stole the first consonant of the
      // next syllable's (often a cluster: กล กร กว คล ปล พร …). This distinguishes a
      // real trap (ขอก = ขอ|ก-stolen) from a legitimate rare-ranked compound key
      // that is simply self-contained (ด้วยกัน, ที่ทำงาน), which must be left whole.
      // Without this test, a common phrase that happens to have a high insertion
      // rank would be wrongly split. The greedy piece must be >= 2 chars to have a
      // droppable tail.
      var pcEnd = pc.start + pc.len;
      var steals = false;
      if (pc.len >= 2 && pcEnd < s.length) {
        var head = s.slice(pc.start, pcEnd - 1);
        if (Object.prototype.hasOwnProperty.call(dict(), head)) {
          // Does the stolen last char + following text begin any dictionary key?
          var stolenStart = pcEnd - 1;
          if (dictMatchLenAt(dict(), s, stolenStart, s.length, maxKeyLen()) > 0) steals = true;
        }
      }
      if (!steals) { out.push(pc.w); idx++; continue; }

      // Trap span: this rare word plus up to 2 following pieces (room for the DP to
      // reshuffle a 2-3 syllable window). Stop once a clearly-common word is hit.
      var a = pc.start, b = pc.start + pc.len, j = idx, ext = 0, greedyWorst = romRank(pc.w);
      while (j + 1 < pieces.length && ext < 2) {
        var nxt = pieces[j + 1];
        b = nxt.start + nxt.len; j++; ext++;
        if (nxt.w) greedyWorst = Math.max(greedyWorst, romRank(nxt.w));
        if (nxt.w && romRank(nxt.w) < 1500) break;
      }

      // Never re-segment a span whose exact characters form a dictionary key: a
      // baked key (even a rare-ranked compound like เป็นไป, การงาน, or a word+ๆ
      // form like มากๆ) is an intentional unit with its own curated romanization,
      // so splitting it would corrupt the reading. Only spans that greedy already
      // broke into multiple pieces are eligible for the trap fix.
      var spanStr = s.slice(a, b);
      if (Object.prototype.hasOwnProperty.call(dict(), spanStr)) { out.push(pc.w); idx++; continue; }

      var alt = bDpSpan(s, a, b);
      if (alt && alt.seg && alt.seg.length) {
        var greedyStr = pieces.slice(idx, j + 1).map(function (p) { return p.w || s[p.start]; }).join('|');
        var altStr = alt.seg.join('|');
        if (altStr !== greedyStr &&
            alt.worst <= TRAP_COMMON_MAX &&
            (greedyWorst - alt.worst) >= TRAP_GAP) {
          for (var z = 0; z < alt.seg.length; z++) out.push(alt.seg[z]);
          changed = true;
          idx = j + 1;
          continue;
        }
      }
      out.push(pc.w); idx++;
    }
    return changed ? out : null;
  }

  // Post-pass over a buildTokens stream: find maximal runs of consecutive pure-Thai
  // `word` tokens, re-segment each run via bTrapFixWords, and splice replacements
  // in. Everything else (unknown/space/newline/punct/raw tokens, number tokens, and
  // any word whose thai isn't purely Thai such as a latin/dotted key) passes through
  // untouched. A run is only altered when re-running greedy on its concatenation
  // reproduces the exact original tokens (guards against boundary mismatch).
  function bApplyTrapFix(tokens) {
    var d = dict();
    if (!d) return tokens;
    function isPlainThaiWord(t) {
      if (!t || t.type !== 'word' || t.isNumber) return false;
      var s = t.thai || '';
      if (!s) return false;
      for (var i = 0; i < s.length; i++) { if (!isThaiChar(s[i])) return false; }
      return true;
    }
    var out = [], i = 0, n = tokens.length;
    while (i < n) {
      if (!isPlainThaiWord(tokens[i])) { out.push(tokens[i]); i++; continue; }
      var j = i, run = '';
      while (j < n && isPlainThaiWord(tokens[j])) { run += tokens[j].thai; j++; }
      var greedy = bGreedyPieces(run).map(function (p) { return p.w || run[p.start]; });
      var orig = [];
      for (var k = i; k < j; k++) orig.push(tokens[k].thai);
      var reproduces = (greedy.length === orig.length);
      if (reproduces) { for (var q = 0; q < orig.length; q++) { if (greedy[q] !== orig[q]) { reproduces = false; break; } } }

      if (reproduces) {
        var fixed = bTrapFixWords(run);
        if (fixed) {
          for (var f = 0; f < fixed.length; f++) {
            var w = fixed[f];
            if (Object.prototype.hasOwnProperty.call(d, w)) {
              out.push({ type: 'word', thai: w, rom: d[w], meanings: lookupMeanings(w) });
            } else {
              out.push({ type: 'unknown', thai: w, rom: null });
            }
          }
          i = j; continue;
        }
      }
      for (var m = i; m < j; m++) out.push(tokens[m]);
      i = j;
    }
    return out;
  }

  function buildTokens(text) {
    var d = dict();
    var tokens = [];
    if (!text) return tokens;
    var i = 0, n = text.length, cap = maxKeyLen();

    // Non-dot sentence punctuation (Latin + Thai). We deliberately EXCLUDE the
    // period "." here and handle it contextually below, because Thai does not end
    // sentences with a period — a "." touching Thai is virtually always part of an
    // abbreviation (พล.ต.อ., กทม., น.) or a decimal (18.15), NOT a sentence break.
    // The Thai marks ฯ ๚ ๛, Western ! ? ; and the ellipsis stay hard breaks.
    var SENT_PUNCT = /[!?;\u0E2F\u0E5A\u0E5B\u2026]/;

    // Matches a leading run of "1–4 Thai chars + a dot" segments, e.g. "พล.ต.อ." or
    // "กทม." or "น.". Always ends at a dot, so it can never swallow a following word.
    var ABBREV_RUN = /^(?:[\u0E00-\u0E7F]{1,4}\.)+/;

    while (i < n) {
      var ch = text[i];

      // Whitespace run — hard "newline" break if it contains a line break, else soft.
      if (/\s/.test(ch)) {
        var s = i;
        while (i < n && /\s/.test(text[i])) i++;
        var ws = text.slice(s, i);
        tokens.push({ type: /[\r\n]/.test(ws) ? 'newline' : 'space', text: ws });
        continue;
      }

      // Digit run, possibly with internal decimal points (18.15, 3.5) and thousands-
      // separator commas (1,000): consume as one run so neither splits into a sentence
      // break. Thai numerals (๐–๙) are accepted too and normalized to Arabic for display,
      // matching how Arabic digit runs render. (A pure-digit dictionary entry like "555"
      // is still honored, on the normalized form.)
      if (/[0-9\u0E50-\u0E59]/.test(ch)) {
        var digRun = text.slice(i).match(/^[0-9\u0E50-\u0E59]+(?:,[0-9\u0E50-\u0E59]{3})*(?:\.[0-9\u0E50-\u0E59]+)*/)[0];
        var digLen = digRun.length;
        var digNorm = toArabicDigits(digRun);
        if (d && Object.prototype.hasOwnProperty.call(d, digNorm)) {
          tokens.push({ type: 'word', thai: digNorm, rom: d[digNorm], meanings: lookupMeanings(digNorm) });
        } else {
          tokens.push({ type: 'raw', text: digNorm });
        }
        i += digLen;
        continue;
      }

      // Trailing paiyannoi (ฯ) after a word is a SILENT abbreviation mark — it shortens
      // a longer proper name (จุฬาฯ = จุฬาลงกรณ์มหาวิทยาลัย, กรุงเทพฯ = the full name of
      // Bangkok) and is not pronounced. When a lone ฯ directly follows a word we just
      // emitted, attach it with an empty romanization so it doesn't voice as its mark
      // name. Exceptions preserved: ฯลฯ (the "etc." symbol) matches as its own key in the
      // normal path below, and a ฯ not preceded by a word keeps its dictionary reading.
      if (ch === '\u0E2F' && text.slice(i, i + 3) !== '\u0E2F\u0E25\u0E2F') {
        var prevTok = tokens[tokens.length - 1];
        if (prevTok && prevTok.type === 'word') {
          tokens.push({ type: 'word', thai: ch, rom: '', meanings: lookupMeanings(ch) });
          i += 1;
          continue;
        }
      }

      // Repetition mark mai-yamok (ๆ) repeats the preceding word. Most common word+ๆ
      // forms exist as baked dictionary keys (เด็กๆ) and match as a unit in the Thai run
      // below; this branch handles every OTHER case — a ๆ written as a separate character
      // after a word (โรงเรียนๆ) and the spaced form (เด็ก ๆ), which is standard Thai
      // typography. We emit the ๆ with the previous word's romanization so it voices as a
      // repeat instead of its literal mark name. A ๆ with no preceding word (orphan, or
      // after punctuation) is left to the normal path, preserving its dictionary reading.
      if (ch === '\u0E46') {
        var yPrev = null;
        for (var yj = tokens.length - 1; yj >= 0; yj--) {
          if (tokens[yj].type === 'space') continue;      // reach across a single space
          if (tokens[yj].type === 'word') yPrev = tokens[yj];
          break;
        }
        if (yPrev && yPrev.rom) {
          tokens.push({ type: 'word', thai: ch, rom: yPrev.rom, meanings: lookupMeanings(ch) });
          i += 1;
          continue;
        }
      }


      // INCLUDE dots, so dotted dictionary keys — ordinary abbreviations (ผอ., พ.ศ.,
      // พล.ต.อ.) and any dotted phrase key — match here directly and take priority
      // over the abbreviation fallback below. This keeps every existing key working.
      if (isThaiChar(ch) && d) {
        var matched = null, mlen = 0;
        var upper = Math.min(cap, n - i);
        for (var L = upper; L >= 1; L--) {
          var cand = text.slice(i, i + L);
          if (Object.prototype.hasOwnProperty.call(d, cand)) {
            // Reject a match that would strand a non-syllable-initial char right after
            // it (greedy over-consumption); back off to a shorter length instead.
            if (i + L < n && cantStartSyllable(text[i + L])) continue;
            matched = cand; mlen = L; break;
          }
        }
        // Strand-aware back-off. The guard above only rejects over-consumption that
        // strands a combining MARK. When the greedy match instead strands a full
        // CONSONANT (e.g. ตาล wins over ตา+ลง, orphaning ง as [ง]), the longest match
        // is a cross-boundary over-consumption too. If the chosen match leaves a
        // remainder that dead-ends immediately (no dict word starts right after it),
        // look for a SHORTER match here that yields strictly fewer stranded Thai chars
        // over the rest of the string. Adopt it only when it strictly improves; if no
        // shorter match reduces stranding, keep the greedy match exactly as-is. This
        // can only ever turn a broken segmentation into a less-stranded one — it never
        // alters an already-clean parse and never increases stranding.
        if (matched && mlen < (n - i) &&
            dictMatchLenAt(d, text, i + mlen, n, cap) === 0) {
          var baseStrand = tailThaiStrandCount(d, text, i + mlen, n, cap);
          for (var SL = mlen - 1; SL >= 1; SL--) {
            var scand = text.slice(i, i + SL);
            if (!Object.prototype.hasOwnProperty.call(d, scand)) continue;
            if (i + SL < n && cantStartSyllable(text[i + SL])) continue;
            if (i + SL < n && dictMatchLenAt(d, text, i + SL, n, cap) === 0) continue;
            if (tailThaiStrandCount(d, text, i + SL, n, cap) < baseStrand) {
              matched = scand; mlen = SL; break;
            }
          }
        }
        if (matched) {
          tokens.push({ type: 'word', thai: matched, rom: d[matched], meanings: lookupMeanings(matched) });
          i += mlen;
          continue;
        }

        // No direct match. If a dotted abbreviation cluster starts here but isn't a
        // known key, resolve it so its letters and dots stay together (never strand
        // loose combining marks). Try the longest KNOWN dotted-key prefix first:
        var runMatch = text.slice(i).match(ABBREV_RUN);
        if (runMatch) {
          var run = runMatch[0];
          var parts = run.match(/[\u0E00-\u0E7F]{1,4}\./g) || [];
          var acc = '', prefixes = [];
          for (var pi = 0; pi < parts.length; pi++) { acc += parts[pi]; prefixes.push(acc); }
          var picked = null;
          for (var qi = prefixes.length - 1; qi >= 0; qi--) {
            var pref = prefixes[qi];
            if (Object.prototype.hasOwnProperty.call(d, pref)) { picked = { key: pref, adv: pref.length }; break; }
          }
          if (picked) {
            tokens.push({ type: 'word', thai: text.substr(i, picked.adv), rom: d[picked.key], meanings: lookupMeanings(picked.key) });
            i += picked.adv;
            continue;
          }
          // A chained abbreviation (>= 2 dots) with no known prefix: keep the whole
          // run together as one unknown unit rather than shattering it into stranded
          // marks. A single unknown "word." segment is NOT treated as an abbreviation
          // (it falls through: the word matches per-char below, its dot becomes punct).
          var dotCount = (run.match(/\./g) || []).length;
          if (dotCount >= 2) {
            tokens.push({ type: 'unknown', thai: run, rom: null });
            i += run.length;
            continue;
          }
        }
      }

      // Contextual period: a "." not consumed as a decimal or a dictionary key acts as
      // ordinary sentence punctuation (Latin text, or a stray dot). Merge with any
      // adjacent sentence punctuation.
      if (ch === '.') {
        var dp = i;
        while (i < n && (text[i] === '.' || SENT_PUNCT.test(text[i]))) i++;
        tokens.push({ type: 'punct', text: text.slice(dp, i) });
        continue;
      }

      // Non-dot sentence punctuation — its own token so the breakdown can hard-break.
      if (SENT_PUNCT.test(ch)) {
        var p = i;
        while (i < n && (SENT_PUNCT.test(text[i]) || text[i] === '.')) i++;
        tokens.push({ type: 'punct', text: text.slice(p, i) });
        continue;
      }

      // Other non-Thai run (latin, other symbols) — passed verbatim, UNLESS the run is
      // itself a dictionary entry (e.g. "555" = hahaha). Digits and periods are handled
      // above, so they won't start a run here.
      if (!isThaiChar(ch)) {
        var r = i;
        while (i < n && !isThaiChar(text[i]) && !/\s/.test(text[i]) && !SENT_PUNCT.test(text[i]) && text[i] !== '.' && !/[0-9]/.test(text[i])) i++;
        if (i === r) { i++; continue; }
        var runText = text.slice(r, i);
        if (d && Object.prototype.hasOwnProperty.call(d, runText)) {
          tokens.push({ type: 'word', thai: runText, rom: d[runText], meanings: lookupMeanings(runText) });
        } else {
          tokens.push({ type: 'raw', text: runText });
        }
        continue;
      }

      // No dictionary match at this Thai position: collect the maximal unmatched run
      // as one "unknown" chunk (advance one char; later positions re-sync onto words).
      var u = i;
      i += 1;
      var prev = tokens[tokens.length - 1];
      if (prev && prev.type === 'unknown') {
        prev.thai += text.slice(u, i);
      } else {
        tokens.push({ type: 'unknown', thai: text.slice(u, i), rom: null });
      }
    }
    // Option B: correct rare-key over-segmentation traps (ขอก+ลับ -> ขอ+กลับ)
    // before returning, so both the romanization line and the word-by-word
    // breakdown use the corrected segmentation. No-op for the vast majority of
    // input (returns the same tokens array contents when nothing qualifies).
    return bApplyTrapFix(tokens);
  }

  function lookupMeanings(word) {
    var m = meaningsData();
    if (!m) return [];
    return (Object.prototype.hasOwnProperty.call(m, word) && m[word]) ? m[word] : [];
  }

  // ---- Component decomposition (parent -> child breakdown) -----------------
  // Given a Thai word/phrase, return an array of component "word" tokens (each
  // shaped like a breakdown row token: { type, thai, rom, meanings }) when the
  // word is a known combination of smaller pieces, or null when it should not be
  // decomposed. This drives the expandable child rows in the breakdown; it never
  // affects the romanization output.
  //
  // Two sources, checked in order:
  //   1. Manual override: a "@@parts:a|b|c" item in the word's meanings array.
  //      Its pieces are used verbatim (romanized/glossed from the dictionary,
  //      shown as "unknown" if a piece isn't a dict key). A single-piece override
  //      is an explicit "do NOT decompose" and returns null.
  //   2. Automatic: re-run the same greedy longest-match segmentation on the
  //      word's own Thai. If it yields 2+ pieces we treat those as components.
  //
  // Either way, a result is only returned when there are 2+ pieces AND at least
  // one piece differs from the whole word (so a word that "segments" to just
  // itself yields no children). Children are never themselves decomposed by the
  // caller — this is a single parent->child level by design.
  function makeComponentToken(piece) {
    var d = dict();
    if (d && Object.prototype.hasOwnProperty.call(d, piece)) {
      return { type: 'word', thai: piece, rom: d[piece], meanings: lookupMeanings(piece) };
    }
    return { type: 'unknown', thai: piece, rom: null, meanings: [] };
  }

  function getComponents(thai) {
    if (!thai) return null;
    var d = dict();
    if (!d) return null;

    // 1) Manual override via @@parts.
    var over = partsOverride(lookupMeanings(thai));
    if (over) {
      // A single piece (typically the word itself) means "do not decompose".
      if (over.length < 2) return null;
      return over.map(makeComponentToken);
    }

    // 1.5) Auto-decomposition whitelist gate. Only words human-reviewed for
    // correct breakdown (ROM_AUTOBREAK, from romanizer-autobreak.js) are allowed
    // to auto-segment below. Manual @@parts overrides above are unaffected (they
    // already returned). Words not whitelisted are shown whole (no children)
    // rather than risk a wrong auto-split. If the file is absent, the guard falls
    // back to today's behavior (auto-break everything).
    if (typeof ROM_AUTOBREAK !== 'undefined' && ROM_AUTOBREAK && !ROM_AUTOBREAK.has(thai)) {
      return null;
    }

    // 2) Automatic segmentation into KNOWN sub-words. We can't just run the normal
    // tokenizer here: greedy longest-match would return the whole-word key itself
    // (น่ารัก -> [น่ารัก]) and never reveal its parts. So we segment "below" the
    // whole word: the FIRST piece may not be the entire string, and every piece
    // must be a real dictionary key. If the word can't be fully covered by known
    // sub-words, we decline (no children) rather than emit ragged fragments — this
    // keeps auto-decomposition conservative and meaningful. Segmentation still uses
    // the same greedy longest-match + syllable-initial invariant as the tokenizer.
    var pieces = segmentIntoKnownParts(thai);
    if (!pieces || pieces.length < 2) return null;
    return pieces.map(makeComponentToken);
  }

  // Greedy longest-match cover of `thai` using dictionary keys strictly SHORTER
  // than the whole word for the first piece (so the word never "covers itself").
  // Returns an array of Thai sub-strings (all dict keys), or null if it can't be
  // fully covered by known keys. Honors cantStartSyllable to avoid over-consuming.
  function segmentIntoKnownParts(thai) {
    var d = dict();
    if (!d || !thai) return null;
    var n = thai.length, cap = maxKeyLen();
    var out = [], i = 0, first = true;
    while (i < n) {
      var upper = Math.min(cap, n - i);
      var picked = null, plen = 0;
      for (var L = upper; L >= 1; L--) {
        // On the first piece, forbid consuming the entire word (that's the very
        // key we're trying to break down); a proper part must be shorter.
        if (first && i === 0 && L === n) continue;
        var cand = thai.slice(i, i + L);
        if (Object.prototype.hasOwnProperty.call(d, cand)) {
          if (i + L < n && cantStartSyllable(thai[i + L])) continue;
          picked = cand; plen = L; break;
        }
      }
      if (!picked) return null;   // an uncovered gap: decline auto-decomposition
      out.push(picked);
      i += plen;
      first = false;
    }
    return out;
  }

  // ---- Optional per-word reserved metadata items --------------------------
  // A meanings array may contain reserved items beginning with "@@" that carry
  // metadata rather than a displayable gloss. This keeps the data shape unchanged
  // (still an array of strings); entries without any reserved item behave exactly
  // as before. Two markers are defined:
  //   "@@note:<text>"   an explanatory comment shown below the numbered meanings.
  //   "@@parts:a|b|c"   an explicit component decomposition for the word (used by
  //                     the breakdown's child-expansion; overrides auto-splitting).
  var NOTE_PREFIX = '@@note:';
  var PARTS_PREFIX = '@@parts:';
  function isNoteItem(s) {
    return typeof s === 'string' && s.lastIndexOf(NOTE_PREFIX, 0) === 0;
  }
  function isPartsItem(s) {
    return typeof s === 'string' && s.lastIndexOf(PARTS_PREFIX, 0) === 0;
  }
  // Any reserved (@@-prefixed) metadata item that must never be shown as a gloss.
  function isReservedItem(s) {
    return typeof s === 'string' && s.lastIndexOf('@@', 0) === 0;
  }
  // The displayable meanings only (all reserved @@ items stripped out).
  function realMeanings(arr) {
    if (!arr || !arr.length) return arr || [];
    for (var i = 0; i < arr.length; i++) {
      if (isReservedItem(arr[i])) {
        var out = [];
        for (var j = 0; j < arr.length; j++) { if (!isReservedItem(arr[j])) out.push(arr[j]); }
        return out;
      }
    }
    return arr; // no reserved item present: return original array as-is
  }
  // The note text (without the marker), or '' if the word has none.
  function noteText(arr) {
    if (!arr || !arr.length) return '';
    for (var i = 0; i < arr.length; i++) {
      if (isNoteItem(arr[i])) return arr[i].slice(NOTE_PREFIX.length);
    }
    return '';
  }
  // The manual parts override for a meanings array, as an array of Thai component
  // strings, or null if none is present. "@@parts:น่า|รัก" -> ["น่า","รัก"].
  // Empty pieces are dropped. A single-piece override (e.g. "@@parts:น่ารัก") is
  // returned as a one-element array, which the caller treats as "no decomposition".
  function partsOverride(arr) {
    if (!arr || !arr.length) return null;
    for (var i = 0; i < arr.length; i++) {
      if (isPartsItem(arr[i])) {
        var raw = arr[i].slice(PARTS_PREFIX.length);
        var pieces = [];
        raw.split('|').forEach(function (p) { p = p.trim(); if (p) pieces.push(p); });
        return pieces;
      }
    }
    return null;
  }

  // ---- Render the romanization string from tokens -------------------------
  // Words join with spaces; newlines and sentence punctuation are preserved so
  // the output mirrors the input's line structure. Unknown Thai runs are shown
  // in brackets so the user sees exactly what wasn't recognized.
  // A token is "Thai-derived" if it's a word/unknown whose Thai text actually
  // contains a Thai character (so a latin dict-hit like "555" doesn't count).
  function isThaiToken(t) {
    if (!t) return false;
    if (t.type !== 'word' && t.type !== 'unknown') return false;
    var s = t.thai || '';
    for (var i = 0; i < s.length; i++) { if (isThaiChar(s[i])) return true; }
    return false;
  }

  // A repetition-mark token: a 'word' token whose Thai is exactly the mai-yamok ๆ.
  // These are emitted for the spaced form "เด็ก ๆ" (and standalone ๆ after a word),
  // carrying the previous word's romanization. Used so a space preceding one renders
  // as a plain join rather than a phrase-boundary separator.
  function isYamokToken(t) {
    return !!(t && t.type === 'word' && t.thai === '\u0E46');
  }

  // The next token that produces visible output (skips space tokens), so a
  // 'space' can decide whether it sits between two Thai phrases.
  function nextRealToken(tokens, from) {
    for (var j = from; j < tokens.length; j++) {
      if (tokens[j].type !== 'space') return tokens[j];
    }
    return null;
  }

  function tokensToRom(tokens) {
    // Keep-Thai mode has its own layout (rom line + Thai line per block), so it's
    // handled separately to keep the default/line-break paths untouched.
    if (_optLineKeepThai) return tokensToRomKeepThai(tokens);

    var out = '';
    var prevReal = null;                 // last token that produced output
    for (var k = 0; k < tokens.length; k++) {
      var t = tokens[k];
      if (t.type === 'word') {
        out += (needsSpace(out) ? ' ' : '') + ((t.isNumber && !_optRomanizeNumbers) ? t.thai : t.rom);
        prevReal = t;
      } else if (t.type === 'unknown') {
        out += (needsSpace(out) ? ' ' : '') + '[' + t.thai + ']';
        prevReal = t;
      } else if (t.type === 'raw') {
        // A raw run that is ONLY sentence punctuation (e.g. the trailing ".." left
        // over when "...", "!!" etc. follow a Thai word — the first mark tokenizes
        // as punct, the rest fall through to a raw run) attaches directly to the
        // preceding token with no leading space, so "ใจเย็นๆ..." renders as
        // "jai-yen-yen..." not "jai-yen-yen. ..". Any other raw run is unchanged.
        var rawIsPunct = /^[.!?;\u2026\u0E2F\u0E5A\u0E5B]+$/.test(t.text);
        out += ((needsSpace(out) && !rawIsPunct) ? ' ' : '') + t.text;
        prevReal = t;
      } else if (t.type === 'query') {
        // English search terms echo back as-is in the top (romanization) line.
        out += (needsSpace(out) ? ' ' : '') + t.text;
        prevReal = t;
      } else if (t.type === 'punct') {
        // Attach punctuation directly to the preceding token (no leading space).
        out += t.text;
        prevReal = t;
      } else if (t.type === 'newline') {
        // Collapse to a single newline per run, trimming trailing spaces.
        out = out.replace(/[ \t]+$/, '') + '\n';
        prevReal = t;
      } else if (t.type === 'space') {
        // A space in the Thai source that sits BETWEEN two Thai phrases marks a
        // sentence/clause boundary, so render it as " \u00b7 ". Any other space
        // (touching English, numbers, punctuation, or a line edge) stays a plain
        // soft space, added lazily by needsSpace when the next token is appended.
        var nxt = nextRealToken(tokens, k + 1);
        if (isThaiToken(prevReal) && isThaiToken(nxt)) {
          // A space that precedes a repetition mark ๆ (the standard spaced form
          // "เด็ก ๆ") is NOT a phrase boundary — the ๆ repeats the previous word, so
          // the two belong together. Render it as a plain joining space ("dèk dèk"),
          // not a " · " / line break, in every mode. (The ๆ token itself already
          // carries the repeated romanization.)
          if (isYamokToken(nxt)) {
            out = out.replace(/[ \t]+$/, '') + ' ';
          } else {
            // A space inside a "..." span always stays an inline middle dot, even
            // in line-break mode. Otherwise: a blank-line-separated new phrase if
            // line-break-phrases is on (a blank line reads better in long pastes),
            // else the usual " · " separator.
            var sep = (_optLineBreakPhrases && !t.forceInline) ? '\n\n' : ' \u00b7 ';
            out = out.replace(/[ \t]+$/, '') + sep;
          }
        }
      }
    }
    // Tidy: collapse runs of >1 space, and trim spaces around newlines/ends.
    // The middle dot is preserved; only plain space/tab runs are collapsed.
    return out
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s*\u00b7\s*/g, ' \u00b7 ')
      .trim();
  }

  // Keep-Thai layout: split the token stream into blocks the same way the
  // breakdown does (soft space between Thai phrases = block boundary, unless
  // that space is inside a "..." span; newline/punct = hard boundary). For each
  // block emit its romanization, then its original Thai on the next line, then a
  // blank line. English query blocks echo their term (no Thai line).
  function tokensToRomKeepThai(tokens) {
    var blocks = [];         // each: { roms:[], thais:[], isQuery:bool }
    var cur = null;
    function ensure() { if (!cur) { cur = { roms: [], thais: [], isQuery: false }; } }
    function flush() { if (cur && (cur.roms.length || cur.thais.length)) blocks.push(cur); cur = null; }

    var prevReal = null;
    for (var k = 0; k < tokens.length; k++) {
      var t = tokens[k];
      if (t.type === 'word') {
        ensure(); cur.roms.push((t.isNumber && !_optRomanizeNumbers) ? t.thai : t.rom); cur.thais.push(t.thai); prevReal = t;
      } else if (t.type === 'unknown') {
        ensure(); cur.roms.push('[' + t.thai + ']'); cur.thais.push(t.thai); prevReal = t;
      } else if (t.type === 'raw') {
        ensure(); cur.roms.push(t.text); cur.thais.push(t.text); prevReal = t;
      } else if (t.type === 'query') {
        flush(); blocks.push({ roms: [t.text], thais: [], isQuery: true }); prevReal = t;
      } else if (t.type === 'punct') {
        // Attach punctuation to the current block, then hard-break.
        if (cur && cur.roms.length) { cur.roms[cur.roms.length - 1] += t.text; }
        if (cur && cur.thais.length) { cur.thais[cur.thais.length - 1] += t.text; }
        flush(); prevReal = t;
      } else if (t.type === 'newline') {
        flush(); prevReal = t;
      } else if (t.type === 'space') {
        var nxt = nextRealToken(tokens, k + 1);
        if (isThaiToken(prevReal) && isThaiToken(nxt)) {
          if (isYamokToken(nxt)) {
            // Space before a repetition mark ๆ ("เด็ก ๆ") is not a phrase boundary:
            // keep it in the SAME block, joined by a plain space on BOTH lines, so the
            // rom reads "dèk dèk" and the Thai keeps "เด็ก ๆ".
            if (cur) { cur.roms.push(' '); cur.thais.push(' '); }
          } else if (t.forceInline) {
            // Inside "...": keep both phrases in the SAME block. On the rom line
            // they're joined by " · "; on the Thai line, by the original space.
            if (cur) { cur.roms.push('\u00b7'); cur.thais.push('\u00b7'); }
          } else {
            flush();   // normal phrase boundary -> new block
          }
        } else if (cur) {
          // A space that ISN'T a Thai-phrase boundary (e.g. Thai next to a number
          // or English) still separated two things in the source, so keep a plain
          // space on both lines rather than gluing them together.
          cur.roms.push(' '); cur.thais.push(' ');
        }
      }
    }
    flush();

    // Render blocks: rom line, Thai line (if any), blank line between blocks.
    var lines = [];
    blocks.forEach(function (b) {
      var romLine = joinInline(b.roms, ' ', ' \u00b7 ');   // rom: spaced syllables, middle-dot break
      lines.push(romLine);
      if (!b.isQuery) {
        var thaiLine = joinInline(b.thais, '', ' ');       // Thai: no inter-word space, plain-space break
        if (thaiLine) lines.push(thaiLine);
      }
      lines.push('');   // blank separator
    });
    // Drop the trailing blank line.
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  }

  // Join word pieces with `sep` between them. A "\u00b7" piece marks a phrase
  // boundary from a "..." span, rendered as `dot` (" · " on the rom line, a plain
  // " " on the Thai line). Empty pieces are skipped.
  //   sep : between-word joiner (' ' for rom, '' for Thai)
  //   dot : how a phrase break renders (' \u00b7 ' for rom, ' ' for Thai)
  function joinInline(parts, sep, dot) {
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '') continue;
      if (p === '\u00b7') { out = out.replace(/\s+$/, '') + dot; continue; }
      if (p === ' ') { if (out && !/\s$/.test(out)) out += ' '; continue; }
      out += (out && !/\s$/.test(out) ? sep : '') + p;
    }
    out = out.replace(/[ \t]{2,}/g, ' ');
    if (dot.indexOf('\u00b7') !== -1) out = out.replace(/\s*\u00b7\s*/g, ' \u00b7 ');
    return out.trim();
  }

  // True if `out` ends with a real character that should be separated from the
  // next word by a space (i.e. not empty and not already ending in a newline).
  function needsSpace(out) {
    if (!out) return false;
    var last = out[out.length - 1];
    return last !== '\n';
  }

  // ---- DOM building -------------------------------------------------------
  var _built = false;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildView() {
    var view = document.getElementById('view-romanizer');
    if (!view || _built) return;
    _built = true;

    view.classList.add('menu'); // reuse the shared scrolling menu layout

    // ---- Header (mirrors other screens: title + subtitle + tappable Thai) ----
    var header = el('div', 'screen-header rz-header');
    header.appendChild(el('h1', 'screen-title', 'Dictionary &amp; Romanizer'));
    // Thai name + romanization, tappable to hear it (like the other menus).
    var romLine = el('p', 'screen-rom');
    romLine.innerHTML = '<span class="th">\u0e1e\u0e08\u0e19\u0e32\u0e19\u0e38\u0e01\u0e23\u0e21 pót-jà-naa-nú-grom</span>';
    header.appendChild(romLine);

    // ---- Word count (mirrors the Vocabulary menu's "Total: x words") ----
    // Counts dictionary entries that actually have an English meaning, i.e. keys
    // in ROM_MEANINGS whose displayable meaning list is non-empty (excludes
    // @@note-only and empty entries). Words with a romanization but no gloss are
    // not counted. Computed live so it stays correct as the data grows.
    // Placed INSIDE the header (not as a sibling) so it sits snug below the Thai
    // subtitle like the Vocabulary menu, rather than being spaced out by the
    // parent .menu flex `gap`.
    var totalRow = el('div', 'rz-total');
    totalRow.innerHTML = 'Total: <strong>' + formatCount(countMeaningEntries()) + '</strong> words';
    header.appendChild(totalRow);

    // ---- Font-size slider (Dictionary only) ----
    // Same shared .menu-font-slider component as the Grammar/Vocabulary menus.
    // Sits below the word count so users can set their size on entry, then focus
    // on the dictionary below. Scales the result output + all breakdown fonts via
    // the #view-romanizer --rz-text variable (see applyRomanizerTextScale in the
    // main script). Range/step/ids mirror Grammar's slider exactly.
    var fontSlider = el('div', 'menu-font-slider');
    fontSlider.innerHTML =
      '<span class="mfs-label"><span class="mfs-a-small">A</span><span class="mfs-a-big">A</span></span>' +
      '<input type="range" id="rz-text-slider" min="90" max="125" step="5" value="100" aria-label="Text size">' +
      '<span class="mfs-value" id="rz-text-value">100%</span>';
    header.appendChild(fontSlider);

    view.appendChild(header);

    // ---- One-time info box (mirrors the Sentence Builder how-to card) ----
    // Shown until the user taps "OK — Don't show again", which sets
    // state.romanizerHideHelp and persists it via the shared saveStorage().
    // The copy icon (⧉) and the breakdown chevron (▼) are rendered as inline,
    // non-interactive replicas of the real controls so they match exactly.
    if (!(typeof state !== 'undefined' && state && state.romanizerHideHelp)) {
      var help = el('div', 'menu-section');
      help.id = 'rz-help-section';
      help.innerHTML =
        '<div class="sb-help" id="rz-help">' +
          '<div class="sb-help-body">' +
            '<p class="sb-help-lead">\u2139\uFE0F Paste any Thai text into the box and click <strong>Go</strong> to see the romanization, using the same romanization system used throughout this course.</p>' +
            '<p class="sb-help-note">The tool also breaks sentences down word by word, showing each word\u2019s meanings and usage notes where available.</p>' +
            '<p class="sb-help-note"><br>Click <span class="rz-help-icon">\u29C9</span> to copy the romanization.</p>' +
            '<p class="sb-help-note"><br>If you see the <span class="rz-help-chev"><span class="rz-bd-parts-chev" aria-hidden="true">\u25BC</span></span> icon next to a word, click it to explore a more detailed breakdown.</p>' +
            '<p class="sb-help-note"><br>You can also reverse search by typing in an English word to find its Thai translation.</p>' +
          '</div>' +
          '<button type="button" class="sb-help-ok" id="rz-help-ok">\u2713 OK \u2014 Don\u2019t show again</button>' +
        '</div>';
      view.appendChild(help);

      var rzHelpOk = help.querySelector('#rz-help-ok');
      if (rzHelpOk) {
        rzHelpOk.addEventListener('click', function () {
          if (typeof state !== 'undefined' && state) state.romanizerHideHelp = true;
          if (typeof saveStorage === 'function') { try { saveStorage(); } catch (e) {} }
          help.remove();
          try { if (typeof haptic === 'function') haptic(8); } catch (e2) {}
        });
      }
    }

    // ---- Input section ----
    var inSec = el('div', 'menu-section rz-section');
    var inLabel = el('div', 'menu-section-label', 'Thai or English');
    inSec.appendChild(inLabel);

    var ta = el('textarea', 'rz-input');
    ta.id = 'rz-input';
    ta.setAttribute('rows', '3');
    ta.setAttribute('placeholder', 'Type Thai text to romanize, or an English word to search');
    ta.setAttribute('spellcheck', 'false');
    ta.setAttribute('autocapitalize', 'off');
    ta.setAttribute('autocomplete', 'off');
    inSec.appendChild(ta);

    var actions = el('div', 'rz-actions');
    var goBtn = el('button', 'rz-btn rz-btn-primary', 'Go');
    goBtn.id = 'rz-go';
    goBtn.type = 'button';
    var clearBtn = el('button', 'rz-btn rz-btn-ghost', 'Clear');
    clearBtn.id = 'rz-clear';
    clearBtn.type = 'button';
    actions.appendChild(goBtn);
    actions.appendChild(clearBtn);
    inSec.appendChild(actions);

    // ---- Options row: two quiet toggles (applied on the next "Go") ----
    var opts = el('div', 'rz-options');

    var optNum = el('label', 'rz-opt');
    var cbNum = document.createElement('input');
    cbNum.type = 'checkbox';
    cbNum.id = 'rz-opt-numbers';
    cbNum.className = 'rz-opt-cb';
    optNum.appendChild(cbNum);
    optNum.appendChild(el('span', 'rz-opt-text', 'Romanize numbers'));

    var optNL = el('label', 'rz-opt');
    var cbNL = document.createElement('input');
    cbNL.type = 'checkbox';
    cbNL.id = 'rz-opt-linebreak';
    cbNL.className = 'rz-opt-cb';
    optNL.appendChild(cbNL);
    optNL.appendChild(el('span', 'rz-opt-text', 'Line-break phrases'));

    var optKT = el('label', 'rz-opt');
    var cbKT = document.createElement('input');
    cbKT.type = 'checkbox';
    cbKT.id = 'rz-opt-keepthai';
    cbKT.className = 'rz-opt-cb';
    optKT.appendChild(cbKT);
    optKT.appendChild(el('span', 'rz-opt-text', 'Line-break + keep Thai'));

    opts.appendChild(optNum);
    opts.appendChild(optNL);
    opts.appendChild(optKT);
    inSec.appendChild(opts);

    view.appendChild(inSec);

    // ---- Output section: romanization ----
    var outSec = el('div', 'menu-section rz-section rz-out-section');
    outSec.id = 'rz-out-section';
    var outLabelRow = el('div', 'menu-section-label rz-out-label');
    outLabelRow.appendChild(el('span', null, 'Result'));
    var outTools = el('span', 'rz-out-tools');
    // Speaker + copy icons. Both carry classes excluded from the global menu
    // click sound (rz-speak / rz-copy handled in shouldPlayMenuClick exclusions
    // via the .v-speak-style pattern — we reuse v-speak so no core edit needed).
    var speakBtn = el('button', 'rz-icon-btn v-speak', '🔊');
    speakBtn.id = 'rz-speak';
    speakBtn.type = 'button';
    speakBtn.title = 'Play pronunciation';
    speakBtn.setAttribute('aria-label', 'Play pronunciation');
    var copyBtn = el('button', 'rz-icon-btn v-speak', '⧉');
    copyBtn.id = 'rz-copy';
    copyBtn.type = 'button';
    copyBtn.title = 'Copy romanization';
    copyBtn.setAttribute('aria-label', 'Copy romanization');
    outTools.appendChild(speakBtn);
    outTools.appendChild(copyBtn);
    outLabelRow.appendChild(outTools);
    outSec.appendChild(outLabelRow);

    var outBox = el('div', 'rz-output rz-output-empty', 'Your romanization will appear here.');
    outBox.id = 'rz-output';
    outSec.appendChild(outBox);
    view.appendChild(outSec);

    // ---- Breakdown section (Phase 1: hidden scaffold) ----
    var bdSec = el('div', 'menu-section rz-section rz-breakdown-section hidden');
    bdSec.id = 'rz-breakdown-section';
    bdSec.appendChild(el('div', 'menu-section-label', 'Word by word'));
    var bdList = el('div', 'rz-breakdown');
    bdList.id = 'rz-breakdown';
    bdSec.appendChild(bdList);
    view.appendChild(bdSec);

    // ---- Credit line (attribution for the bundled open data) ----
    var credit = el('div', 'menu-credit',
      'Data: PyThaiNLP (CC0), TLTK (BSD), Volubilis (CC BY-SA 4.0).');
    view.appendChild(credit);

    // ---- Wire interactions ----
    goBtn.addEventListener('click', runRomanize);
    clearBtn.addEventListener('click', function () {
      ta.value = '';
      setOutput('', []);
      ta.focus();
    });
    // Ctrl/Cmd+Enter runs romanize from the textarea (Enter alone adds newlines).
    ta.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runRomanize();
      }
    });
    speakBtn.addEventListener('click', speakOutput);
    copyBtn.addEventListener('click', copyOutput);

    // Option checkboxes: update the flags only. The values are read when the
    // user next presses "Go", so toggling doesn't re-render existing output.
    // The two line-break options are mutually exclusive (ticking one unticks the
    // other); "Romanize numbers" is independent and combines freely with either.
    cbNum.addEventListener('change', function () { _optRomanizeNumbers = !!cbNum.checked; });
    cbNL.addEventListener('change', function () {
      _optLineBreakPhrases = !!cbNL.checked;
      if (cbNL.checked && cbKT.checked) { cbKT.checked = false; _optLineKeepThai = false; }
    });
    cbKT.addEventListener('change', function () {
      _optLineKeepThai = !!cbKT.checked;
      if (cbKT.checked && cbNL.checked) { cbNL.checked = false; _optLineBreakPhrases = false; }
    });

    // Per-word speaker icons in the breakdown (delegated, so it covers rows that
    // are rebuilt on every romanize). Speaks just that word's Thai.
    bdList.addEventListener('click', function (e) {
      var b = e.target.closest('.rz-bd-speak');
      if (!b || !bdList.contains(b)) return;
      var thai = b.getAttribute('data-thai') || '';
      if (thai && typeof tts !== 'undefined' && tts && tts.supported) {
        tts.speak(thai, b);
        try { if (typeof haptic === 'function') haptic(10); } catch (e2) {}
      }
    });

    // Expand/collapse a word's component breakdown (delegated). The ONLY trigger
    // is the dedicated "Break down" pill button (data-parts-toggle); the head text
    // is not clickable, so selecting/copying the Thai or romanization never toggles
    // anything. Toggling is a pure class flip on the row, so open/closed state
    // never causes overlap and many rows can be open independently. Being a native
    // <button>, it also responds to Enter/Space without a separate key handler.
    bdList.addEventListener('click', function (e) {
      var btn = e.target.closest('.rz-bd-parts-btn[data-parts-toggle]');
      if (!btn || !bdList.contains(btn)) return;
      var row = btn.closest('.rz-bd-has-children');
      if (!row) return;
      var open = row.classList.toggle('rz-bd-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      try { if (typeof haptic === 'function') haptic(8); } catch (e2) {}
    });

    // Per-menu font-size slider (Dictionary only). Mirrors the Grammar menu: the
    // input updates state.romanizerTextScale and applyRomanizerTextScale() sets
    // the scoped --rz-text variable + persists. Both live in the main script
    // (index.html); we call them defensively in case the engine loads standalone.
    var fSlider = document.getElementById('rz-text-slider');
    if (fSlider) {
      fSlider.addEventListener('input', function () {
        var n = parseInt(fSlider.value, 10);
        if (isFinite(n) && typeof state !== 'undefined' && typeof applyRomanizerTextScale === 'function') {
          state.romanizerTextScale = n;
          applyRomanizerTextScale();
          if (typeof saveStorage === 'function') { try { saveStorage(); } catch (e) {} }
        }
      });
    }
    if (typeof applyRomanizerTextScale === 'function') applyRomanizerTextScale();

    // Tappable Thai in the header subtitle (พจนานุกรม), like other menus.
    if (typeof wireThaiTapToSpeak === 'function') {
      wireThaiTapToSpeak(view, '.screen-rom .th');
    }
  }

  // ---- Mixed-input processing ---------------------------------------------
  // Splits the whole input into runs and routes each: Thai runs are romanized/
  // broken down; English runs are reverse-searched. Newlines are hard breaks
  // (each line handled independently), matching the Thai behavior.
  // Token stream understood by tokensToRom() and renderBreakdown():
  //   Thai path reuses: word / unknown / space / newline / punct / raw
  //   English path adds: { type:'query', text, results:[thaiKey...] }
  function isEnglishWordChar(ch) {
    // ASCII letters/digits/apostrophe/hyphen, plus any non-ASCII letter-like character
    // (accented Latin such as í á ê ñ ø, and Paiboon+ tone-marked vowels like ê ô à ĕ ŏ).
    // These must stay glued into the surrounding Latin/romanization run instead of being
    // split off as stray punctuation, which previously broke words like "Debí" and echoed
    // romanized search input as "m ê ua". Thai, whitespace, and ASCII punctuation are
    // deliberately excluded so their handling is unchanged.
    if (/[a-zA-Z0-9'\-]/.test(ch)) return true;
    var c = ch.charCodeAt(0);
    if (c < 0x00A0) return false;              // ASCII controls/space/punctuation: unchanged
    if (c >= 0x0E00 && c <= 0x0E7F) return false;  // Thai block: not a Latin word char
    return /[\p{L}\p{M}]/u.test(ch);         // other Unicode letters / combining marks
  }

  function buildMixedTokens(text) {
    var tokens = [];
    if (!text) return tokens;
    var n = text.length, i = 0;

    // Whether the input contains ANY Thai. When it does, embedded Latin runs are
    // treated as foreign words/names that happen to sit inside Thai text: they are
    // echoed as-is in the romanization but NOT reverse-searched, so the word-by-word
    // breakdown isn't flooded with unrelated Thai matches for an English word (e.g.
    // "water" inside a Thai sentence). A PURELY Latin input keeps reverse-search, so
    // the tool still works as a romanized-to-Thai lookup. This never changes the
    // romanization RESULT line — a query and a raw token echo identically there.
    var inputHasThai = /[\u0E00-\u0E7F]/.test(text);

    // Force-inline state: a straight double-quote toggles it. Tokens created
    // while it's on are tagged forceInline, so the line-break modes keep them
    // joined with " · " instead of splitting them onto new lines. The quote
    // characters themselves are consumed (never shown). An unclosed quote simply
    // stays "on" until the end of the input or the next hard line break.
    var insideQuotes = false;
    // Helper: push a token, tagging it if we're inside a quoted span.
    function push(tok) {
      if (insideQuotes) tok.forceInline = true;
      tokens.push(tok);
    }

    while (i < n) {
      var ch = text[i];

      // Straight double-quote: an invisible marker that toggles inline mode.
      if (ch === '"') { insideQuotes = !insideQuotes; i++; continue; }

      // Newline run -> hard break. Also resets quote state so an unclosed quote
      // can't bleed across lines.
      if (/[\r\n]/.test(ch)) {
        var s0 = i;
        while (i < n && /\s/.test(text[i])) i++;
        insideQuotes = false;
        tokens.push({ type: 'newline', text: text.slice(s0, i) });
        continue;
      }

      // Thai numeral run (๐–๙): treated like an Arabic-digit number. It becomes a
      // word token carrying the Thai digits and their per-digit romanization (tagged
      // isNumber), so the breakdown always shows "digits + romanization" and the
      // RESULT line shows digits or romanization per the "Romanize numbers" option.
      // A Thai-numeral string that is itself a dictionary entry keeps its entry.
      if (ch >= '\u0E50' && ch <= '\u0E59') {
        var tds = i;
        while (i < n && text[i] >= '\u0E50' && text[i] <= '\u0E59') i++;
        var tdRun = text.slice(tds, i);
        var dd = dict();
        if (dd && Object.prototype.hasOwnProperty.call(dd, tdRun)) {
          push({ type: 'word', thai: tdRun, rom: dd[tdRun], meanings: lookupMeanings(tdRun) });
        } else {
          push({ type: 'word', thai: tdRun, rom: readThaiNumber(tdRun), meanings: [], isNumber: true });
        }
        continue;
      }

      // Repetition mark ๆ that appears on its own at the mixed-token level — most
      // commonly the SPACED form "เด็ก ๆ" (standard Thai typography), where the space
      // splits it from its word so the pure-Thai tokenizer never sees them together.
      // Repeat the previous emitted word's romanization (reaching back across a single
      // space). Contiguous forms (เด็กๆ) are still handled inside buildTokens; an orphan
      // ๆ with no preceding word falls through to the normal path unchanged.
      if (ch === '\u0E46') {
        var yp = null;
        for (var yk = tokens.length - 1; yk >= 0; yk--) {
          if (tokens[yk].type === 'space') continue;
          if (tokens[yk].type === 'word') yp = tokens[yk];
          break;
        }
        if (yp && yp.rom) {
          push({ type: 'word', thai: ch, rom: yp.rom, meanings: lookupMeanings(ch) });
          i += 1;
          continue;
        }
      }

      // Thai run -> hand to the existing Thai tokenizer, splice its tokens in.
      // We also keep an abbreviation dot INSIDE the run: a "." whose preceding char
      // is Thai (พล.อ., กกต., พ.ศ., น.) so the whole abbreviation reaches buildTokens,
      // which resolves it against the dictionary. Without this, the run would stop at
      // the first dot and each Thai letter would be looked up (and stranded) on its
      // own. Dot-free Thai is unaffected (the extra clause never fires); a Latin URL
      // like www.com never enters this branch; a decimal like 18.15 is handled by the
      // digit path; and a plain sentence-ending "ครับ." still romanizes correctly
      // because buildTokens emits the word and treats the trailing dot as punctuation.
      if (isThaiChar(ch)) {
        var ts = i;
        while (i < n) {
          var cc = text[i];
          if (isThaiChar(cc) || cc === '\u0E46' ||
              (cc === '.' && i > ts && isThaiChar(text[i - 1]))) { i++; continue; }
          // Cross a single internal space ONLY when the run so far is a space-terminated
          // prefix of a spaced dictionary key AND the character right after the space is
          // a real Thai letter — never the repetition mark ๆ. Gating out ๆ preserves the
          // existing (desired) rendering of "word ๆ" as two tokens with a repeated
          // romanization (handled by the ๆ branch below) for forms that AREN'T a baked
          // key. A run that DOES continue into a spaced key (e.g. "สมรักษ์ คำสิงห์")
          // absorbs the space so the whole span reaches buildTokens, which matches the
          // spaced key atomically.
          if (cc === ' ' && text[i + 1] !== undefined &&
              isThaiChar(text[i + 1]) && text[i + 1] !== '\u0E46' &&
              isSpacedKeyPrefix(text.slice(ts, i))) {
            i++; continue;
          }
          // Exact spaced-key wins over ๆ auto-repeat: when "run + space + ๆ" is itself
          // a dictionary key (e.g. "ใจเย็น ๆ" -> "jai-yen yen", "ต่าง ๆ"), absorb the
          // space + ๆ so the whole span reaches buildTokens and matches the baked key
          // atomically, letting the curated romanization win. Only fires on an EXACT
          // key match; a spaced "word ๆ" with no key still falls through to the ๆ branch
          // and repeats as before (so "เด็ก ๆ" etc. are unchanged). The dictionary is
          // the single source of truth here.
          if (cc === ' ' && text[i + 1] === '\u0E46') {
            var dY = dict();
            if (dY && Object.prototype.hasOwnProperty.call(dY, text.slice(ts, i) + ' \u0E46')) {
              i += 2; continue;
            }
          }
          break;
        }
        var thaiTokens = buildTokens(text.slice(ts, i));
        for (var t = 0; t < thaiTokens.length; t++) push(thaiTokens[t]);
        continue;
      }

      // English run (letters/digits, spaces allowed inside) -> reverse search.
      // Exception: a pure-digit group (e.g. "555" = hahaha) is Thai internet
      // slang, never an English word, so we break the run at any boundary
      // between letters and a digit group. That lets the digit group fall
      // through and be matched against the dictionary on its own below.
      if (isEnglishWordChar(ch)) {
        var es = i;
        var startsDigit = /[0-9]/.test(ch);
        while (i < n) {
          var c2 = text[i];
          if (/[\r\n]/.test(c2) || isThaiChar(c2)) break;
          // Keep a decimal point inside a digit run: a "." flanked by digits
          // (18.15, 3.5) stays part of the number instead of splitting it.
          if (startsDigit && c2 === '.' && /[0-9]/.test(text[i - 1] || '') && /[0-9]/.test(text[i + 1] || '')) { i++; continue; }
          // Keep a thousands-separator comma inside a digit run: a "," flanked by
          // digits (1,500) stays part of the number. readThaiNumber strips clean
          // groups of three, and the isNumber path shows raw digits or the cardinal
          // reading per the "Romanize numbers" option, so the toggle still applies.
          if (startsDigit && c2 === ',' && /[0-9]/.test(text[i - 1] || '') && /[0-9]/.test(text[i + 1] || '')) { i++; continue; }
          // Break where a digit run meets letters or vice-versa, so "555"
          // separates from adjacent words like "Peter".
          if (/[0-9]/.test(c2) !== startsDigit) break;
          if (isEnglishWordChar(c2) || c2 === ' ' || c2 === '\t') { i++; continue; }
          break;
        }
        var run = text.slice(es, i).trim();
        if (run) {
          var d = dict();
          if (d && Object.prototype.hasOwnProperty.call(d, run)) {
            // Dictionary hit wins first — this keeps "555" = hahaha and any other
            // digit-string that is a real dictionary entry.
            push({ type: 'word', thai: run, rom: d[run], meanings: lookupMeanings(run) });
          } else if (isDigitStr(run.replace(/[.,]/g, ''))) {
            // A plain number (not a dictionary entry) is always a word token — never
            // an English search query. It carries both the digits (thai) and their
            // Thai cardinal romanization (rom), tagged isNumber so the RESULT line can
            // show digits or romanization depending on the "Romanize numbers" option,
            // while the word-by-word breakdown always shows "digits + romanization".
            push({ type: 'word', thai: run, rom: readThaiNumber(run), meanings: [], isNumber: true });
          } else if (inputHasThai) {
            // Foreign word/name embedded in Thai text: echo it verbatim in the
            // romanization (same as a query would) but skip the reverse search so it
            // doesn't pollute the breakdown with unrelated Thai words.
            push({ type: 'raw', text: run });
          } else {
            push({ type: 'query', text: run, results: reverseSearchRun(run) });
          }
        }
        continue;
      }

      // Whitespace (non-newline).
      if (/\s/.test(ch)) {
        var ss = i;
        while (i < n && /\s/.test(text[i]) && !/[\r\n]/.test(text[i])) i++;
        push({ type: 'space', text: text.slice(ss, i) });
        continue;
      }

      // Other punctuation/symbols -> pass through.
      var rs = i;
      while (i < n && !isThaiChar(text[i]) && !isEnglishWordChar(text[i]) && !/\s/.test(text[i]) && text[i] !== '"') i++;
      push({ type: 'raw', text: text.slice(rs, i) });
    }
    return tokens;
  }

  // Reverse-search one English run: whole phrase first; if nothing and the run
  // has multiple words, fall back to searching each word.
  function reverseSearchRun(run) {
    var hits = reverseSearch(run, 15);
    if (hits.length) return hits;
    if (run.indexOf(' ') !== -1) {
      var perWord = [], seen = Object.create(null);
      run.split(/\s+/).forEach(function (w) {
        reverseSearch(w, 8).forEach(function (thai) {
          if (!seen[thai]) { seen[thai] = 1; perWord.push(thai); }
        });
      });
      return perWord.slice(0, 15);
    }
    return [];
  }

  // ---- Actions ------------------------------------------------------------
  var _lastTokens = [];
  var _lastRom = '';

  function runRomanize() {
    var ta = document.getElementById('rz-input');
    if (!ta) return;
    var text = ta.value || '';
    if (!text.trim()) { setOutput('', []); return; }
    if (!dict()) {
      setOutputRaw('The dictionary didn\u2019t load. Reopen the app and try again.', true);
      return;
    }
    var tokens = buildMixedTokens(text);
    var rom = tokensToRom(tokens);
    setOutput(rom, tokens);
    try { if (typeof haptic === 'function') haptic(10); } catch (e) {}
  }

  function setOutput(rom, tokens) {
    _lastTokens = tokens || [];
    _lastRom = rom || '';
    var box = document.getElementById('rz-output');
    if (!box) return;
    if (!rom) {
      box.textContent = 'Your romanization will appear here.';
      box.classList.add('rz-output-empty');
    } else {
      box.textContent = rom;
      box.classList.remove('rz-output-empty');
    }
    renderBreakdown(_lastTokens);
  }

  // For error/status messages that aren't a romanization result.
  function setOutputRaw(msg, isError) {
    _lastTokens = [];
    _lastRom = '';
    var box = document.getElementById('rz-output');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('rz-output-empty');
    if (isError) box.classList.add('rz-output-error'); else box.classList.remove('rz-output-error');
    renderBreakdown([]);
  }

  function speakOutput() {
    // Speak the ORIGINAL Thai (not the romanization) so pronunciation is real.
    var ta = document.getElementById('rz-input');
    var thai = ta ? (ta.value || '') : '';
    // Keep only Thai + spaces for the TTS engine.
    thai = thai.replace(/[^\u0E00-\u0E7F\s]/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!thai) return;
    var btn = document.getElementById('rz-speak');
    if (typeof tts !== 'undefined' && tts && tts.supported) {
      tts.speak(thai, btn);
      try { if (typeof haptic === 'function') haptic(12); } catch (e) {}
    }
  }

  // Convert the result text into a clipboard-friendly form.
  //
  // On screen the output uses plain "\n" everywhere (see tokensToRomKeepThai),
  // which `white-space: pre-wrap` renders correctly. But word processors and
  // slide apps (PowerPoint, Word, Google Slides) map "\n" to a NEW PARAGRAPH,
  // so a pasted "rom / Thai" pair lands as two separate paragraphs and has to be
  // rejoined by hand (backspace + shift+enter).
  //
  // U+000B (vertical tab) is exactly what shift+enter inserts in those apps: a
  // SOFT line break inside the same paragraph. So, for the "Line-break + keep
  // Thai" layout, the lines WITHIN a block (rom, then its Thai) are joined with
  // "\v", while the blank line BETWEEN blocks stays a real paragraph break.
  //
  // Blocks are separated by a blank line, so splitting on /\n\s*\n/ recovers the
  // exact block structure. Single-line blocks (plain romanization, "Line-break
  // phrases" mode, English query echoes) contain no inner newline, so they pass
  // through completely unchanged — this is a no-op for every mode except
  // keep-Thai. Display and _lastRom are never touched.
  function toClipboardText(s) {
    if (!s) return s;
    if (s.indexOf('\n') === -1) return s;   // nothing to do
    return s.split(/\n[ \t]*\n/).map(function (block) {
      return block.split('\n').join('\v');
    }).join('\n\n');
  }

  function copyOutput() {
    if (!_lastRom) return;
    var btn = document.getElementById('rz-copy');
    var text = toClipboardText(_lastRom);
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = '✓';
      btn.classList.add('rz-copied');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('rz-copied'); }, 1200);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallbackCopy);
      } else {
        fallbackCopy();
      }
    } catch (e) { fallbackCopy(); }

    function fallbackCopy() {
      try {
        var tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        done();
      } catch (e2) { /* give up silently */ }
    }
  }

  // ---- Breakdown: word-by-word Thai + rom + English meanings --------------
  // Grouping rules (agreed design):
  //   • newline  -> hard break: start a NEW sentence block (divider).
  //   • sentence punctuation (. ! ? ; ฯ …) -> hard break too.
  //   • plain space -> SOFT break: a subtle gap between word-groups inside the
  //     same sentence (spaces are ambiguous in Thai, so we don't over-split).
  // Each word row has its own speaker icon that speaks just that word.
  function renderBreakdown(tokens) {
    var sec = document.getElementById('rz-breakdown-section');
    var list = document.getElementById('rz-breakdown');
    if (!sec || !list) return;

    if (!BREAKDOWN_ENABLED) { sec.classList.add('hidden'); return; }

    // Split the token stream into blocks. A "sentence" block holds Thai word
    // groups; a "query" block holds one English search + its Thai results.
    var blocks = [];            // each: {kind:'thai', sentence:[groups]} | {kind:'query', token}
    var curSentence = [];
    var curGroup = [];

    function flushGroup() {
      if (curGroup.length) { curSentence.push(curGroup); curGroup = []; }
    }
    function flushSentence() {
      flushGroup();
      if (curSentence.length) { blocks.push({ kind: 'thai', sentence: curSentence }); curSentence = []; }
    }

    tokens.forEach(function (t) {
      if (t.type === 'word' || t.type === 'unknown') {
        curGroup.push(t);
      } else if (t.type === 'space') {
        flushGroup();              // soft break within a sentence
      } else if (t.type === 'newline' || t.type === 'punct') {
        flushSentence();           // hard break -> new sentence
      } else if (t.type === 'query') {
        flushSentence();           // English query is its own block
        blocks.push({ kind: 'query', token: t });
      } else if (t.type === 'raw') {
        flushGroup();              // stray symbols: ignore for breakdown
      }
    });
    flushSentence();

    if (!blocks.length) { sec.classList.add('hidden'); list.innerHTML = ''; return; }

    // "Single matching entry" input: exactly one Thai block, one group, one word
    // token — i.e. the user searched for just one word/phrase. In that case its
    // components auto-expand (as if the user had already tapped it).
    var soleWord = null;
    if (blocks.length === 1 && blocks[0].kind === 'thai' &&
        blocks[0].sentence.length === 1 && blocks[0].sentence[0].length === 1 &&
        blocks[0].sentence[0][0].type === 'word') {
      soleWord = blocks[0].sentence[0][0];
    }

    list.innerHTML = '';
    blocks.forEach(function (blk, bi) {
      if (bi > 0) list.appendChild(el('div', 'rz-bd-divider'));
      if (blk.kind === 'thai') {
        var block = el('div', 'rz-bd-sentence');
        blk.sentence.forEach(function (group, gi) {
          if (gi > 0) block.appendChild(el('span', 'rz-bd-gap'));
          group.forEach(function (t) {
            block.appendChild(buildWordRow(t, { allowChildren: true, autoExpand: (t === soleWord) }));
          });
        });
        list.appendChild(block);
      } else {
        list.appendChild(buildQueryBlock(blk.token));
      }
    });

    sec.classList.remove('hidden');
  }

  // Render one English search: a header showing the query, then a Thai result
  // row for each hit (reusing the same row layout, so per-word TTS still works).
  function buildQueryBlock(token) {
    var wrap = el('div', 'rz-bd-sentence rz-bd-query');
    var header = el('div', 'rz-bd-query-head');
    header.appendChild(el('span', 'rz-bd-query-label', 'Search'));
    header.appendChild(el('span', 'rz-bd-query-term', '\u201C' + escapeHtml(token.text) + '\u201D'));
    wrap.appendChild(header);

    var results = token.results || [];
    if (!results.length) {
      wrap.appendChild(el('div', 'rz-bd-meanings rz-bd-none', 'no Thai match found'));
      return wrap;
    }
    var d = dict();
    results.forEach(function (thai) {
      wrap.appendChild(buildWordRow({
        type: 'word',
        thai: thai,
        rom: (d && d[thai]) ? d[thai] : '',
        meanings: lookupMeanings(thai)
      }, { allowChildren: true }));
    });
    return wrap;
  }

  // Build one breakdown row. `opts` (optional) controls the expandable component
  // feature and is only passed by the top-level breakdown callers:
  //   opts.allowChildren : if the word decomposes, make the row expandable and
  //                        attach a (hidden) child container of component rows.
  //   opts.autoExpand    : start expanded (used when the whole input is a single
  //                        matching entry). Ignored if there are no components.
  // Child rows are themselves built WITHOUT opts, so they are never expandable —
  // this enforces the single parent->child level by construction.
  function buildWordRow(t, opts) {
    opts = opts || {};
    var row = el('div', 'rz-bd-row');

    // Resolve components up front (only when allowed), so we know whether this
    // row is expandable before we build the head.
    var comps = (opts.allowChildren && (t.type === 'word' || t.type === 'unknown'))
      ? getComponents(t.thai) : null;
    var expandable = !!(comps && comps.length);

    var head = el('div', 'rz-bd-head');
    var thaiSpan = el('span', 'rz-bd-thai th', escapeHtml(t.thai));
    head.appendChild(thaiSpan);
    if (t.rom) head.appendChild(el('span', 'rz-bd-rom', escapeHtml(t.rom)));

    // Per-word speaker icon (excluded from the menu-click sound via .v-speak).
    var spk = el('button', 'rz-bd-speak v-speak', '🔊');
    spk.type = 'button';
    spk.title = 'Play word';
    spk.setAttribute('aria-label', 'Play word');
    spk.setAttribute('data-thai', t.thai);
    head.appendChild(spk);

    // The ONLY toggle for the component breakdown: a compact icon button that
    // matches the speaker icon and sits beside it. Made an explicit control so
    // selecting/copying the Thai or romanization text can never accidentally
    // expand a word. .v-speak keeps it out of the menu-click sound. It shows a
    // bold filled chevron (down when collapsed); CSS rotates it to point up and
    // fills the button when the row is open, so the state is obvious at a glance.
    if (expandable) {
      var partsBtn = el('button', 'rz-bd-parts-btn v-speak',
        '<span class="rz-bd-parts-chev" aria-hidden="true">\u25bc</span>');
      partsBtn.type = 'button';
      partsBtn.setAttribute('data-parts-toggle', '1');
      partsBtn.setAttribute('aria-expanded', opts.autoExpand ? 'true' : 'false');
      partsBtn.setAttribute('aria-label', 'Show component words');
      partsBtn.title = 'Show component words';
      head.appendChild(partsBtn);
    }

    row.appendChild(head);

    var rawArr = (t.meanings && t.meanings.length) ? t.meanings : [];
    var meanings = realMeanings(rawArr);
    if (meanings.length) {
      var ml = el('div', 'rz-bd-meanings');
      meanings.forEach(function (m, idx) {
        ml.appendChild(el('span', 'rz-bd-meaning',
          '<span class="rz-bd-num">[' + (idx + 1) + ']</span> ' + escapeHtml(m)));
      });
      row.appendChild(ml);
    } else {
      row.appendChild(el('div', 'rz-bd-meanings rz-bd-none',
        t.type === 'unknown' ? 'not in dictionary' : 'no meaning listed'));
    }

    // Optional usage note, shown below the meanings. Newlines in the note are
    // preserved (CSS white-space: pre-wrap). Thai inside stays tap-to-speak-free
    // here — it's explanatory prose, so we just escape and display it.
    var note = noteText(rawArr);
    if (note) {
      row.appendChild(el('div', 'rz-bd-comment', escapeHtml(note)));
    }

    // Component children: a container that visually reads as belonging to this
    // row (indented, bracketed by CSS). Built once, toggled via a class so there
    // is no re-render and no possibility of overlap — expanding simply grows the
    // row in normal flow and pushes siblings down.
    if (expandable) {
      row.classList.add('rz-bd-has-children');
      if (opts.autoExpand) row.classList.add('rz-bd-open');
      var kids = el('div', 'rz-bd-children');
      comps.forEach(function (c) { kids.appendChild(buildWordRow(c)); });
      row.appendChild(kids);
    }

    return row;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- Public entry point, called by navigate() ---------------------------
  window.renderRomanizer = function () {
    buildView();
    // Focus the input for quick typing (deferred so the view is visible first).
    setTimeout(function () {
      var ta = document.getElementById('rz-input');
      if (ta) ta.focus();
    }, 50);
  };

  /* ---- Headless romanization API ------------------------------------------
     Added for the Vocabulary "My Words" feature: the Add-word dialog needs the
     SAME romanization this menu produces, but as a plain string, with no DOM,
     no breakdown, and no side effects on this module's view state.

     Why this wrapper exists rather than calling buildMixedTokens/tokensToRom
     directly: the three user options below are MODULE-LEVEL and STICKY. They
     are set by the checkboxes in buildView() and are never reset, so a learner
     who ticks "Keep Thai" here and then adds a vocabulary word would otherwise
     get a two-line rom+Thai block written into their romanization field. We
     therefore force all three to their defaults for the duration of the call
     and restore the learner's real choices in a finally block, so this menu's
     own behaviour is bit-for-bit unchanged either way.

     Returns '' for empty input, or if the dictionary failed to load — callers
     treat '' as "leave the field alone and let the user type". Never throws. */
  window.romanizeThaiText = function (text) {
    if (typeof text !== 'string' || !text.trim()) return '';
    if (!dict()) return '';
    var savedNum = _optRomanizeNumbers;
    var savedNL  = _optLineBreakPhrases;
    var savedKT  = _optLineKeepThai;
    try {
      _optRomanizeNumbers  = false;
      _optLineBreakPhrases = false;
      _optLineKeepThai     = false;
      return tokensToRom(buildMixedTokens(text)) || '';
    } catch (e) {
      return '';
    } finally {
      _optRomanizeNumbers  = savedNum;
      _optLineBreakPhrases = savedNL;
      _optLineKeepThai     = savedKT;
    }
  };
})();
