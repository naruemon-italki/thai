/* Service worker for Thai Memory Game (PWA support).
   Strategy: cache-first for the app shell.

   RELEASE CHECKLIST — three things must carry the same version number:
     1. CACHE_VERSION below
     2. APP_VERSION in index.html   (shown on Guide -> About)
     3. version.json                ({ "version": "..." } beside index.html)
   Bumping CACHE_VERSION is what makes this file byte-different, which is what
   makes the browser notice an update at all. version.json is the independent
   safety net: index.html compares it against its own APP_VERSION on launch, so
   a device running stale code can prove it even if the machinery below has
   somehow failed.

   How updates work:
   - When you deploy a new version of index.html, bump CACHE_VERSION below.
   - The browser installs the new service worker in the background. It then
     WAITS (it does not auto-activate), so the page can show a "new version
     available" toast.
   - When the user taps Reload, the page sends a SKIP_WAITING message; the new
     worker activates, clears old caches, and the page reloads once into the
     new version. (If the user ignores the toast, the update applies naturally
     on a later visit when no old version is controlling any tab.)
   - No "reinstall" needed; same icon, same saved data (localStorage is never
     touched by cache changes), new content.
*/

const CACHE_VERSION = 'thai-memory-v1.6.6';
const CACHE_NAME = CACHE_VERSION;

/* Recordings live in their OWN cache, whose name deliberately does NOT contain
   CACHE_VERSION.

   Why: the app-shell cache above is wiped on every version bump, which is
   exactly right for HTML/JS/CSS — stale code must go. But a recording of a Thai
   word never changes, and students accumulate them gradually. If they lived in
   the versioned cache, every single app update would throw away every recording
   a student had built up and make them re-download the lot over mobile data.

   Kept out of the activate cleanup below, this cache simply survives updates.

   THREE FOLDERS, ONE CACHE:
     ./audio/voice/      — lesson pronunciations, one per vocabulary word, keyed
                           in the app by Thai text. Hundreds of them.
     ./audio/computer/   — CPU opponent dialogue. A character speaking, named
                           directly by filename on the dialogue line, so two
                           characters saying the same words still get their own
                           recording. A few dozen.
     ./audio/tone-words/ — the Tone Trainer's native reference words, played by
                           the "Native examples" box. Nineteen of them, named by
                           the word id in tone-trainer.js's TONE_WORDS table.
   They are separate folders because they are unrelated content with different
   owners and lifecycles, but they want identical CACHE treatment, so one regex
   covers all three. Anything matching it gets cache-first playback that survives
   updates, and — importantly — a clean failure instead of the index.html
   fallback at the foot of this file (see the fetch handler for why that matters
   to an <audio> element). A new audio folder that is NOT listed here would
   silently get the app-shell treatment instead, and be wiped on every update.

   NOT PRE-CACHED AT INSTALL. There can be hundreds of these; forcing every
   student to download all of them before the app will even open would be a
   terrible trade for files most of them will never play. Instead the page sends
   a WARM_MEDIA message a few seconds after startup and they are fetched
   quietly in the background (see the message handler below), CPU dialogue
   first. Until a file has arrived the app copes on its own — a vocabulary word
   falls back to speech synthesis, and a CPU line stays silent, which is that
   feature's normal state anyway. */
const VOICE_CACHE_NAME = 'thai-voice-v1';
const MEDIA_PATH_RE = /\/audio\/(voice|computer|tone-words)\//i;

/* Lesson review pages (thai-course.com/review/... and /reviews/...) are separate
   websites that happen to share this origin, opened in a new tab from the
   Grammar menu. They are not part of the app and must not be handled here:
   caching them would slowly fill the app's cache with pages and images the app
   never uses, and — worse — the offline fallback at the bottom of this file
   would answer an uncached review page with the app's own index.html, so a
   student offline would see the app boot inside the review tab instead of a
   normal browser error. Left alone, the browser handles them normally.
   (\/|$) rather than a bare \/ so the folder roots themselves, /review and
   /reviews with no trailing slash, are left alone too.
   /start (the new-student lesson portal, its API included) is the same kind of
   separate site and gets the same treatment, in both places this regex is used. */
const REVIEW_PATH_RE = /^\/(reviews?|start)(\/|$)/i;

/* version.json is the update sentinel: index.html fetches it on launch and
   compares it with the APP_VERSION baked into that build, so a mismatch proves
   the device is running stale code. That only works if the answer comes from
   the server, so this file is excluded from caching entirely — left alone here,
   it goes straight to the network like any ordinary request. Caching it would
   turn the one honest source of truth into another thing that can go stale, and
   the offline fallback at the foot of this file would answer it with the app's
   own index.html, which is not JSON and would fail to parse. It is deliberately
   absent from PRECACHE_URLS for the same reason. */
const VERSION_PATH_RE = /\/version\.json$/i;

/* The private statistics area: the /api/ endpoints and the page that reads
   them. Deliberately NOT cached and NOT precached.

   POST /api/sync is already ignored below (the handler skips anything that is
   not a GET), but GET /api/stats is not, and under the app-shell strategy it
   would be answered from cache — so the statistics page would show the first
   snapshot it ever fetched and never update again, which looks exactly like a
   broken tracker. statistics.html gets the same treatment so that editing it
   does not require a cache version bump.

   These paths are also useless offline: they need a live Cloudflare Access
   session, so the index.html fallback at the foot of this file would hand an
   HTML document to code expecting JSON. */
const PRIVATE_PATH_RE = /^\/(api\/|statistics\.html$)/i;

/* Listening Practice tracks (./audio/listening/). Deliberately NOT handled
   here at all — no cache, no fallback — so the browser streams them itself.

   WHY HANDS OFF. These are long files (7+ MB) that an <audio> element reads
   in pieces with Range requests while it plays and every time the student
   jumps to a sentence. The app-shell strategy below would try to cache each
   206 partial response (which cache.put() rejects), and when offline would
   hand the element the app's own index.html instead of audio. Left alone,
   the browser's normal network + HTTP cache handling is exactly right, and
   the Listening screen shows its own clear message when there is no
   connection. Offline copies of tracks, if ever wanted, belong in their own
   cache with proper Range support — a separate, deliberate change.
   Unanchored like MEDIA_PATH_RE; review pages are excluded earlier anyway. */
const LISTENING_PATH_RE = /\/audio\/listening\//i;

// Files to pre-cache during install. Images and sounds live in
// separate ./images/ and ./audio/ files (previously embedded as base64 inside
// index.html). We pre-cache them all so the game works fully offline once
// installed. The browser will still cache any other requests opportunistically.
const PRECACHE_URLS = [
  './',
  './index.html',
  './vocab-data.js',
  './grammar-data.js',
  './sentences.js',
  './sentence-builder.js',
  './pitchy.js',
  './tone-trainer.js',
  './tone-challenge.js',
  './tongue-twister.js',
  './word-cards.js',
  './lessons.js',
  // Listening Practice: the engine, and the track list/timings it loads the
  // first time the screen opens. Pre-cached so the screen itself works offline
  // (the audio streams — see LISTENING_PATH_RE).
  './listening.js',
  './listening-data.js',
  './romanizer-dict.js',
  './romanizer-dict2.js',
  './romanizer-meanings.js',
  './romanizer-meanings2.js',
  './romanizer-freq.js',
  './romanizer-autobreak.js',
  './romanizer.js',
  './manifest.json',
  './icon_48.png',
  './icon_180.png',
  './icon_192.png',
  './icon_512.png',
  // Card backgrounds
  './images/card_background_1.jpg',
  './images/card_background_2.jpg',
  './images/card_background_3.jpg',
  './images/card_background_4.jpg',
  './images/card_background_5.jpg',
  './images/card_background_6.jpg',
  './images/card_background_7.jpg',
  // Character artwork
  './images/artwork_1_grandma.jpg',
  './images/artwork_2_tuktuk.jpg',
  './images/artwork_3_fighter.jpg',
  './images/artwork_4_student.jpg',
  './images/artwork_5_lawyer.jpg',
  './images/artwork_6_teacher.jpg',
  // Character end-game outcome artwork (won / lost poses)
  './images/artwork_1_grandma_won.jpg',
  './images/artwork_1_grandma_lost.jpg',
  './images/artwork_2_tuktuk_won.jpg',
  './images/artwork_2_tuktuk_lost.jpg',
  './images/artwork_3_fighter_won.jpg',
  './images/artwork_3_fighter_lost.jpg',
  './images/artwork_4_student_won.jpg',
  './images/artwork_4_student_lost.jpg',
  './images/artwork_5_lawyer_won.jpg',
  './images/artwork_5_lawyer_lost.jpg',
  './images/artwork_6_teacher_won.jpg',
  './images/artwork_6_teacher_lost.jpg',
  // Character avatars
  './images/avatar_1_grandma.jpg',
  './images/avatar_2_tuktuk.jpg',
  './images/avatar_3_fighter.jpg',
  './images/avatar_4_student.jpg',
  './images/avatar_5_lawyer.jpg',
  './images/avatar_6_teacher.jpg',
  // Achievement trophies (transparent PNGs)
  './images/Ach1.png',
  './images/Ach2.png',
  './images/Ach3.png',
  './images/Ach4.png',
  './images/Ach5.png',
  './images/Ach6.png',
  './images/Ach7.png',
  './images/Ach8.png',
  // Tone Challenge rating illustrations (1 = lowest … 5 = excellent)
  './images/rate1.png',
  './images/rate2.png',
  './images/rate3.png',
  './images/rate4.png',
  './images/rate5.png',
  // vs-CPU badge trophies (transparent PNGs)
  './images/trophy_bronze.png',
  './images/trophy_silver.png',
  './images/trophy_gold.png',
  // Sound effects
  './audio/game_memory_match-v2.mp3',
  './audio/game_memory_wrong.mp3',
  './audio/card-flip-v2.mp3',
  './audio/result_win_big-v2.mp3',
  './audio/result_win_regular.mp3',
  './audio/result_lose-v2.mp3',
  './audio/result_draw-v2.mp3',
  './audio/skip.mp3',
  './audio/got-it.mp3',
  './audio/toggle-on.mp3',
  './audio/toggle-off.mp3',
  './audio/game_start-v2.mp3',
  './audio/game_cpu_click-v2.mp3',
  // Trimmed menu click (mono, silence removed). The untrimmed original is kept
  // and still pre-cached below purely so that reverting the one line in
  // index.html that names this file is a complete, offline-safe rollback.
  './audio/menu-click-v3.mp3',
  './audio/menu-click.mp3',
  './audio/game_cpu_chat-v2.mp3',
  // vs-Computer end-modal spoken result lines
  './audio/say-won.mp3',
  './audio/say-lost.mp3',
  './audio/say-draw.mp3',
  './audio/game_bingo_correct-v2.mp3',
  './audio/game_bingo_incorrect-v2.mp3',
  './audio/game_sentence_put-v2.mp3',
  './audio/game_sentence_remove-v2.mp3',
  './audio/game_sentence_fail-v2.mp3',
  // Word Cards SFX — declared in WC_SOUNDS in word-cards.js, not in index.html.
  './audio/uno-shuffle-v2.mp3',
  './audio/uno-deal-v2.mp3',
  './audio/uno-red.mp3',
  './audio/uno-blue.mp3',
  './audio/uno-green.mp3',
  './audio/uno-yellow.mp3',
  './audio/uno-reverse-say.mp3',
  './audio/uno-skip-say.mp3',
  './audio/uno-wrong-v2.mp3',
  './audio/uno-1left-v2.mp3',
  './audio/uno-draw2-v2.mp3',
  './audio/uno-draw4-v2.mp3',
  './audio/uno-reverse-v2.mp3',
  './audio/uno-skip-v2.mp3',
  './audio/uno-turn-v2.mp3',
  './audio/uno-change-v2.mp3',
  // Lesson-content unlock chime
  './audio/unlock.mp3',
  /* Tongue Twister native recordings — named in TT_TWISTERS in
     tongue-twister.js, not in index.html. Unlike the ./audio/voice/ and
     ./audio/computer/ recordings these ARE pre-cached: there are only a
     handful, every learner who opens the mode needs them, and the mode is far
     less useful without a model to copy. Being in the versioned cache they are
     re-downloaded on each app update, which is an acceptable cost at this
     count. (The install step adds each file individually and swallows failures,
     so a recording that has not been uploaded yet logs a warning rather than
     breaking the install.) */
  './audio/twisters/moo-meuk-goong.mp3',
  './audio/twisters/krai-kaai-kai-gai.mp3',
  './audio/twisters/yak-yai-lai-yak-lek.mp3',
  './audio/twisters/kao-gin.mp3',
  './audio/twisters/chaam-kieow.mp3',
  './audio/twisters/mai-mai.mp3',
  './audio/twisters/maa-5-tones.mp3',
  './audio/twisters/saao.mp3',
  /* Tongue Twister result chimes. Referenced from tongue-twister.js only, so
     they must be listed here explicitly — nothing in index.html points at them. */
  './audio/twister-fail.mp3',
  './audio/twister-poor.mp3',
  './audio/twister-ok.mp3',
  './audio/twister-good.mp3',
  './audio/bingo01.mp3',
  './audio/bingo02.mp3',
  './audio/bingo03.mp3',
  './audio/welcome.mp3',
  './audio/how-to-v2.mp3'
];

/* Files whose CONTENTS change from release to release while keeping the same
   name: the page itself, every script, and the manifest. These must be fetched
   from the network at install time, bypassing the browser's HTTP cache — see
   the install handler below for why.

   Everything else (images, sound effects, recordings) is versioned by FILENAME
   instead: when one of those changes it ships under a new name, the way
   menu-click-v2.mp3 did. Their contents at a given URL therefore never change,
   so letting the HTTP cache answer for them is always correct — and on a phone
   it is the difference between an update re-downloading a couple of hundred KB
   of code and re-downloading every megabyte of artwork and audio again. */
const VOLATILE_PRECACHE_RE = /(^\.\/$|\.html$|\.js$|\.json$)/i;

/* The same code-vs-content distinction, but tested against a REQUEST PATH
   rather than a PRECACHE_URLS entry, so the fetch handler can ask it too.
   `^\/$` is the root navigation, which is './' in the list above. */
const VOLATILE_PATH_RE = /(^\/$|\.html$|\.js$|\.json$)/i;

/* Install: pre-cache the app shell.

   NOTE: we intentionally do NOT call skipWaiting() here. Letting the new worker
   wait is what allows the page to detect the update and show the reload toast.

   WHY { cache: 'reload' } ON THE CODE FILES. A plain cache.add() is allowed to
   be answered from the browser's own HTTP cache. If that cache is holding the
   PREVIOUS index.html — which is exactly the situation on a device that has
   fallen behind — then a brand new worker would faithfully pre-cache the OLD
   page into its brand new versioned cache, activate, and go on serving stale
   content under a fresh version number. Nothing afterwards could detect that,
   because as far as the worker is concerned the update succeeded. Forcing a
   network fetch for these few files makes that failure impossible.

   Individual adds still swallow their own errors, so a missing icon or a
   recording that has not been uploaded yet logs a warning instead of breaking
   the install. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) => {
          let request = url;
          if (VOLATILE_PRECACHE_RE.test(url)) {
            // If Request construction is ever unavailable, fall back to the
            // plain string form rather than skipping the file altogether.
            try { request = new Request(url, { cache: 'reload' }); } catch (e) { request = url; }
          }
          return cache.add(request).catch((err) => {
            console.warn('SW: failed to cache', url, err);
          });
        })
      );
    })
  );
});

/* ========= BACKGROUND RECORDING WARM-UP =========
   The page sends { type: 'WARM_MEDIA', urls: [...] } a few seconds after
   startup, listing every recording it could ever want to play. We download
   whatever is missing into the recordings cache, slowly and in the background,
   so that a student who has just installed the app is not the one paying for the
   first play of each file.

   WHY THIS LIVES HERE rather than in the page: one cache.keys() call tells us
   what is already present, so a returning student's warm-up costs a single
   cache read and no network at all. Doing it page-side would mean either
   hundreds of individual cache probes or hundreds of speculative fetches.

   DESIGN RULES, all of them about staying out of the way:
     • One shared queue. Repeat messages just add to it; already-queued and
       already-cached URLs are dropped, so calling this every launch is cheap.
     • 'now' priority jumps the queue. Used when a student picks a CPU opponent
       — that character's voice is needed in seconds, not after two hundred
       vocabulary files — and when an Audio Bingo or Sentence Builder game
       starts. Files already waiting in the queue are moved to the front too.
     • Small concurrency and a pause between files. This is deliberately slower
       than the network allows: it is competing with the app the student is
       actually using, and finishing a minute later costs nothing.
     • Every failure is swallowed and simply leaves that file for next time.
       Progress is durable because it lives in the cache itself, so a run cut
       short by the app closing resumes on the next launch rather than starting
       over.
   Nothing here can affect the fetch handler, the install, or the activation. In
   the worst case no warm-up happens and recordings arrive on first play, which
   is exactly how the app behaved before this existed. */
const WARM_CONCURRENCY = 2;      // parallel downloads — low on purpose
const WARM_GAP_MS = 120;         // breather between files, per worker

let warmQueue = [];              // URLs still to fetch, in order
let warmQueued = new Set();      // membership index for warmQueue (dedupe)
let warmRunning = 0;             // active drain workers

function warmSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Add URLs to the queue, skipping anything already queued or already cached.
async function warmEnqueue(urls, priority) {
  if (!Array.isArray(urls) || urls.length === 0) return;

  // What is already in the cache? One read for the whole set.
  let have = new Set();
  try {
    const cache = await caches.open(VOICE_CACHE_NAME);
    const keys = await cache.keys();
    keys.forEach((req) => {
      try { have.add(new URL(req.url).pathname); } catch (e) {}
    });
  } catch (e) {
    // Cannot read the cache — fall through with an empty set. Worst case we
    // re-request files we already have, which the fetch below caches again.
  }

  const fresh = [];
  const promote = new Set();   // 'now' only: already-waiting files to move up
  urls.forEach((u) => {
    if (typeof u !== 'string' || !u) return;
    let abs, path;
    try {
      abs = new URL(u, self.location.href);
      path = abs.pathname;
    } catch (e) { return; }
    if (abs.origin !== self.location.origin) return;   // only our own files
    /* Review sites are not ours, even though they share this origin. The guard
       in the fetch handler does not cover this path (a worker's own fetches
       skip its fetch handler), and MEDIA_PATH_RE is unanchored, so without this
       a /reviews/.../audio/voice/ file would pass the check below. */
    if (REVIEW_PATH_RE.test(path)) return;
    if (!MEDIA_PATH_RE.test(path)) return;             // only recordings
    if (have.has(path)) return;                        // already cached
    if (warmQueued.has(path)) {                        // already waiting (or downloading)
      if (priority === 'now') promote.add(path);
      return;
    }
    warmQueued.add(path);
    fresh.push(abs.href);
  });

  /* PROMOTION. A 'now' request must also be able to move a file that is
     ALREADY WAITING in the queue to the front. Without this, a file queued by
     the big background warm-up (which, on a fresh install, is every file) could
     not be hurried at all: the dedupe above would drop the 'now' request and the
     file would keep its place behind hundreds of others — exactly when priming
     matters most. Files currently being downloaded are no longer in warmQueue,
     so they are simply left alone. Order among promoted files is kept. */
  const moved = [];
  if (promote.size) {
    const keep = [];
    warmQueue.forEach((href) => {
      let p = href;
      try { p = new URL(href).pathname; } catch (e) {}
      if (promote.has(p)) moved.push(href);
      else keep.push(href);
    });
    if (moved.length) warmQueue = keep;
  }

  if (fresh.length === 0 && moved.length === 0) return;
  if (priority === 'now') warmQueue = fresh.concat(moved, warmQueue);
  else warmQueue = warmQueue.concat(fresh);

  /* Start drain workers, and hand their promises back so the caller's waitUntil
     keeps this worker alive while they run rather than only while the queue was
     being built.

     HOW MANY IS DECIDED UP FRONT, ON PURPOSE. warmDrain is async but returns
     SYNCHRONOUSLY when it finds the queue already empty — its finally block, and
     so its warmRunning--, both run before control comes back here. A loop
     conditioned on the live value of warmRunning therefore never terminates in
     that case: every worker started to fill the gap immediately un-fills it
     again. Since this is the service worker's only thread, that is a hang, not
     a slow path. Counting once, before any worker starts, is what makes it
     impossible. Capping at the queue length also avoids starting a worker that
     has nothing to do — the exact case (a one-file 'now' prime) that tripped
     it. */
  const want = Math.min(WARM_CONCURRENCY - warmRunning, warmQueue.length);
  const started = [];
  for (let i = 0; i < want; i++) {
    warmRunning++;
    started.push(warmDrain());
  }
  if (started.length) await Promise.all(started);
}

/* Is this URL already in the recordings cache? warmEnqueue() checks the cache
   when a file is QUEUED, but a file can arrive by another route while it waits
   (the student plays that word, or a 'now' prime fetches it first), and without
   this check it would then be downloaded a second time. Never throws: any
   failure answers "no", which simply means the file is fetched, exactly as it
   was before this check existed. */
async function warmAlreadyCached(url) {
  try {
    const cache = await caches.open(VOICE_CACHE_NAME);
    const hit = await cache.match(url, { ignoreVary: true });
    return !!hit;
  } catch (e) {
    return false;
  }
}

// One drain worker: take the next URL, fetch it, cache it, breathe, repeat.
async function warmDrain() {
  try {
    while (warmQueue.length) {
      const url = warmQueue.shift();
      let path = url;
      try { path = new URL(url).pathname; } catch (e) {}
      // Arrived by another route while it waited — nothing to download. No
      // pause either, since no network was used. The dedupe slot is released
      // exactly as it is after a download below.
      if (await warmAlreadyCached(url)) {
        try { warmQueued.delete(path); } catch (e) {}
        continue;
      }
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        /* status 206 (a partial response) cannot be cached and would throw, so
           insist on a plain 200 rather than the looser res.ok.

           !res.redirected matters MORE here than anywhere else in this file.
           This origin sits behind Cloudflare Access; when a session expires a
           fetch follows the redirect to the login page and comes back 200 OK
           with HTML. Writing that into the recordings cache would be permanent
           damage, because this cache is deliberately never versioned, is never
           cleared on activate, and is preserved even by the ?reset=1 recovery —
           and warmEnqueue() skips anything already present, so the real file
           would never be requested again. Skipping the write instead leaves the
           URL uncached, which is the state this whole queue already knows how
           to resume from on the next launch. */
        if (res && res.status === 200 && !res.redirected) {
          const cache = await caches.open(VOICE_CACHE_NAME);
          await cache.put(url, res);
        }
      } catch (e) {
        // Offline, 404, or anything else: leave it for a future run.
      }
      // Release the dedupe slot only after the attempt, so a second message
      // arriving mid-run cannot queue the same file twice.
      try { warmQueued.delete(path); } catch (e) {}
      await warmSleep(WARM_GAP_MS);
    }
  } catch (e) {
    // Never let a drain worker die noisily.
  } finally {
    warmRunning--;
    if (warmRunning < 0) warmRunning = 0;
  }
}

// Messages from the page: activation of a waiting worker (the "Reload" button),
// and the background warm-up request.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'WARM_MEDIA') {
    // waitUntil keeps this worker alive long enough to make progress; if the
    // browser stops it anyway, whatever was cached stays cached and the rest is
    // picked up next launch.
    const job = warmEnqueue(data.urls, data.priority).catch(() => {});
    try { if (event.waitUntil) event.waitUntil(job); } catch (e) {}
  }
});

// Activate: clean up old caches from previous versions, then take control.
// The voice cache is preserved: it is not versioned, and the recordings in it
// are still valid no matter which version of the app is running.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== VOICE_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* The background half of the stale-while-revalidate strategy below, split out
   so that the one thing that matters about it is impossible to miss: HOW it
   re-fetches.

   A plain fetch() may be answered by THE BROWSER'S OWN HTTP CACHE. For code
   files that is the bug this function exists to prevent. On a device whose HTTP
   cache is holding the previous index.html, a plain refresh writes that old
   file straight back over itself: the app-shell cache looks freshly updated,
   the device never notices the deployment, and nothing downstream can tell,
   because as far as every other piece of machinery is concerned the refresh
   succeeded. That is how a student ends up stranded on an old build with no way
   out but the ?reset=1 link. The install handler already guards against exactly
   this with { cache: 'reload' }; this path was the remaining hole.

   WHY 'no-cache' HERE AND 'reload' THERE. Both bypass a stale cached body.
   'reload' re-downloads unconditionally; 'no-cache' revalidates first and
   accepts a 304. Install runs once per version and can afford the former. This
   runs for every app-shell file on every launch, so the difference is a few
   hundred bytes of conditional requests versus re-downloading every script in
   the app each time the student opens it — on mobile data, every time.

   IMAGES AND AUDIO KEEP THE PLAIN FETCH, deliberately. They are versioned by
   FILENAME (the way menu-click-v2.mp3 was), so their contents at a given URL
   never change and revalidating them would spend a student's data to confirm
   something already known.

   Nothing here is awaited and every failure is swallowed: this is a background
   courtesy, and the response being served to the page has already gone out. */
function revalidate(req, isVolatile) {
  let refreshReq = req;
  if (isVolatile) {
    try {
      refreshReq = new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    } catch (e) {
      refreshReq = req;          // ancient browser: a stale refresh beats none
    }
  }
  fetch(refreshReq).then((res) => {
    /* !res.redirected matters more now that code files always reach the
       network. This origin sits behind Cloudflare Access; when a session
       expires, a fetch follows a redirect to the login page and comes back 200
       OK with HTML that is not this app. Storing that over index.html would
       poison the shell until the next version bump. A redirected response is
       never written to the cache — the existing entry simply stays. */
    if (res && res.ok && !res.redirected) {
      caches.open(CACHE_NAME).then((cache) => cache.put(req, res));
    }
  }).catch(() => { /* offline — ignore */ });
}

// Fetch: cache-first for same-origin GET requests.
// Cross-origin (e.g. Google Fonts) bypasses the cache and goes to network.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests with our cache.
  if (url.origin !== self.location.origin) return;

  // Lesson review pages are not part of the app — hands off entirely.
  if (REVIEW_PATH_RE.test(url.pathname)) return;

  // The update sentinel must always be answered by the server, never by us.
  if (VERSION_PATH_RE.test(url.pathname)) return;

  // Statistics API and page — always live, never cached. See PRIVATE_PATH_RE.
  if (PRIVATE_PATH_RE.test(url.pathname)) return;

  // Listening Practice tracks — streamed by the browser itself, never cached
  // or answered here. See LISTENING_PATH_RE.
  if (LISTENING_PATH_RE.test(url.pathname)) return;

  // Recordings (lesson pronunciations + CPU dialogue): cache-first out of the
  // long-lived recordings cache.
  //
  // Two deliberate differences from the app-shell strategy below. There is no
  // background re-fetch on a hit, because a recording of a word never changes,
  // so re-downloading it would spend a student's data to replace a file with
  // itself. And there is no index.html fallback on failure: handing an HTML
  // document to an <audio> element produces a confusing decode error, whereas a
  // clean failure is exactly what the app's own fallback is waiting for — it
  // then speaks the word with TTS instead, which is the whole point of the
  // recordings being optional.
  if (MEDIA_PATH_RE.test(url.pathname)) {
    event.respondWith(
      /* ignoreVary: a recording is one immutable file at one URL, so matching on
         URL alone is always correct for it. It also matters now that entries can
         be written two ways — by this handler, from a media element's request,
         or by the background warm-up, from a plain fetch. Those two send
         different request headers, so a server that responds with any Vary at
         all could otherwise leave a warmed file sitting in the cache unmatched
         and re-downloaded on first play, which would defeat the warm-up. */
      caches.match(req, { cacheName: VOICE_CACHE_NAME, ignoreVary: true }).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          /* !res.redirected: an expired Cloudflare Access session answers with
             the login page as a 200, and this cache survives both version bumps
             and ?reset=1, so storing it would break that one recording forever.
             The response is still handed to the caller untouched — the <audio>
             element fails, and the app falls back to speech synthesis exactly as
             it does for any recording it cannot play. See warmDrain() above. */
          if (res && res.ok && res.status !== 206 && !res.redirected) {
            const clone = res.clone();
            caches.open(VOICE_CACHE_NAME).then((cache) => cache.put(req, clone));
          } else if (res && res.status === 206 && !res.redirected) {
            /* A PARTIAL RESPONSE CAN NEVER BE CACHED, and for a media element it
               is the normal case, not the exception. <audio> sends a Range
               header (Chrome and Firefox 'bytes=0-', Safari 'bytes=0-1'), the
               server answers 206 Partial Content, and cache.put() rejects every
               206 by spec. So a recording fetched on first play never reached
               this cache: the only files that did were the ones the background
               warm-up had fetched itself (a plain fetch, no Range, a plain 200).
               That hit hardest on exactly the students the warm-up skips (Data
               Saver, 2G), for whom a played word was re-downloaded on every play
               and never became available offline.

               The response is still handed to the element untouched, exactly as
               before. Separately, the URL goes to the warm-up queue at 'now'
               priority, which fetches it WITHOUT a Range header and caches the
               full file (see warmDrain). Cost: one extra ~25 KB download, once
               per file, ever. The queue's own dedupe absorbs the repeat requests
               a single playback makes (Safari sends several ranges). Every
               failure is swallowed; the worst case is that nothing is cached,
               which is how this path behaved before. */
            try {
              const job = warmEnqueue([req.url], 'now').catch(() => {});
              try { event.waitUntil(job); } catch (e) {}
            } catch (e) {}
          }
          return res;
        }).catch(() => new Response('', { status: 504, statusText: 'Recording unavailable offline' }));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Cache hit — return cached, but also refresh the cache in the
        // background for next time (stale-while-revalidate pattern). See
        // revalidate() for why code files must not be refreshed through the
        // browser's HTTP cache.
        revalidate(req, VOLATILE_PATH_RE.test(url.pathname));
        return cached;
      }
      // Cache miss — fetch from network and cache the result.
      return fetch(req).then((res) => {
        /* !res.redirected, for the same reason revalidate() above refuses a
           redirected response: behind Cloudflare Access an expired session
           comes back 200 OK with the login page's HTML, and writing that into
           the app-shell cache would poison the shell until the next version
           bump. This was the remaining hole — revalidate() only guards the
           cache-HIT path, and a file that is not in the cache at all (anything
           added since the last install) arrives through here. Not caching it
           simply means the next request tries the network again. */
        if (res && res.ok && !res.redirected) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Network failed and not in cache — return whatever we have for the
        // root URL as a fallback so the app at least loads its shell.
        return caches.match('./index.html');
      });
    })
  );
});
