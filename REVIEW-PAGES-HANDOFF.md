# Lesson review pages — handoff (for Claude, not the owner)

Written at the end of the session that fixed **Lesson 1** (October 2026). You are being asked
to bring another lesson's review page (Lessons 2–8) to exactly the same standard. The owner
will attach: **this file**, the **fixed Lesson 1 `index.html`** (your REFERENCE — every line
of the new code lives there) and **Lesson X's `index.html`**. The owner expects the result
to be the same and consistent with Lesson 1 without re-explaining anything, so read this
whole file before touching code.

---

## 0. The job, and how the session should go

1. **Read Lesson X's page completely.** Then make an inventory and post it as your first short
   reply (not a question list, just "here is what I found and will do"):
   - every `.player[data-src]` (file, part, title) and which carry `data-waveform="true"`;
   - the listen-and-repeat (vocabulary) track, the vocabulary list (`VOCAB` array, list id),
     and whether there is an **English → Thai pairs** track (and any other long track);
   - `AUDIO_VERSION` value (Lesson 1's old code comment says Lessons 2 and 4 already apply it to
     every player — whatever the value is, **keep it**);
   - part numbering and any text that refers to part numbers;
   - anything in its player code that the Lesson 1 *original* did not have (see §3 for what
     the original looked like) — a feature you must not silently drop.
2. **Ask for the long MP3s if they are not attached**: the vocabulary track and the pairs track.
   You need them to measure `PAIR_CUES` and to check the word count. Short clips are not needed
   (fake them for tests — Appendix C header).
3. Port (§5), measure (§6), test (§7), audit the diff (§7), deliver (§8).
4. Stop and ask before inventing anything when Lesson X does not fit the pattern: a pairs track
   that is not strict English→Thai alternation, a vocabulary track whose word count ≠ list rows,
   old player code with extra features, a different settings panel, etc.

This porting job is **pre-approved** by the owner ("lets fix lesson X the same way") — no
proposal round needed unless something does not fit.

## 1. Owner and house rules

- The owner runs thai-course.com (the course teacher is Naruemon Rintha, "Kroo Apple"). Detail-oriented, deploys
  everything himself on Cloudflare, prefers concise replies with a clear verification summary.
- **Zero-risk changes. Verify nothing else was modified or lost** — he asks for this every time.
- **Send only the edited files** (the page, plus any MP3 you remuxed). Never zip the folder.
- **Never change version numbers.** (Main-app rule. On these pages the nearest thing is
  `AUDIO_VERSION`: keep Lesson X's value.)
- Do not redesign or reword content. The only text changes allowed are the ones listed in §5
  (part-number references, "Click" → `<span class="js-tap">Click</span>`, the Thinking-time
  sentence). Anything else: ask.
- Say plainly what could not be tested here (real iPhones; see §9).

## 2. Background facts

- Static files on Cloudflare (same account as the app), **no service worker** on these pages.
  Each lesson is one folder: a single-file `index.html` + its PNG/JPG images + MP3s.
- Lessons 1–6: `https://thai-course.com/reviews/lesson_N_…` (public: Cloudflare Access
  *bypass* — intentional, never raise it). Lesson 7 onward: `/review/…` (singular), behind the
  app's Access whitelist. URLs as of Oct 2026: lesson_1_first_meeting, lesson_2_self_introduction,
  lesson_3_numbers, lesson_4_age_and_tones, lesson_5_simple_sentences, lesson_6_questions.
- The sandbox cannot reach thai-course.com (proxy 403). Reproduce server behaviour locally.
- Page anatomy (same on all lessons, written months ago by an earlier model): sticky topbar
  (`.tb-lesson` = "Lesson N · Review") with a settings panel (themes Warm/Paper/Dark, text-size
  slider `--tx`), hero, TOC (`.contents` → `#part-N`), `<section class="part" id="part-N">` with
  `.part-eyebrow` "Part 0N", footer. localStorage keys are per lesson (`thaiL1Theme`, `thaiL1Text`,
  `thaiL1Name`, `thaiL1Gender`) — keep Lesson X's own.
- Lesson 1 only (do NOT port): Part 2 "The wai" (`.wai-*` CSS, `.part-head .th-word`, wai.jpg,
  sawatdee-krap.mp3, kop-kun-krap.mp3) and Lesson 1's `VOCAB`/`PAIR_CUES` data.

## 3. What was wrong — expect the same on every page

**A. Simple player restarts when you click the bar (critical).** On a Cloudflare cache miss a
Range request is answered with the whole file as a plain **200**. Chrome then marks the media
`seekable = [0,0]` — even after the whole clip has arrived — so every bar click / arrow key
restarts from 0:00 (reproduced: 6 s clip, click at 75 % → 1.13 s). Same root cause as the main
app's Listening bug (Cloudflare doc: cache/reference/range-requests). **Fix: download the whole
file with fetch (no Range), play it from a Blob URL** — blob media is always seekable.
Original code to recognise: `function buildPlayer(el)` with `new Audio()`, `preload='metadata'`,
`audio.src = src`, and on error the text `Audio not added yet (` + src + `)`.

**B. Waveform player (listen-and-repeat) weaknesses.** It already downloads the whole file
(Web Audio `decodeAudioData`), so seeking was fine, but: fetched at page open (even if never
reached); disabled ▶ with a bare "Loading audio…" (6–12 s on a slow line, no %); iPhone ring/
silent switch mutes Web Audio while `<audio>` clips still play; on any failure it fell back to
the buggy simple player. Original code: `function buildWavePlayer(el)` → `fetch(url)` →
`decodeAudioData` → `.then(onDecoded).catch(fallback)`, play button created `disabled`.

**C. English → Thai pairs track on the simple player.** Just switching it to the waveform
player does NOT work: the page's own auto-detection (`analyseSegments`) merges the whole pairs
track into ONE item (the answering pause, ~1.1–2.6 s, is barely longer than the breaths inside
"Hello (male speaker)"), so ⏮/⏭/Loop are disabled. **Fix: pairs mode driven by hand-measured
timings (`PAIR_CUES`)**, measured with Appendix B.

**D. Theme swatches look broken.** `.theme-opt .sw` had `border: 1px solid` + a hard-stop
`linear-gradient(135deg …)`: the gradient (sized to the padding box) repeats into the border and
draws a stray strip of the opposite colour on the top/bottom/left edges. **Fix:** no border,
`box-shadow: inset 0 0 0 1px var(--shadow)`, `background-repeat: no-repeat`, stops at
`calc(50% ± 0.5px)` for a smooth diagonal.

**E. Phone ergonomics.** 6 px seek bar (tiny target, click only); waveform canvas had
`touch-action: none` (a swipe starting on it could not scroll the page); waveform buttons wrapped
into ragged rows; small buttons.

**F. Missing polish.** No favicon; phones' lock screen showed a bare file name; "Click" on touch
screens; misleading "Audio not added yet" on any network hiccup (and the player stayed dead).

## 4. Target behaviour (what Lesson 1 does now)

- **Every recording** is fetched whole, once (shared per URL), and played from memory. Fetch
  starts when the player comes within 600 px of the viewport (IntersectionObserver), or on the
  first press. Prefetches go at `priority:'low'`, pressed files at `'high'`. ▶ pressed while
  loading → turning ring, starts by itself. `file://` / no fetch → stream as before. 404 or an
  HTML page in place of the file → "Recording not available" (file name in tooltip + console);
  network failure → "Couldn't load the audio — check your connection." + **Try again**.
- **Simple player:** 30 px touch zone around the visible 6 px line (negative margins keep the
  layout identical), draggable handle (pointer events, preview while dragging, `touch-action:
  pan-y` so vertical swipes still scroll), arrows ±2 s, 0.75× (`preservesPitch` native), Replay.
- **Waveform player:** lazy load with "Loading audio… N%" + a filling line on the canvas; ▶
  enabled while loading ("— it starts by itself"); `navigator.audioSession.type = 'playback'`
  (iPhone silent switch); every tap calls `ctx.resume()`; sample-exact scheduled stops
  (`node._until`) for single words and for "Wait for me"; canvas `touch-action: manipulation`.
- **Pairs mode** (`data-pairs="true"`): ⏮/⏭/Loop by pair, 0.75×, **Thinking time** (as recorded
  / 4 s / 6 s / 8 s / **Wait for me** — stops after each English prompt, ▶ plays the Thai);
  only the English→Thai pause is stretched; status "N pairs · pair 3 · English → your turn — say
  it in Thai → Thai"; English bars drawn quieter (ink-soft), answering pause tinted accent.
- **Vocabulary list** (`data-vocab-list="<id>"` on the vocabulary track): a speaker button per
  row plays just that word (cut from the track; while Loop is on it moves the loop); the row of
  the word being spoken lights up; buttons hide themselves if the track's word count ≠ rows.
- **Lock screen** (Media Session): title = the player's `data-title`, artist = `.tb-lesson`
  text, album "Thai Beginner Course", artwork = the golden-circle icon drawn to a PNG.
- **Phones:** waveform buttons in one even row (Replay icon-only ≤560 px, tighter ≤400 px; one
  row from 360 px up), `@media (pointer: coarse)` 34 px minimum button height; intro says "Tap".
- Favicon = the Student Portal's golden circle (data-URI SVG, one `<link>` line).

## 5. Porting recipe — block by block

Find every block in the Lesson 1 reference by its marker (line numbers drift; markers don't).
"Copy" means verbatim from the reference.

**HEAD**
- Copy the `<link rel="icon" href="data:image/svg+xml,…">` line (right after `<title>`).
- Update the header comment's file list if file names change (and mention PAIR CUES there).

**CSS** (replace the old rules where they exist; keep Lesson X's colour values if they differ)
1. SETTINGS PANEL: the comment + `.theme-opt .sw { … }` and the three `.sw-warm/.sw-paper/.sw-dark`
   lines (they now use `background-image` with `calc(50% - 0.5px)` stops).
2. AUDIO PLAYER: after `.play-btn:disabled` → the `svg.spin`, `@keyframes play-spin`,
   `.play-btn.is-waiting`, `@keyframes play-wait` block. Replace old `.player-bar`/`.player-fill`/
   `.player-foot` with the reference block from the "The seek bar." comment through
   `.player-foot > * { position: relative; }`. After `.player-error` → `.player-msg`,
   `.player-msg[hidden]`, `.player-retry`, and the `@media (pointer: coarse)` block.
3. WAVEFORM PLAYER: `.wave-canvas` → `touch-action: manipulation` (+ comment); after
   `.wave-select:focus-visible` → `.wave-retry`; after the existing `@media (max-width: 520px)`
   block → the `@media (max-width: 560px)` and `@media (max-width: 400px)` blocks.
4. VOCABULARY: `.vocab-item` gains `position: relative` and the box-shadow transition; then the
   `.vh-play / .has-audio / .has-play` rules, `.is-current` (+ `::before`), the whole
   `.vocab-play` block, and in the phone media block the `.has-play` grid lines and
   `.vocab-play svg` size. If Lesson X has no vocabulary list, skip 4.
5. Do NOT copy `.wai-*`, `.part-head .th-word` (Lesson 1 content).

**HTML**
- Hero: `Tip: Click the …` → `Tip: <span class="js-tap">Click</span> the …` (only if present).
- Vocabulary track: add `data-vocab-list="<list id>"` **only if §6 confirms one word per row**.
  Vocabulary header: prepend `<span class="vh-play"></span>` as its first child.
- Pairs track: `data-waveform="true" data-pairs="true"` (only strict English→Thai alternation).
- If the lesson has an "Extra challenge"-style tip for the pairs track, append to it the same
  sentence Lesson 1 uses: *If the pause feels too short, set **Thinking time** on the player to
  a longer pause, or to **Wait for me**: the player then stops after each English prompt until
  you tap ▶.* (Tell the owner you added it.)
- New file names only if the owner supplies re-exported tracks (§6).

**JS**
1. Vocabulary rendering: copy the `ICON_SPEAKER` declaration (with its comment) and add the
   `<button type="button" class="vocab-play" … hidden>` line as the first child of each row —
   compare with the reference `list.innerHTML = VOCAB.map(…)`. Keep Lesson X's VOCAB.
2. `PAIR_CUES` block: copy the comment, replace the data with your measurement (§6). If the
   lesson has no pairs track, still include `var PAIR_CUES = {};` (cueItems reads it).
3. Replace everything from the `AUDIO PLAYERS` banner through the end of `function audioUrl`
   with the reference. Keep Lesson X's `AUDIO_VERSION` value; reword its comment to fit.
4. Replace the WAVEFORM PLAYER doc comment with the reference's.
5. Keep `ICON_PREV/NEXT`, `audioCtx`, `waveRedraws`, `waveSeq`, and the SEGMENTATION and SLOW
   PLAYBACK functions — first **diff them against the reference; they should be byte-identical**
   (they share an ancestor: the comments cite "lesson 4"). If they differ, stop and understand why.
6. Insert the reference's `/* ==== PAIR CUES → items … ==== */` block after END SLOW PLAYBACK,
   then replace `function buildWavePlayer` through the init `forEach` with the reference's.
7. After the init `forEach`, copy the `WORD LIST ↔ VOCABULARY TRACK` block (`ICON_RING`,
   `linkVocab`, its `forEach`) and the `"CLICK" OR "TAP"` block.

Dependencies to confirm in Lesson X: `esc()` exists before the players (Lesson 1 defines it
right after VOCAB); `lessonImgFail` in `<head>`; a `.tb-lesson` element; `ICON_SPEAKER` defined
whenever `linkVocab` can run. Keep the page's ES5 style (`var`, `function`) — no `let`/arrows.

## 6. Per-lesson measurements (Appendix B: `review_tools.py`)

- **Remux** every long MP3 the owner attaches: `review_tools.py remux IN OUT` (lossless
  `-c:a copy` + Info header; it proves the audio frames are byte-identical). Audition exports
  have no Info header and run slightly under the nominal bitrate (191.7 kbps for "192"), so a
  streaming browser estimates seek positions (~0.15 % drift). Ship the remuxed file and measure
  on it. The owner now exports mono 192 kbps; his mono mixes came out ~3 dB quieter than the old
  stereo files (mention once if levels differ audibly from the short clips).
- **Vocabulary track:** `review_tools.py segments --page index.html VOCAB.mp3` runs the page's
  own detection in Chromium. Words found (after the lead-in) must equal `VOCAB.length`, in the
  same order (check durations against syllable counts). Equal → wire `data-vocab-list`. Not
  equal → do not wire; tell the owner which item(s) differ.
- **Pairs track:** `review_tools.py pairs --page index.html --vocab VOCAB.mp3 PAIRS.mp3`. It
  locates each vocabulary recording inside the pairs track (same takes score ≈ 1.0; Lesson 1:
  0.97–1.00, all 12 in order), takes what lies between answers as the English prompt and splits
  the intro off at the last ≥ 1 s pause. Paste the output into `PAIR_CUES` and fill each comment
  with the VOCAB entry (English + Thai), as in the reference. Check: pair count, answers in
  order, no "events after the last answer", plausible intro. If it reports NO MATCHES (new takes)
  the cues are an alternation guess: say so and ask the owner to step through with ⏭ once.
  Re-running the tool on Lesson 1 reproduces the shipped cues within ±0.02 s (16 kHz analysis) —
  irrelevant next to the 0.12 s/0.20 s padding the page adds.
- The `PAIR_CUES` key is exactly the `data-src` file name. New name ⇒ new key.
- Cache: browsers and Cloudflare keep old MP3s. A re-exported track gets a new file name (the
  owner uses `-v2`) or a bumped `AUDIO_VERSION` — pairs cues must never meet a stale file.

## 7. Verification (all of it, every time)

1. Syntax: every inline `<script>` through `new Function(...)` in node.
2. Test suite (Appendix C) with both servers (Appendix A): `NORANGE=1 node server.js 8766` (plain
   200 = the Cloudflare bug) and `node server.js 8765` (206). Adapt the Lesson-1-specific bits
   listed in its header. Lesson 1 result: 67/67. Covers: lazy loading; blob prefetch; click/drag/
   keyboard seek on the no-Range server; slow line (CDP throttling) with ▶ pressed early; waveform
   progress + queued play; pairs ⏮/⏭/Loop/Thinking time/Wait for me/Loop+Wait/0.75×; vocabulary
   buttons (single word, scheduled stop, highlight, loading ring); one-player-at-a-time; Media
   Session metadata; missing files; offline + Try again; Range server; `file://` fallback; console.
3. Visual (Playwright screenshots, read them): desktop 1280 and phone 390 (dpr 2, `has_touch`,
   `is_mobile`) of every part with a player; Warm/Paper/Dark; the settings panel swatches zoomed
   at 1× and 2×; waveform button rows at 320/360/390 px (one row expected from 360 px).
4. Diff audit against Lesson X's original: list every hunk; prove every region outside the
   planned blocks is verbatim (`old_chunk in new_text` per region); the script diff outside the
   player blocks must be empty; SEGMENTATION + SLOW PLAYBACK identical to the reference.
5. Console clean (in the sandbox, Google Fonts requests fail through the proxy — ignore those).

## 8. Delivery

Send `index.html` (+ remuxed MP3s) with SendUserFile. Reply briefly: what changed (one line per
area), deploy steps (which files, any new names, old files that can be deleted), test result
(e.g. "67/67 on a server that behaves like Cloudflare's cache miss"), and what is untested
(iPhone silent switch / gesture unlock / lock screen). No version numbers changed.

## 9. Gotchas that cost time

- `pkill -f "node server.js"` inside a command whose own text contains that string kills your
  shell (exit 144). Stop servers in a separate command: `pkill -f "node [s]erver.js 876"` alone.
- Players load lazily: tests must scroll a part into view before waiting for it, and wait on
  conditions (e.g. "Loading audio… N%"), not fixed sleeps — throttled prefetches compete.
- `window.__audios` (Appendix C hook) only holds SIMPLE players, in page order.
- Only Chromium exists here (no WebKit, and `playwright install` is not allowed). iOS-specific
  code paths are written from Safari's documented behaviour: `navigator.audioSession` (current
  Safari; feature-detected), `audio.load()` inside the tap so a later `play()` is allowed, `ctx.resume()` inside the
  tap. If iOS refuses a deferred `play()`, the button just shows ▶ again — the next tap plays.
- `analyseSegments` is adaptive; its "lead-in" detection needs ≥ 4 items. Lesson 1's vocabulary
  track: 13 phrases → lead-in + 12 words.
- Old CSS `.player-bar` had `overflow:hidden`; the new hit zone needs the inner `.player-track`
  to clip instead — copy the whole block, don't merge by hand.

---

## Appendix A — `server.js` (static test server; `NORANGE=1` = answer everything with 200)

```js
// Minimal static server WITH HTTP Range support (media seeking needs it).
// Test-only; logs every audio request so tests can inspect Range behaviour.
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, port = Number(process.argv[2] || 8765);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
                '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, url === '/' ? '/index.html' : url);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  const size = fs.statSync(file).size, type = types[path.extname(file)] || 'application/octet-stream';
  const range = process.env.NORANGE ? null : req.headers.range;
  if (range && /^bytes=/.test(range)) {
    let [a, b] = range.replace('bytes=', '').split('-');
    a = a === '' ? size - Number(b) : Number(a);
    b = (b === '' || b === undefined || range.startsWith('bytes=-')) ? size - 1 : Math.min(Number(b), size - 1);
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${size}`,
                         'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
    fs.createReadStream(file, { start: a, end: b }).pipe(res);
  } else {
    const h = { 'Content-Type': type, 'Content-Length': size, 'Cache-Control': 'no-store' };
    if (!process.env.NORANGE) h['Accept-Ranges'] = 'bytes';
    res.writeHead(200, h);
    fs.createReadStream(file).pipe(res);
  }
}).listen(port, () => console.log('serving on ' + port));
```

## Appendix B — `review_tools.py` (frames · remux · segments · events · pairs)

Tested on Lesson 1: `remux` reproduces the shipped `lesson_1_06-v2.mp3` byte for byte; `segments` finds lead-in + 12 words; `pairs --vocab` finds all 12 answers in order (0.97–1.00) and the shipped cues ±0.02 s.

```python
#!/usr/bin/env python3
"""review_tools.py — audio helpers for the thai-course.com lesson review pages.

  python3 review_tools.py frames  A.mp3 [B.mp3 ...]
      MPEG frame census: bitrate, padding, Info/Xing header, true duration.

  python3 review_tools.py remux   IN.mp3 OUT.mp3
      Adds an Info header WITHOUT re-encoding (ffmpeg -c:a copy) and proves the
      audio frames are byte-identical to the input.

  python3 review_tools.py segments --page index.html VOCAB.mp3
      Runs the PAGE'S OWN analyseSegments + detectLeadIn (extracted from the
      html) on the file, decoded by Chromium exactly as the page does, and prints
      the words it will find. Use it to check a listen-and-repeat track has one
      word per vocabulary row.

  python3 review_tools.py events  FILE.mp3
      Sound events (where a voice starts and stops), Chromium-decoded.

  python3 review_tools.py pairs   --page index.html PAIRS.mp3 [--vocab VOCAB.mp3]
      Drafts a PAIR_CUES entry for an English → Thai track. With --vocab, each
      word of the listen-and-repeat track is LOCATED inside the pairs track by
      cross-correlation: where the very same recording occurs (score ≥ 0.9) is
      that word's Thai answer; what lies between answers is the English prompt;
      what comes before the first prompt (split at the last pause ≥ 1 s) is
      the intro.
      Without --vocab, or if answers do not match, it falls back to plain
      alternation and SAYS SO — then confirm by ear / ask the owner.

Needs: python3, numpy, playwright (Chromium), ffmpeg.  No web server needed:
files are served to Chromium through page.route().
"""
import argparse, asyncio, base64, collections, json, os, re, subprocess, sys
import numpy as np

# ---------------------------------------------------------------- frames ----
BR = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
SR = [44100, 48000, 32000]

def frame_list(path):
    b = open(path, 'rb').read(); i = 0; id3 = 0
    if b[:3] == b'ID3':
        id3 = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]); i = id3
    frames, header = [], None
    while i + 4 <= len(b):
        h = int.from_bytes(b[i:i + 4], 'big')
        if (h >> 21) & 0x7FF != 0x7FF: break
        ver, layer, bri, sri, pad, mode = (h >> 19) & 3, (h >> 17) & 3, (h >> 12) & 15, (h >> 10) & 3, (h >> 9) & 1, (h >> 6) & 3
        if ver != 3 or layer != 1 or bri in (0, 15) or sri == 3: break
        size = 144 * BR[bri] * 1000 // SR[sri] + pad
        fr = b[i:i + size]
        if not frames:
            off = 4 + (17 if mode == 3 else 32)
            if fr[off:off + 4] in (b'Xing', b'Info'): header = fr[off:off + 4].decode()
        frames.append((BR[bri], pad, SR[sri], mode, fr)); i += size
    return dict(bytes=len(b), id3=id3, frames=frames, header=header, trailing=len(b) - i)

def cmd_frames(a):
    for p in a.files:
        f = frame_list(p); fr = f['frames']
        audio = fr[1:] if f['header'] else fr
        sizes = collections.Counter((x[0], x[1]) for x in audio)
        sr = audio[0][2] if audio else 44100
        chans = 'mono' if audio and audio[0][3] == 3 else 'stereo'
        dur = len(audio) * 1152 / sr
        eff = sum(len(x[4]) for x in audio) * 8 / dur / 1000 if dur else 0
        print(f"{p}: {f['bytes']} bytes, {chans}, {sr} Hz, audio frames {len(audio)}, kbps×padding {dict(sizes)}, "
              f"effective {eff:.1f} kbps, true duration {dur:.3f} s, header {f['header'] or 'NONE (browsers estimate seek positions)'}, "
              f"id3 {f['id3']} B, trailing {f['trailing']} B")

def cmd_remux(a):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a.src, '-map', '0:a', '-c:a', 'copy',
                    '-map_metadata', '-1', '-write_xing', '1', '-id3v2_version', '3', a.dst], check=True)
    x, y = frame_list(a.src), frame_list(a.dst)
    ax = [f[4] for f in (x['frames'][1:] if x['header'] else x['frames'])]
    ay = [f[4] for f in (y['frames'][1:] if y['header'] else y['frames'])]
    print(f"{a.dst}: header {y['header']}, audio frames {len(ay)} (input {len(ax)}), byte-identical: {ax == ay}")
    if ax != ay: sys.exit('NOT identical — do not ship')

# -------------------------------------------------------- chromium decode ----
def page_js(page_html, name_from, name_to):
    """Pull a run of top-level functions out of the page's script, verbatim."""
    s = open(page_html, encoding='utf-8').read()
    i = s.index(name_from); j = s.index(name_to, i)
    k = s.index('\n  }\n', j) + 4
    return s[i:k]

async def chromium(files, js_body):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        async def serve(route):
            name = route.request.url.split('/')[-1].split('?')[0]
            if name in files: await route.fulfill(path=files[name], content_type='audio/mpeg')
            else: await route.fulfill(body='<!doctype html><title>t</title>', content_type='text/html')
        await pg.route('http://review.local/**', serve)
        await pg.goto('http://review.local/index.html')
        r = await pg.evaluate(js_body)
        await b.close()
        return r

DECODE_JS = """async ([name, rate]) => {
  const ab = await (await fetch(name)).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, rate);
  const buf = await ctx.decodeAudioData(ab);
  const n = buf.length, d = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) { const x = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] += x[i] / buf.numberOfChannels; }
  let s = ''; const u = new Uint8Array(d.buffer); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
  return { dur: buf.duration, sr: rate, pcm: btoa(s) };
}"""

def decode(path, rate=16000):
    name = os.path.basename(path)
    r = asyncio.run(chromium({name: path}, f"({DECODE_JS})({json.dumps([name, rate])})"))
    return np.frombuffer(base64.b64decode(r['pcm']), dtype=np.float32), rate, r['dur']

def events(pcm, sr, det=-45, edge=-55, mingap=0.25, minlen=0.08):
    hop = int(sr * 0.005); n = len(pcm) // hop
    env = np.sqrt((pcm[:n * hop].reshape(n, hop) ** 2).mean(1)); db = 20 * np.log10(env + 1e-9)
    ev, i = [], 0
    while i < n:
        if db[i] > det:
            s = i
            while s > 0 and db[s - 1] > edge: s -= 1
            e = i
            while e < n - 1 and db[e + 1] > edge: e += 1
            ev.append([s * hop / sr, (e + 1) * hop / sr]); i = e + 1
        else: i += 1
    out = []
    for s, e in ev:
        if out and s - out[-1][1] < mingap: out[-1][1] = e
        else: out.append([s, e])
    return [x for x in out if x[1] - x[0] >= minlen]

def cmd_events(a):
    pcm, sr, dur = decode(a.file)
    prev = 0
    print(f"{a.file}: {dur:.3f} s (Chromium decode)")
    for k, (s, e) in enumerate(events(pcm, sr)):
        print(f"  {k:2d}  {s:6.2f}-{e:6.2f}  len {e - s:4.2f}  pause before {s - prev:4.2f}"); prev = e

def page_segments(page, path):
    js = page_js(page, 'function analyseSegments', 'function detectLeadIn')
    name = os.path.basename(path)
    body = f"""(async () => {{ {js}
      const ab = await (await fetch({json.dumps(name)})).arrayBuffer();
      const ctx = new OfflineAudioContext(1, 1, 44100);
      const buf = await ctx.decodeAudioData(ab);
      const n = buf.length, d = new Float32Array(n);
      for (let c = 0; c < buf.numberOfChannels; c++) {{ const x = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] += x[i] / buf.numberOfChannels; }}
      const items = analyseSegments(d, buf.sampleRate);
      return {{ dur: buf.duration, lead: detectLeadIn(items), items }};
    }})()"""
    return asyncio.run(chromium({name: path}, body))

def cmd_segments(a):
    r = page_segments(a.page, a.file)
    items, lead = r['items'], r['lead']
    print(f"{a.file}: {len(items)} phrases; lead-in instruction detected: {lead} → {len(items) - (1 if lead else 0)} WORDS")
    for k, it in enumerate(items):
        tag = 'lead' if (lead and k == 0) else f"word {k + (0 if lead else 1)}"
        print(f"  {tag:8s} {it['s']:6.2f}-{it['e']:6.2f}")

def locate(template, signal, sr):
    """Where does `template` occur inside `signal`? Normalised cross-correlation
    (FFT); returns (seconds, score). Score ≈ 1.0 means the very same recording."""
    L = len(template)
    if L == 0 or L > len(signal): return 0.0, 0.0
    n = len(signal) + L; nfft = 1 << (n - 1).bit_length()
    c = np.fft.irfft(np.fft.rfft(signal, nfft) * np.conj(np.fft.rfft(template, nfft)), nfft)[:len(signal) - L + 1]
    cs = np.concatenate([[0.0], np.cumsum(signal.astype(np.float64) ** 2)])
    e = np.sqrt(np.maximum(cs[L:] - cs[:-L], 0)) * np.sqrt(float(np.dot(template, template)))
    r = c / (e + 1e-9)
    k = int(np.argmax(r))
    return k / sr, float(r[k])

def cmd_pairs(a):
    pcm, sr, dur = decode(a.file)
    ev = events(pcm, sr)
    th = []          # (start, end, word index, score) — one per answer found
    method = 'each vocabulary word located inside this track (same recording → score ≈ 1.0)'
    if a.vocab:
        vr = page_segments(a.page, a.vocab)
        vitems = vr['items'][1:] if vr['lead'] else vr['items']
        vpcm, _, _ = decode(a.vocab)
        for j, it in enumerate(vitems):
            # the word without the page's padding (0.12 s before, up to 0.20 s after)
            tpl = vpcm[int((it['s'] + 0.10) * sr):int((it['e'] - 0.15) * sr)]
            at, score = locate(tpl, pcm, sr)
            if score < 0.9: continue
            hit = [k for k, (s0, e0) in enumerate(ev) if e0 > at and s0 < at + len(tpl) / sr]
            if hit: th.append((ev[hit[0]][0], ev[hit[-1]][1], j, score, hit[0], hit[-1]))
        th.sort()
    if len(th) < 2:
        method = 'NO MATCHES — plain alternation guess (EN, TH, EN, TH …); CONFIRM BY EAR / ASK THE OWNER'
        merged = []
        for s0, e0 in ev:     # merge breath splits (< 0.9 s) and then alternate
            if merged and s0 - merged[-1][1] < 0.9: merged[-1][1] = e0
            else: merged.append([s0, e0])
        ev = merged
        th = [(ev[k][0], ev[k][1], None, 0.0, k, k) for k in range(2, len(ev), 2)]
    pairs, intro, warn = [], None, []
    for gi, (ts, te, w, sc, k0, k1) in enumerate(th):
        lo = (th[gi - 1][5] + 1) if gi else 0
        en = list(range(lo, k0))
        if not en: warn.append(f'no English found before answer {gi + 1}'); continue
        if gi == 0:   # split the intro from the first prompt at the last pause ≥ 1 s
            cut = en[0]
            for k in en[1:]:
                if ev[k][0] - ev[k - 1][1] >= 1.0: cut = k
            if cut > en[0]: intro = [ev[en[0]][0], ev[cut - 1][1]]
            en = [k for k in en if k >= cut]
        pairs.append((ev[en[0]][0], ev[en[-1]][1], ts, te, w, sc))
    tail = list(range(th[-1][5] + 1, len(ev))) if th else []
    print(f"// {os.path.basename(a.file)}: {dur:.3f} s (Chromium decode); {len(pairs)} pairs; method: {method}")
    if a.vocab: print(f"// answers found for words (in track order): {[p[4] + 1 if p[4] is not None else '?' for p in pairs]}")
    for x in warn: print('// !! ' + x)
    if tail: print(f"// !! {len(tail)} sound event(s) after the last answer: {[tuple(round(v, 2) for v in ev[k]) for k in tail]}")
    print(f"'{os.path.basename(a.file)}': {{")
    if intro: print(f"  intro: [{intro[0]:.2f}, {intro[1]:.2f}],")
    print("  pairs: [")
    for i, (es, ee, ts, te, w, sc) in enumerate(pairs):
        comma = ',' if i < len(pairs) - 1 else ' '
        note = f"word {w + 1}, match {sc:.2f}" if w is not None else 'UNVERIFIED'
        print(f"    [{es:5.2f}, {ee:5.2f}, {ts:5.2f}, {te:5.2f}]{comma}   /* {i + 1:2d}  {note} · answering pause {ts - ee:.2f} s */")
    print("  ]\n}")

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
    x = sp.add_parser('frames'); x.add_argument('files', nargs='+'); x.set_defaults(fn=cmd_frames)
    x = sp.add_parser('remux'); x.add_argument('src'); x.add_argument('dst'); x.set_defaults(fn=cmd_remux)
    x = sp.add_parser('segments'); x.add_argument('--page', required=True); x.add_argument('file'); x.set_defaults(fn=cmd_segments)
    x = sp.add_parser('events'); x.add_argument('file'); x.set_defaults(fn=cmd_events)
    x = sp.add_parser('pairs'); x.add_argument('--page', required=True); x.add_argument('--vocab'); x.add_argument('file'); x.set_defaults(fn=cmd_pairs)
    a = ap.parse_args(); a.fn(a)
```

## Appendix C — `test_review.py` (Lesson 1 suite, 67/67; adapt per its header)

```python
"""Lesson review page — player test suite (written for Lesson 1; adapt per lesson).

Run from the folder that holds the page and its media:
    NORANGE=1 node server.js 8766 &      # answers every request with a plain 200, like a Cloudflare cache miss
    node server.js 8765 &                # proper Range support (206)
    python3 test_review.py

ADAPT FOR ANOTHER LESSON (everything below is Lesson 1 specific):
  * part ids: the vocabulary track is in #part-5, the English→Thai pairs track in
    #part-6, the homework clip in #part-7 (Lesson 1 after the wai part was added);
  * file names: lesson_1_01.mp3 (6 s clip), lesson_1_02/03.mp3, lesson_1_07.mp3 (24 s),
    sawatdee-krap.mp3 / kop-kun-krap.mp3 (section 9 is Lesson 1 only — drop it);
  * window.__audios[i] = the i-th SIMPLE player in page order (waveform players have no
    <audio>): Lesson 1 order is sawatdee, kop-kun, 01, 02, 03, 04, 07;
  * expected numbers: pair starts 7.10 / 13.77 / 20.97 (= cue start − 0.12 s padding),
    Thai of pair 1 at 10.79, loop end 25.74, 6 s thinking time → 2:18, 0.75× → 1:53,
    word 8 at ~26.56 s, 9 simple players under file://;
  * t_missing/ = a copy of the page with some media deliberately absent (01, 06-v2, wai.jpg,
    the two wai clips) for the error-message tests.
Missing short clips can be faked (any speech-like noise works):
    ffmpeg -f lavfi -i "anoisesrc=d=6:c=pink:a=0.3,lowpass=f=3000" -ac 1 -b:a 192k lesson_X_01.mp3
"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

HOOK = """
(() => {
  const OA = window.Audio; window.__audios = [];
  function A(src){ const a = new OA(src); window.__audios.push(a); return a; }
  A.prototype = OA.prototype; window.Audio = A;
  window.__src = [];
  const S = AudioBufferSourceNode.prototype, st = S.start, sp = S.stop;
  S.start = function (w, off) { window.__src.push({ ev: 'start', off: off || 0, dur: this.buffer && this.buffer.duration, loop: this.loop, ls: this.loopStart, le: this.loopEnd, ct: this.context.currentTime }); return st.apply(this, arguments); };
  S.stop = function (w) { if (w !== undefined) window.__src.push({ ev: 'stop', when: w, ct: this.context.currentTime }); return sp.apply(this, arguments); };
})();
"""
results = []
def check(name, ok, info=''):
    results.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + ('  — ' + str(info) if info else ''))

async def new_page(b, port=8766, w=1200, h=900, touch=False, path='index.html'):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch)
    await ctx.add_init_script(HOOK)
    pg = await ctx.new_page()
    pg._logs = []
    pg.on('console', lambda m: pg._logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'fonts.g' not in m.text and 'TUNNEL' not in m.text and 'AudioContext' not in m.text else None)
    pg.on('pageerror', lambda e: pg._logs.append(f'PAGEERROR: {e}'))
    pg._reqs = []
    pg.on('request', lambda r: pg._reqs.append(r.url.rsplit('/', 1)[-1]) if '.mp3' in r.url else None)
    await pg.goto(f'http://localhost:{port}/{path}', wait_until='load')
    return ctx, pg

async def audio_of(pg, name):
    return await pg.evaluate("n => window.__audios.findIndex(a => a.__n === n || (a.__n = undefined, false))", name)

async def simple_state(pg, sel):
    # find the Audio element belonging to the player via its play button order
    return await pg.evaluate("""sel => {
      const els = [...document.querySelectorAll('.player[data-src]')];
      const i = els.indexOf(document.querySelector(sel));
      const a = window.__audios[i];
      if (!a) return null;
      return { t: +a.currentTime.toFixed(2), d: +(a.duration || 0).toFixed(2), paused: a.paused, src: a.src.slice(0, 5),
               seekable: a.seekable.length ? +a.seekable.end(0).toFixed(1) : 0 };
    }""", sel)

async def click_bar(pg, sel, frac):
    bar = pg.locator(sel + ' .player-bar')
    await bar.scroll_into_view_if_needed()
    box = await bar.bounding_box()
    await pg.mouse.click(box['x'] + box['width'] * frac, box['y'] + box['height'] / 2)

async def sub(pg, part):
    return (await pg.locator(f'{part} .js-sub').text_content()).strip()

async def wait_ready(pg, part, timeout=30000):
    await pg.evaluate(f"document.querySelector('{part}').scrollIntoView()")
    await pg.wait_for_function(f"() => {{ const s = document.querySelector('{part} .js-sub'); return s && !/Loading/.test(s.textContent); }}", timeout=timeout)

async def src_log(pg, clear=True):
    r = await pg.evaluate("() => { const x = window.__src.slice(); return x; }")
    if clear: await pg.evaluate("() => { window.__src.length = 0; }")
    return r

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

        # ---------- 1. the original bug: seeking on a server without Range ----------
        ctx, pg = await new_page(b, 8766)
        check('no mp3 requested before scrolling (lazy)', not any(x.startswith('lesson_1_05') or x.startswith('lesson_1_06') for x in pg._reqs), pg._reqs)
        sel = '.player[data-src="lesson_1_01.mp3"]'
        await pg.locator(sel).scroll_into_view_if_needed()
        await pg.wait_for_timeout(700)
        st = await simple_state(pg, sel)
        check('6 s clip prefetched into memory when near (blob)', st and st['src'] == 'blob:' and st['d'] > 6, st)
        await pg.locator(sel + ' .play-btn').click()
        await pg.wait_for_timeout(1500)
        await click_bar(pg, sel, 0.75)
        await pg.wait_for_timeout(400)
        st = await simple_state(pg, sel)
        check('6 s clip: click at 75% jumps there (no restart)', st and 4.5 <= st['t'] <= 5.4 and not st['paused'], st)
        await click_bar(pg, sel, 0.10)
        await pg.wait_for_timeout(300)
        st = await simple_state(pg, sel)
        check('6 s clip: click back at 10% jumps back', st and 0.5 <= st['t'] <= 1.2, st)
        # drag the handle
        bar = pg.locator(sel + ' .player-bar'); box = await bar.bounding_box()
        y = box['y'] + box['height'] / 2
        await pg.mouse.move(box['x'] + box['width'] * 0.2, y); await pg.mouse.down()
        await pg.mouse.move(box['x'] + box['width'] * 0.5, y, steps=5)
        mid = await pg.locator(sel + ' .player-time').text_content()
        await pg.mouse.move(box['x'] + box['width'] * 0.6, y, steps=3); await pg.mouse.up()
        await pg.wait_for_timeout(250)
        st = await simple_state(pg, sel)
        check('drag the handle: preview while dragging, seek on release', st and 3.6 <= st['t'] <= 4.3 and mid.startswith('0:03'), (mid, st))
        # keyboard
        await pg.locator(sel + ' .play-btn').click()   # pause
        await pg.locator(sel + ' .player-bar').focus()
        before = (await simple_state(pg, sel))['t']
        await pg.keyboard.press('ArrowLeft')
        st = await simple_state(pg, sel)
        check('arrow key seeks 2 s back', abs((before - 2) - st['t']) < 0.3, (before, st['t']))
        # slow
        await pg.locator(sel + ' .js-slow').click()
        r = await pg.evaluate("() => window.__audios[2].playbackRate")
        check('0.75× still works on the simple player', r == 0.75, r)
        await pg.locator(sel + ' .js-slow').click()
        # touch-zone height
        h = (await pg.locator(sel + ' .player-bar').bounding_box())['height']
        th = (await pg.locator(sel + ' .player-track').bounding_box())['height']
        check('seek bar: 30px touch zone around a 6px line', h == 30 and th == 6, (h, th))
        await ctx.close()

        # ---------- 2. throttled + no Range: press play before the clip is in ----------
        ctx, pg = await new_page(b, 8766)
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 300, 'downloadThroughput': 500 * 1024 / 8, 'uploadThroughput': 100000})
        sel = '.player[data-src="lesson_1_07.mp3"]'
        await pg.evaluate("document.querySelector('#part-7').scrollIntoView()")
        await pg.locator(sel + ' .play-btn').click()
        await pg.wait_for_timeout(300)
        html = await pg.locator(sel + ' .play-btn').inner_html()
        check('play pressed while downloading shows the turning ring', 'spin' in html, html[:40])
        await pg.wait_for_function(f"() => {{ const a = window.__audios[6]; return a && !a.paused && a.currentTime > 0.5; }}", timeout=150000)
        st = await simple_state(pg, sel)
        check('...and starts by itself once the file is in', st and not st['paused'] and st['src'] == 'blob:', st)
        await click_bar(pg, sel, 0.8)
        await pg.wait_for_timeout(300)
        st = await simple_state(pg, sel)
        check('24 s track: jump to 80% works on a slow line too', st and abs(st['t'] - 0.8 * st['d']) < 1.0, st)
        await pg.locator(sel + ' .play-btn').click()
        await pg.locator(sel + ' .play-btn').click()
        await ctx.close()
        # waveform: progress, and ▶ pressed while it loads
        ctx, pg = await new_page(b, 8766)
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 200, 'downloadThroughput': 150 * 1024 / 8, 'uploadThroughput': 100000})
        await pg.evaluate("document.querySelector('#part-5').scrollIntoView()")
        await pg.wait_for_function("() => /Loading audio… \\d+%/.test(document.querySelector('#part-5 .js-sub').textContent)", timeout=30000)
        s1 = await sub(pg, '#part-5')
        check('waveform shows download progress', re.search(r'Loading audio… \d+%', s1), s1)
        await pg.locator('#part-5 .play-btn').click()
        await pg.wait_for_timeout(300)
        s2 = await sub(pg, '#part-5')
        h2 = await pg.locator('#part-5 .play-btn').inner_html()
        check('waveform: ▶ while loading → "it starts by itself" + ring', 'starts by itself' in s2 and 'spin' in h2, s2)
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
        await pg.wait_for_function("() => /word|instructions/.test(document.querySelector('#part-5 .js-sub').textContent)", timeout=60000)
        await pg.wait_for_timeout(600)
        lg = await src_log(pg)
        lbl = await pg.locator('#part-5 .play-btn').get_attribute('aria-label')
        check('waveform starts by itself after loading', any(e['ev'] == 'start' for e in lg) and lbl == 'Pause', (lbl, lg[:1]))
        await pg.locator('#part-5 .play-btn').click()
        check('no console errors (throttled run)', not pg._logs, pg._logs)
        await ctx.close()

        # ---------- 3. pairs player ----------
        ctx, pg = await new_page(b, 8766)
        await wait_ready(pg, '#part-6')
        s = await sub(pg, '#part-6')
        check('pairs player: 12 pairs, starts at the instructions', s == '12 pairs · instructions', s)
        lbl = await pg.locator('#part-6 .wave-gap-label').text_content()
        opts = await pg.locator('#part-6 select option').all_text_contents()
        check('pairs player: "Thinking time" with Wait for me', lbl == 'Thinking time' and opts == ['as recorded', '4s', '6s', '8s', 'Wait for me'], (lbl, opts))
        await src_log(pg)
        nxt = pg.locator('#part-6 .js-next')
        await nxt.click(); await pg.wait_for_timeout(150)
        await nxt.click(); await pg.wait_for_timeout(150)
        await nxt.click(); await pg.wait_for_timeout(250)
        lg = [e for e in await src_log(pg) if e['ev'] == 'start']
        offs = [round(e['off'], 2) for e in lg]
        check('⏭ ×3 lands on the English of pairs 1, 2, 3', offs == [7.10, 13.77, 20.97], offs)
        s = await sub(pg, '#part-6')
        check('status names the pair and the phase', s.startswith('12 pairs · pair 3 · English'), s)
        await pg.wait_for_timeout(2300)
        s = await sub(pg, '#part-6')
        check('…then "your turn" in the answering pause', 'pair 3 · your turn — say it in Thai' in s, s)
        await pg.locator('#part-6 .js-prev').click(); await pg.wait_for_timeout(200)
        lg = [e for e in await src_log(pg) if e['ev'] == 'start']
        check('⏮ restarts the current pair', lg and round(lg[-1]['off'], 2) == 20.97, [round(e['off'], 2) for e in lg])
        # loop pair
        await pg.locator('#part-6 .js-loop').click(); await pg.wait_for_timeout(200)
        lg = [e for e in await src_log(pg) if e['ev'] == 'start']
        L = lg[-1] if lg else {}
        check('Loop pair loops English+Thai of pair 3', L.get('loop') and round(L['ls'], 2) == 20.97 and 25.4 < L['le'] < 25.8, L)
        s = await sub(pg, '#part-6')
        check('status says looping pair 3', 'looping pair 3' in s, s)
        await pg.locator('#part-6 .js-loop').click(); await pg.wait_for_timeout(200)
        await pg.locator('#part-6 .play-btn').click()   # pause
        # thinking time 6 s
        before = await pg.locator('#part-6 .js-time').text_content()
        await pg.locator('#part-6 select').select_option('6')
        await pg.wait_for_timeout(300)
        after = await pg.locator('#part-6 .js-time').text_content()
        d = await pg.evaluate("() => { const c = document.querySelector('#part-6 canvas'); return c.getAttribute('aria-valuenow'); }")
        check('Thinking time 6 s: track grows to exactly 2:18 (12 answering pauses of 6 s)', before.endswith('1:24') and after.endswith('/ 2:18'), (before, after))
        await src_log(pg)
        await pg.locator('#part-6 .js-next').click(); await pg.wait_for_timeout(200)
        await pg.wait_for_function("() => /pair \\d+ · Thai/.test(document.querySelector('#part-6 .js-sub').textContent)", timeout=20000)
        lg = await src_log(pg)
        await pg.locator('#part-6 .play-btn').click()
        check('with 6 s thinking time the Thai still follows', True)
        # wait for me
        await pg.locator('#part-6 select').select_option('wait')
        await pg.locator('#part-6 .js-replay').click()
        await pg.wait_for_function("() => /then tap/.test(document.querySelector('#part-6 .js-sub').textContent)", timeout=20000)
        s = await sub(pg, '#part-6'); t = await pg.locator('#part-6 .js-time').text_content()
        cls = await pg.locator('#part-6 .play-btn').get_attribute('class')
        lg = await src_log(pg)
        stops = [e for e in lg if e['ev'] == 'stop']
        check('Wait for me: stops after the English of pair 1', 'pair 1 · your turn' in s and t.startswith('0:09') and 'is-waiting' in cls, (s, t, cls))
        await pg.wait_for_timeout(2500)
        s2 = await sub(pg, '#part-6'); t2 = await pg.locator('#part-6 .js-time').text_content()
        check('…and keeps waiting (no Thai until tapped)', s2 == s and t2 == t, (s2, t2))
        await pg.locator('#part-6 .play-btn').click()
        await pg.wait_for_timeout(300)
        lg = [e for e in await src_log(pg) if e['ev'] == 'start']
        check('tap ▶ → the Thai answer of pair 1', lg and round(lg[-1]['off'], 2) == 10.79, [round(e['off'], 2) for e in lg])
        await pg.wait_for_function("() => /pair 2 · your turn — say it in Thai, then tap/.test(document.querySelector('#part-6 .js-sub').textContent)", timeout=20000)
        check('…then the English of pair 2, and waits again', True)
        # loop + wait
        await pg.locator('#part-6 .js-loop').click()
        await pg.wait_for_function("() => /then tap/.test(document.querySelector('#part-6 .js-sub').textContent)", timeout=20000)
        await pg.locator('#part-6 .play-btn').click()
        await pg.wait_for_function("() => /then tap/.test(document.querySelector('#part-6 .js-sub').textContent)", timeout=20000)
        lg = [round(e['off'], 2) for e in await src_log(pg) if e['ev'] == 'start']
        check('Loop pair + Wait: English, wait, Thai, then the same English again', lg[-3:] == [13.77, 17.62, 13.77], lg)
        await pg.locator('#part-6 .js-loop').click()
        # slow pairs
        await pg.locator('#part-6 .js-slow').click()
        await pg.wait_for_function("() => document.querySelector('#part-6 .js-slow').getAttribute('aria-pressed') === 'true'", timeout=10000)
        t = await pg.locator('#part-6 .js-time').text_content()
        s = await sub(pg, '#part-6')
        check('0.75× on the pairs track: longer track, still 12 pairs', t.endswith('1:53') and s.startswith('12 pairs'), (t, s))
        await pg.locator('#part-6 .js-slow').click()
        await pg.locator('#part-6 select').select_option('0')
        check('no console errors (pairs)', not pg._logs, pg._logs)
        await ctx.close()

        # ---------- 4. vocabulary rows ----------
        ctx, pg = await new_page(b, 8766)
        await wait_ready(pg, '#part-5')
        check('12 speaker buttons, header column shown', await pg.locator('.vocab-play:visible').count() == 12 and await pg.locator('.vocab-head.has-audio').count() == 1)
        await src_log(pg)
        await pg.locator('.vocab-play').nth(7).click()
        await pg.wait_for_timeout(250)
        cur = await pg.evaluate("() => [...document.querySelectorAll('.vocab-item')].findIndex(r => r.classList.contains('is-current'))")
        lg = await src_log(pg)
        st_ = [e for e in lg if e['ev'] == 'start']; sp_ = [e for e in lg if e['ev'] == 'stop']
        length = (sp_[0]['when'] - st_[0]['ct']) if (st_ and sp_) else None
        check('row 8 plays word 8 only (scheduled stop after it)', st_ and 26.4 < st_[0]['off'] < 26.7 and length and 1.4 < length < 2.1, (st_[:1], length))
        check('row 8 lights up while it plays', cur == 7, cur)
        await pg.wait_for_timeout(2200)
        cur = await pg.evaluate("() => document.querySelectorAll('.vocab-item.is-current').length")
        s = await sub(pg, '#part-5')
        check('…then stops and invites the repeat', cur == 0 and 'your turn — repeat word 8' in s, (cur, s))
        await pg.locator('#part-5 .play-btn').click()
        await pg.wait_for_timeout(1500)
        cur = await pg.evaluate("() => [...document.querySelectorAll('.vocab-item')].findIndex(r => r.classList.contains('is-current'))")
        check('▶ continues from there; row 8 lit in its repeat pause, then row 9', cur in (7, 8), cur)
        await pg.locator('#part-5 .play-btn').click()
        # one at a time
        await pg.locator('#part-5 .play-btn').click(); await pg.wait_for_timeout(300)
        sp = '.player[data-src="lesson_1_02.mp3"]'
        await pg.locator(sp).scroll_into_view_if_needed()
        await pg.locator(sp + ' .play-btn').click(); await pg.wait_for_timeout(500)
        wl = await pg.locator('#part-5 .play-btn').get_attribute('aria-label')
        st = await simple_state(pg, sp)
        check('one player at a time: a clip stops the waveform', wl.startswith('Play') and st and not st['paused'], (wl, st))
        ms = await pg.evaluate("() => navigator.mediaSession && navigator.mediaSession.metadata && [navigator.mediaSession.metadata.title, navigator.mediaSession.metadata.artist, navigator.mediaSession.metadata.album, navigator.mediaSession.metadata.artwork.length]")
        check('lock-screen info: clip title + lesson + artwork', ms == ['kun chûu à-rai kráp', 'Lesson 1 · Review', 'Thai Beginner Course', 1], ms)
        await pg.locator('.vocab-play').nth(0).click(); await pg.wait_for_timeout(300)
        st = await simple_state(pg, sp)
        check('…and a word-list button stops the clip', st['paused'], st)
        check('no console errors (vocab)', not pg._logs, pg._logs)
        await ctx.close()

        # ---------- 5. vocab tap while the track is still loading ----------
        ctx, pg = await new_page(b, 8766)
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 200, 'downloadThroughput': 400 * 1024 / 8, 'uploadThroughput': 100000})
        await pg.evaluate("document.querySelector('#vocab-list').scrollIntoView()")
        await pg.wait_for_timeout(300)
        await pg.locator('.vocab-play').nth(2).click()
        await pg.wait_for_timeout(200)
        spinning = await pg.locator('.vocab-play').nth(2).get_attribute('class')
        check('word button pressed while loading shows a ring', 'is-loading' in spinning, spinning)
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
        await pg.wait_for_function("() => document.querySelectorAll('.vocab-item.is-current').length === 1", timeout=60000)
        cur = await pg.evaluate("() => [...document.querySelectorAll('.vocab-item')].findIndex(r => r.classList.contains('is-current'))")
        check('…then plays that word by itself', cur == 2, cur)
        await ctx.close()

        # ---------- 6. errors: missing files and a dropped connection ----------
        ctx, pg = await new_page(b, 8766, path='t_missing/index.html')
        await pg.locator('.player[data-src="lesson_1_01.mp3"]').scroll_into_view_if_needed()
        await pg.wait_for_timeout(800)
        m = await pg.locator('.player[data-src="lesson_1_01.mp3"] .player-error').text_content()
        dis = await pg.locator('.player[data-src="lesson_1_01.mp3"] .play-btn').is_disabled()
        check('missing clip: "Recording not available", button disabled', m == 'Recording not available' and dis, (m, dis))
        await wait_ready(pg, '#part-6')
        s = await sub(pg, '#part-6')
        check('missing pairs track: "Recording not available"', s == 'Recording not available', s)
        await ctx.close()

        ctx, pg = await new_page(b, 8766)
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {'offline': True, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
        sel = '.player[data-src="lesson_1_03.mp3"]'
        await pg.locator(sel).scroll_into_view_if_needed()
        await pg.locator(sel + ' .play-btn').click()
        await pg.wait_for_function(f"() => !document.querySelector('{sel} .player-msg').hidden", timeout=15000)
        m = await pg.locator(sel + ' .player-error').text_content()
        check('offline: clear message + Try again', 'check your connection' in m and await pg.locator(sel + ' .player-retry').is_visible(), m)
        await pg.evaluate("document.querySelector('#part-5').scrollIntoView()")
        await pg.wait_for_function("() => /connection/.test(document.querySelector('#part-5 .js-sub').textContent)", timeout=15000)
        check('offline: waveform says so too, with Try again', await pg.locator('#part-5 .wave-retry').count() == 1)
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
        await pg.locator(sel).scroll_into_view_if_needed()
        await pg.locator(sel + ' .player-retry').click()
        await pg.wait_for_timeout(1200)
        st = await simple_state(pg, sel)
        check('back online: Try again plays it', st and not st['paused'] and st['src'] == 'blob:', st)
        await pg.evaluate("document.querySelector('#part-5').scrollIntoView()")
        await pg.locator('#part-5 .wave-retry').click()
        await pg.wait_for_function("() => /word|instructions/.test(document.querySelector('#part-5 .js-sub').textContent)", timeout=20000)
        check('back online: waveform Try again loads and plays', any(e['ev'] == 'start' for e in await src_log(pg)))
        await ctx.close()

        # ---------- 7. Range server: everything still fine ----------
        ctx, pg = await new_page(b, 8765)
        sel = '.player[data-src="lesson_1_01.mp3"]'
        await pg.locator(sel).scroll_into_view_if_needed(); await pg.wait_for_timeout(500)
        await pg.locator(sel + ' .play-btn').click(); await pg.wait_for_timeout(1000)
        await click_bar(pg, sel, 0.7); await pg.wait_for_timeout(300)
        st = await simple_state(pg, sel)
        check('Range server: seek works as before', st and 4.2 < st['t'] < 5.0, st)
        await wait_ready(pg, '#part-5'); await wait_ready(pg, '#part-6')
        check('no console errors (Range server)', not pg._logs, pg._logs)
        await ctx.close()

        # ---------- 8. file:// (double-clicked locally) ----------
        ctx = await b.new_context(viewport={'width': 1200, 'height': 900})
        await ctx.add_init_script(HOOK)
        pg = await ctx.new_page(); logs = []
        pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.goto('file://' + os.path.abspath('index.html'))
        await pg.wait_for_timeout(500)
        n_wave = await pg.locator('.wave-player').count()
        check('file://: waveform players fall back to simple players', n_wave == 0 and await pg.locator('.player[data-src]').count() == 9, n_wave)
        check('file://: word-list buttons stay hidden', await pg.locator('.vocab-play:visible').count() == 0)
        sel = '.player[data-src="lesson_1_06-v2.mp3"]'
        await pg.locator(sel).scroll_into_view_if_needed()
        await pg.locator(sel + ' .play-btn').click(); await pg.wait_for_timeout(1500)
        await click_bar(pg, sel, 0.5); await pg.wait_for_timeout(400)
        st = await simple_state(pg, sel)
        check('file://: streams and seeks', st and st['src'] == 'file:' and 41 < st['t'] < 44, st)
        check('file://: no page errors', not logs, logs)
        await ctx.close()


        # ---------- 9. the new Part 2 (the wai), numbering, swatches ----------
        ctx, pg = await new_page(b, 8766)
        info = await pg.evaluate("""() => ({
          eyebrows: [...document.querySelectorAll('.part-eyebrow')].map(e => e.textContent.trim()),
          ids: [...document.querySelectorAll('section.part')].map(e => e.id),
          toc: [...document.querySelectorAll('.toc-link')].map(a => a.getAttribute('href') + ' ' + a.textContent.trim()),
          titles: [...document.querySelectorAll('section.part h2')].map(h => h.textContent.trim()),
          tocOk: [...document.querySelectorAll('.toc-link')].every(a => document.querySelector(a.getAttribute('href'))),
          steps: [...document.querySelectorAll('#part-2 .wai-steps li')].map(l => l.textContent.trim()),
          img: (document.querySelector('#part-2 .wai-figure img') || {}).getAttribute && document.querySelector('#part-2 .wai-figure img').getAttribute('src')
        })""")
        check('8 parts numbered 01–08 in order', info['eyebrows'] == ['Part 0%d' % i for i in range(1, 9)] and info['ids'] == ['part-%d' % i for i in range(1, 9)], info['eyebrows'])
        check('contents: 8 links, each to its own part, wai second', info['tocOk'] and len(info['toc']) == 8 and info['toc'][1] == '#part-2 02 The wai' and info['toc'][2] == '#part-3 03 Listen to Mali', info['toc'])
        check('part titles in order', info['titles'] == ['Introduce yourself', 'The wai', 'Listen to Mali', "Ask someone's name", 'Vocabulary', 'English → Thai review', 'Homework', 'Notes'], info['titles'])
        check('wai: four steps, photo wired as wai.jpg', len(info['steps']) == 4 and info['steps'][3].startswith('Say what you want to say') and info['img'] == 'wai.jpg', info['steps'])
        txt = await pg.locator('#part-6 .part-head p').text_content()
        tip = await pg.locator('#part-6 .tip-note').text_content()
        check('English → Thai part now points back to Part 5 (Vocabulary)', 'Part 5' in txt and 'Part 5' in tip, (txt[:40], tip[:60]))
        for i, (f, t) in enumerate([('sawatdee-krap.mp3', 'sà-wàt-dee kráp'), ('kop-kun-krap.mp3', 'kòp kun kráp')]):
            sel = f'.player[data-src="{f}"]'
            await pg.locator(sel).scroll_into_view_if_needed()
            await pg.wait_for_timeout(400)
            await pg.locator(sel + ' .play-btn').click()
            await pg.wait_for_timeout(500)
            st = await simple_state(pg, sel)
            ttl = await pg.locator(sel + ' .player-title').text_content()
            check(f'wai player {i+1} ({f}) plays from memory', st and not st['paused'] and st['src'] == 'blob:' and ttl.strip() == t, (st, ttl))
            await pg.wait_for_timeout(1500)
        ok = await pg.evaluate("() => { const i = document.querySelector('#part-2 .wai-figure img'); return i.complete && i.naturalWidth === 566 && i.naturalHeight === 400; }")
        check('wai.jpg loads at 566×400', ok)
        sw = await pg.evaluate("""() => [...document.querySelectorAll('.theme-opt .sw')].map(e => { const c = getComputedStyle(e); return [c.borderTopWidth, c.backgroundRepeat, c.boxShadow.includes('inset')]; })""")
        check('theme swatches: no border, no repeat, inset outline', all(x == ['0px', 'no-repeat', True] for x in sw), sw)
        check('no console errors (wai)', not pg._logs, pg._logs)
        await ctx.close()
        # wai photo missing -> block collapses to one column, no gap
        ctx, pg = await new_page(b, 8766, path='t_missing/index.html')
        await pg.locator('#part-2').scroll_into_view_if_needed(); await pg.wait_for_timeout(800)
        r = await pg.evaluate("() => { const b = document.querySelector('#part-2 .wai-block'); return [b.classList.contains('no-figure'), !b.querySelector('figure'), getComputedStyle(b).gridTemplateColumns.split(' ').length]; }")
        check('missing wai.jpg: the photo column folds away', r == [True, True, 1], r)
        m = await pg.locator('.player[data-src="sawatdee-krap.mp3"] .player-error').text_content()
        check('missing wai recording: "Recording not available"', m == 'Recording not available', m)
        await ctx.close()
        await b.close()
    bad = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(bad)}/{len(results)} passed" + (f"; FAILED: {bad}" if bad else ''))

asyncio.run(main())
```

## Appendix D — `phone_rows.py` (waveform controls per row at phone widths)

```python
"""Which waveform-player controls share a row at common phone widths? (one row expected from 360 px)
Usage: python3 phone_rows.py http://localhost:8765/index.html"""
import asyncio, sys
from playwright.async_api import async_playwright
async def main(url):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (320, 360, 390, 430):
            ctx = await b.new_context(viewport={'width': w, 'height': 800}, has_touch=True, is_mobile=True, device_scale_factor=2)
            pg = await ctx.new_page(); await pg.goto(url, wait_until='load')
            rows = await pg.evaluate("""() => [...document.querySelectorAll('.wave-foot')].map(f => {
              const ks = [...f.querySelectorAll('.mini-btn, .wave-gap, .wave-time')], rows = [];
              ks.forEach(k => { const r = k.getBoundingClientRect(), mid = r.top + r.height / 2;
                let row = rows.find(x => Math.abs(x.mid - mid) < 12); if (!row) rows.push(row = { mid, items: [] });
                row.items.push(k.classList.contains('wave-gap') ? 'GAP' : k.classList.contains('wave-time') ? 'TIME' : (k.getAttribute('aria-label') || k.textContent.trim())); });
              return rows.sort((a, b) => a.mid - b.mid).map(r => r.items.join(' | ')).join('   //   ');
            })""")
            for i, r in enumerate(rows): print(f'{w}px  player {i + 1}: {r}')
            await ctx.close()
        await b.close()
asyncio.run(main(sys.argv[1]))
```
