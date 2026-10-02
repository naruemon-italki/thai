/* =============================================================================
   lessons.js  —  Lesson Downloads screen

   Loaded as a plain (non-module) script after the main one. Like word-cards.js
   and tongue-twister.js it keeps BOTH its markup and its CSS here: index.html
   holds only an empty #view-lessons shell, the menu button and the navigation
   wiring.

   Exposes renderLessons() on window.

   ---------------------------------------------------------------------------
   THE SERVER DECIDES EVERYTHING HERE.

   This screen lists every item the course has, always, in the order the server
   sends them. Each one is either a real download or a locked row, and which of
   those it is comes from /api/lessons/manifest — never from anything on this
   device. There is no unlock code involved and nothing in localStorage that
   could change what a student can get.

   That is a deliberate simplification over the first version, which filtered
   the list by the unlock ceiling. Two-part lessons broke that model: the codes
   unlock a whole lesson, but Part 1 is taught a week before Part 2, so the
   teacher needs to hand over Part 1 alone. Access is now granted per item in
   the admin panel, and this screen simply shows the result.

   A locked row still shows its title and which formats exist. A student should
   be able to see that Lesson 9 Part 2 is real and not theirs yet, rather than
   wonder whether it was ever made — and if a grant was forgotten, they can say
   exactly which item is missing.

   No link is ever rendered for a locked row, and the entitlement is checked
   again on the server for every download, so a hand-edited page achieves
   nothing beyond a 403.

   ---------------------------------------------------------------------------
   OFFLINE. Everything here needs the network and a live Access session; none
   of it is cached (these URLs sit under /api/, which the service worker
   ignores by design). So the failure path is a first-class part of the screen
   rather than an afterthought: a clear message and a Retry button, never an
   empty list that looks like "you have nothing".
============================================================================= */

(function () {
  'use strict';

  var MANIFEST_URL = '/api/lessons/manifest';
  var AUTH_MSG = 'Your sign-in has expired. Please sign in again to continue.';

  /* "app" when running as the installed app, "web" in a browser tab. Sent as
     ?m= on the manifest request this screen already makes, so the admin panel
     can show which way each student uses the app: no extra request, nothing
     visible, and if anything here fails the marker is simply left out. The
     Worker ignores the parameter entirely if it does not know it. */
  function viewMode() {
    try {
      if (window.navigator && window.navigator.standalone === true) return 'app';   // iPhone / iPad home screen
      if (window.matchMedia) {
        var modes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
        for (var i = 0; i < modes.length; i++) {
          if (window.matchMedia('(display-mode: ' + modes[i] + ')').matches) return 'app';
        }
      }
      return 'web';
    } catch (e) { return ''; }
  }
  function manifestUrl() {
    var m = viewMode();
    return m ? (MANIFEST_URL + '?m=' + m) : MANIFEST_URL;
  }

  var built = false;      // markup injected yet?
  var loading = false;    // a fetch is in flight
  var data = null;        // last good manifest
  var failure = null;     // { kind, message } from the last failed attempt

  /* The app's tap feedback. `id` names a sound effect from index.html's
     SOUND_CONFIG; without one it is the ordinary menu click. (This used to ask
     for 'click', an id nothing has, so every button here was silent.) */
  function click(id) {
    try { if (typeof playSound === 'function') playSound(id || 'snd-menu-click'); } catch (e) {}
    try { if (typeof haptic === 'function') haptic('light'); } catch (e) {}
  }

  /* A real page load to a URL the service worker has never cached, so it
     reaches Cloudflare, which shows its sign-in page. The implementation lives
     in index.html (window.tcSignIn, under SIGN-IN RENEWAL) so there is one of
     them; the guarded fallback below does the same thing if it is missing. */
  function signIn() {
    try {
      if (typeof window.tcSignIn === 'function') { window.tcSignIn(); return; }
    } catch (e) {}
    var url = (location.pathname || '/') + '?signin=' + Date.now();
    try { location.replace(url); } catch (e2) { location.href = url; }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sizeText(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '';
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function iconFor(ext) {
    if (ext === 'pdf') return '📄';
    if (ext === 'ppsx' || ext === 'pptx' || ext === 'ppt') return '💻';
    return '📎';
  }

  /* ---- styles ------------------------------------------------------------- */

  function injectStyles() {
    if (document.getElementById('lsn-styles')) return;
    var s = document.createElement('style');
    s.id = 'lsn-styles';
    s.textContent = [
      '#view-lessons .lsn-wrap{max-width:640px;margin:0 auto;width:100%}',
      '#view-lessons .lsn-intro{color:var(--ink-soft);font-size:.9rem;line-height:1.5;margin:0 0 1rem}',
      '#view-lessons .lsn-bar{display:flex;gap:.5rem;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 .8rem}',
      '#view-lessons .lsn-state{color:var(--ink-soft);font-size:.85rem}',
      '#view-lessons .lsn-btn{font:inherit;font-size:.85rem;padding:.35rem .8rem;border:1px solid var(--card-face-border);',
      'border-radius:8px;background:var(--button-bg);color:var(--ink);cursor:pointer}',
      '#view-lessons .lsn-btn:hover{background:var(--button-hover)}',
      '#view-lessons .lsn-row{background:var(--panel);border:1px solid var(--card-face-border);border-radius:12px;',
      'padding:.7rem .85rem;margin:0 0 .6rem;box-shadow:0 1px 3px var(--shadow)}',
      '#view-lessons .lsn-row.locked{opacity:.72}',
      '#view-lessons .lsn-head{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}',
      '#view-lessons .lsn-name{font-weight:600;color:var(--ink);flex:1 1 auto;min-width:0}',
      '#view-lessons .lsn-tag{font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;padding:.15rem .5rem;',
      'border-radius:999px;border:1px solid currentColor;flex:0 0 auto}',
      '#view-lessons .lsn-tag.open{color:var(--success)}',
      '#view-lessons .lsn-tag.shut{color:var(--ink-soft)}',
      '#view-lessons .lsn-files{display:flex;flex-direction:column;gap:.4rem;margin-top:.55rem}',
      '#view-lessons a.lsn-file,#view-lessons .lsn-file{display:flex;align-items:center;gap:.55rem;text-decoration:none;',
      'color:var(--ink);border:1px solid var(--card-face-border);border-radius:9px;padding:.45rem .6rem;background:var(--button-bg)}',
      '#view-lessons a.lsn-file:hover{background:var(--button-hover)}',
      '#view-lessons .lsn-file.off{border-style:dashed;background:transparent;color:var(--ink-soft)}',
      '#view-lessons .lsn-file .lsn-ic{font-size:1.1rem;flex:0 0 auto}',
      '#view-lessons .lsn-file.off .lsn-ic{filter:grayscale(1);opacity:.6}',
      '#view-lessons .lsn-file .lsn-ft{flex:1 1 auto;min-width:0}',
      '#view-lessons .lsn-file .lsn-fn{display:block;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#view-lessons .lsn-file .lsn-fm{display:block;font-size:.73rem;color:var(--ink-soft)}',
      '#view-lessons .lsn-note{margin-top:.5rem;font-size:.82rem;color:var(--ink-soft);line-height:1.45}',
      '#view-lessons .lsn-empty{text-align:center;color:var(--ink-soft);padding:2rem 1rem;line-height:1.6}',
      '#view-lessons .lsn-err{background:var(--panel);border:1px solid var(--error);border-radius:12px;',
      'padding:.9rem 1rem;color:var(--ink);line-height:1.5}',
      '#view-lessons .lsn-hint{margin-top:1rem;font-size:.82rem;color:var(--ink-soft);line-height:1.5;text-align:center}',
      '#view-lessons .lsn-sec{margin:0 0 .6rem;font-size:.8rem;font-weight:700;letter-spacing:.06em;',
      'text-transform:uppercase;color:var(--ink-soft)}',
      '#view-lessons .lsn-sec.upper{margin-top:1.6rem;padding-top:1.1rem;border-top:1px solid var(--card-face-border)}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ---- markup ------------------------------------------------------------- */

  function build() {
    var host = document.getElementById('view-lessons');
    if (!host) return null;
    if (built) return host;
    injectStyles();
    injectNotifyStyles();
    injectDownloadStyles();
    host.innerHTML =
      '<div class="lsn-wrap">' +
        '<h2>Lesson Downloads</h2>' +
        '<p class="lsn-intro">The PowerPoint and PDF for every lesson.<br>The ones ' +
        'you have studied are ready to download; the rest unlock as we go.</p>' +
        '<div class="lsn-notify" id="lsn-notify" hidden>' +
          '<label class="lsn-notify-row" for="lsn-notify-switch">' +
            '<span class="lsn-notify-label">Email me when a new lesson unlocks</span>' +
            '<input type="checkbox" role="switch" class="lsn-switch" id="lsn-notify-switch">' +
          '</label>' +
          '<div class="lsn-notify-msg" id="lsn-notify-msg" hidden>Couldn\u2019t save that. Please try again.</div>' +
          '<div class="lsn-notify-ok" id="lsn-notify-ok" role="status" aria-live="polite"></div>' +
        '</div>' +
        '<div class="lsn-bar">' +
          '<span class="lsn-state" id="lsn-state"></span>' +
          '<button class="lsn-btn" id="lsn-refresh" type="button">Refresh</button>' +
        '</div>' +
        '<div id="lsn-list"></div>' +
      '</div>';
    var btn = document.getElementById('lsn-refresh');
    if (btn) btn.addEventListener('click', function () { click(); load(); });
    bindNotify();
    bindDownloads();
    built = true;
    return host;
  }

  /* ---- data --------------------------------------------------------------- */

  function load() {
    if (loading) return;
    loading = true;
    failure = null;
    render();

    /* redirect: 'manual' is what makes a lapsed session visible at all. Left to
       follow it, the browser chased Access's redirect to the login page on
       another origin, the request failed exactly as if offline, and the student
       was told to check their connection. Held back, it arrives below as an
       'opaqueredirect'. A live session is never redirected here (the Worker
       answers directly), so a normal load is unaffected. */
    fetch(manifestUrl(), { credentials: 'same-origin', cache: 'no-store', redirect: 'manual' })
      .then(function (res) {
        if (res.type === 'opaqueredirect') {
          throw { kind: 'auth', message: AUTH_MSG };
        }
        /* An Access session that has lapsed answers with the login page, not
           with JSON, so the status is checked before anything is parsed. */
        if (res.status === 401 || res.status === 403) {
          throw { kind: 'auth', message: AUTH_MSG };
        }
        if (res.status === 503) {
          throw { kind: 'server', message: 'The download service is temporarily unavailable. Please try again shortly.' };
        }
        if (!res.ok) throw { kind: 'server', message: 'The server answered with an error (' + res.status + ').' };
        return res.json();
      })
      .then(function (d) {
        if (!d || !d.ok) throw { kind: 'server', message: (d && d.error) || 'The server sent an unexpected answer.' };
        data = d;
        loading = false;
        render();
        /* Tell the main menu that this student has now SEEN what is open, so
           the "NEW" marker on its Lesson Downloads button can come off. Here,
           in the success branch, rather than on entering the screen: a student
           who opens this while offline has been shown nothing new, and the
           marker has to survive that.

           Guarded on typeof for the same reason navigate() guards its call to
           renderLessons(): the two files are independent, and a missing hook
           must cost a stale marker and nothing more. */
        try {
          if (typeof window.onLessonsManifest === 'function') window.onLessonsManifest(d);
        } catch (e) {}
      })
      .catch(function (e) {
        loading = false;
        failure = (e && e.kind)
          ? e
          : { kind: 'offline', message: 'Could not reach the server. Check your connection and try again.' };
        render();
      });
  }

  /* ---- render ------------------------------------------------------------- */

  function rowHtml(unit) {
    var locked = !!unit.locked;
    var files = Array.isArray(unit.files) ? unit.files : [];
    var h = '<div class="lsn-row' + (locked ? ' locked' : '') + '">' +
      '<div class="lsn-head">' +
        '<span class="lsn-name">' + esc(unit.title || unit.id) + '</span>' +
        '<span class="lsn-tag ' + (locked ? 'shut">🔒 Locked' : 'open">Ready') + '</span>' +
      '</div><div class="lsn-files">';

    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var meta = [f.label, sizeText(f.size)].filter(Boolean).join(' · ');
      var inner =
        '<span class="lsn-ic">' + iconFor(f.ext) + '</span>' +
        '<span class="lsn-ft">' +
          '<span class="lsn-fn">' + esc(f.title) + '</span>' +
          '<span class="lsn-fm">' + esc(meta) + '</span>' +
        '</span>';
      /* A locked item is a <span>, not a disabled <a>. There is no href to
         disable: the server sent no url for it at all. */
      h += (locked || !f.url)
        ? '<span class="lsn-file off">' + inner + '</span>'
        : '<a class="lsn-file" href="' + esc(f.url) + '" download>' + inner + '</a>';
    }

    h += '</div>';
    if (locked) {
      h += '<div class="lsn-note">Not unlocked for your account yet. It becomes ' +
           'available once we have covered it in class.</div>';
    }
    return h + '</div>';
  }

  function render() {
    var list = document.getElementById('lsn-list');
    var state = document.getElementById('lsn-state');
    if (!list) return;

    var units = (data && Array.isArray(data.units)) ? data.units : [];
    var open = units.filter(function (u) { return !u.locked; }).length;

    if (state) {
      state.textContent = loading ? 'Checking…'
        : (data ? (open + ' of ' + units.length + ' available') : '');
    }

    if (loading && !data) { list.innerHTML = '<div class="lsn-empty">Loading…</div>'; return; }

    // Signed out: the one failure that "Try again" can never fix. See signIn().
    if (failure && !data && failure.kind === 'auth') {
      list.innerHTML = '<div class="lsn-err"><strong>' + esc(failure.message) + '</strong>' +
        '<div class="lsn-note">This opens the Cloudflare sign-in page, the same one ' +
        'you used when you first joined. Your progress in the app is safe.</div></div>' +
        '<div class="lsn-bar" style="margin-top:.8rem"><span></span>' +
        '<button class="lsn-btn" id="lsn-signin" type="button">Sign in again</button></div>';
      var si = document.getElementById('lsn-signin');
      if (si) si.addEventListener('click', function () { click(); signIn(); });
      return;
    }

    if (failure && !data) {
      list.innerHTML = '<div class="lsn-err"><strong>' + esc(failure.message) + '</strong>' +
        '<div class="lsn-note">Lesson files are stored online and need a ' +
        'connection — they are not saved on your device.</div></div>' +
        '<div class="lsn-bar" style="margin-top:.8rem"><span></span>' +
        '<button class="lsn-btn" id="lsn-retry" type="button">Try again</button></div>';
      var r = document.getElementById('lsn-retry');
      if (r) r.addEventListener('click', function () { click(); load(); });
      return;
    }

    if (!units.length) {
      list.innerHTML = '<div class="lsn-empty">No lesson files have been ' +
                       'published yet.<br>Please check back later.</div>';
      return;
    }

    /* Upper Beginner items (course: "upper") arrive only once granted, and get
       their own section below the Beginner list. With none, the list is
       drawn exactly as before, with no headings at all. */
    var upper = units.filter(function (u) { return u.course === 'upper'; });
    var beginner = units.filter(function (u) { return u.course !== 'upper'; });
    var html = '';
    if (upper.length && beginner.length) html += '<div class="lsn-sec">Beginner Course</div>';
    for (var i = 0; i < beginner.length; i++) html += rowHtml(beginner[i]);
    if (upper.length) {
      html += '<div class="lsn-sec' + (beginner.length ? ' upper' : '') + '">Upper Beginner Course</div>';
      for (var j = 0; j < upper.length; j++) html += rowHtml(upper[j]);
    }

    if (!open) {
      html += '<div class="lsn-hint">Nothing is unlocked for you yet. Materials ' +
              'are switched on as we work through the course.</div>';
    }
    // A stale list plus a failed refresh: keep the list, admit the refresh failed.
    if (failure && data) {
      html += '<div class="lsn-hint">Could not refresh just now — showing what ' +
              'was loaded earlier.</div>';
    }

    list.innerHTML = html;
  }

  /* ---- lesson emails ------------------------------------------------------
     "Email me when a new lesson unlocks": the student's own choice, one they
     share with the student portal, kept on the server (lesson_notify, see
     LESSON EMAILS in lessons-worker.js). Asked for once per visit; shown only
     when the server has emails set up and knows this student, so any failure
     simply leaves it hidden and the rest of the screen exactly as before. A
     change that cannot be saved puts the switch back and says so. Marked busy
     while saving rather than disabled, so keyboard focus stays on it. */

  var NOTIFY_URL = '/api/lessons/notify';
  var notifyKnown = false;    // a valid answer has arrived this visit
  var notifyAsking = false;   // the GET is in flight
  var notifyBusy = false;     // a POST is in flight

  function injectNotifyStyles() {
    if (document.getElementById('lsn-notify-styles')) return;
    var s = document.createElement('style');
    s.id = 'lsn-notify-styles';
    s.textContent = [
      '#view-lessons .lsn-notify{margin:0 0 1rem;padding:.65rem 0;border-top:1px solid var(--card-face-border);',
      'border-bottom:1px solid var(--card-face-border)}',
      '#view-lessons .lsn-notify[hidden]{display:none}',
      '#view-lessons .lsn-notify-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;cursor:pointer}',
      '#view-lessons .lsn-notify-label{font-weight:600;font-size:.92rem;color:var(--ink)}',
      /* Off: an outlined pill in the theme's soft ink, which contrasts with
         every theme's background. On: filled with the accent colour. */
      '#view-lessons .lsn-switch{-webkit-appearance:none;appearance:none;margin:0;flex:0 0 auto;position:relative;',
      'box-sizing:border-box;width:42px;height:24px;border-radius:999px;border:2px solid var(--ink-soft);',
      'background:transparent;cursor:pointer;transition:background-color .2s ease,border-color .2s ease}',
      '#view-lessons .lsn-switch::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;',
      'border-radius:50%;background:var(--ink-soft);transition:transform .2s ease,background-color .2s ease}',
      '#view-lessons .lsn-switch:checked{background:var(--accent);border-color:var(--accent)}',
      '#view-lessons .lsn-switch:checked::after{transform:translateX(18px);background:#fffaf0}',
      '#view-lessons .lsn-switch.busy{opacity:.6;cursor:progress}',
      '#view-lessons .lsn-switch:focus-visible{outline:3px solid var(--accent);outline-offset:2px}',
      '#view-lessons .lsn-notify-msg{margin-top:.4rem;font-size:.82rem;color:var(--error)}',
      '@media (prefers-reduced-motion:reduce){#view-lessons .lsn-switch,#view-lessons .lsn-switch::after{transition:none}}',
      /* "Saved", for a moment, once the server has confirmed a change. A small
         chip sitting on the bottom divider right under the switch: absolutely
         positioned, so nothing on the screen moves, and it stays clear of both
         the switch above and the Refresh button below. It never takes taps. */
      '#view-lessons .lsn-notify{position:relative}',
      '#view-lessons .lsn-notify-ok{position:absolute;right:0;bottom:0;transform:translateY(40%);opacity:0;',
      'display:inline-flex;align-items:center;gap:.25rem;font-weight:600;font-size:.72rem;line-height:1;',
      'padding:.14rem .55rem;border-radius:999px;background:var(--panel);border:1px solid var(--success);',
      'color:var(--success);pointer-events:none;transition:opacity .22s ease,transform .22s ease}',
      '#view-lessons .lsn-notify-ok.show{opacity:1;transform:translateY(60%)}',
      '#view-lessons .lsn-notify-ok svg{width:.95em;height:.95em;flex:0 0 auto}',
      '@media (prefers-reduced-motion:reduce){#view-lessons .lsn-notify-ok{transition:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function syncNotify() {
    try {
      var box = document.getElementById('lsn-notify');
      if (!box || notifyKnown || notifyAsking) return;
      notifyAsking = true;
      fetch(NOTIFY_URL, { credentials: 'same-origin', cache: 'no-store', redirect: 'manual' })
        .then(function (res) { if (!res.ok) throw 0; return res.json(); })
        .then(function (r) {
          notifyAsking = false;
          if (!r || r.ok !== true || typeof r.on !== 'boolean') return;
          notifyKnown = true;
          if (r.available !== true) return;
          var sw = document.getElementById('lsn-notify-switch');
          if (!sw) return;
          sw.checked = r.on;
          box.hidden = false;
        })
        .catch(function () { notifyAsking = false; });   // offline or signed out: stays hidden, asked again next visit
    } catch (e) { notifyAsking = false; }
  }

  function setNotify(on) {
    var sw = document.getElementById('lsn-notify-switch'), msg = document.getElementById('lsn-notify-msg');
    if (!sw || !msg) return;
    notifyBusy = true; sw.classList.add('busy'); sw.setAttribute('aria-busy', 'true'); msg.hidden = true;
    fetch(NOTIFY_URL, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'manual',
      headers: { 'content-type': 'application/json', 'x-thai-app': '1' },
      body: JSON.stringify({ on: on })
    })
      .then(function (res) { if (!res.ok) throw 0; return res.json(); })
      .then(function (r) { if (!r || r.ok !== true) throw 0; sw.checked = !!r.on; notifySaved(true); })
      .catch(function () { sw.checked = !on; msg.hidden = false; })
      .then(function () { notifyBusy = false; sw.classList.remove('busy'); sw.removeAttribute('aria-busy'); });
  }

  /* "Saved" under the switch, for a moment — only after the server has
     confirmed, so it never claims a save that did not happen. Cleared as soon
     as the next change starts. Purely visual: any failure here is ignored. */
  var savedTimer = null;
  var CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" ' +
                   'd="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
  function notifySaved(show) {
    try {
      var el = document.getElementById('lsn-notify-ok');
      if (!el) return;
      clearTimeout(savedTimer);
      if (show) {
        el.innerHTML = CHECK_ICON + 'Saved';
        void el.offsetWidth;   // commit the hidden state first, so the fade-in runs
        el.classList.add('show');
        savedTimer = setTimeout(function () { notifySaved(false); }, 2400);
      } else {
        el.classList.remove('show');
        savedTimer = setTimeout(function () { el.innerHTML = ''; }, 300);
      }
    } catch (e) {}
  }

  function bindNotify() {
    try {
      var sw = document.getElementById('lsn-notify-switch');
      if (!sw) return;
      sw.addEventListener('change', function () {
        if (notifyBusy) { sw.checked = !sw.checked; return; }   // one save at a time
        notifySaved(false);
        click(sw.checked ? 'snd-toggle-on' : 'snd-toggle-off');
        setNotify(sw.checked);
      });
    } catch (e) {}
  }

  /* ---- download feedback --------------------------------------------------
     A download link fetches its file in the background: the page itself does
     not change, and some browsers show nothing at all for a second or two. So
     students took a tap for "nothing happened" and tapped again (or double-
     clicked), and the same file came down twice. Now a tap that starts a
     download:
       • shows a card at the top of the screen for a few seconds: a big green
         tick, "Download started", "Check your Downloads folder." It sits over
         everything but never takes a tap, so nothing underneath is blocked;
       • plays snd-download (index.html's SOUND_CONFIG), whose two rising
         notes are timed to the tick popping in and then being drawn;
       • marks that link as started for DOWNLOAD_COOLDOWN_MS: a green tick at
         its end, its text dimmed, and a repeat tap on the same file swallowed
         instead of downloading it again. Every other file stays available.
     The cooldown is kept by URL rather than on the link element, so it still
     holds if the list is redrawn meanwhile (Refresh).

     The download itself is the browser's own default action and is never
     touched: nothing here calls preventDefault() on a first tap or alters the
     link's href or download attribute, and every step is guarded, so if any of
     this fails the link behaves exactly as it did before. */

  var DOWNLOAD_COOLDOWN_MS = 4000;   // a repeat tap on the same file within this is ignored
  var DOWNLOAD_TOAST_MS = 3600;      // how long the "Download started" card stays up
  var downloadUntil = {};            // link href → when its cooldown ends (nowMs())
  var startedSeq = 0;                // see markStarted()
  var toastCard = null;              // the card, created once and reused
  var toastTimer = null;
  var toastClearTimer = null;

  var TOAST_TICK = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
                   '<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* A clock that only moves forward, so a device whose time is changed can
     never stretch a cooldown; the range check in onDownloadClick() covers
     the fallback. */
  function nowMs() {
    try { if (window.performance && typeof performance.now === 'function') return performance.now(); } catch (e) {}
    return Date.now();
  }

  /* Guarded, unlike the two above: this runs inside build(), and a purely
     cosmetic extra must never be what stops the screen from opening. */
  function injectDownloadStyles() {
    try {
      if (document.getElementById('lsn-download-styles')) return;
      var s = document.createElement('style');
      s.id = 'lsn-download-styles';
      s.textContent = [
        /* The tapped link, while its cooldown runs. */
        '#view-lessons a.lsn-file .lsn-ic,#view-lessons a.lsn-file .lsn-ft{transition:opacity .25s ease}',
        '#view-lessons a.lsn-file{transition:border-color .25s ease}',
        '#view-lessons a.lsn-file.lsn-started{pointer-events:none;cursor:default;border-color:var(--success)}',
        '#view-lessons a.lsn-file.lsn-started .lsn-ic,#view-lessons a.lsn-file.lsn-started .lsn-ft{opacity:.55}',
        '#view-lessons a.lsn-file.lsn-started::after{content:"";flex:0 0 auto;box-sizing:border-box;width:.45rem;',
        'height:.8rem;margin:0 .4rem .2rem .1rem;border:solid var(--success);border-width:0 2.5px 2.5px 0;',
        'transform:rotate(45deg);animation:lsnStartedIn .3s ease-out}',
        '@keyframes lsnStartedIn{from{opacity:0;transform:rotate(45deg) scale(.4)}to{opacity:1;transform:rotate(45deg) scale(1)}}',
        /* The card. Lives on <body>, not in #view-lessons, so leaving the screen
           does not cut it off mid-message. Same look as the app's "Update
           complete" card: panel, green border, green tick drawn in --panel, so
           it reads in every theme. Above modals and guides, just below the
           achievement toasts (4000). */
        '.lsn-toast{position:fixed;top:0;left:0;right:0;z-index:3900;display:flex;justify-content:center;',
        'box-sizing:border-box;padding:12px 12px 0;padding-top:max(12px,calc(env(safe-area-inset-top,0px) + 8px));',
        'pointer-events:none}',
        '.lsn-toast-card{display:flex;align-items:center;gap:14px;box-sizing:border-box;max-width:420px;',
        'background:var(--panel);color:var(--ink);border:1.5px solid var(--success);border-radius:14px;',
        'padding:12px 22px 12px 12px;box-shadow:0 10px 30px var(--shadow-strong);',
        'opacity:0;visibility:hidden;transform:translateY(-18px) scale(.96);',
        'transition:transform .28s ease-in,opacity .28s ease-in,visibility 0s linear .28s}',
        '.lsn-toast-card.show{opacity:1;visibility:visible;transform:none;',
        'transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .2s ease-out,visibility 0s}',
        '.lsn-toast-tick{position:relative;flex:0 0 auto;width:52px;height:52px;border-radius:50%;',
        'background:var(--success);color:var(--panel);display:flex;align-items:center;justify-content:center;',
        'box-shadow:0 4px 12px var(--shadow)}',
        '.lsn-toast-tick svg{width:32px;height:32px;display:block;overflow:visible}',
        '.lsn-toast-tick path{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}',
        '.lsn-toast-text{display:flex;flex-direction:column;min-width:0;line-height:1.25}',
        '.lsn-toast-title{font-size:1.05rem;font-weight:700;color:var(--ink)}',
        '.lsn-toast-msg{font-size:.88rem;color:var(--ink-soft);margin-top:2px}',
        /* The tick pops in on the chime's first note, then is drawn as the
           second rings; a soft ring spreads out behind it. The path is 19.8
           units long, so a dash of 20 hides it completely. */
        '.lsn-toast-card.show .lsn-toast-tick{animation:lsnTickPop .5s cubic-bezier(.34,1.56,.64,1) .04s both}',
        '.lsn-toast-card.show .lsn-toast-tick path{stroke-dasharray:20;animation:lsnTickDraw .3s cubic-bezier(.65,0,.35,1) .16s both}',
        '.lsn-toast-card.show .lsn-toast-tick::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;',
        'box-sizing:border-box;border-radius:50%;border:2px solid var(--success);opacity:0;',
        'animation:lsnTickRing .7s ease-out .22s}',
        '@keyframes lsnTickPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}',
        '@keyframes lsnTickDraw{0%{stroke-dashoffset:20;opacity:0}12%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}',
        '@keyframes lsnTickRing{from{transform:scale(1);opacity:.6}to{transform:scale(1.4);opacity:0}}',
        '@media (max-width:480px){.lsn-toast-card{gap:12px;padding:10px 18px 10px 10px}',
        '.lsn-toast-tick{width:46px;height:46px}.lsn-toast-tick svg{width:28px;height:28px}}',
        /* Reduced motion: the card simply fades, with the tick already drawn. */
        '@media (prefers-reduced-motion:reduce){',
        '.lsn-toast-card,.lsn-toast-card.show{transform:none}',
        '.lsn-toast-card{transition:opacity .2s ease,visibility 0s linear .2s}',
        '.lsn-toast-card.show{transition:opacity .2s ease,visibility 0s}',
        '.lsn-toast-card.show .lsn-toast-tick,.lsn-toast-card.show .lsn-toast-tick path{animation:none}',
        '.lsn-toast-card.show .lsn-toast-tick path{stroke-dasharray:none}',
        '.lsn-toast-card.show .lsn-toast-tick::after{animation:none;display:none}',
        '#view-lessons a.lsn-file.lsn-started::after{animation:none}}'
      ].join('');
      document.head.appendChild(s);
    } catch (e) {}
  }

  /* Made once, when the screen is built: a live region is announced reliably
     only if it is already on the page when its text changes. */
  function ensureToast() {
    try {
      if (toastCard && toastCard.parentNode && toastCard.parentNode.parentNode) return toastCard;
      var box = document.createElement('div');
      box.className = 'lsn-toast';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.innerHTML = '<div class="lsn-toast-card"></div>';
      document.body.appendChild(box);
      toastCard = box.firstChild;
      return toastCard;
    } catch (e) { return null; }
  }

  /* Shows the card, or if it is already up (a second file tapped), runs the
     tick again and restarts the clock. Purely visual: failures are ignored. */
  function showDownloadToast() {
    try {
      var card = ensureToast();
      if (!card) return;
      clearTimeout(toastTimer);
      clearTimeout(toastClearTimer);
      card.innerHTML =
        '<span class="lsn-toast-tick">' + TOAST_TICK + '</span>' +
        '<span class="lsn-toast-text">' +
          '<strong class="lsn-toast-title">Download started</strong>' +
          '<span class="lsn-toast-msg">Check your Downloads folder.</span>' +
        '</span>';
      if (!card.classList.contains('show')) {
        void card.offsetWidth;   // commit the hidden state first, so the slide-in runs
        card.classList.add('show');
      }
      toastTimer = setTimeout(hideDownloadToast, DOWNLOAD_TOAST_MS);
    } catch (e) {}
  }

  function hideDownloadToast() {
    try {
      clearTimeout(toastTimer);
      if (!toastCard) return;
      toastCard.classList.remove('show');
      // Emptied once it has slid away, so a screen reader never meets stale text.
      toastClearTimer = setTimeout(function () {
        try { if (!toastCard.classList.contains('show')) toastCard.innerHTML = ''; } catch (e) {}
      }, 400);
    } catch (e) {}
  }

  /* The tapped link, for `ms`: green tick, dimmed text, no pointer (the CSS).
     Only the latest call for a link may clear it, so a timer left over from an
     earlier tap can never cut a newer cooldown short. */
  function markStarted(a, ms) {
    try {
      var token = String(++startedSeq);
      a.setAttribute('data-lsn-started', token);
      a.setAttribute('aria-disabled', 'true');
      a.classList.add('lsn-started');
      setTimeout(function () {
        try {
          if (a.getAttribute('data-lsn-started') !== token) return;
          a.classList.remove('lsn-started');
          a.removeAttribute('aria-disabled');
          a.removeAttribute('data-lsn-started');
        } catch (e) {}
      }, Math.max(0, ms));
    } catch (e) {}
  }

  function onDownloadClick(e) {
    var a, href;
    try {
      a = (e.target && e.target.closest) ? e.target.closest('a.lsn-file') : null;
      href = a ? (a.getAttribute('href') || '') : '';
    } catch (err) { return; }
    if (!href) return;   // not a download link (a locked row has no link at all)

    var now = nowMs();
    var left = (downloadUntil[href] || 0) - now;
    if (left > 0 && left <= DOWNLOAD_COOLDOWN_MS) {
      /* The same file again, moments after it started: the double tap this is
         here for. Swallowed, so the browser does not fetch it a second time. */
      try { e.preventDefault(); } catch (err) {}
      markStarted(a, left);
      return;
    }
    downloadUntil[href] = now + DOWNLOAD_COOLDOWN_MS;

    // Feedback only, from here on. The download is the browser's default action.
    try { if (typeof playSound === 'function') playSound('snd-download'); } catch (err) {}
    try { if (typeof haptic === 'function') haptic(25); } catch (err) {}
    showDownloadToast();
    /* The link is marked after this tap has been fully handled, so nothing
       about it changes while the browser is still acting on the tap. */
    setTimeout(function () { markStarted(a, (downloadUntil[href] || 0) - nowMs()); }, 0);
  }

  function bindDownloads() {
    try {
      var list = document.getElementById('lsn-list');
      if (!list) return;
      list.addEventListener('click', onDownloadClick);
      ensureToast();
    } catch (e) {}
  }

  /* ---- entry point -------------------------------------------------------- */

  /* Called by navigate(). Wrapped so that nothing in here can prevent the
     screen from being shown; a blank panel is a far better failure than a
     navigation that throws. */
  window.renderLessons = function renderLessons() {
    try {
      if (!build()) return;
      /* Re-fetch on every entry. The manifest is small, it is the only place a
         new grant can show up, and a student who has just been given access
         should not have to restart the app to see it. */
      load();
      syncNotify();
    } catch (e) {
      try {
        var host = document.getElementById('view-lessons');
        if (host) host.innerHTML = '<div class="lsn-wrap"><div class="lsn-empty">' +
          'This screen could not be opened.</div></div>';
      } catch (e2) {}
    }
  };
})();
