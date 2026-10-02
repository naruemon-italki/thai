/*
  © 2026 Naruemon Rintha. All rights reserved.
  Original educational work created by Naruemon Rintha (Kroo Apple).
  Unauthorized reproduction, modification, or redistribution is prohibited.

  ---------------------------------------------------------------------------
  WORD CARDS  —  a UNO-style vocabulary card game
  ---------------------------------------------------------------------------
  A four-colour shedding game in the UNO family where the number ranks are
  replaced by ten vocabulary words drawn from the player's chosen pool. Each
  word appears on both Thai-side and English-side cards, and the two MATCH each
  other — recognising that pairing is the learning moment the mode is built on.

  Loaded as a classic (non-module) script AFTER the main inline script in
  index.html, so it shares the global scope and can see:
    state, saveStorage, showView, navigate, currentView (via the window helper),
    tts, playSound, haptic, shuffle, escapeHtml, poolForMode, poolSizeForMode,
    renderVocabFilterToggle, renderCategoryChips, CHARACTERS, PLAYER_COLORS,
    CARD_BACKS, openQuit/closeQuit, checkAchievements.

  Unlike the other game modes, this file owns BOTH its markup and its CSS:
  it builds #view-wordcards and #view-wordcards-game at runtime and injects its
  own <style id="wc-styles">. index.html holds only the two empty view shells,
  the #wc-hud span, and the navigation wiring. To change anything about this
  game mode, edit THIS FILE only.

  Exposes on window:
    renderWordCardsMenu()      — build/refresh the setup screen (called by navigate)
    wcRefreshStart()           — re-validate the START button (called by the shared pool UI)
    teardownWordCards()        — stop everything, clear state.wcSession
  (window.enterWordCardsGameView() is defined in index.html, not here — it has
  to write that script's `currentView` binding. This file calls it.)

  ---------------------------------------------------------------------------
  BUILD STATUS — Phase 7 of 7, COMPLETE
    DONE  Phase 1 — setup screen, opponent multi-select, validation,
          navigation, quit flow, game view shell
    DONE  Phase 2 — full rules core (§4) + a deliberately plain debug view (§7)
          so complete rounds can be played and rules bugs found cheaply
    DONE  Phase 3 — the real card table (§7 + its styles in §2)
    DONE  Phase 4 — per-character AI (§5), challenge judgement, bluffing, and
          thinking delays driven by state.speed x each character's speedMult
    DONE  Phase 5 — sound and motion: eight sound effects, cards that fly
          between hands and the pile, and an opening deal
    DONE  Phase 6 — the end-of-round screen, landmarks and Progress, Thai TTS
          with the table holding for it, the matched-pair rule, the reverse
          flourish
    DONE  Phase 7 — pacing, clarity and accessibility. The reading floor; the
          dealing bed; character speed neutralised; the just-drawn card; the
          wild-only colour ring; skipped seats as standing state; a turn cue
          nothing can crowd out; live regions, card and seat labels, and focus
          management for the four panels.

    §4 (RULES CORE) AND §5 (AI) WERE LAST CHANGED IN PHASE 8, by
    WC_MATCH_EFFECT — which is a RULE change, and so is exactly the kind of
    edit the freeze below contemplates rather than forbids. Anything already
    diffing these two sections against a Phase 7 snapshot must be
    RE-BASELINED against this build, or the check reports CHANGED forever and
    stops meaning anything.

    The freeze itself still stands: if you find yourself editing either while
    changing motion, sound, pacing or presentation, stop. The seam you want is
    almost certainly gs.events, which is how the table layer learns about
    things the rules did on its behalf (see wcFlyEaten in §7).

    SWITCHES THAT TURN PHASE 7 DECISIONS BACK OFF, all in §1 unless noted.
    Nothing below was deleted; each is one edit away from returning:
      WC_USE_CHARACTER_SPEED  per-character thinking speed (off — it was
                              deciding how long you got to READ)
      WC_READ_ENABLED         the reading floor itself
      WC_READ_MS              the floor, per card kind
      WC_SHOW_READ_SETTING    the Reading Time control on the setup screen (off)
      WC_COLOUR_GLYPHS        colour-blind shape symbols on word cards (off)
      WC_SHOW_DIFF_PIPS       the brain pips on the opponent cards (off)
      WC_SHOW_TROPHIES        memory-game trophies on the opponent cards (off)
      WC_HUD_ENABLED          the top-bar colour/direction/count capsule (off;
                              lives beside wcRenderHud in §7, not §1)
      WC_COLOUR_VOICE         the spoken colour and skip announcements
      WC_TURN_HOLD_MS         the beat before the next seat lights up
      WC_MATCH_MS             the matched-pair celebration
      WC_MATCH_EFFECT         what a matched Thai/English pair DOES to the
                              table: 'draw' | 'skip' | 'none'. The one switch
                              here that changes a RULE rather than a
                              presentation choice — see §1 and §4. This is the
                              DEFAULT; the live value is the Matched Pair
                              control on the setup screen.
      WC_SHOW_MATCH_SETTING   that control (on)
      WC_MATCH_SKIP_VOICE     the spoken "skip" clip on a match under the skip
                              rule (off — the Thai TTS is already speaking)
      WC_ALWAYS_SHOW_GUIDE    show the How to play guide on EVERY Start, for
                              previewing it (off — normally it shows once; §6b)

    THREE OF THESE ARE READ THROUGH AN ACCESSOR, NOT FROM state DIRECTLY —
    wcGlyphsOn(), wcReadScale() and wcSpeedMultFor(). That is deliberate and it
    is the WC_FORCE_ASSIST pattern: the matching state key is still saved and
    loaded, so a value already sitting in a player's localStorage would
    otherwise override a shipped default that has no UI left to change it. A
    hidden control a stale saved value can still drive is worse than no control
    at all. This trap has been walked into three times in this file.

  MOTION AND SOUND — the one rule
    Every flight commits the game state FIRST and animates afterwards. A
    sprite that never appears, never lands, or is torn down mid-air costs a
    cosmetic flag and nothing else. Nothing in §4 or §5 waits on an animation,
    and no rule consults one. Unmeasurable geometry is a first-class bail:
    with no browser there are no flights and no deal, and the game plays
    exactly as it did before any of this existed.
  ---------------------------------------------------------------------------
*/

(function () {
  'use strict';

  /* =======================================================================
     1 · CONFIGURATION
     ======================================================================= */

  // Distinct words per round. The deck is 8×W + 32 cards, so W drives deck size:
  //   W=10 -> 112 (UNO's own count)   W=12 -> 128   W=14 -> 144
  // Each word appears exactly 8 times (2 copies × 4 colours) at EVERY setting,
  // so raising W does not thin out repetition — it only widens how much
  // vocabulary a single round drills. The trade is a slightly lower share of
  // action cards (28.6% -> 22.2%), i.e. calmer games.
  var WC_WORD_COUNTS = [10, 12, 14];
  var WC_WORD_COUNT_DEFAULT = 10;

  function wcWordCount() {
    var n = state.wcWordCount;
    return (WC_WORD_COUNTS.indexOf(n) !== -1) ? n : WC_WORD_COUNT_DEFAULT;
  }

  var WC_MAX_OPPONENTS = 3;

  /* ---- How to play guide (§6b) -------------------------------------------
     OFF (false) = normal: the guide shows before the player's FIRST round
                   only, then a saved flag (state.wcGuideSeen) keeps it away.
     ON  (true)  = it shows on every Start — handy while previewing it.
     The setup screen's "How to play" button opens it either way. */
  var WC_ALWAYS_SHOW_GUIDE = false;

  /* Wild Draw Four — official Mattel rules, used unconditionally (no setting).
     You SHOULD only play it holding no card of the current colour, but you may
     play it anyway as a bluff, and the next player may challenge:
       • challenged and guilty  -> the player who played it draws 4 instead
       • challenged and innocent -> the challenger draws 6 (the 4, plus 2)
     Challenging reveals the accused player's hand.
     Implemented in Phase 2 (rules) and Phase 4 (AI challenge behaviour). */
  var WC_DRAW_FOUR_CHALLENGE = true;
  var WC_CHALLENGE_PENALTY_GUILTY   = 4;  // bluffer draws this instead of the challenger
  var WC_CHALLENGE_PENALTY_INNOCENT = 6;  // challenger draws this (4 + 2)

  /* ---- Help level -------------------------------------------------------
     Set to 'easy' or 'expert' to force that level for every round, ignoring
     state.wcAssist; set to null to restore the Help Level picker on the setup
     screen and honour the saved preference again.

     Expert is forced because Easy highlights every legal card, which turns the
     matching decision — the actual vocabulary exercise — into autopilot. In
     Expert a wrong card costs one card and wcWhyNot() explains the mismatch, so
     the mistake becomes the lesson.

     Forcing at ROUND START rather than changing the default matters: a stored
     'easy' from before this change would otherwise survive in localStorage with
     no toggle left to correct it. None of the Easy rendering or rules code is
     removed — it is simply unreachable while this constant is set. */
  var WC_FORCE_ASSIST = 'expert';

  /* ---- CPU pacing -------------------------------------------------------
     A CPU turn is a sequence of beats, not one instant. Three separate scales,
     all in milliseconds and all indexed by the app-wide state.speed setting
     (Settings -> Speed), exactly as the memory game's CPU_THINK_PRE is.

       WC_THINK_MS   before a CPU acts, and again after it draws, so you can see
                     it consider the card it just picked up rather than draw and
                     play in the same frame.
       WC_BEAT_MS    an extra pause AFTER something consequential lands (Skip,
                     Reverse, Draw Two, Wild Draw Four, a stack being eaten, a
                     challenge resolving) so the change of flow can be read.
       WC_COLOUR_MS  a wild card lands, a beat passes, THEN the colour is named.
                     The single most consequential decision in the game, and the
                     colour name is Thai vocabulary worth a moment to read.

     Shorter than the memory game's values on purpose. There a pause is you
     studying the board; here it is pure queueing — in a four-player round you
     act ~13 times and wait ~39 times, so every millisecond is paid 3× over.

     Only WC_THINK_MS is multiplied by the character's speedMult and the table
     multiplier. The other two stay flat so the rhythm of a consequence reads
     the same whoever caused it — the same reasoning as CPU_POST_MATCH_SAVOR_MS
     in index.html. */
  /* Doubled from the first pass. This is a game whose whole purpose is that
     you READ the cards being played, so the CPUs are meant to look like they
     are thinking, not like they are dealing. The announcement holds below are
     deliberately NOT doubled with them — a consequence needs long enough to be
     read, which is a fixed amount, while a turn needs long enough to feel
     considered, which is not. */
  /* Trimmed ~15% after the first playtest of the reading floor: correct in
     principle, a touch sluggish in the hand. The floor below moved with it,
     so the RATIO between thinking and reading is unchanged — only the tempo. */
  var WC_THINK_MS  = { fast: 1275, medium: 1870, slow: 2550 };
  var WC_BEAT_MS   = { fast: 260, medium:  380, slow:  520 };
  var WC_COLOUR_MS = { fast: 300, medium:  440, slow:  600 };

  /* ---- Character speed, and why this mode ignores it ---------------------
     CHARACTERS[].speedMult comes from the memory game, where it is pure
     flavour: an impatient opponent flips its pair sooner and costs you
     nothing, because the board you are reading does not move.

     Here it does something else entirely. The time a word stays legible on
     the discard is the time until the NEXT player covers it — so Tuk-tuk's
     0.8 was not "Tuk-tuk is impatient", it was "every card played before
     Tuk-tuk gets 33% less reading time than one played before Grandma".
     Measured over ten four-player rounds it put the floor at 1760ms and left
     38% of cards on screen for under two seconds. A personality trait was
     acting as a legibility setting.

     So this mode reads the roster's speedMult through one switch and leaves
     it off. Nothing is deleted and index.html's cpuTimingMult() — the memory
     game's own use of the same field — is untouched: set this to true and
     every character's own pace comes straight back. */
  var WC_USE_CHARACTER_SPEED = false;

  /* ---- The reading floor ------------------------------------------------
     A card that has just landed stays legible for at least this long before
     anyone covers it. Not a delay added to the pace — a MINIMUM under it: a
     seat that was going to think for longer than the floor still does, and
     the floor contributes nothing.

     This is the number the mode's whole premise rests on. UNO's ranks are
     digits you recognise without reading; these are Thai words a learner has
     to decode, sometimes sound out, sometimes translate. Before this existed
     the reading window was whatever the next player's thinking delay happened
     to be, which is to say it was an accident.

     Two tiers, because a word card and a Skip are not the same job. A Skip is
     a symbol you know at a glance; วันเสาร์ is not.

     Deliberately NOT indexed by state.speed. Speed is how fast the opponents
     think — a pacing preference. This is how long you need to read — a
     legibility one. One dial cannot serve both, which is why there are now
     two: Settings -> Speed, and Reading Time on this mode's setup screen.

     The scale below is that setting. Every number here is a first guess tuned
     against a simulation and no eyes at all; §8 of the handoff applies. */
  /* ---- Colour-blind glyphs ----------------------------------------------
     A shape symbol per colour, on every card corner, in the colour picker
     and in the log. Switched OFF after playtesting: the artwork already
     distinguishes the four colours clearly, and a symbol on every ordinary
     card competed with the symbols that actually mean something — the ones
     on Skip, Reverse and the Draw cards.

     Soft, exactly like WC_FORCE_ASSIST: not one line of the glyph rendering
     is removed, and state.wcColourGlyphs is still saved and loaded. Set this
     to true and every glyph comes back, everywhere, with no other change.
     Read through wcGlyphsOn() rather than state.wcColourGlyphs so a value
     already sitting in a player's localStorage cannot override it — the
     same trap WC_FORCE_ASSIST was written to close. */
  var WC_COLOUR_GLYPHS = false;

  /* ---- What the opponent cards on the setup screen carry -----------------
     Both off. The brain pips and the trophies belong to the memory game — the
     pips are its difficulty scale and the trophies count its wins — and
     borrowing them here labelled a Word Cards opponent with another game's
     record. Neither switch reaches outside this file: the vs-Computer screen
     and the Progress menu build their own markup and are unaffected. */
  /* ---- Reading Time -------------------------------------------------------
     The setting is hidden, not removed: the markup is skipped, the state key is
     still saved and loaded, and one constant brings the whole control back.

     While it is hidden the DEFAULT is what applies, not whatever happens to be
     in a player's localStorage — see wcReadScale. That is the same guard
     WC_FORCE_ASSIST and WC_COLOUR_GLYPHS use, and it exists because a hidden
     control that a stale stored value can still drive is worse than no control
     at all: the game would be running at a pace nobody could see or change. */
  var WC_SHOW_READ_SETTING = false;

  var WC_SHOW_DIFF_PIPS = false;
  var WC_SHOW_TROPHIES  = false;

  var WC_READ_ENABLED = true;
  var WC_READ_MS      = { word: 2550, action: 1360 };
  var WC_READ_SCALE   = { relaxed: 1.40, normal: 1.00, brisk: 0.70 };
  var WC_READ_DEFAULT = 'normal';

  /* ---- Announcements ----------------------------------------------------
     Things used to resolve silently and instantly: a Skip landed, the turn
     moved, and unless you happened to be watching the right seat you had no
     idea why. These two scales are how long the table WAITS on a consequence
     while it is shown — a badge over the seat it happened to, or a toast when
     it happened to you.

     WC_EVENT_MS  Skip, Draw Two, Wild Draw Four, a stack eaten, a colour
                  named, someone down to their last card.
     WC_LESSON_MS a wrong card and the reason it was wrong. Longer, because
                  this is the moment the game is actually teaching something.
                  Tapping the message continues immediately, so knowing the
                  answer is never punished by waiting for it. */
  // How many moves the log box keeps. Five is enough to cover a full lap of a
  // four-player table, which is exactly the span you miss when you look away.
  var WC_LOG_LINES = 5;

  var WC_EVENT_MS  = { fast:  900, medium: 1250, slow: 1600 };
  var WC_LESSON_MS = { fast: 1800, medium: 2400, slow: 3000 };

  /* ---- Card motion ------------------------------------------------------
     Cards move rather than teleport. A play travels from the hand (or from an
     opponent's seat) onto the discard; a draw travels from the pile into a
     hand. Everything is decorative: the game state is committed BEFORE any
     sprite exists, so a flight that never runs — reduced motion, a backgrounded
     tab, a torn-down round, an element that cannot be measured — leaves the
     table already correct. See §7's flight machinery for why that ordering is
     the whole design.

     WC_FLY_MS      how long one card takes to cross the table
     WC_FLIP_MS     the 3D turn, for the cards that reveal themselves in flight
     WC_FLY_STAGGER how far apart the cards of a multi-card draw set off

     These are NOT part of the pacing budget and nothing waits on them. The gap
     between two CPU actions is the think time plus any beat — 1500ms at the
     very least — so a flight of half a second has room to spare.

     A note on why an opponent's card can LOOK quicker than your own even
     though it is on screen longer: the travel is the same WC_FLY_MS either
     way, but theirs also grows from a 14px seat card to full size. A small
     object crossing the same distance in the same time covers far more of its
     own width per frame, and reads as faster. Yours does not flip, so its
     total is WC_FLY_MS alone, where theirs is that plus the turn. */
  var WC_ANIM_ENABLED = true;
  var WC_FLY_MS       = { fast: 300, medium: 380, slow: 460 };
  var WC_FLIP_MS      = { fast: 240, medium: 320, slow: 400 };
  var WC_FLY_STAGGER  = { fast:  75, medium: 100, slow: 125 };

  // How far into the flight the card starts turning over, as a fraction of the
  // flight. Late enough that the turn reads as arrival rather than departure.
  var WC_FLIP_AT = 0.45;

  /* ---- The direction reversing ------------------------------------------
     How long the direction arrow takes to grow, turn over and settle after a
     Reverse. Roughly half out and half back.

     This is NOT part of the pacing budget and nothing waits on it. A Reverse
     with three or more players already holds the table for WC_EVENT_MS while
     its announcement is up (900-1600ms depending on speed), so the flourish
     finishes inside a pause that already existed. At two players there is no
     announcement, but the next CPU still thinks for WC_THINK_MS — 1500ms at
     the very least — so it has room there too.

     Read by §2 to build the keyframes and by §7 to work out how far through
     the animation a freshly rendered node should join. Changing it here
     changes both. */
  /* How long the table holds before lighting up the next seat. The rules
     commit and re-render the instant a card is played, so without this the
     next player is highlighted while the previous player's card is still
     crossing the table — the move and its consequence arrive together and
     read as one event. A flight is WC_FLY_MS (380ms at medium); this is
     deliberately shorter, because the point is to break the simultaneity,
     not to wait for the sprite. NOTHING waits on this: it delays a class,
     never a rule, and a round with no motion at all plays identically. */
  var WC_TURN_HOLD_MS = 240;
  var WC_TURN_IN_MS   = 340;   // the arrival itself, once the hold is over
  /* Ceiling on how long the highlight may be held back waiting for motion. A
     four-card draw is well inside it; this exists so nothing can park the
     next seat un-highlighted for an absurd length of time. */
  var WC_TURN_WAIT_MAX_MS = 2000;

  /* The matched-pair celebration. The rarest and most satisfying thing a
     player can do in this mode — putting the Thai and the English of one word
     together — and until now it looked exactly like any other card landing.
     Long enough to register, short enough not to become a wait. */
  var WC_MATCH_MS = 900;
  var WC_MATCH_BITS = 14;      // confetti pieces

  var WC_DIR_MS = 800;

  /* ---- Speaking the cards -----------------------------------------------
     A word card played THAI SIDE UP is read aloud, and the table waits for it.
     English-side cards stay silent: the Thai is the thing being learned, and
     hearing it twice per pair would halve how much it registers.

     Waiting is the point. A voice under a CPU's next move is a voice nobody
     listens to, so wcMaybeCpu holds while speech is running (see the gate in
     §7) and picks up whatever pause it was owed afterwards.

     WC_SPEAK_MATCH_GAP_MS   a cross-language match sounds its own chime first;
                             the voice follows once that has landed, so the two
                             are heard as two things rather than a collision.
     WC_SPEAK_MAX_MS         the watchdog. speechSynthesis is unreliable in
                             ways nothing here controls — a backgrounded tab,
                             an engine that never fires onend, an utterance
                             cancelled from underneath. The gate is released by
                             whichever comes first, speech or this. Without it
                             one missing callback wedges the round for good,
                             which is a far worse outcome than a word cut off.
     WC_MATCH_SOUND          REPLACES the generic play click for a match, the
                             same way an action card's sound does — never
                             layered over it. See WC_CARD_SOUND above. */
  /* ---- Matching the pair -------------------------------------------------
     Playing a word on its OTHER-LANGUAGE twin is the move this whole mode
     exists to teach, and until now it was worth exactly as much as following
     a colour. It now costs every opponent a card.

     That is a deliberately large lever. At a four-seat table one match takes
     three cards off the other three players at once — stronger than a Draw
     Two, which takes two off one person. The point is to make reading the
     card the winning strategy rather than the virtuous one: if you are only
     matching colours you will lose to someone who is reading, and losing that
     way teaches faster than being told.

     Generic, like every other rule here: it applies to the CPUs exactly as it
     applies to you, and §5 scores it accordingly. */

  /* ---- WHAT A MATCH DOES -------------------------------------------------
     Three settings, and the only switch in this file that changes a RULE.
     Edit this line, reload, play. There is deliberately no UI for it: it is a
     house rule being tuned, not a preference a player should be choosing
     between mid-round.

       'draw'   every opponent draws WC_MATCH_DRAW. The Phase 6 rule. The
                strongest of the three and the slowest — at a full table it
                puts three cards back into play every time somebody reads a
                card correctly, which is a hand that stops shrinking.
       'skip'   the next seat loses its turn. A match becomes, exactly, a Skip
                card: same badge, same dimmed hand, same spoken cue, same
                hold. Costs the table nothing in cards, so it rewards reading
                without lengthening the round.
       'none'   no mechanical effect at all. The confetti, the chime, the
                spoken Thai and the log line all still happen — the match is
                still MARKED as the thing worth doing, it just does not move
                the game. The quietest option and the shortest rounds.

     ALL THREE emit the {t:'match'} public event, with `drew` empty for the
     last two. That is what keeps the celebration, the sound and the voice
     working identically across all three without §7 knowing the rule: see
     wcFlyMatch, which bails on there being no EVENT, not on nobody drawing.

     Read through wcMatchEffect() rather than directly, so a typo falls back
     to the shipped rule instead of silently selecting 'none'. */
  var WC_MATCH_EFFECT = 'skip';

  /* The Matched Pair control on the setup screen. Unlike the Reading Time
     switch this ships ON, so state.wcMatchEffect is what actually drives the
     game and the constant above is only the DEFAULT — used when the control is
     hidden, and whenever the stored value is missing or invalid.

     Turning this off restores exactly the WC_SHOW_READ_SETTING arrangement:
     the markup is skipped, the state key is still saved and loaded, and the
     shipped default wins over anything already in a player's localStorage. A
     hidden control a stale saved value can still drive is worse than no
     control at all. */
  var WC_SHOW_MATCH_SETTING = true;

  /* Does a match under the 'skip' rule fire the spoken "skip" announcement?
     NO, and this is not an oversight. A matched pair is a WORD card, so the
     Thai TTS reads it aloud — and the skip clip was landing 300ms into that,
     two voices talking over each other. The recording belongs to the Skip
     CARD, which is a different branch and still plays it.

     Nothing about the pacing depends on this. wcSaySkip's return value feeds
     the scheduler's delay, but a matched word card already owes the reading
     floor (WC_READ_MS.word, 2550ms) and the floor is a MINIMUM under the pace,
     so it dominates the announcement hold either way. */
  var WC_MATCH_SKIP_VOICE = false;

  function wcMatchEffectValid(v) {
    return v === 'draw' || v === 'skip' || v === 'none';
  }

  function wcMatchEffectDefault() {
    return wcMatchEffectValid(WC_MATCH_EFFECT) ? WC_MATCH_EFFECT : 'skip';
  }

  function wcMatchEffect() {
    if (!WC_SHOW_MATCH_SETTING) return wcMatchEffectDefault();
    var v = state.wcMatchEffect;
    return wcMatchEffectValid(v) ? v : wcMatchEffectDefault();
  }

  /* The rule THIS ROUND is playing under. Snapshotted into gs at creation, the
     same way stacking and assist are, so §4 stays pure — it reads the game it
     was handed rather than reaching out to a setting that could have moved.
     Falls back to the live accessor for any game built without one, which is
     every game the older suites construct. */
  function wcEffectOf(gs) {
    return (gs && wcMatchEffectValid(gs.matchEffect)) ? gs.matchEffect : wcMatchEffect();
  }

  var WC_MATCH_DRAW = 1;

  var WC_SPEAK_DEFAULT      = 'on';
  var WC_SPEAK_MATCH_GAP_MS = 500;
  var WC_SPEAK_MAX_MS       = 6000;
  var WC_MATCH_SOUND        = 'snd-bingo-correct';

  /* ---- The deal ---------------------------------------------------------
     A round opens with empty hands: the deck shuffles, then cards travel out
     to each seat one at a time, and yours turn face-up as they land.

     Like every flight, this is PRESENTATION ONLY. wcCreateGame() has already
     dealt the whole round into gs before the first card moves; the deal simply
     reveals what is there, one card at a time. So it can be skipped at any
     instant, interrupted by teardown, or never run at all, and the table is
     identical either way.

     WC_DEAL_MS is per card. Four players is 28 cards, which at medium is
     28 x 90 = 2.5s, plus the shuffle and the opening card: about four seconds
     to sit down. That is a long time to watch twice, let alone twenty times,
     so tapping anywhere finishes it immediately — the same courtesy the held
     announcements get, and for the same reason. */
  var WC_DEAL_MS    = { fast: 60, medium: 90, slow: 120 };
  // Locked to the length of uno-shuffle.mp3. Change one and change the other.
  var WC_SHUFFLE_MS = 700;

  /* uno-deal.mp3 runs under the deal and is longer than any deal will be, so
     it is always stopped early. Cutting a sustained sound dead is audible as a
     click; a short ramp is not. WC_DEAL_FADE_STEPS is how many volume steps
     that ramp uses — enough to be smooth, few enough that every one of them is
     a timer this file has to be able to cancel at teardown. */
  var WC_DEAL_FADE_MS    = 140;
  var WC_DEAL_FADE_STEPS = 7;

  /* ---- End-of-round artwork ---------------------------------------------
     When YOU win, the panel shows this illustration. When a CPU wins it shows
     that character's own "won" artwork instead, via index.html's cpuEndArt(),
     which is the same resolver the vs Computer end screen uses.

     PATH UNVERIFIED. This file is the only place it appears, and the <img>
     carries an onerror handler that hides the artwork column outright — so a
     wrong path costs the illustration and nothing else, and correcting it is
     this one line. */
  var WC_WIN_ART = 'images/rate5.png';

  /* How long the table sits on the winning card before the results panel
     covers it. The last card of a round is the one most worth looking at —
     somebody just went out on it — and a modal arriving in the same frame
     means nobody ever reads it. The win chime waits with the panel, so the
     order is: card lands, a moment to take it in, then the fanfare. */
  var WC_RESULT_MS = 1500;

  /* ---- Sound effects ----------------------------------------------------
     This mode owns its own audio, the same way it owns its own markup and its
     own stylesheet. index.html declares each built-in sound in THREE separate
     places — the <audio> element, a path constant with its src assignment, and
     SOUND_CONFIG for the volume — so adding one there means three edits in a
     file this mode otherwise never touches. The table below is the single
     place instead: id, file and volume together, in the file you already edit
     to change anything about Word Cards.

     `volume` is the dial to turn. Same 0.0–1.0 scale as SOUND_CONFIG, and the
     values are balanced against it — the built-ins run 0.20 (menu click) to
     0.90 (small win), so these sit mid-range and are quieter the more often
     they fire. `snd-uno-turn` is the lowest by some way because a four-player
     round hands you the turn about thirteen times; a cue that loud enough to
     notice once is exhausting by the tenth.

     Registered by wcRegisterSounds() at load. playSound() only does
     getElementById(id).play(), so these behave exactly like the built-ins,
     including respecting the global mute.

     LEVEL BUILT INTO THE FILE. iPhones and iPads ignore the volume of an
     <audio> element and always play it at 1.0, so a sound turned down only
     here played there at the file's full loudness. The entries marked "built
     in" were therefore re-exported at exactly their old level (e.g. 0.50 =
     -6.02 dB, timing unchanged to the sample) and set to 1.00 here, so every
     device now hears what desktop always did. To make one quieter still,
     lowering it here works on desktop and Android; to change it on iPhones
     too, re-export the file. The deal's fade-out scales from whatever is set
     here, so it behaves exactly as before. */
  var WC_SOUNDS = {
    /* The only sound in this mode that RUNS rather than fires. It is a long
       bed under the whole deal, started when the first card leaves the deck
       and stopped when the last one lands — which will almost never be where
       the file ends, so it is faded rather than cut. Everything about stopping
       it lives in wcDealSoundStop(); nothing else may start or stop it. */
    'snd-uno-deal':    { file: 'audio/uno-deal-v2.mp3', volume: 1.00, label: 'Word Cards \u2014 dealing' },   // built in (was 0.40)
    'snd-uno-shuffle': { file: 'audio/uno-shuffle-v2.mp3', volume: 1.00, label: 'Word Cards \u2014 deck shuffle' },   // built in (was 0.50)
    'snd-uno-1left':   { file: 'audio/uno-1left-v2.mp3',   volume: 1.00, label: 'Word Cards \u2014 one card left' },   // built in (was 0.60)
    'snd-uno-draw2':   { file: 'audio/uno-draw2-v2.mp3',   volume: 1.00, label: 'Word Cards \u2014 Draw Two played' },   // built in (was 0.55)
    'snd-uno-draw4':   { file: 'audio/uno-draw4-v2.mp3',   volume: 1.00, label: 'Word Cards \u2014 Wild Draw Four played' },   // built in (was 0.60)
    'snd-uno-reverse': { file: 'audio/uno-reverse-v2.mp3', volume: 1.00, label: 'Word Cards \u2014 Reverse played' },   // built in (was 0.50)
    'snd-uno-skip':    { file: 'audio/uno-skip-v2.mp3', volume: 1.00, label: 'Word Cards \u2014 Skip played' },   // built in (was 0.50)
    'snd-uno-turn':    { file: 'audio/uno-turn-v2.mp3', volume: 1.00, label: 'Word Cards \u2014 your turn' },   // built in (was 0.35)
    'snd-uno-change':  { file: 'audio/uno-change-v2.mp3',  volume: 1.00, label: 'Word Cards \u2014 Wild played' },   // built in (was 0.50)
    /* Spoken announcements, not effects. These fire when a colour is NAMED,
       which is a different moment from the Wild landing — uno-change marks the
       card arriving, these mark the decision — so the two never stack even
       though both belong to the same play. Nothing waits for them: the colour
       beat plus the next player's think time leaves better than two seconds of
       clear air, and a one-second recording finishes inside it. */
    'snd-uno-red':     { file: 'audio/uno-red.mp3',     volume: 0.85, label: 'Word Cards \u2014 "red"' },
    'snd-uno-blue':    { file: 'audio/uno-blue.mp3',    volume: 0.85, label: 'Word Cards \u2014 "blue"' },
    'snd-uno-green':   { file: 'audio/uno-green.mp3',   volume: 0.85, label: 'Word Cards \u2014 "green"' },
    'snd-uno-yellow':  { file: 'audio/uno-yellow.mp3',  volume: 0.85, label: 'Word Cards \u2014 "yellow"' },
    /* The spoken reverse. A SEPARATE file from uno-reverse.mp3, which stays
       what it always was — the effect that fires the instant the card lands.
       This is the voice that follows it. */
    'snd-uno-say-rev': { file: 'audio/uno-reverse-say.mp3', volume: 0.85, label: 'Word Cards \u2014 "reverse"' },
    /* Skip is the one action card whose effect is FIXED — exactly one player
       loses exactly one turn, every time — so a single recording can state it
       and always be right. Draw Two and Wild Draw Four deliberately have no
       voice: with stacking on a +2 becomes +4 or +6, and a challenged +4
       becomes +6 for whoever loses, so a recorded number would be wrong more
       often than not. The badge and the toast carry the real figure. */
    'snd-uno-say-skip': { file: 'audio/uno-skip-say.mp3', volume: 0.85, label: 'Word Cards \u2014 "skip"' },
    /* A wrong card. This REPLACES the app-wide snd-fail that both penalty
       sites used to share — one buzzer, belonging to this mode, rather than
       the memory game's borrowed one. Both sites, or a player learns that a
       CPU's blunder and their own sound like different mistakes. */
    'snd-uno-wrong':   { file: 'audio/uno-wrong-v2.mp3',   volume: 1.00, label: 'Word Cards \u2014 wrong card' }   // built in (was 0.60)
  };

  /* Which sound a PLAYED card makes. An action card REPLACES the generic play
     click rather than layering over it: two sounds on one event reads as a
     defect rather than as emphasis. Anything not listed — word cards, and the
     plain Wild, which has no consequence of its own until a colour is named —
     falls through to the click it always had. */
  var WC_CARD_SOUND = {
    skip:    'snd-uno-skip',
    reverse: 'snd-uno-reverse',
    draw2:   'snd-uno-draw2',
    wild4:   'snd-uno-draw4',
    wild:    'snd-uno-change'
  };

  /* Taking a card off the deck. One per DRAW, never one per card: a Draw Four
     eaten four times over is one event, and four flips fired 100ms apart is a
     machine gun. The opening deal stays silent for the same reason — 28 of
     them under the shuffle would be a mess. */
  var WC_DRAW_SOUND = 'snd-card-flip';

  /* Which recording announces which colour. Keyed by the colour id so a
     mistyped key is a missing sound rather than the wrong one, and gated so
     the whole feature is one constant if the recordings ever go. */
  /* ---- Spoken announcements ----------------------------------------------
     Two sounds, one event. The EFFECT (uno-change, uno-reverse) fires the
     instant the card lands; the VOICE follows it after a short gap, and the
     table waits for the voice before moving on.

     THE HOLD IS COMPUTED, NEVER OBSERVED. Waiting on the element's `ended`
     event would be the one thing in this file capable of freezing the game
     outright: a missing file, a decode failure or a muted autoplay policy all
     produce a play() that never ends, and the table would sit there forever.
     Instead the length is read from the element's own `duration` if the
     browser happens to have it, clamped into a sane window, and used as a
     number decided before anything moves — the same rule wcHoldFor follows.
     WC_SAY_MAX_MS is the ceiling, and it is the safety break: whatever the
     audio does or fails to do, the table moves again by then. */
  var WC_COLOUR_VOICE = true;
  var WC_SAY_DELAY_MS = 200;    // effect first, then the voice
  var WC_SAY_MS       = 1000;   // assumed length when the browser won't say
  var WC_SAY_MIN_MS   = 600;
  var WC_SAY_MAX_MS   = 2000;   // the safety break

  var WC_COLOUR_SOUND = {
    red: 'snd-uno-red', blue: 'snd-uno-blue',
    green: 'snd-uno-green', yellow: 'snd-uno-yellow'
  };

  var wcSayTimer = null;

  function wcClearSayTimer() {
    if (wcSayTimer) { clearTimeout(wcSayTimer); wcSayTimer = null; }
  }

  /* How long to hold for a recording, worked out before it starts. A browser
     that has loaded metadata reports duration in seconds; anything else —
     jsdom, a file that failed, a element that has not loaded yet — reports
     NaN or 0 and gets the assumed length. Always inside [MIN, MAX]. */
  function wcSayLengthMs(id) {
    var ms = WC_SAY_MS;
    try {
      var el = document.getElementById(id);
      var d = el ? el.duration : NaN;
      if (typeof d === 'number' && isFinite(d) && d > 0) ms = Math.round(d * 1000);
    } catch (e) { /* the assumed length is the point of having one */ }
    if (ms < WC_SAY_MIN_MS) ms = WC_SAY_MIN_MS;
    if (ms > WC_SAY_MAX_MS) ms = WC_SAY_MAX_MS;
    return ms;
  }

  /* Fires the voice after the effect has had the table to itself, and returns
     the total the caller should add to the next scheduled step. One timer,
     tracked, cancelled at teardown — a voice scheduled into a round that has
     already ended must not arrive over the menu. */
  function wcSayAnnounce(soundId) {
    if (!WC_COLOUR_VOICE || !soundId || !WC_SOUNDS[soundId]) return 0;
    if (typeof playSound !== 'function') return 0;
    var len = wcSayLengthMs(soundId);
    wcClearSayTimer();
    wcSayTimer = setTimeout(function () {
      wcSayTimer = null;
      playSound(soundId);
    }, WC_SAY_DELAY_MS);
    return WC_SAY_DELAY_MS + len;
  }

  function wcColourVoice(colourId) {
    return wcSayAnnounce(WC_COLOUR_SOUND[colourId]);
  }

  function wcSayReverse() {
    return wcSayAnnounce('snd-uno-say-rev');
  }

  function wcSaySkip() {
    return wcSayAnnounce('snd-uno-say-skip');
  }

  /* With more opponents there is more happening between your turns, so each
     individual pause could afford to be tighter without the table feeling
     rushed. Indexed by opponent count (1-3).

     DEFAULT OFF while the base timings are being judged on real hardware —
     one pace for every table size makes the base numbers above the only thing
     you are reacting to. Set WC_TABLE_PACE_ENABLED = true to bring it back. */
  var WC_TABLE_PACE_ENABLED = false;
  var WC_TABLE_PACE = { 1: 1.00, 2: 0.90, 3: 0.82 };

  /* ---- CPU tiers --------------------------------------------------------
     Two behaviour tiers rather than six separate AIs. The split follows the
     roster's own `diff` ordering: Grandma (1), Tuk-tuk (2) and Fighter (3) are
     casual; Student (4), Lawyer (5) and Teacher (6) are sharp. A character id
     that isn't listed — or a player with no charId at all, as the rules tests
     construct — falls back to casual. */
  var WC_SHARP_IDS = ['student', 'lawyer', 'teacher'];

  /* What the setup screen calls each tier. Derived from WC_SHARP_IDS above —
     the SAME list wcTierOf() reads — so the label on the card can never
     disagree with the opponent you actually get.

     Two names, because there are two behaviours. The roster carries a 1-6
     `diff` scale, but that belongs to the memory game: here Grandma, Tuk-tuk
     and Fighter play identically to one another, as do Student, Lawyer and
     Teacher. Printing six levels would promise a gradient that does not exist,
     which is the same mistake WC_SHOW_TROPHIES and WC_SHOW_DIFF_PIPS were
     switched off for. */
  var WC_LEVEL_LABEL = { casual: 'Novice', sharp: 'Expert' };

  function wcLevelTier(charId) {
    return (charId && WC_SHARP_IDS.indexOf(charId) !== -1) ? 'sharp' : 'casual';
  }

  /* ---- Tier behaviour ---------------------------------------------------
     The two tiers score every position IDENTICALLY. What separates them is how
     often they slip, how boldly they bluff, how well they judge a bluff, and
     one deliberate exception noted under WC_THREAT below.

     That is on purpose. A head-to-head between a sharp and a casual CPU lands
     at roughly 49-52% whichever way the dials are turned — card luck dominates
     this game, and no amount of cleverness overcomes it. So the tiers are not
     built to win more; they are built to be FELT in individual moments. Which
     is arguably right for a vocabulary app: the student's Thai should decide
     the game, not the opponent's IQ.

     MISPLAYS. A misplay plays uniformly at random from the LEGAL moves,
     excluding the top-scoring band — so it is always a real mistake, and the
     number below means exactly what it says: no calibration, no measured rate
     that quietly differs from the configured one.

     Note this is per REAL DECISION, not per turn. Around 56% of turns offer no
     choice at all (no legal move, or exactly one), so 10% here is about 4.3%
     of turns — roughly one misplay from a casual CPU per round.

     A misplay is LEGAL: the wrong card to choose, not a card that breaks the
     rules — playing a word card when a Draw Two would have stopped you going
     out. That makes a CPU beatable, but a learner cannot SEE it happen. The
     visible kind — a CPU playing a card that genuinely does not match, taking
     the penalty, and showing you why — is a different mechanism entirely. The
     two were called the same thing for a while and it caused real confusion;
     these names keep them apart. */
  var WC_MISPLAY_P = { casual: 0.10, sharp: 0.03 };

  /* WRONG CARDS — the other kind of mistake, and the one a learner can
     actually see. A casual CPU occasionally plays a card that genuinely does
     not match; the rules refuse it, it takes the card back and draws one, and
     the same explanation you get appears against its seat. Watching Grandma
     try to put blue on red and be told why is a lesson you did not have to
     lose a card for.

     Deliberately rare — about one teachable moment every round or two — and
     zero for the sharp tier, who are meant to know better.

     This lives in the TABLE layer, never inside wcAiChooseMove. test-rules.js
     drives aiMove -> play and ignores the return value, so an AI that started
     returning illegal cards would wedge the rules fuzz. Keeping it out of the
     decision path leaves all 104 rules assertions untouched. */
  var WC_WRONGCARD_P = { casual: 0.04, sharp: 0 };

  /* BLUFFING — playing a Wild Draw Four while still holding the colour in
     force. A CPU holds a playable Draw Four on ~5% of turns and most of those
     are bluffable, so across a four-player round the table sees only one or
     two opportunities. Rare and dramatic, so it should be spent well rather
     than often.

     A bluff can never be a CPU's only option: holding the colour in force
     means that card is legal too, so declining to bluff can never leave the
     candidate list empty. */
  var WC_BLUFF_P = { casual: 0.10, sharp: 0.35 };

  /* CHALLENGE SUSPICION. A probability assembled from what the table has
     publicly seen, then rolled — deliberately not a hard rule, because a CPU
     that always challenges under identical conditions is one the player learns
     to walk straight past.

     `playedColour` is the signal everyone recognises: you played red two turns
     ago, and now you drop a Draw Four on red. `drewOnColour` is its opposite
     and only a sharp CPU weighs it — someone who DREW while red was in force
     probably has no red. Casual reads the first and ignores the rest. */
  var WC_SUSPICION = {
    casual: { base: 0.10, playedColour: 0.35, choseColour: 0,
              drewOnColour: 0,     perCard: 0,    max: 0.60, min: 0.05 },
    sharp:  { base: 0.15, playedColour: 0.45, choseColour: 0.15,
              drewOnColour: -0.30, perCard: 0.03, max: 0.85, min: 0.02 }
  };
  // How many turns back the suspicion signals look, scaled by table size.
  var WC_SUSPICION_TURNS = 4;

  /* THREAT AWARENESS — the one place the two tiers genuinely think differently,
     because it is the most visible difference there is. A sharp CPU notices
     that the player to its left is down to one card and aims a Draw Two at
     them; a casual CPU plays whatever suits its own hand and lets you go out.
     Rates alone could not produce that moment. */
  var WC_THREAT_AT = 2;   // "close to winning" means this many cards or fewer

  /* ---- Handing the turn over --------------------------------------------
     Every card answers a question the scorer above never asked: WHO ends up on
     turn because of it. Most cards pass to the next seat and the question is
     uninteresting — but Skip passes two seats along and Reverse passes the
     turn BACKWARDS, and until now nothing modelled that.

     The gap it left was visible at the table. The threat branch rewards
     reversing AWAY from a dangerous next player; nothing penalised reversing
     INTO a dangerous previous one. A sharp CPU holding only action cards would
     play its Reverse — the highest-scoring of the three — and hand the turn
     straight to the seat sitting on one card, when the Skip in the same hand
     would have passed it to somebody holding seven.

     One term, scaled by how close the receiver is to going out, so a seat on
     one card repels harder than a seat on two.

     SHARP ONLY. Reading the whole table rather than just your own hand is
     exactly the difference the two tiers exist to express, and a casual
     opponent that never notices who it is helping is the one a learner should
     be able to beat. Set the casual value above zero to give it to both. */
  var WC_HANDOVER_AT = 2;                          // cards or fewer = a threat
  var WC_HANDOVER_P  = { casual: 0, sharp: 12 };   // per card below the line

  /* How much a colour the NEXT player recently drew on is worth when naming a
     colour, in units of "cards of that colour in your own hand".

     THE CAP IS THE POINT. This signal was already here and already documented
     as being "worth less than a whole card... so it decides ties rather than
     overriding a real majority" — but it accumulated 0.5 per event across a
     32-event window, so three draws made it worth 1.5 cards and it overrode
     everything. A CPU holding one yellow card and nothing else named RED,
     which reads as either a bug or a bluff and was in fact the former.

     Capped strictly below 1, the comment becomes true: the hint can break a
     tie and can never outrank a colour actually held. */
  var WC_COLOUR_HINT     = 0.5;   // per qualifying event
  var WC_COLOUR_HINT_MAX = 0.9;   // total, and never 1.0 or more

  /* ---- Card geometry: ONE source of truth -------------------------------
     Every number below is a fraction of the card's HEIGHT, so the layout is
     identical at any size and the frame is even on all four sides regardless
     of aspect ratio. These values are injected into the stylesheet AND used by
     the text-fit calculation, so the CSS and the pool filter can never drift
     apart. Derived, and relied upon:
       padding box height = 1 - 2·border            = 0.940
       bottom colour band = 0.940 - bandTop - bandH = 0.190  (== bandTop ✓)
       band centre        = bandTop + bandH/2       = 0.470
         which is exactly the padding box centre (0.940/2), so a background
         split at 50% height changes colour precisely at the band's midline —
         that is what lets the Wild card's side rails meet cleanly.
       index occupies idxInset … idxInset+idxSize   = 0.030 … 0.145
         which clears the band's top edge (0.190) by 0.045
       usable text width  = ratio - 2·border - 2·rail - 2·padX = 0.626
       usable text height = bandH - 2·padY                     = 0.510   */
  var WC_GEO = {
    ratio:    0.75,    // card width ÷ height (3:4 portrait)
    border:   0.030,   // white card edge
    bandTop:  0.190,   // white text band starts here (from the padding box)
    bandH:    0.560,   // and is this tall
    idxSize:  0.115,   // corner index box (square)
    idxInset: 0.030,   // its distance from the corner, identical on both axes
    rail:     0.017,   // colour showing down each side, joining the two bands
    padX:     0.015,   // text padding inside the band
    padY:     0.025,
    font:     0.115,   // ONE size for every word card
    romEm:    0.76,    // romanization line, relative to the main size
    line:     1.16     // line height
  };
  var WC_CARD_RATIO = WC_GEO.ratio;

  var WC_USABLE_W = WC_GEO.ratio - 2 * WC_GEO.border - 2 * WC_GEO.rail
                                 - 2 * WC_GEO.padX;                    // 0.626
  var WC_USABLE_H = WC_GEO.bandH - 2 * WC_GEO.padY;                      // 0.510
  var WC_MAX_LINES = 3;

  /* ---- Text fitting -----------------------------------------------------
     A word only reaches a card if it actually FITS on one at the single shared
     font size. Character counts were a poor proxy: "Switzerland" and "I am"
     are both short strings but need very different room, and Thai combining
     vowels and tone marks add no width at all while counting as characters.

     The per-character widths below are deliberate OVER-estimates for a bold
     sans stack, so anything this calculation accepts has margin in the real
     render. The estimate is always applied in the WORST display mode (Thai
     plus romanization), so switching Display in Settings mid-session can never
     change which words are eligible. */
  var WC_W_LATIN = 0.58, WC_W_THAI = 0.68, WC_W_DIGIT = 0.60,
      WC_W_SPACE = 0.28, WC_W_NARROW = 0.30;

  function wcTextEm(s) {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), c = s.charCodeAt(i);
      if (ch === ' ') { w += WC_W_SPACE; }
      else if (c >= 0x0E00 && c <= 0x0E7F) {
        // Thai vowels above/below and tone marks stack on the previous
        // consonant — they take no advance width of their own.
        var combining = (c >= 0x0E31 && c <= 0x0E3A) || (c >= 0x0E47 && c <= 0x0E4E);
        w += combining ? 0 : WC_W_THAI;
      }
      else if (ch >= '0' && ch <= '9') { w += WC_W_DIGIT; }
      else if ('ilj.,!\'\u2019:;|'.indexOf(ch) !== -1) { w += WC_W_NARROW; }
      else { w += WC_W_LATIN; }
    }
    return w;
  }

  // The longest run with no space in it — it has to fit on one line by itself,
  // because breaking mid-word is what produced "ar-mory".
  function wcLongestTokenEm(s) {
    var parts = s.split(/\s+/), max = 0;
    for (var i = 0; i < parts.length; i++) max = Math.max(max, wcTextEm(parts[i]));
    return max;
  }

  function wcLinesFor(em, size) {
    return Math.ceil((em * size) / WC_USABLE_W);
  }

  // The four card colours. Deliberately NOT theme tokens — the rules depend on
  // these being distinguishable, so they stay constant across all six themes.
  // Thai names follow the app's own Level 1 colour vocabulary: blue is
  // น้ำเงิน náam ngern (สีฟ้า sĕe fáa is "light blue" in Level 2).
  var WC_COLOURS = [
    { id: 'red',    hex: '#d5443a', dark: '#a52f27', th: 'สีแดง',     rom: 'sĕe daeng',      en: 'red',    glyph: '\u25C6' },
    { id: 'blue',   hex: '#2f6fc4', dark: '#22518f', th: 'สีน้ำเงิน', rom: 'sĕe náam ngern', en: 'blue',   glyph: '\u25CF' },
    { id: 'green',  hex: '#3f9243', dark: '#2c6b2f', th: 'สีเขียว',   rom: 'sĕe kĭeow',      en: 'green',  glyph: '\u25B2' },
    { id: 'yellow', hex: '#e8b71f', dark: '#b08c10', th: 'สีเหลือง',  rom: 'sĕe lĕuang',     en: 'yellow', glyph: '\u25A0' }
  ];

  // Action cards. English names are Mattel's official ones ("Draw Two", not
  // "+2" — the +2 glyph is the card face, the name is what the Guide uses).
  // Thai follows how Thai players actually talk at the table.
  var WC_ACTIONS = {
    skip:    { symbol: '\u2298', en: 'Skip',            th: 'ข้าม',      rom: 'kâam' },
    reverse: { symbol: '\u21BB', en: 'Reverse',         th: 'ย้อนกลับ',  rom: 'yón glàp' },
    draw2:   { symbol: '+2',     en: 'Draw Two',        th: 'จั่วสองใบ', rom: 'jùa sŏng bai' },
    wild:    { symbol: '\u2687', en: 'Wild',            th: 'เลือกสี',   rom: 'lêuak sĕe' },
    wild4:   { symbol: '+4',     en: 'Wild Draw Four',  th: 'จั่วสี่ใบ', rom: 'jùa sèe bai' }
  };

  /* ---- Icons -------------------------------------------------------------
     Drawn as SVG rather than typed as characters. A text glyph's ink does not
     fill its layout box — ascent/descent padding, side bearings, and different
     metrics per glyph and per fallback font — so positioning ◆ and ▲ and ⊘ by
     the same offsets put their ink in visibly different places. Every icon
     below is drawn to the same 100×100 box and fills it identically, so all
     four corners land in exactly the same spot at any card size, on any
     platform, regardless of which fonts are installed. */
  function wcSvg(inner, extra) {
    return '<svg class="wc-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"' +
           (extra || '') + '>' + inner + '</svg>';
  }
  var WC_STROKE = 'fill="none" stroke="currentColor" stroke-width="11" ' +
                  'stroke-linecap="round" stroke-linejoin="round"';
  var WC_ICONS = {
    // Colour-blind cues. One shape per colour, all filling the same box.
    diamond:  wcSvg('<polygon points="50,6 94,50 50,94 6,50" fill="currentColor"/>'),
    circle:   wcSvg('<circle cx="50" cy="50" r="44" fill="currentColor"/>'),
    triangle: wcSvg('<polygon points="50,8 94,88 6,88" fill="currentColor"/>'),
    square:   wcSvg('<rect x="7" y="7" width="86" height="86" rx="10" fill="currentColor"/>'),
    // Action symbols. ⊘ and ↻ are the worst offenders for font substitution,
    // so they are drawn too.
    skip:     wcSvg('<circle cx="50" cy="50" r="38" ' + WC_STROKE + '/>' +
                    '<line x1="23" y1="23" x2="77" y2="77" ' + WC_STROKE + '/>'),
    reverse:  wcSvg('<g ' + WC_STROKE + '>' +
                    '<path d="M18 34 H70"/><path d="M56 20 L70 34 L56 48"/>' +
                    '<path d="M82 66 H30"/><path d="M44 80 L30 66 L44 52"/></g>'),
    // The Wild card has no single colour, so its mark is the four of them.
    wild:     wcSvg('<path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z" fill="#d5443a"/>' +
                    '<path d="M50 50 L96 50 A46 46 0 0 1 50 96 Z" fill="#e8b71f"/>' +
                    '<path d="M50 50 L50 96 A46 46 0 0 1 4 50 Z" fill="#3f9243"/>' +
                    '<path d="M50 50 L4 50 A46 46 0 0 1 50 4 Z" fill="#2f6fc4"/>')
  };
  var WC_COLOUR_ICON = { red: 'diamond', blue: 'circle', green: 'triangle', yellow: 'square' };


  /* =======================================================================
     2 · STYLES  (injected once, on load)
     ======================================================================= */

  // Turn a fraction of card height into a CSS length. Every card measurement
  // goes through here, so WC_GEO is the only place the numbers live.
  function u(k) { return 'calc(var(--wc-chh,120px) * ' + k + ')'; }

  var WC_CSS = [
    /* The shared .menu-group-label is width:100% with no cap, while every
       .menu-section under it stops at 480px — so as a direct child of the
       centred .menu column it would rule a line wider than the settings it
       heads. Scoped here rather than changed in index.html, which every other
       screen shares. */
    '#view-wordcards .menu-group-label{max-width:480px;}',
    /* ---- setup screen: opponent tick grid ---- */
    '.wc-opp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}',
    '.wc-opp{position:relative;display:flex;align-items:center;gap:10px;padding:9px 10px;border:2px solid var(--card-face-border);',
    'border-radius:12px;background:var(--button-bg);color:var(--ink);cursor:pointer;text-align:left;',
    'transition:border-color .15s,background .15s,transform .1s;}',
    '.wc-opp:hover{background:var(--button-hover);}',
    '.wc-opp:active{transform:scale(.98);}',
    '.wc-opp.selected{border-color:var(--accent);background:var(--button-hover);}',
    '.wc-opp:focus-visible{outline:3px solid var(--accent);outline-offset:2px;}',
    '.wc-opp-avatar{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 auto;',
    'border:2px solid var(--card-face-border);background:var(--panel);}',
    '.wc-opp.selected .wc-opp-avatar{border-color:var(--accent);}',
    '.wc-opp-text{min-width:0;flex:1 1 auto;line-height:1.25;}',
    '.wc-opp-en{font-size:.86rem;font-weight:700;}',
    '.wc-opp-th{font-size:.8rem;color:var(--ink);}',
    '.wc-opp-rom{font-size:.72rem;color:var(--rom);}',
    '.wc-opp-diff{font-size:.62rem;letter-spacing:-1px;margin-top:1px;}',
    '.wc-opp-level{display:block;margin-top:2px;font-size:.62rem;font-weight:700;',
    'letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);}',
    '.wc-opp-level-sharp{color:var(--accent);}',
    /* tick box */
    '.wc-opp-tick{position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:5px;',
    'border:2px solid var(--card-face-border);background:var(--panel);display:flex;align-items:center;',
    'justify-content:center;font-size:.72rem;font-weight:700;color:#fff;line-height:1;}',
    '.wc-opp.selected .wc-opp-tick{background:var(--accent);border-color:var(--accent);}',
    /* dimmed when the 3-opponent cap is reached and this one is not ticked */
    '.wc-opp.wc-opp-full{opacity:.45;cursor:not-allowed;}',
    '.wc-opp.wc-opp-full:hover{background:var(--button-bg);}',
    /* trophy, reusing the vs-Computer badge art */
    '.wc-opp-trophy{position:absolute;bottom:4px;left:40px;width:17px;height:17px;object-fit:contain;',
    'filter:drop-shadow(0 1px 2px var(--shadow));}',

    /* Feedback line under the opponent grid. Matches .start-msg so the two read
       as the same kind of message, just anchored to different controls. */
    '.wc-opp-msg{text-align:center;font-size:.85rem;color:var(--error);margin-top:.6rem;min-height:1.2em;}',
    '.wc-opp-msg:empty{margin-top:0;min-height:0;}',

    /* ---- setup screen: pool counter (Word Cards has its own rule: it needs',
       10 SHORT words, not just 10 words, so it can't use updatePoolCounter) ---- */
    '.wc-pool-counter{margin-top:8px;font-size:.8rem;color:var(--ink-soft);text-align:center;}',
    '.wc-pool-counter strong{color:var(--accent);font-variant-numeric:tabular-nums;}',
    '.wc-pool-counter.invalid strong{color:var(--error);}',

    /* ---- topbar HUD ---- */
    '.wc-hud.hidden{display:none;}',
    '.wc-hud{display:inline-flex;align-items:center;gap:12px;white-space:nowrap;font-size:.82rem;}',
    '.wc-hud strong{color:var(--accent);font-variant-numeric:tabular-nums;}',
    /* Blank the Solo/CPU stat spans while this mode owns the HUD centre —',
       same treatment Connect Pairs and Sentence Builder get in the main sheet. */
    '#hud.hud-wc-mode > .stat,',
    '#hud.hud-wc-mode > .turn-indicator{display:none !important;}',

    /* =================== GAME VIEW: THE TABLE =========================
       Landscape-first. Height is the scarce dimension, so every size derives
       from --wc-hand-h / --wc-table-h / --wc-seat-h, which JS recomputes from
       the available height on entry and on every resize. Card WIDTH follows
       height at the 3:4 ratio; font sizes scale on their own curve with a hard
       floor, because text stops being readable well before a card stops being
       tappable. The four card colours are fixed, not theme tokens — the rules
       depend on them being distinguishable in all six themes. */
    '.wc-game-view{display:flex;flex-direction:column;position:relative;overflow:hidden;',
    'padding:0;height:100%;min-height:0;}',
    '.wc-game-view.hidden{display:none;}',
    '.wc-stage{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;',
    'min-height:0;width:100%;padding:6px 10px 8px;gap:4px;}',

    /* ---- opponent seats, across the top ----
       Everything in a seat SCALES from --wc-seat-h rather than being hidden on
       small screens. The avatar and the mini-fan used to be display:none below
       520px of view height, which took them out on phone landscape AND on any
       desktop running OS display scaling (a 1080p screen at 200% is a 960x540
       CSS viewport — under the threshold, same as a phone). They fit at every
       size the table supports, so nothing sheds any more; .wc-compact now only
       tightens padding.

       Seats shrink rather than truncating by default: flex 0 1 auto with
       min-width:0 lets the row give a long name its full width when there's
       room, and fall back to an ellipsis only when there genuinely isn't. */
    /* padding-top is the other half of the marker fix: the chips straddle the
       seat's top edge, so roughly 8px of each one sits above the box. This is
       the clearance that keeps it inside the stage, and it is the whole cost
       of the change — 8px, on the tightest dimension the game has. */
    /* --wc-mark-y is HOW FAR the marker chips ride above the seat's top edge,
       as a share of their own height. -50% is dead centre on the border: half
       out, half in. It is a variable because the right answer depends on how
       much room the seat has, and on a phone in landscape the seat is 44px
       tall with 4px of padding — the chip's inner half lands on the name. See
       the compact block near the end of this sheet. */
    '.wc-seats{display:flex;justify-content:center;align-items:flex-start;gap:clamp(16px,3.2vw,34px);',
    '--wc-mark-y:-50%;',
    'width:100%;flex:0 0 auto;padding-top:8px;min-height:var(--wc-seat-h,72px);}',
    /* No `transition` here on purpose: wcRenderSeats() rebuilds the row through
       innerHTML, so every seat is a fresh node and a transition can never run.
       Entrance work is done with `animation`, which starts correctly on a new
       node — and restarts exactly when the turn moves, which is what we want. */
    '.wc-seat{position:relative;display:flex;align-items:center;gap:7px;padding:5px 9px 5px 5px;',
    'border-radius:12px;background:var(--panel);border:2px solid transparent;',
    'box-shadow:0 1px 3px var(--shadow);flex:0 1 auto;min-width:0;max-width:270px;}',
    /* The active opponent. Contrast does the work: the live seat lifts and
       glows while the others recede, which reads at a glance far better than
       making the active one alone louder. The dimming is applied only while a
       CPU is actually on turn (.wc-seats-active), so during YOUR turn the row
       sits at full strength instead of looking permanently switched off. */
    '.wc-seat-turn{border-color:var(--accent);z-index:2;transform:scale(1.03);',
    'box-shadow:0 0 0 3px var(--success-glow),0 2px 8px var(--shadow);',
    'animation:wc-seat-in ' + (WC_TURN_HOLD_MS + WC_TURN_IN_MS) + 'ms cubic-bezier(.34,1.56,.64,1) both,',
    'wc-seat-glow 1.9s ease-in-out infinite;}',
    /* The first WC_TURN_HOLD_MS of this animation hold the seat exactly as it
       looked before the turn arrived, so the highlight lands a beat after the
       card rather than alongside it. Percentages are generated from the two
       constants so the shape cannot drift from them. */
    '@keyframes wc-seat-in{0%,' + wcPct(WC_TURN_HOLD_MS) + '{transform:scale(1);',
    'border-color:var(--card-face-border);box-shadow:none;}',
    wcPct(WC_TURN_HOLD_MS + WC_TURN_IN_MS * 0.58) + '{transform:scale(1.06);}',
    '100%{transform:scale(1.03);border-color:var(--accent);',
    'box-shadow:0 0 0 3px var(--success-glow),0 2px 8px var(--shadow);}}',
    '@keyframes wc-seat-glow{0%,100%{box-shadow:0 0 0 3px var(--success-glow),0 2px 8px var(--shadow);}',
    '50%{box-shadow:0 0 0 4px var(--accent),0 0 17px 2px var(--success-glow),0 2px 8px var(--shadow);}}',
    '.wc-seats-active .wc-seat:not(.wc-seat-turn){opacity:.5;filter:saturate(.55);}',
    /* An announcement pinned to the seat it happened to: a badge popping above
       the box, and the box itself ringed in the matching colour. Two-class
       selectors so they outrank .wc-seat-turn without needing !important, and
       a seat being announced is never dimmed by the row-dimming rule above. */
    '.wc-seat.wc-seat-fx-on{border-color:var(--accent);opacity:1 !important;filter:none !important;}',
    '.wc-seat.wc-seat-fx-bad{border-color:var(--error);}',
    /* THE THREE SEAT MARKERS SHARE ONE GEOMETRY. They used to be three
       different sizes with two different capitalisation rules — the
       announcement badge was .72rem mixed-case, the standing chips .54 and
       .56rem forced uppercase — which read as three unrelated widgets stacked
       on the same corner of the same box.

       What separates an ANNOUNCEMENT from a STANDING STATE is now colour and
       motion, not size: the badge is accent (or error) and pops, the standing
       marks are muted ink and simply appear. That is a difference you can
       still read at a glance, and it costs no height.

       They sit ASTRIDE the seat's top edge rather than above it — top:0 with a
       -50% Y shift — so only half the chip overhangs. Above the box they
       overflowed the stage entirely on a phone in landscape, where the seat
       row is already against the top of the screen. */
    '.wc-seat-fx{position:absolute;left:50%;top:0;transform:translate(-50%,var(--wc-mark-y,-50%));',
    'background:var(--accent);color:#fff;border-radius:7px;padding:2px 7px;',
    'font-size:.56rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;',
    'white-space:nowrap;z-index:6;pointer-events:none;',
    'box-shadow:0 2px 8px var(--shadow-strong);animation:wc-fx-pop .26s cubic-bezier(.34,1.56,.64,1);}',
    '.wc-seat-fx-bad .wc-seat-fx{background:var(--error);}',
    /* The pop has to animate from the position the badge actually occupies, or
       it starts at the default offset and snaps to the compact one the instant
       the animation ends. --wc-mark-y does not change during the animation, so
       it resolves once and interpolates cleanly. */
    '@keyframes wc-fx-pop{from{opacity:0;',
    'transform:translate(-50%,var(--wc-mark-y,-50%)) translateY(7px) scale(.82);}',
    'to{opacity:1;transform:translate(-50%,var(--wc-mark-y,-50%)) translateY(0) scale(1);}}',
    '@media (prefers-reduced-motion: reduce){.wc-seat-fx{animation:none;}}',
    '@media (prefers-reduced-motion: reduce){.wc-seat-turn{animation:none;transform:none;',
    'box-shadow:0 0 0 4px var(--accent),0 2px 6px var(--shadow);}}',
    '.wc-seat-av{width:calc(var(--wc-seat-h,72px) * .58);height:calc(var(--wc-seat-h,72px) * .58);',
    'min-width:26px;min-height:26px;max-width:52px;max-height:52px;',
    'border-radius:50%;object-fit:cover;flex:0 0 auto;',
    'border:2px solid var(--card-face-border);background:var(--bg-2);}',
    '.wc-seat-turn .wc-seat-av{border-color:var(--accent);}',
    '.wc-seat-body{min-width:0;display:flex;flex-direction:column;gap:2px;}',
    /* 140px holds the two longest names ("Muay Thai Fighter", "Excellent
       Student" — 17 characters) at this weight and size. The old 120px cut
       both to "Muay Thai Fi…". */
    '.wc-seat-name{font-size:.78rem;font-weight:700;color:var(--ink);white-space:nowrap;',
    'overflow:hidden;text-overflow:ellipsis;max-width:140px;}',
    '.wc-seat-stack{display:flex;align-items:center;gap:4px;}',
    /* a little fan of card backs standing in for their hand, sized from the
       seat height with a floor so it stays a recognisable card shape */
    '.wc-mini{--wc-mini-h:clamp(11px,calc(var(--wc-seat-h,72px) * .19),18px);',
    'display:inline-block;height:var(--wc-mini-h);width:calc(var(--wc-mini-h) * .7);',
    'border-radius:2px;margin-left:calc(var(--wc-mini-h) * -.28);flex:0 0 auto;',
    /* STRETCHED, not `cover`. The shared back artwork is framed, and `cover`
       scales it to fill then crops the overflow — on a 0.7:1 mini that throws
       away most of the frame and reads as a careless crop. 100% 100% distorts
       the image instead, which at this size is invisible and keeps the frame
       intact. Same reasoning as .wc-c-back below. The memory game keeps
       `cover` because its card is square, so it barely crops at all. */
    'background-image:var(--card-back-image);background-size:100% 100%;background-position:center;',
    'background-color:var(--card-face-border);border:1px solid rgba(0,0,0,.25);}',
    '.wc-mini:first-child{margin-left:0;}',
    '.wc-seat-n{font-size:.74rem;font-weight:700;color:var(--ink-soft);margin-left:4px;',
    'font-variant-numeric:tabular-nums;}',
    '.wc-last-badge{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;border-radius:10px;',
    'background:var(--error);color:#fff;font-size:.68rem;font-weight:800;display:flex;align-items:center;',
    'justify-content:center;padding:0 5px;box-shadow:0 1px 3px var(--shadow-strong);',
    'animation:wc-pulse 1.1s ease-in-out infinite;}',
    '@keyframes wc-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.16);}}',
    '.wc-think{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);display:flex;gap:3px;}',
    '.wc-think i{width:4px;height:4px;border-radius:50%;background:var(--accent);',
    'animation:wc-think 1s ease-in-out infinite;}',
    '.wc-think i:nth-child(2){animation-delay:.16s;} .wc-think i:nth-child(3){animation-delay:.32s;}',
    '@keyframes wc-think{0%,100%{opacity:.25;transform:translateY(0);}50%{opacity:1;transform:translateY(-3px);}}',
    '@media (prefers-reduced-motion: reduce){.wc-think i,.wc-last-badge{animation:none;}}',

    /* ---- table centre: draw pile, direction, discard, colour in force ---- */
    /* MUST stretch: .wc-stage centres its children, so a shrink-wrapped wrapper
       is only as wide as the two piles — and an absolutely positioned log at
       left:0 then lands ON the draw pile instead of at the edge of the screen. */
    '.wc-centre-wrap{position:relative;flex:1 1 auto;display:flex;min-height:0;',
    'width:100%;align-self:stretch;}',
    '.wc-centre{flex:1 1 auto;display:flex;align-items:center;justify-content:center;',
    'gap:clamp(10px,3vw,34px);min-height:0;width:100%;}',
    '.wc-pile{position:relative;background:none;border:none;padding:0;cursor:pointer;',
    'border-radius:calc(var(--wc-table-h,140px) * .09);transition:transform .12s;}',
    '.wc-pile:hover{transform:translateY(-2px);}',
    '.wc-pile:focus-visible{outline:3px solid var(--accent);outline-offset:3px;}',
    '.wc-pile-count{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);',
    'background:var(--panel);border:1px solid var(--card-face-border);border-radius:9px;',
    'font-size:.68rem;font-weight:700;padding:0 6px;color:var(--ink-soft);',
    'font-variant-numeric:tabular-nums;}',
    /* The discard carries the colour in force as a ring. Two rings when a card
       is selected: colour inside, "play here" outside — they read as separate
       pieces of information rather than fighting for the same edge. */
    /* The colour ring is a WILD-ONLY device. On an ordinary card the artwork
       already states the colour and a ring on top of it is noise; on a wild
       the face is four quadrants and the ring is the only source of the
       information there is. So the base pile carries none. */
    '.wc-pile-discard{box-shadow:none;}',
    /* After a wild the card face says nothing about what colour is in force,
       so the ring stops being a reminder and becomes the only source of the
       information. It gets thicker, it gets a glow, and it gets a chip that
       names the colour in words. On an ordinary coloured card none of that
       appears: the card already says it. */
    '.wc-pile-discard.wc-pile-wild{box-shadow:0 0 0 5.5px var(--wc-now,#888),',
    '0 0 15px 3px var(--wc-now,#888),0 2px 8px var(--shadow);}',
    /* Selected-card target AND a wild underneath: both rings, nested, rather
       than whichever rule happens to come last in the sheet. */
    '.wc-pile-target.wc-pile-wild{box-shadow:0 0 0 5.5px var(--wc-now,#888),',
    '0 0 0 9px var(--success),0 0 18px var(--success-glow);}',
    /* A seat that has just lost its turn. Unlike wc-seat-fx this is STATE,
       not an announcement: it stays until play comes back round to them, so
       looking away for three seconds cannot cost you the reason the turn
       jumped. The fx badge overrides it (see .wc-seat.wc-seat-fx-on above)
       because a live announcement outranks a standing condition. */
    /* Visually hidden, still read aloud. The clip-rect form rather than
       display:none or visibility:hidden, both of which take an element out of
       the accessibility tree entirely — which for a live region means it
       announces nothing at all. */
    '.wc-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;',
    'overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}',
    /* Who plays after you. Deliberately NOT a quieter version of the on-turn
       highlight — that one is a solid accent border, a glow and a scale-up, and
       a faded copy of it reads as "on turn, but broken". This is a dashed
       outline in the neutral ink colour, no scale and no glow: a different
       statement rather than a weaker one. */
    '.wc-seat-next{outline:2px dashed var(--ink-soft);outline-offset:2px;border-radius:12px;}',
    '.wc-seat-nextmark{position:absolute;left:50%;top:0;transform:translate(-50%,var(--wc-mark-y,-50%));',
    'background:var(--ink-soft);color:var(--panel);font-size:.56rem;font-weight:800;',
    'letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:7px;',
    'white-space:nowrap;pointer-events:none;z-index:3;}',
    /* The order-of-play arrows. They sit in the row's own gap, pulled inward so
       they read as belonging between two seats rather than as a third item. */
    '.wc-seat-arrow{align-self:center;font-size:clamp(.95rem,2.4vh,1.45rem);',
    'color:var(--accent);opacity:.75;line-height:1;flex:0 0 auto;',
    'transform-origin:50% 50%;will-change:transform;pointer-events:none;',
    'margin:0 calc(clamp(16px,3.2vw,34px) / -3);}',
    '.wc-seat-arrow-rev{transform:scaleX(-1);}',
    '.wc-seat-arrow-turn{animation:wc-arrow-flip ' + WC_DIR_MS + 'ms cubic-bezier(.34,1.4,.5,1) both;}',
    '@keyframes wc-arrow-flip{',
      '0%{transform:scaleX(1) scale(1);opacity:.75;}',
      '40%{transform:scaleX(0) scale(1.5);opacity:1;}',
      '100%{transform:scaleX(1) scale(1);opacity:.75;}}',
    '.wc-seat-arrow-rev.wc-seat-arrow-turn{animation-name:wc-arrow-flip-rev;}',
    '@keyframes wc-arrow-flip-rev{',
      '0%{transform:scaleX(-1) scale(1);opacity:.75;}',
      '40%{transform:scaleX(0) scale(1.5);opacity:1;}',
      '100%{transform:scaleX(-1) scale(1);opacity:.75;}}',
    '@media (prefers-reduced-motion: reduce){.wc-seat-arrow-turn{animation:none;}}',
    /* The matched-pair celebration. A hard pop and a shake on the pile itself,
       so the thing that is being celebrated is the thing that moves. */
    '.wc-pile-discard.wc-pile-match{animation:wc-pile-match ' + WC_MATCH_MS + 'ms ',
    'cubic-bezier(.3,1.5,.5,1) both;z-index:8;}',
    '@keyframes wc-pile-match{',
      '0%{transform:scale(1) rotate(0deg);}',
      '14%{transform:scale(1.26) rotate(-7deg);}',
      '30%{transform:scale(1.20) rotate(6deg);}',
      '44%{transform:scale(1.15) rotate(-5deg);}',
      '58%{transform:scale(1.10) rotate(4deg);}',
      '72%{transform:scale(1.06) rotate(-2deg);}',
      '100%{transform:scale(1) rotate(0deg);}}',
    '.wc-match-bit{position:absolute;width:9px;height:12px;border-radius:2px;',
    'pointer-events:none;opacity:0;will-change:transform,opacity;',
    'animation:wc-match-bit ' + WC_MATCH_MS + 'ms cubic-bezier(.2,.8,.3,1) both;}',
    '.wc-match-bit-0{background:var(--wc-red,#e2574c);}',
    '.wc-match-bit-1{background:var(--wc-blue,#3d7bd6);}',
    '.wc-match-bit-2{background:var(--wc-green,#3f9e5a);}',
    '.wc-match-bit-3{background:var(--wc-yellow,#e8b53a);}',
    '@keyframes wc-match-bit{',
      '0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(0deg);}',
      '18%{opacity:1;}',
      '100%{opacity:0;',
      'transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(220deg);}}',
    '@media (prefers-reduced-motion: reduce){',
      '.wc-pile-discard.wc-pile-match{animation:none;}',
      '.wc-match-bit{display:none;}}',
    '.wc-seat-out{opacity:.5;filter:grayscale(.8);}',
    /* The same statement, made about you. Applied to the cards rather than the
       whole bar so the count and the panel stay legible while it is up. */
    '.wc-handbar.wc-hand-out .wc-hand-card{opacity:.45;filter:grayscale(.85);}',
    '.wc-handbar.wc-hand-out .wc-hand-count{opacity:.6;}',
    /* A seat can be BOTH: freshly skipped (badge up) and sitting out. The
       fx-on rule above forces full strength with !important so an announced
       seat is never dimmed by the row-dimming rule — but this dimming is not
       that one, it is the thing the badge is announcing, and it has to land
       in the same frame as the card. Matching !important, one class more
       specific. */
    '.wc-seat.wc-seat-fx-on.wc-seat-out{opacity:.58 !important;filter:grayscale(.7) !important;}',
    /* Top edge, with the other two. It used to sit at the bottom so it could
       not collide with the announcement badge that hands over to it — but the
       two never appear together anyway (see wcRenderSeats), and having the
       same information arrive at the top and then reappear at the bottom read
       as two unrelated things rather than one handover. */
    '.wc-seat-outmark{position:absolute;left:50%;top:0;transform:translate(-50%,var(--wc-mark-y,-50%));',
    'background:var(--ink-soft,#777);color:#fff;font-size:.56rem;font-weight:800;',
    'letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:7px;',
    'white-space:nowrap;pointer-events:none;z-index:3;}',
    '.wc-pile-target{box-shadow:0 0 0 5px var(--success),0 0 18px var(--success-glow);}',
    '.wc-pile-target::after{content:"play here";position:absolute;top:-18px;left:50%;',
    'transform:translateX(-50%);font-size:.64rem;font-weight:700;text-transform:uppercase;',
    'letter-spacing:.06em;color:var(--success);white-space:nowrap;}',
    '.wc-centre-mid{display:flex;flex-direction:column;align-items:center;gap:4px;}',
    '.wc-dir{font-size:clamp(1.1rem,3.2vh,1.9rem);color:var(--accent);line-height:1;}',
    /* ---- the direction reversing ------------------------------------------
       A Reverse used to swap this glyph between one frame and the next, which
       is the single easiest thing in the game to miss — the arrow is small,
       it is not where you are looking, and nothing about the swap says a
       change happened.

       So the NEW glyph is rendered immediately (state first, always) and then
       turned into place: it starts mirrored, which is what the OLD direction
       looked like, swings through edge-on while growing to ~3x, and settles
       back. What you see is the arrow you had turning into the arrow you now
       have, rather than one being replaced by the other.

       It is deliberately allowed to overlap the two piles at full size —
       z-index lifts it over them for the duration — because a flourish that
       stayed inside its own box would have to be small enough not to be worth
       making. .wc-centre-mid gets no overflow of its own, so nothing clips it.

       The node is rebuilt by innerHTML on every render, and a render can
       easily land mid-flourish (a card lands, a badge appears). A fresh node
       would restart the animation from the top and stutter. That is what the
       negative animation-delay in wcDirStyle() is for: the replacement node
       joins the animation already in progress, at exactly the point the old
       one had reached. No timer, and nothing to clean up. */
    '.wc-dir-turn{position:relative;z-index:7;transform-origin:50% 50%;',
    'will-change:transform;animation:wc-dir-turn ' + WC_DIR_MS + 'ms ',
    'cubic-bezier(.34,1.3,.5,1) both;}',
    '@keyframes wc-dir-turn{',
      /* mirrored == the direction you had a moment ago */
      '0%{transform:scale(1) rotateY(180deg);text-shadow:none;}',
      /* edge-on while it grows, so it reads as a turn and not a spin */
      '34%{transform:scale(2.4) rotateY(90deg);}',
      /* opens out at full size, and this is the frame that catches the eye */
      '52%{transform:scale(3) rotateY(38deg);',
      'text-shadow:0 0 14px var(--success-glow),0 0 4px var(--accent);}',
      '100%{transform:scale(1) rotateY(0deg);text-shadow:none;}}',
    '@media (prefers-reduced-motion: reduce){',
      /* No growth and no spin — but the change still has to be legible, so it
         keeps a brief tint rather than becoming the silent swap it used to be. */
      '.wc-dir-turn{animation:wc-dir-tint ' + WC_DIR_MS + 'ms ease-out both;}',
      '@keyframes wc-dir-tint{0%,60%{color:var(--success);}100%{color:var(--accent);}}',
    '}',
    '.wc-pending{font-size:.8rem;font-weight:800;color:#fff;background:var(--error);',
    'border-radius:9px;padding:1px 8px;}',

    /* ---- the card itself -------------------------------------------------
       Banded layout: solid colour top and bottom, one full-width white band
       across the middle carrying the word. Chosen over a floating inset panel
       for three reasons:
         • text gets ~28% more usable width, because the band runs edge to edge
         • the corner indices live in the colour bands, so they can never
           collide with the text — a separation, not a tuned clearance
         • black on white is 16:1, where white or black directly on our card
           colours is 1.9–5.0:1, well under the 4.5:1 small text needs. UNO can
           print straight onto colour because its content is one huge digit;
           ours is Thai script with tone marks at 12px.
       Every measurement is generated from WC_GEO, so the CSS and the pool's
       text-fit calculation cannot drift apart. */
    '.wc-c{position:relative;display:block;box-sizing:border-box;',
    'width:var(--wc-cw,90px);height:var(--wc-chh,120px);',
    'border-radius:' + u(0.085) + ';background:var(--wc-cbg,#666);',
    'border:' + u(WC_GEO.border) + ' solid #fdfdfb;',
    'box-shadow:0 2px 5px var(--shadow-strong);overflow:hidden;flex:0 0 auto;}',
    '.wc-c-hand{--wc-cw:var(--wc-hand-w,90px);--wc-chh:var(--wc-hand-h,120px);}',
    '.wc-c-table{--wc-cw:var(--wc-table-w,78px);--wc-chh:var(--wc-table-h,104px);}',
    /* The revealed hand in a challenge. Was 44px, which is legible on a phone
       only if you already know what it says. +20% everywhere, +50% once there
       is a real screen to use — the panel grows with it so they still sit
       comfortably inside. */
    '.wc-c-mini{--wc-cw:53px;--wc-chh:71px;}',
    '.wc-c-red{--wc-cbg:#d5443a;} .wc-c-blue{--wc-cbg:#2f6fc4;}',
    '.wc-c-green{--wc-cbg:#3f9243;} .wc-c-yellow{--wc-cbg:#e8b71f;}',
    /* Four equal quadrants rather than a colour wheel. A conic sweep gave each
       colour an unequal share of the two visible bands — mostly blue and
       yellow. Quadrants give every colour exactly a quarter, and because the
       split sits at 50% height (== the band's midline, see WC_GEO) each side
       rail runs one colour down to the band and the next colour on from it. */
    '.wc-c-wild{--wc-cbg:#2b2b2b;background:',
    'linear-gradient(to right,#2f6fc4 0 50%,#d5443a 50% 100%) top/100% 50% no-repeat,',
    'linear-gradient(to right,#3f9243 0 50%,#e8b71f 50% 100%) bottom/100% 50% no-repeat;}',
    /* See .wc-mini: the back art is FITTED to the card, not cropped to it. */
    '.wc-c-back{background-image:var(--card-back-image);background-size:100% 100%;',
    'background-position:center;background-color:var(--card-face-border);}',
    /* A tone-on-tone texture in the colour bands, the way real card faces carry
       a pattern — it is what stops a coloured rectangle reading as a coloured
       rectangle. Pure CSS, so it costs nothing. */
    '.wc-c::before{content:"";position:absolute;inset:0;pointer-events:none;',
    'background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.09) 0 2px,',
    'rgba(255,255,255,0) 2px 9px);}',
    '.wc-c-back::before{display:none;}',

    /* the white text band — full width, so nothing is squeezed */
    /* Inset horizontally by the rail width, so the card's own colour shows
       down both edges and joins the top and bottom bands into a frame. The
       rails ARE the card background, so they match their bands exactly — no
       seam, and nothing to keep in sync. A 2px floor keeps them from thinning
       to a hairline on a phone. */
    '.wc-c-band{position:absolute;left:max(2px,' + u(WC_GEO.rail) + ');',
    'right:max(2px,' + u(WC_GEO.rail) + ');top:' + u(WC_GEO.bandTop) + ';',
    'height:' + u(WC_GEO.bandH) + ';background:#fdfdfb;',
    'display:flex;align-items:center;justify-content:center;overflow:hidden;',
    'padding:' + u(WC_GEO.padY) + ' ' + u(WC_GEO.padX) + ';',
    'box-shadow:inset 0 1px 0 rgba(0,0,0,.07),inset 0 -1px 0 rgba(0,0,0,.07);}',
    /* NOT a flex container. A bare text node inside a flex box becomes an
       anonymous flex item with min-width:auto, which sizes to max-content and
       refuses to wrap at all — that is what clipped "I don't understand". */
    '.wc-c-main{display:block;width:100%;text-align:center;color:#22201c;',
    'font-weight:700;line-height:' + WC_GEO.line + ';',
    'word-break:normal;overflow-wrap:break-word;hyphens:none;}',
    '.wc-c-line{display:block;}',
    '.wc-c-rom{display:block;font-weight:500;color:#6b5d44;',
    'font-size:' + WC_GEO.romEm + 'em;line-height:' + WC_GEO.line + ';}',
    /* ONE size for every word card. Sized so that every entry the pool filter
       admits fits — the filter is derived from this number, not guessed. */
    '.wc-c-word{font-size:max(9px,' + u(WC_GEO.font) + ');}',
    '.wc-c-action{font-size:max(9px,' + u(WC_GEO.font) + ');}',
    '.wc-c-action .wc-c-symbol{display:block;height:' + u(0.20) + ';margin:0 auto ' + u(0.012) + ';}',
    '.wc-c-action .wc-c-symbol .wc-svg{height:100%;width:auto;}',
    '.wc-c-action .wc-c-symtext{display:block;font-size:' + u(0.20) + ';line-height:1;',
    'letter-spacing:-.02em;}',
    '.wc-c-actth{display:block;color:#22201c;font-weight:700;line-height:' + WC_GEO.line + ';}',
    '.wc-c-actrom{display:block;font-size:' + WC_GEO.romEm + 'em;color:#6b5d44;',
    'font-weight:500;line-height:' + WC_GEO.line + ';}',

    /* corner indices — a fixed square box at an exact offset, with the mark
       centred inside it. The box placement is identical at both corners by
       construction; centring the mark keeps glyph-to-glyph variation from
       turning into positional drift. */
    '.wc-idx{position:absolute;width:' + u(WC_GEO.idxSize) + ';height:' + u(WC_GEO.idxSize) + ';',
    'display:flex;align-items:center;justify-content:center;color:#fff;',
    'filter:drop-shadow(0 1px 1px rgba(0,0,0,.45));}',
    '.wc-idx .wc-svg{width:100%;height:100%;display:block;}',
    '.wc-idx-text{font-size:' + u(0.088) + ';font-weight:800;line-height:1;',
    'text-shadow:0 1px 2px rgba(0,0,0,.5);}',
    '.wc-idx-tl{top:' + u(WC_GEO.idxInset) + ';left:' + u(WC_GEO.idxInset) + ';}',
    '.wc-idx-br{bottom:' + u(WC_GEO.idxInset) + ';right:' + u(WC_GEO.idxInset) + ';}',
    /* the ไทย / EN marker, shown only where the two faces are both Latin */
    '.wc-c-lang{position:absolute;bottom:' + u(WC_GEO.idxInset) + ';left:' + u(WC_GEO.idxInset) + ';',
    'font-size:' + u(0.072) + ';color:#fff;opacity:.85;font-weight:700;line-height:1;',
    'text-shadow:0 1px 2px rgba(0,0,0,.5);}',

    /* ---- your hand: an overlapping fan ---- */
    /* The line that says what is happening — whose turn it is, what just
       landed, why a card was refused. It was .8rem and sitting close enough to
       the hand to be read as a caption on it. Moving the hand count and the
       action buttons into the side panel freed the whole row, so it gets the
       size the information deserves. */
    '.wc-ticker{flex:0 0 auto;min-height:1.5em;font-size:1rem;text-align:center;',
    'color:var(--ink-soft);padding:2px 0 4px;line-height:1.35;}',
    '@media (min-width:900px){.wc-ticker{font-size:1.1rem;min-height:1.6em;}}',
    '.wc-state-msg{color:var(--ink);font-weight:700;}',
    /* ---- move log ----
       Absolutely positioned so it can never shove the two piles off centre —
       .wc-centre is a centred flex row, and a sibling in the flow would push
       against it. */
    '.wc-log{position:absolute;left:clamp(8px,2vw,26px);top:50%;transform:translateY(-50%);',
    'z-index:12;width:min(26%,260px);display:flex;flex-direction:column;',
    'align-items:flex-start;gap:3px;pointer-events:auto;}',
    /* Mirror of .wc-log above, right-anchored. Same top:50% and the same
       clamp() inset, so the two boxes sit at the same height at every width
       without either one needing to know about the other. */
    '.wc-side{position:absolute;right:clamp(8px,2vw,26px);top:50%;transform:translateY(-50%);',
    'z-index:12;width:min(24%,215px);display:flex;flex-direction:column;',
    'align-items:stretch;gap:6px;pointer-events:auto;background:var(--panel);',
    'border-radius:10px;padding:8px 9px;box-shadow:0 2px 8px var(--shadow);}',
    '.wc-side .wc-hand-count{text-align:center;font-size:.78rem;}',
    /* Stacked, full width, because this is now a control panel rather than a
       row under the hand: a column of same-width buttons is easier to hit and
       does not reflow when a second action appears mid-turn. */
    '.wc-side .wc-actions{flex-direction:column;align-items:stretch;gap:6px;width:100%;}',
    '.wc-side .wc-act-btn{width:100%;justify-content:center;}',
    '.wc-side .wc-act-hint{text-align:center;white-space:normal;line-height:1.3;}',
    /* Empty for most of a CPU turn — an empty bordered box reads as broken. */
    '.wc-side:empty{display:none;}',
    '.wc-log-toggle{background:var(--panel);color:var(--ink-soft);border:1px solid var(--card-face-border);',
    'border-radius:8px;padding:2px 7px;font-size:.68rem;font-weight:700;cursor:pointer;',
    'display:flex;align-items:center;gap:4px;line-height:1.5;}',
    '.wc-log-list{background:var(--panel);border-radius:10px;padding:6px 9px;width:100%;',
    'box-shadow:0 2px 8px var(--shadow);display:flex;flex-direction:column;gap:2px;}',
    /* Two lines rather than one truncated one: the Thai colour name is the end
       of the longest lines, and it is the part worth keeping. */
    '.wc-log-line{font-size:.68rem;line-height:1.35;color:var(--ink-soft);',
    'overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;',
    '-webkit-line-clamp:2;line-clamp:2;}',
    '.wc-log-line:last-child{color:var(--ink);font-weight:700;}',
    '.wc-log-empty{font-size:.68rem;color:var(--ink-soft);opacity:.7;font-style:italic;}',
    /* "Your turn" used to be 0.8rem of accent-coloured text in a ticker it
       had to share, and it lost that fight 17% of the time — measured, and
       most often to the Reverse message, which is exactly the moment the
       turn snaps back to you unexpectedly. It now has its own line that
       nothing else can occupy, plus a glow on the hand you are about to
       play from, which is where you are looking anyway. */
    /* The "tap to continue" on a held message. Quieter than the message it
       follows — it is an affordance, not the news. */
    '.wc-tick-tap{display:inline-block;margin-left:7px;font-size:.72em;font-weight:700;',
    'opacity:.72;text-transform:uppercase;letter-spacing:.05em;vertical-align:baseline;}',
    '.wc-state-msg{cursor:pointer;}',
    '.wc-your-turn{color:var(--accent);font-weight:800;letter-spacing:.02em;}',
    '.wc-your-turn::before{content:"";display:inline-block;width:7px;height:7px;',
    'border-radius:50%;background:var(--accent);margin-right:6px;vertical-align:middle;',
    'animation:wc-turn-dot 1400ms ease-in-out infinite;}',
    '@keyframes wc-turn-dot{0%,100%{opacity:1;transform:scale(1);}',
    '50%{opacity:.35;transform:scale(.72);}}',
    '.wc-handbar{transition:box-shadow 220ms ease;}',
    // The focus anchor must not draw a ring when it is only catching focus
    // handed back from a closing panel; :focus-visible still fires if the
    // player actually tabs to it.
    '.wc-handbar:focus{outline:none;}',
    '.wc-handbar:focus-visible{outline:3px solid var(--accent);outline-offset:-3px;}',
    '.wc-handbar.wc-my-turn{box-shadow:0 -3px 0 0 var(--accent),0 -10px 18px -8px var(--accent);}',
    '@media (prefers-reduced-motion: reduce){.wc-your-turn::before{animation:none;}',
    '.wc-handbar{transition:none;}}',
    '.wc-tick-sub{font-style:italic;}',
    '.wc-handbar{flex:0 0 auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:0;}',
    '.wc-hand-scroll{width:100%;overflow-x:auto;overflow-y:visible;display:flex;',
    /* `center` first as the fallback; `safe center` then wins where supported.
       Plain `center` would make the left end of an overflowing fan unreachable,
       and `flex-start` (what was here) left-aligned the hand on phones even
       when it fitted comfortably. */
    'justify-content:center;justify-content:safe center;',
    '-webkit-overflow-scrolling:touch;scrollbar-width:thin;padding-top:14px;}',
    '.wc-hand{position:relative;height:calc(var(--wc-hand-h,120px) + 4px);flex:0 0 auto;}',
    '.wc-hand-card{position:absolute;top:0;background:none;border:none;padding:0;cursor:pointer;',
    'border-radius:calc(var(--wc-hand-h,120px) * .085);transition:transform .13s ease,opacity .15s;}',
    '.wc-hand-card:hover{transform:translateY(-9px);}',
    '.wc-hand-card:focus-visible{outline:3px solid var(--accent);outline-offset:2px;z-index:99!important;}',
    '.wc-hand-card:disabled{cursor:default;}',
    '.wc-hand-card:disabled:hover{transform:none;}',
    /* The card you have just drawn, when it turns out to be playable. In
       Expert nothing else in the fan is marked at all, so this is the only
       highlight on screen and it can afford to be loud. */
    '.wc-just-drawn{outline:3px dashed var(--accent);outline-offset:3px;border-radius:9px;}',
    '.wc-just-drawn .wc-c{box-shadow:0 0 0 2px var(--accent),0 4px 12px var(--shadow);}',
    '.wc-drawn-tag{position:absolute;top:-15px;left:50%;transform:translateX(-50%);',
    'background:var(--accent);color:#fff;font-size:.58rem;font-weight:800;',
    'letter-spacing:.04em;text-transform:uppercase;padding:1px 7px;border-radius:7px;',
    'white-space:nowrap;pointer-events:none;z-index:5;}',
    '.wc-sel{transform:translateY(-16px);z-index:98!important;}',
    '.wc-sel .wc-c{box-shadow:0 0 0 3px var(--accent),0 6px 14px var(--shadow-strong);}',
    '.wc-sel:hover{transform:translateY(-16px);}',
    /* Easy only: mark what is legal, dim the rest. Expert adds no classes at all. */
    '.wc-ok .wc-c{box-shadow:0 0 0 2px var(--success),0 2px 6px var(--shadow-strong);}',
    '.wc-no{opacity:.42;}',
    /* .wc-hand-foot was the row under the hand that held the count and the
       action buttons. Both moved into the side panel in Phase 7 and the
       element went with them; the rule is deleted rather than left behind,
       because a selector matching nothing is a claim that something exists. */
    '.wc-hand-count{font-size:.8rem;color:var(--ink-soft);}',
    '.wc-hand-count strong{color:var(--accent);font-variant-numeric:tabular-nums;}',
    '.wc-you-last{color:var(--error);font-weight:800;text-transform:uppercase;font-size:.72rem;}',
    '.wc-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}',
    '.wc-act-btn{border:1.5px solid var(--card-face-border);background:var(--button-bg);color:var(--ink);',
    'border-radius:9px;padding:5px 13px;font-size:.82rem;font-weight:600;cursor:pointer;',
    'display:inline-flex;align-items:center;gap:5px;}',
    '.wc-act-btn:hover{background:var(--button-hover);border-color:var(--accent);}',
    '.wc-act-btn:focus-visible{outline:3px solid var(--accent);outline-offset:2px;}',
    '.wc-act-primary{background:var(--accent);border-color:var(--accent);color:#fff;}',
    '.wc-act-hint{font-size:.74rem;color:var(--ink-soft);font-style:italic;}',

    /* ---- overlays: colour picker, challenge, results ---- */
    '.wc-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;',
    'padding:16px;background:var(--overlay);z-index:20;}',
    '.wc-overlay-on{display:flex;}',
    '.wc-panel{background:var(--panel);border-radius:16px;padding:16px 18px;max-width:520px;width:100%;',
    'max-height:100%;overflow-y:auto;box-shadow:0 8px 26px var(--shadow-strong);text-align:center;}',
    '.wc-panel-title{font-size:1.1rem;margin-bottom:6px;color:var(--ink);}',
    '.wc-panel-body{font-size:.88rem;line-height:1.5;color:var(--ink);margin-bottom:5px;}',
    '.wc-panel-note{font-size:.76rem;color:var(--ink-soft);line-height:1.45;margin-bottom:10px;}',
    '.wc-panel-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:10px;}',
    '.wc-inline-chip{display:inline-block;padding:0 7px;border-radius:9px;color:#fff;font-weight:700;',
    'background:var(--wc-cbg,#666);text-shadow:0 1px 2px rgba(0,0,0,.4);}',
    /* colour picker — big, and labelled in Thai, because choosing by name is
       the most-repeated recall moment in the whole game */
    '.wc-pick{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-top:6px;}',
    '.wc-pick-btn{flex:1 1 108px;min-height:78px;border:3px solid rgba(255,255,255,.45);border-radius:13px;',
    'background:var(--wc-cbg,#666);color:#fff;cursor:pointer;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:2px;text-shadow:0 1px 3px rgba(0,0,0,.5);}',
    '.wc-pick-btn:hover{filter:brightness(1.12);transform:translateY(-2px);}',
    '.wc-pick-btn:focus-visible{outline:3px solid var(--ink);outline-offset:2px;}',
    '.wc-pick-glyph{font-size:1.05rem;}',
    '.wc-pick-th{font-size:1.02rem;font-weight:700;}',
    '.wc-pick-rom{font-size:.74rem;opacity:.92;}',
    '.wc-reveal{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0;}',
    /* Laptops and large tablets. The panel was built to a phone-landscape
       budget and stayed that size on a 1920-wide screen. */
    '@media (min-width:900px){',
      '.wc-c-mini{--wc-cw:66px;--wc-chh:89px;}',
      '.wc-panel{max-width:680px;padding:22px 26px;}',
      '.wc-panel-title{font-size:1.32rem;margin-bottom:9px;}',
      '.wc-panel-body{font-size:.98rem;}',
      '.wc-panel-note{font-size:.84rem;}',
      '.wc-reveal{gap:9px;margin:12px 0;}',
      /* The accused hand in a challenge reveal. This is the one moment in the
         round where a player is asked to READ someone else's cards and judge
         them, and at the phone-landscape size they were guesswork on a 1920
         screen. Scoped to .wc-reveal so nothing else that borrows wc-c-mini
         is dragged along with it. */
      '.wc-reveal .wc-c-mini{--wc-cw:88px;--wc-chh:118px;}',
      /* The colour picker, ~15% wider and taller, with the romanization taking
         most of the gain — it was the smallest text in the most consequential
         decision in the game. */
      '.wc-pick{gap:12px;}',
      '.wc-pick-btn{flex:1 1 124px;min-height:90px;}',
      '.wc-pick-glyph{font-size:1.2rem;}',
      '.wc-pick-th{font-size:1.22rem;}',
      '.wc-pick-rom{font-size:.95rem;}',
    '}',
    '.wc-places{display:flex;flex-direction:column;gap:4px;margin:8px 0;}',
    '.wc-place{display:flex;align-items:center;gap:9px;padding:5px 10px;border-radius:9px;',
    'background:var(--bg-2);font-size:.88rem;}',
    '.wc-place-you{outline:2px solid var(--accent);}',
    '.wc-place-rank{font-weight:800;color:var(--accent);min-width:1.2em;}',
    '.wc-place-name{flex:1;text-align:left;}',
    '.wc-place-cards{font-size:.76rem;color:var(--ink-soft);}',

    /* ---- the end-of-round panel ------------------------------------------
       This mode is landscape-LOCKED (see .wc-rotate), so unlike the shared
       win-modal in index.html there is no portrait case to design for. The
       scarce dimension is always HEIGHT: a phone held sideways gives about
       340–420px of it, a laptop gives 700+. So the artwork is sized from vh
       with a floor and a ceiling, exactly the way the table itself is, rather
       than from the fixed pixel steps the shared modal uses.

       .wc-panel already carries max-height:100% and overflow-y:auto, so the
       panel scrolls rather than clipping when the word list is long — which on
       a short landscape phone it usually will be. */
    '.wc-panel-end{max-width:600px;text-align:left;}',
    '.wc-end-grid{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;}',
    '.wc-end-main{min-width:0;width:100%;}',
    '.wc-end-line{font-size:.88rem;line-height:1.45;color:var(--ink-soft);margin-bottom:8px;}',
    /* The pill is index.html\'s .record-badge, shared with every other mode so
       an unlock is celebrated identically everywhere. Only the spacing is
       tightened here, because that stylesheet was written for a taller modal. */
    '.wc-panel-end .record-badge{margin-bottom:8px;font-size:.74rem;padding:.32rem .8rem;}',
    /* Artwork. The character portraits are photographic and squarish, so they
       fill a rounded frame the way the shared modal shows them. The win
       illustration is a different kind of image — unknown aspect, likely
       transparent — so .wc-end-art-plain drops the frame and CONTAINS it
       instead, which is what stops it being cropped into a square. */
    '.wc-end-art{flex:0 0 auto;text-align:center;}',
    '.wc-end-art-inner{--wc-art:clamp(84px,20vh,150px);width:var(--wc-art);height:var(--wc-art);',
    'margin:0 auto;border-radius:14px;overflow:hidden;border:3px solid var(--card-face-border);',
    'background:var(--bg-2);box-shadow:0 5px 15px var(--shadow-strong);',
    'animation:wc-art-in .45s cubic-bezier(.34,1.56,.64,1) .12s both;}',
    '.wc-end-art-plain{border:none;background:none;box-shadow:none;border-radius:0;overflow:visible;}',
    '.wc-end-art-img{width:100%;height:100%;object-fit:cover;display:block;',
    /* The defeated character, softened — the same treatment the shared modal
       gives a CPU that lost. Here the artwork only ever shows the WINNER, so
       this applies to the plain win illustration and is a no-op on it. */
    'filter:saturate(1.04);}',
    '.wc-end-art-plain .wc-end-art-img{object-fit:contain;}',
    '@keyframes wc-art-in{from{opacity:0;transform:scale(.72) rotate(-3deg);}',
    'to{opacity:1;transform:none;}}',
    '@media (prefers-reduced-motion: reduce){.wc-end-art-inner{animation:none;}}',
    '.wc-end-art-name{margin-top:6px;font-size:.86rem;font-weight:700;color:var(--ink);line-height:1.25;}',
    '.wc-end-art-en{display:block;font-size:.72rem;font-weight:500;color:var(--ink-soft);}',

    /* The round\'s vocabulary, full width under both columns. A grid rather
       than a list: at 10–14 entries a single column would push the buttons off
       every screen this game runs on. auto-fill means the column count follows
       the panel, so it is three across on a laptop and one or two on a phone
       with no breakpoint of its own. */
    '.wc-end-words{margin-top:10px;padding-top:9px;border-top:1px solid var(--card-face-border);}',
    '.wc-end-words-head{display:flex;align-items:baseline;justify-content:space-between;',
    'gap:8px;margin-bottom:6px;}',
    '.wc-end-words-title{font-size:.8rem;font-weight:700;color:var(--ink);}',
    '.wc-end-words-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:5px;}',
    '.wc-word{background:var(--bg-2);border-radius:8px;padding:4px 8px;text-align:left;min-width:0;}',
    '.wc-word-line{display:block;font-size:.82rem;color:var(--ink);line-height:1.3;',
    'overflow-wrap:anywhere;}',
    '.wc-word-rom{color:var(--ink-soft);font-size:.75rem;}',
    '.wc-word-en{display:block;font-size:.72rem;color:var(--ink-soft);line-height:1.3;',
    'overflow-wrap:anywhere;}',

    /* Two columns once there is width for them: standings left, artwork right,
       the same arrangement (and the same 560px threshold) as the shared modal
       in index.html, so the two end screens read as one family. */
    '@media (min-width:560px){',
      '.wc-end-grid{flex-direction:row;align-items:center;text-align:left;gap:16px;}',
      '.wc-end-main{flex:1 1 0;width:auto;}',
      '.wc-panel-end .wc-panel-title{text-align:left;}',
    '}',
    '@media (min-width:900px){',
      '.wc-panel-end{max-width:760px;}',
      '.wc-end-art-inner{--wc-art:clamp(120px,26vh,200px);}',
      '.wc-end-line{font-size:.96rem;}',
      '.wc-end-words-title{font-size:.9rem;}',
      '.wc-word-line{font-size:.9rem;}',
      '.wc-word-en{font-size:.78rem;}',
    '}',

    /* ---- transient messages ---- */
    '.wc-flash-layer{position:absolute;left:0;right:0;bottom:calc(var(--wc-hand-h,120px) + 54px);',
    'display:flex;flex-direction:column;align-items:center;gap:5px;pointer-events:none;z-index:15;}',
    '.wc-flash{background:var(--panel);color:var(--ink);border-radius:11px;padding:7px 14px;',
    'font-size:.83rem;line-height:1.4;box-shadow:0 3px 10px var(--shadow-strong);max-width:min(92%,460px);',
    'text-align:center;animation:wc-rise .22s ease-out;}',
    '.wc-flash-warn{border-left:4px solid var(--accent);}',
    '.wc-flash-bad{border-left:4px solid var(--error);}',
    '.wc-flash-out{opacity:0;transition:opacity .3s;}',
    /* .wc-flash-hold and .wc-flash-tap styled the toast the table used to wait
       on. That message is on the ticker now (see wcAnnounce) and the toast is
       gone, so the rules are deleted rather than left matching nothing. The
       tappable affordance lives on .wc-tick-tap. */
    '@keyframes wc-rise{from{opacity:0;transform:translateY(9px);}to{opacity:1;transform:none;}}',
    '@media (prefers-reduced-motion: reduce){.wc-flash{animation:none;}}',

    /* ---- cards in flight --------------------------------------------------
       A full-view coordinate space that NOTHING else renders into. It has to
       be its own layer: .wc-flash-layer is a bottom-anchored flex column, and
       every other container in this file is rebuilt through innerHTML on each
       render — a sprite parked in one would be destroyed mid-flight.

       z-index sits above the table and the toasts (.wc-seat-turn is 2,
       .wc-seat-fx is 6, .wc-flash-layer is 15) and BELOW .wc-overlay, which is
       20 — so a card can fly over the table but never over the colour picker,
       a challenge panel or the results screen. */
    '.wc-fly-layer{position:absolute;inset:0;pointer-events:none;z-index:18;overflow:hidden;}',
    /* transform-origin 0 0 makes the maths trivial: translate places the
       sprite's top-left corner and scale grows from that same corner, so a
       pose is fully described by (x, y, scale) with no compensation term. */
    '.wc-fly{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;}',
    '.wc-fly-inner{position:relative;width:var(--wc-cw,90px);height:var(--wc-chh,120px);',
    'transform-style:preserve-3d;}',
    /* Both faces stack at the same spot; backface-visibility is what hides
       whichever one is pointing away. Same technique as the memory card and
       the flashcard, sized from this mode's own card variables instead of
       theirs — .card is square and driven by --card-size, .flash-card is a
       fixed-height grid panel, so neither could be reused as it stands. */
    '.wc-fly-inner > .wc-c{position:absolute;left:0;top:0;',
    'backface-visibility:hidden;-webkit-backface-visibility:hidden;}',
    '.wc-fly-inner > .wc-fly-b{transform:rotateY(180deg);}',
    '.wc-fly-turn{transform:rotateY(180deg);}',
    /* The slot a card is flying INTO. It keeps its place in the fan — the
       layout must not reflow when the card lands — but shows nothing until it
       arrives. visibility, not display, for exactly that reason. */
    '.wc-fly-gap{visibility:hidden;}',
    /* ---- the deal --------------------------------------------------------
       The deck riffling in place. Two ghost backs ride over the pile and snap
       home, offset in time so it reads as a shuffle rather than a wobble. They
       are rendered only while the shuffle phase is up, and wcRenderCentre
       rebuilds through innerHTML — so `animation` starts correctly on a fresh
       node and there is nothing to clean up afterwards. */
    '.wc-shuf-g{position:absolute;left:0;top:0;pointer-events:none;',
    'animation:wc-shuf ' + WC_SHUFFLE_MS + 'ms cubic-bezier(.4,0,.3,1) both;}',
    '.wc-shuf-g2{animation-delay:' + Math.round(WC_SHUFFLE_MS * 0.18) + 'ms;}',
    '@keyframes wc-shuf{0%{transform:none;}',
    '28%{transform:translateX(62%) rotate(8deg);}',
    '55%{transform:translateX(-4%) rotate(-1deg);}',
    '78%{transform:translateX(-48%) rotate(-7deg);}',
    '100%{transform:none;}}',
    /* The discard before the starter card lands: a card-shaped absence, so the
       two piles stay the same size and the table does not resize under the
       deal. */
    '.wc-c-slot{background:none !important;border-style:dashed;',
    'border-color:var(--ink-soft);opacity:.35;}',
    '.wc-c-slot::before{display:none;}',
    '.wc-pile-empty{cursor:default;}',
    '.wc-pile-empty:hover{transform:none;}',
    /* Tap anywhere to land the deal at once. Covers the view so the target is
       the whole table rather than a button to find, and sits below .wc-overlay
       so it can never swallow a tap meant for a modal. */
    '.wc-dealskip{position:absolute;inset:0;z-index:19;cursor:pointer;',
    'background:none;border:none;padding:0;display:flex;align-items:flex-end;',
    'justify-content:center;}',
    '.wc-dealskip[hidden]{display:none;}',
    '.wc-dealskip-hint{margin-bottom:calc(var(--wc-hand-h,120px) + 12px);',
    'background:var(--panel);color:var(--ink-soft);border-radius:20px;',
    'padding:4px 13px;font-size:.72rem;font-weight:700;opacity:.9;',
    'box-shadow:0 2px 8px var(--shadow);animation:wc-rise .3s ease-out .6s both;}',

    /* Motion is the whole point of this layer, so reduced motion removes it
       rather than shortening it. wcAnimOn() also refuses to start a flight at
       all in that case; this is the belt to its braces, and covers a
       preference that changes while a card is already in the air. */
    '@media (prefers-reduced-motion: reduce){',
    '.wc-fly,.wc-fly-inner{transition:none !important;}',
    '.wc-shuf-g{animation:none;display:none;}',
    '.wc-fly-layer{display:none;}}',

    /* ---- topbar HUD ---- */
    '.wc-hud.hidden{display:none;}',
    '.wc-hud{display:inline-flex;align-items:center;gap:11px;white-space:nowrap;font-size:.8rem;}',
    '.wc-hud strong{color:var(--accent);font-variant-numeric:tabular-nums;}',
    '.wc-hud-colour{display:inline-flex;align-items:center;gap:4px;padding:1px 9px;border-radius:20px;',
    'color:#fff;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,.45);}',
    '.wc-hud-rom{font-weight:500;opacity:.92;}',
    '.wc-hud-dir{color:var(--accent);font-size:1rem;}',
    '#hud.hud-wc-mode > .stat,',
    '#hud.hud-wc-mode > .turn-indicator{display:none !important;}',

    /* ---- layout modes: the arrangement changes, not just the scale ---- */
    /* short screens (phone landscape): seats keep every part — avatar and
       mini-fan both scale from --wc-seat-h and fit here — and only give up
       padding. The gap stays generous: at 375px of height a seat is ~200px
       wide, so three of them plus two 16px gaps is 632px, inside even a
       667px-wide landscape phone. */
    /* Phone landscape. Compact SHRANK the seat's top padding to 4px, which is
       less than the marker chip's inner half — so the chip landed on the
       player's name, and only here. Three small moves rather than one large
       one, because any single fix big enough on its own is worse:

         - the chips ride higher (-72% instead of -50%), so only a third of
           each one is inside the box rather than half;
         - the seat reserves 11px above its content instead of 4, which grows
           the box DOWNWARD because the row is align-items:flex-start;
         - the row's own clearance goes 8px -> 12px to hold the taller overhang.

       Net cost about 9px of vertical space, spread across two elements, and
       nothing above 900px is touched — the desktop layout already had the room. */
    '.wc-compact .wc-seats{gap:16px;--wc-mark-y:-72%;padding-top:12px;}',
    '.wc-compact .wc-seat{padding:11px 7px 4px 4px;}',
    '.wc-compact .wc-ticker{font-size:.72rem;min-height:1em;}',
    /* The move log is centred on .wc-centre-wrap, which is fine with a desktop
       amount of height and not fine in phone landscape: the log is taller than
       that band, so it overhangs both ways and its bottom edge lands on your
       hand.

       Anchoring it to the top of the band and lifting it by exactly the seats'
       row height puts it level with the top of the table. Nothing is given up:
       .wc-seats is centre-justified, so with two or three opponents the far
       left of that row is empty — precisely where this now sits. --wc-seat-h is
       the same variable the row is sized from, so the two cannot drift apart. */
    '.wc-compact .wc-log{top:0;transform:translateY(calc(-1 * var(--wc-seat-h,72px)));}',
    /* very short: the colour name drops to the HUD only, and the hand scrolls */
    '.wc-tiny .wc-seat-name{max-width:118px;font-size:.72rem;}',
    // The state line now carries live table information — direction, the colour
    // just chosen, whose turn — not a static hint, so it stays visible at every
    // size and gives up font instead.
    '.wc-tiny .wc-ticker{font-size:.66rem;min-height:1em;}',
    '.wc-tiny .wc-log{width:min(32%,190px);}',
    '.wc-tiny .wc-log-line{font-size:.62rem;}',
    '.wc-tiny .wc-stage{padding:3px 6px 5px;}',
    /* narrow: keep the hand scrollable rather than shrinking cards further */
    '.wc-narrow .wc-centre{gap:10px;}',

    /* ---- portrait rotate prompt (landscape-only mode) ---- */
    '.wc-rotate{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;align-items:center;',
    'justify-content:center;gap:14px;padding:28px;text-align:center;background:var(--bg);color:var(--ink);}',
    '.wc-rotate-icon{font-size:2.6rem;animation:wc-rotate-spin 2.4s ease-in-out infinite;}',
    '@keyframes wc-rotate-spin{0%,60%,100%{transform:rotate(0);}30%{transform:rotate(90deg);}}',
    '@media (prefers-reduced-motion: reduce){.wc-rotate-icon{animation:none;}}',
    '.wc-rotate-th{font-size:1.05rem;}',
    '.wc-rotate-rom{font-size:.85rem;color:var(--rom);}',
    '.wc-rotate-en{font-size:.9rem;color:var(--ink-soft);max-width:22rem;line-height:1.5;}',
    /* Shown only while the game view is open AND the viewport is portrait. */
    'body.wc-in-game .wc-rotate{display:none;}',
    '@media (orientation: portrait){body.wc-in-game .wc-rotate{display:flex;}}'
  ].join('');

  /* The How to play guide's pictures (§6b). A separate stylesheet, injected
     beside WC_CSS as <style id="wc-guide-styles">, so WC_CSS itself is
     untouched. Every rule is prefixed .wcg- and only matches inside the guide. */
  var WC_GUIDE_CSS = [
    /* ---- sizes ----
    --wcg-u is each picture's unit: the guide's own --bgd-fs, with a floor on the
    slides whose cards carry words, so a word card is never drawn smaller than
    the game can letter it (its text has a 9px floor). Cards are sized from the
    unit in px terms, never in em: the card's own rules resolve em against
    several different font sizes. */
    '.bguide-stage.wcg-s1,.bguide-stage.wcg-s3,.bguide-stage.wcg-s4,.bguide-stage.wcg-s5{--wcg-u:max(11.7px,var(--bgd-fs,13px));font-size:var(--wcg-u);}',
    '.bguide-stage.wcg-s2{--wcg-u:var(--bgd-fs,13px);}',
    '.wcg-c{--wc-chh:calc(var(--wcg-u,13px) * 5);--wc-cw:calc(var(--wcg-u,13px) * 3.75);}',
    '.wcg-s1 .wcg-c{--wc-chh:calc(var(--wcg-u,13px) * 5.6);--wc-cw:calc(var(--wcg-u,13px) * 4.2);}',
    '.wcg-s2 .wcg-c{--wc-chh:calc(var(--wcg-u,13px) * 3.7);--wc-cw:calc(var(--wcg-u,13px) * 2.775);}',
    /* The legend's cards are pictures of cards: their lettering scales with them
    (no 9px floor), so a small card still looks exactly like a small card. */
    '.wcg-s2 .wc-c-action{font-size:calc(var(--wc-chh,120px) * .115);}',
    '.wcg-th{font-weight:600;}',
    '.wcg-c .wc-c-main{overflow-wrap:normal;}',

    /* ---- shared pieces ---- */
    '.wcg-mark{position:absolute;top:-.5em;right:-.5em;width:1.75em;height:1.75em;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.35);z-index:3;}',
    '.wcg-mark.is-ok{background:var(--success);}',
    '.wcg-mark.is-no{background:var(--error);}',
    '.wcg-mark svg{width:62%;height:62%;fill:none;stroke:#fff;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;}',
    '.wcg-tag{display:block;font-size:.95em;font-weight:700;color:var(--ink-soft);text-align:center;margin-bottom:.4em;white-space:nowrap;}',
    '.wcg-pointer{position:absolute;font-size:1.8em;line-height:1;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));opacity:0;z-index:5;}',
    '.wcg-bit{position:absolute;left:-.3em;top:-.3em;width:.6em;height:.6em;border-radius:.15em;background:var(--c,#e8b71f);opacity:0;}',
    '.wcg-pill-t{font-size:1.05em;}',
    '.wcg-pill{position:absolute;display:inline-flex;align-items:center;gap:.3em;width:max-content;padding:.3em .8em;border-radius:999px;background:var(--panel);border:2px solid var(--success);color:var(--ink);font-weight:800;white-space:nowrap;box-shadow:0 .2em .7em var(--shadow-strong);z-index:4;}',

    /* ---- slide 1: what fits ---- */
    '.wcg-deal{display:flex;flex-direction:column;align-items:center;gap:.8em;}',
    '.wcg-top,.wcg-hand{display:flex;flex-direction:column;align-items:center;}',
    '.wcg-row{display:flex;gap:1em;align-items:flex-start;justify-content:center;}',
    '.wcg-slot{display:flex;flex-direction:column;align-items:center;gap:.4em;}',
    '.wcg-cardwrap{position:relative;display:block;}',
    '.wcg-why{font-size:.95em;font-weight:700;white-space:nowrap;color:var(--success);}',
    '.wcg-slot.is-no .wcg-why{color:var(--error);}',
    '.wcg-slot .wc-c{box-shadow:0 0 0 .22em var(--success-glow),0 2px 5px var(--shadow-strong);}',
    '.wcg-slot.is-no .wc-c{opacity:.5;box-shadow:0 2px 5px var(--shadow-strong);}',
    '.wcg-wide{display:none;}',
    '@media (min-width:520px){.wcg-wide{display:flex;}}',
    '.wcg-s1 .wcg-mark{animation:wcgPop .4s cubic-bezier(.34,1.56,.64,1) both;animation-delay:calc(.45s + var(--i,0) * .5s);}',
    '.wcg-s1 .wcg-why{animation:wcgFadeUp .35s ease-out both;animation-delay:calc(.5s + var(--i,0) * .5s);}',
    '.wcg-s1 .wcg-slot .wc-c{animation:wcgRingOk .4s ease-out both;animation-delay:calc(.45s + var(--i,0) * .5s);}',
    '.wcg-s1 .wcg-slot.is-no .wc-c{animation-name:wcgDim;}',
    '@keyframes wcgPop{0%{opacity:0;transform:scale(.3);}100%{opacity:1;transform:scale(1);}}',
    '@keyframes wcgFadeUp{0%{opacity:0;transform:translateY(.4em);}100%{opacity:1;transform:translateY(0);}}',
    '@keyframes wcgRingOk{0%{box-shadow:0 0 0 0 transparent,0 2px 5px var(--shadow-strong);}100%{box-shadow:0 0 0 .22em var(--success-glow),0 2px 5px var(--shadow-strong);}}',
    '@keyframes wcgDim{0%{opacity:1;}100%{opacity:.5;}}',

    /* ---- slide 2: the action cards ---- */
    '.wcg-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.45em;width:25em;max-width:100%;}',
    '.wcg-leg{display:flex;align-items:center;gap:.9em;text-align:left;}',
    '.wcg-leg-card{flex:0 0 auto;display:block;}',
    '.wcg-leg-txt{display:flex;flex-direction:column;gap:.1em;min-width:0;font-size:max(.82rem,1.05em);line-height:1.3;color:var(--ink);}',
    '.wcg-leg-txt strong{color:var(--accent);}',
    '.wcg-s2 .wcg-leg{animation:wcgFadeUp .35s ease-out both;animation-delay:calc(.15s + var(--i,0) * .12s);}',

    /* ---- slides 3-5: a small card table ---- */
    '.wcg-tbl{position:relative;width:22em;height:15.2em;background:var(--bg);border:1px solid var(--shadow);border-radius:1.1em;box-shadow:0 .35em 1.1em var(--shadow);overflow:hidden;}',
    '.wcg-at{position:absolute;display:block;}',
    '.wcg-deck{left:4.3em;top:3.6em;}',
    '.wcg-deck2{left:4.5em;top:3.4em;}',
    '.wcg-pile{left:9.125em;top:3.6em;}',
    '.wcg-h0{left:4.875em;top:9.7em;}',
    '.wcg-h1{left:9.125em;top:9.7em;}',
    '.wcg-h2{left:13.375em;top:9.7em;}',
    '.wcg-seats{position:absolute;left:0;right:0;top:.6em;display:flex;justify-content:center;gap:.8em;}',
    '.wcg-seat{position:relative;display:inline-flex;align-items:center;gap:.35em;padding:.28em .7em .28em .35em;background:var(--panel);border:1px solid var(--shadow);border-radius:999px;font-size:.92em;font-weight:700;color:var(--ink);white-space:nowrap;box-shadow:0 1px 3px var(--shadow);}',
    '.wcg-seat-av{font-size:1.1em;line-height:1;}',
    '.wcg-seat-n{display:inline-flex;align-items:center;gap:.25em;color:var(--ink-soft);}',
    '.wcg-seat-n::before{content:"";display:block;width:.62em;height:.85em;border-radius:.12em;background:var(--card-face-border);border:1px solid var(--shadow);}',
    '.wcg-badge{position:absolute;left:0;right:0;top:100%;margin:.35em auto 0;width:max-content;display:flex;align-items:center;gap:.25em;padding:.16em .55em;border-radius:999px;font-size:.92em;font-weight:800;line-height:1.25;white-space:nowrap;box-shadow:0 1px 3px var(--shadow-strong);z-index:2;}',
    '.wcg-badge .wc-svg{width:1em;height:1em;display:block;}',
    '.wcg-badge.is-skip{background:var(--error);color:#fff;}',
    '.wcg-badge.is-draw,.wcg-badge.is-rank{background:var(--accent);color:var(--panel);}',
    '.wcg-fly{position:absolute;display:grid;z-index:3;}',
    '.wcg-fly > *{grid-area:1 / 1;}',
    '.wcg-burst{position:absolute;left:11em;top:6.1em;width:0;height:0;z-index:4;}',
    '.wcg-turn{position:absolute;left:0;right:0;top:.8em;display:grid;justify-items:center;font-weight:700;color:var(--accent);}',
    '.wcg-turn > span{grid-area:1 / 1;white-space:nowrap;}',
    '.wcg-turn > span::before{content:"";display:inline-block;width:.5em;height:.5em;border-radius:50%;background:var(--accent);margin-right:.4em;vertical-align:.1em;}',
    '.wcg-acts{position:absolute;left:13.9em;top:3.9em;width:7.4em;height:4.8em;}',
    '.wcg-acts .wc-act-btn{position:absolute;left:0;right:0;justify-content:center;font-size:.95em;padding:.42em .5em;border-radius:.65em;cursor:default;pointer-events:none;white-space:nowrap;}',
    '.wcg-act-draw{top:1.5em;}',
    '.wcg-act-play{top:0;}',
    '.wcg-act-keep{top:2.85em;}',
    '.wcg-lasttag > span{font-size:.85em;}',
    '.wcg-lasttag{position:absolute;left:0;right:0;top:8.2em;margin:0 auto;width:max-content;padding:.14em .6em;border-radius:999px;background:var(--error);color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:.03em;opacity:0;z-index:4;}',

    /* slide 3: a matched pair (loop 6.4s). Base styles = the key moment. */
    '.wcg-s3{--wcg-dur:6.4s;}',
    '.wcg-s3 .wcg-fly{left:9.125em;top:3.6em;transform:rotate(8deg);animation:wcgS3Fly var(--wcg-dur) ease-in-out infinite;}',
    '.wcg-s3 .wcg-pairlbl{left:0;right:0;margin:0 auto;top:7.75em;animation:wcgS3Pill var(--wcg-dur) ease-out infinite;}',
    '.wcg-s3 .wcg-bit{animation:wcgBits var(--wcg-dur) ease-out infinite;}',
    '.wcg-s3 .wcg-badge{animation:wcgS3Badge var(--wcg-dur) ease-out infinite;}',
    '@keyframes wcgS3Fly{',
    '0%{opacity:0;transform:translate(-4.25em,6.1em) rotate(0deg) scale(1);}',
    '4%{opacity:1;transform:translate(-4.25em,6.1em) rotate(0deg) scale(1);}',
    '12%,16%{opacity:1;transform:translate(-4.25em,5.4em) rotate(0deg) scale(1);}',
    '34%{opacity:1;transform:translate(0,0) rotate(8deg) scale(1);}',
    '37%{opacity:1;transform:translate(0,0) rotate(8deg) scale(1.08);}',
    '41%,91%{opacity:1;transform:translate(0,0) rotate(8deg) scale(1);}',
    '94%{opacity:0;transform:translate(0,0) rotate(8deg) scale(1);}',
    '97%,100%{opacity:0;transform:translate(-4.25em,6.1em) rotate(0deg) scale(1);}',
    '}',
    '@keyframes wcgS3Pill{',
    '0%,35%{opacity:0;transform:scale(.6);}',
    '39%{opacity:1;transform:scale(1.1);}',
    '43%,90%{opacity:1;transform:scale(1);}',
    '94%,100%{opacity:0;transform:scale(1);}',
    '}',
    '@keyframes wcgS3Badge{',
    '0%,44%{opacity:0;transform:scale(.5);}',
    '48%{opacity:1;transform:scale(1.15);}',
    '52%,90%{opacity:1;transform:scale(1);}',
    '94%,100%{opacity:0;transform:scale(1);}',
    '}',
    '@keyframes wcgBits{',
    '0%,35%{opacity:0;transform:translate(0,0) scale(1);}',
    '37%{opacity:1;transform:translate(0,0) scale(1);}',
    '56%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.6);}',
    '100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.6);}',
    '}',

    /* slide 4: drawing a card (loop 7.2s) */
    '.wcg-s4{--wcg-dur:7.2s;}',
    '.wcg-s4 .wcg-fly{left:13.375em;top:9.7em;animation:wcgS4Fly var(--wcg-dur) ease-in-out infinite;}',
    '.wcg-s4 .wcg-fly-back{opacity:0;animation:wcgS4Back var(--wcg-dur) linear infinite;}',
    '.wcg-s4 .wcg-fly-face{animation:wcgS4Face var(--wcg-dur) linear infinite;}',
    '.wcg-s4 .wcg-fly .wcg-mark{animation:wcgS4Ok var(--wcg-dur) ease-out infinite;}',
    '.wcg-s4 .wcg-fly-face .wc-c{box-shadow:0 0 0 .22em var(--success-glow),0 2px 5px var(--shadow-strong);}',
    '.wcg-s4 .wcg-nomark{opacity:0;animation:wcgS4No var(--wcg-dur) ease-out infinite;}',
    '.wcg-s4 .wcg-act-draw{opacity:0;animation:wcgS4Draw var(--wcg-dur) ease-in-out infinite;}',
    '.wcg-s4 .wcg-act-play,.wcg-s4 .wcg-act-keep{animation:wcgS4Choice var(--wcg-dur) ease-out infinite;}',
    /* left/top are in the pointer's own (1.8x) em: this lands the fingertip on Draw */
    '.wcg-s4 .wcg-pointer{left:1.65em;top:1.2em;animation:wcgS4Ptr var(--wcg-dur) ease-in-out infinite;}',
    '.wcg-s4 .wcg-turn .wcg-c1,.wcg-s4 .wcg-turn .wcg-c2{opacity:0;}',
    '.wcg-s4 .wcg-turn .wcg-c1{animation:wcgS4C1 var(--wcg-dur) linear infinite;}',
    '.wcg-s4 .wcg-turn .wcg-c2{animation:wcgS4C2 var(--wcg-dur) linear infinite;}',
    '.wcg-s4 .wcg-turn .wcg-c3{animation:wcgS4C3 var(--wcg-dur) linear infinite;}',
    '@keyframes wcgS4Fly{',
    '0%{opacity:0;transform:translate(-9.075em,-6.1em) scaleX(1);}',
    '3%,32%{opacity:1;transform:translate(-9.075em,-6.1em) scaleX(1);}',
    '40%{opacity:1;transform:translate(-4.5em,-3.05em) scaleX(1);}',
    '43%{opacity:1;transform:translate(-2.8em,-1.9em) scaleX(.08);}',
    '48%{opacity:1;transform:translate(0,0) scaleX(1);}',
    '92%{opacity:1;transform:translate(0,0) scaleX(1);}',
    '95%{opacity:0;transform:translate(0,0) scaleX(1);}',
    '97%,100%{opacity:0;transform:translate(-9.075em,-6.1em) scaleX(1);}',
    '}',
    '@keyframes wcgS4Back{0%,42.9%{opacity:1;}43%,100%{opacity:0;}}',
    '@keyframes wcgS4Face{0%,42.9%{opacity:0;}43%,100%{opacity:1;}}',
    '@keyframes wcgS4Ok{',
    '0%,51%{opacity:0;transform:scale(.3);}',
    '55%{opacity:1;transform:scale(1.1);}',
    '58%,91%{opacity:1;transform:scale(1);}',
    '94%,100%{opacity:0;transform:scale(1);}',
    '}',
    '@keyframes wcgS4No{',
    '0%,3%{opacity:0;transform:scale(.3);}',
    '7%{opacity:1;transform:scale(1.1);}',
    '10%,23%{opacity:1;transform:scale(1);}',
    '27%,100%{opacity:0;transform:scale(1);}',
    '}',
    '@keyframes wcgS4Draw{',
    '0%,29%{opacity:1;transform:scale(1);}',
    '30.5%{opacity:1;transform:scale(.92);}',
    '32%,50%{opacity:1;transform:scale(1);}',
    '53%,95%{opacity:0;transform:scale(1);}',
    '98%,100%{opacity:1;transform:scale(1);}',
    '}',
    '@keyframes wcgS4Choice{',
    '0%,53%{opacity:0;transform:translateY(.4em);}',
    '57%,91%{opacity:1;transform:translateY(0);}',
    '94%,100%{opacity:0;transform:translateY(0);}',
    '}',
    '@keyframes wcgS4Ptr{',
    '0%,16%{opacity:0;transform:translate(1.6em,2.4em) scale(1);}',
    '20%{opacity:1;transform:translate(1.6em,2.4em) scale(1);}',
    '28%{opacity:1;transform:translate(0,0) scale(1);}',
    '30%{opacity:1;transform:translate(0,0) scale(.8);}',
    '32%{opacity:1;transform:translate(0,0) scale(1);}',
    '37%{opacity:1;transform:translate(0,0) scale(1);}',
    '42%,100%{opacity:0;transform:translate(.3em,.8em) scale(1);}',
    '}',
    '@keyframes wcgS4C1{0%,26%{opacity:1;}27%,97%{opacity:0;}98%,100%{opacity:1;}}',
    '@keyframes wcgS4C2{0%,26%{opacity:0;}27%,52%{opacity:1;}53%,100%{opacity:0;}}',
    '@keyframes wcgS4C3{0%,52%{opacity:0;}53%,97%{opacity:1;}98%,100%{opacity:0;}}',

    /* slide 5: the last card (loop 6.4s) */
    '.wcg-s5{--wcg-dur:6.4s;}',
    '.wcg-s5 .wcg-fly{left:9.125em;top:3.6em;transform:rotate(-6deg);animation:wcgS5Fly var(--wcg-dur) ease-in-out infinite;}',
    '.wcg-s5 .wcg-lasttag{animation:wcgS5Last var(--wcg-dur) ease-out infinite;}',
    '.wcg-s5 .wcg-winlbl .wcg-pill-t{font-size:1.25em;}',
    '.wcg-s5 .wcg-winlbl{left:0;right:0;top:4.7em;margin:0 auto;border-color:var(--accent);animation:wcgS5Win var(--wcg-dur) ease-out infinite;}',
    '.wcg-s5 .wcg-bit{animation:wcgBits var(--wcg-dur) ease-out infinite;}',
    '.wcg-s5 .wcg-badge{animation:wcgS3Badge var(--wcg-dur) ease-out infinite;}',
    '@keyframes wcgS5Fly{',
    '0%{opacity:0;transform:translate(0,6.1em) rotate(0deg);}',
    '4%{opacity:1;transform:translate(0,6.1em) rotate(0deg);}',
    '14%,18%{opacity:1;transform:translate(0,5.4em) rotate(0deg);}',
    '34%,92%{opacity:1;transform:translate(0,0) rotate(-6deg);}',
    '94%{opacity:0;transform:translate(0,0) rotate(-6deg);}',
    '97%,100%{opacity:0;transform:translate(0,6.1em) rotate(0deg);}',
    '}',
    '@keyframes wcgS5Last{',
    '0%,3%{opacity:0;transform:scale(.6);}',
    '6%,16%{opacity:1;transform:scale(1);}',
    '20%,100%{opacity:0;transform:scale(1);}',
    '}',
    '@keyframes wcgS5Win{',
    '0%,35%{opacity:0;transform:scale(.5);}',
    '40%{opacity:1;transform:scale(1.12);}',
    '44%,90%{opacity:1;transform:scale(1);}',
    '94%,100%{opacity:0;transform:scale(1);}',
    '}',

    /* ---- landscape: the card row sits beside the top card, the legend runs across ---- */
    '@media (orientation:landscape) and (min-width:640px),(orientation:landscape) and (min-width:520px) and (max-height:520px){',
    '.wcg-deal{flex-direction:row;align-items:flex-end;gap:1.4em;}',
    '.wcg-top{padding-right:1.4em;border-right:2px dashed var(--shadow);}',
    '.wcg-legend{flex-direction:row;align-items:flex-start;justify-content:center;width:100%;max-width:62rem;gap:.8em;}',
    '.wcg-leg{flex:1 1 0;min-width:0;max-width:11rem;flex-direction:column;align-items:center;text-align:center;gap:.45em;}',
    '.wcg-s2 .wcg-c{--wc-chh:calc(var(--wcg-u,13px) * 4.3);--wc-cw:calc(var(--wcg-u,13px) * 3.225);}',
    '.wcg-leg-txt{align-items:center;}',
    '}',

    /* ---- short and small upright phones ---- */
    '@media (orientation:portrait) and (max-height:700px){',
    '.bguide-stage.wcg-s1{--wcg-u:max(10.6px,var(--bgd-fs,13px));}',
    '.wcg-deal{gap:.6em;}',
    '}',
    '@media (orientation:portrait) and (max-width:340px){',
    '.bguide-stage.wcg-s1{--wcg-u:10px;}',
    '.wcg-row{gap:.7em;}',
    '.wcg-leg-txt{font-size:.78rem;line-height:1.25;}',
    '}',

    /* ---- very short landscape screens (phones sideways, browser bar showing) ---- */
    '@media (orientation:landscape) and (max-height:340px){',
    '.bguide-stage.wcg-s1{--wcg-u:max(10px,var(--bgd-fs,13px));}',
    '.bguide-stage.wcg-s3,.bguide-stage.wcg-s4,.bguide-stage.wcg-s5{--wcg-u:max(10.2px,var(--bgd-fs,13px));}',
    '.wcg-leg-txt{font-size:max(.74rem,1.05em);line-height:1.25;}',
    '}',

    /* ---- roomy landscape screens (laptops, desktops): everything a size up ---- */
    '@media (orientation:landscape) and (min-width:900px) and (min-height:600px){',
    '.bguide-stage.wcg-s1{--wcg-u:clamp(14px,2.5vh,19px);}',
    '.bguide-stage.wcg-s2{--wcg-u:clamp(14px,2.2vh,17px);}',
    '.wcg-s2 .wcg-c{--wc-chh:calc(var(--wcg-u,13px) * 5.3);--wc-cw:calc(var(--wcg-u,13px) * 3.975);}',
    '.bguide-stage.wcg-s3,.bguide-stage.wcg-s4,.bguide-stage.wcg-s5{--wcg-u:clamp(15px,2.45vh,19px);}',
    '}',

    /* ---- reduced motion: index.html stops every animation in the guide; these
    make sure what is left is the moment each picture is about ---- */
    '@media (prefers-reduced-motion:reduce){',
    '.wcg-s4 .wcg-act-draw{opacity:0;}',
    '.wcg-s4 .wcg-turn .wcg-c3{opacity:1;}',
    '}'
  ].join('');

  // Percentage of the seat-arrival animation a given millisecond mark sits at.
  function wcPct(ms) {
    var total = WC_TURN_HOLD_MS + WC_TURN_IN_MS;
    return (Math.round((ms / total) * 1000) / 10) + '%';
  }

  function wcInjectStyles() {
    if (document.getElementById('wc-styles')) return;
    var el = document.createElement('style');
    el.id = 'wc-styles';
    el.textContent = WC_CSS;
    document.head.appendChild(el);
  }

  /* Build one <audio> element per entry in WC_SOUNDS and apply its volume.
     Called once at load, beside wcInjectStyles() and for the same reason: this
     mode brings its own assets rather than asking index.html to declare them.

     Idempotent by id, so a double load can never stack duplicate elements —
     and re-running it is the way to re-apply volumes after editing the table,
     which is what makes those numbers tweakable without a reload during
     development.

     The files are fetched lazily by the browser; a missing one simply never
     plays, because playSound() swallows the rejected play() promise. That
     means this can ship before the mp3s exist without breaking anything. */
  function wcRegisterSounds() {
    if (typeof document === 'undefined' || !document.body) return;
    Object.keys(WC_SOUNDS).forEach(function (id) {
      var cfg = WC_SOUNDS[id];
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('audio');
        el.id = id;
        el.preload = 'auto';
        el.src = cfg.file;
        document.body.appendChild(el);
      }
      try { el.volume = cfg.volume; } catch (e) { /* volume is a nicety */ }
    });
  }

  /* =======================================================================
     3 · POOL HELPERS
     ======================================================================= */

  // Does this entry actually fit on a card at the shared font size?
  function wcFits(w) {
    if (!w || !w.en || !w.th || !w.rom) return false;
    var F = WC_GEO.font, R = WC_GEO.romEm, L = WC_GEO.line;

    // English face — one block on its own.
    var enLines = wcLinesFor(wcTextEm(w.en), F);
    if (enLines > WC_MAX_LINES) return false;
    if (enLines * L * F > WC_USABLE_H) return false;
    if (wcLongestTokenEm(w.en) * F > WC_USABLE_W) return false;

    // Thai face, measured in the tallest case (Thai + romanization together)
    // so the deck is the same whatever Display is set to.
    var thLines  = wcLinesFor(wcTextEm(w.th), F);
    var romLines = wcLinesFor(wcTextEm(w.rom), F * R);
    if (thLines > WC_MAX_LINES || romLines > WC_MAX_LINES) return false;
    if (thLines * L * F + romLines * L * F * R > WC_USABLE_H) return false;
    if (wcLongestTokenEm(w.th) * F > WC_USABLE_W) return false;
    if (wcLongestTokenEm(w.rom) * F * R > WC_USABLE_W) return false;

    return true;
  }

  // Every card-friendly word in the player's current pool selection. Goes
  // through poolForMode(), so lesson unlocks, the slim edition filter, custom
  // words and the ⭐ set are all honoured with no extra work here.
  function wcEligiblePool() {
    var pool;
    try { pool = poolForMode('wordcards') || []; }
    catch (e) { pool = []; }
    return pool.filter(wcFits);
  }

  /* =======================================================================
     4 · RULES CORE
     -----------------------------------------------------------------------
     Pure game logic. No DOM, no timers, no rendering. Everything here takes a
     game-state object `gs` and returns a result or mutates `gs` predictably,
     so the rules can be reasoned about and tested on their own.

     CARD
       { id, kind, colour, wordIdx, face }
       kind    'word' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'
       colour  one of WC_COLOURS ids, or null for the two wild kinds
       wordIdx index into gs.words          (kind 'word' only)
       face    'th' | 'en' — which language this copy shows (kind 'word' only)

     GAME STATE
       words      the round's vocabulary entries
       drawPile   face-down; the TOP is the LAST element
       discard    face-up;   the TOP is the LAST element
       players    [{ name, isHuman, charId, hand: [] }]
       turn       index into players
       dir        +1 clockwise, -1 after a Reverse
       colour     the colour currently in force (a wild sets this)
       pending    cards the next player must draw (Draw Two / Draw Four)
       pendingKind 'draw2' | 'draw4' | null — what built the pending pile
       phase      'play' | 'colour' | 'challenge' | 'over'
       ======================================================================= */

  function wcMakeCard(id, kind, colour, wordIdx, face) {
    return { id: 'c' + id, kind: kind, colour: colour || null,
             wordIdx: (typeof wordIdx === 'number') ? wordIdx : null,
             face: face || null };
  }

  // 8×W word cards + 24 action cards + 8 wilds.
  // Each word gets 2 copies per colour: one showing Thai, one showing English.
  // Those two are the SAME rank — playing one on the other is the whole point.
  function wcBuildDeck(words) {
    var deck = [], n = 0, i;
    words.forEach(function (w, wi) {
      WC_COLOURS.forEach(function (c) {
        deck.push(wcMakeCard(n++, 'word', c.id, wi, 'th'));
        deck.push(wcMakeCard(n++, 'word', c.id, wi, 'en'));
      });
    });
    WC_COLOURS.forEach(function (c) {
      for (i = 0; i < 2; i++) {
        deck.push(wcMakeCard(n++, 'skip',    c.id));
        deck.push(wcMakeCard(n++, 'reverse', c.id));
        deck.push(wcMakeCard(n++, 'draw2',   c.id));
      }
    });
    for (i = 0; i < 4; i++) {
      deck.push(wcMakeCard(n++, 'wild'));
      deck.push(wcMakeCard(n++, 'wild4'));
    }
    return deck;
  }

  function wcTop(gs) { return gs.discard[gs.discard.length - 1]; }

  // Can this card legally follow the top card, ignoring any pending draw stack?
  // Colour, or word (regardless of which language each side shows), or symbol,
  // or it's a wild.
  function wcIsPlayable(card, top, colour) {
    if (!card || !top) return false;
    if (card.kind === 'wild' || card.kind === 'wild4') return true;
    if (card.colour === colour) return true;
    if (card.kind === 'word') {
      return top.kind === 'word' && top.wordIdx === card.wordIdx;
    }
    return top.kind === card.kind;   // skip on skip, reverse on reverse, +2 on +2
  }

  /* A cross-language match: the same word, the other language. Both cards are
     the same RANK (see wcBuildDeck) so this was always a legal play — what is
     new is that it does something. Pure, and used by §5 to score it and §7 to
     sound and animate it, so there is exactly one definition of what counts. */
  function wcIsMatch(card, top) {
    return !!card && !!top && card.kind === 'word' && top.kind === 'word' &&
           card.wordIdx === top.wordIdx && card.face !== top.face;
  }

  // Does this hand hold a card of the given colour? Used for Wild Draw Four
  // legality — the official test is colour only, not word or symbol.
  function wcHandHasColour(hand, colour, exceptId) {
    return hand.some(function (c) {
      return c.id !== exceptId && c.colour === colour;
    });
  }

  // Everything this player may legally play right now.
  function wcLegalMoves(gs, pi) {
    var hand = gs.players[pi].hand;
    if (gs.pending > 0) {
      // Facing a draw stack. With stacking on, a Draw Two can be passed along —
      // but only onto a Draw Two stack. Draw Four never stacks.
      if (gs.stacking === 'on' && gs.pendingKind === 'draw2') {
        return hand.filter(function (c) { return c.kind === 'draw2'; });
      }
      return [];
    }
    var top = wcTop(gs);
    return hand.filter(function (c) { return wcIsPlayable(c, top, gs.colour); });
  }

  // Official rule: when the draw pile runs out, shuffle the discard pile back
  // in — but leave its top card in place to keep playing on.
  function wcReplenish(gs) {
    if (gs.drawPile.length > 0 || gs.discard.length <= 1) return false;
    var top = gs.discard.pop();
    gs.drawPile = shuffle(gs.discard);
    gs.discard = [top];
    wcLog(gs, 'Draw pile empty \u2014 discards reshuffled.');
    return true;
  }

  // Draw n cards to a player. Returns what was actually drawn (fewer if the
  // deck is genuinely exhausted, which can happen at very low word counts).
  function wcDraw(gs, pi, n) {
    var got = [];
    for (var i = 0; i < n; i++) {
      if (gs.drawPile.length === 0 && !wcReplenish(gs)) break;
      var card = gs.drawPile.pop();
      gs.players[pi].hand.push(card);
      got.push(card);
    }
    return got;
  }

  function wcNextIndex(gs, from, steps) {
    var n = gs.players.length;
    return (((from + gs.dir * (steps || 1)) % n) + n) % n;
  }

  function wcAdvance(gs, steps) {
    gs.turn = wcNextIndex(gs, gs.turn, steps || 1);
  }

  function wcLog(gs, text) {
    gs.log.push(text);
    if (gs.log.length > 60) gs.log.shift();
  }

  /* --- The public event log ----------------------------------------------
     `gs.log` is prose for a human reader. This is the same history in a form
     the AI can reason over, and it records ONLY what every player at the table
     can see: who played what, who chose which colour, and who drew while which
     colour was in force. Hidden hands never enter it.

     It exists because the table itself doesn't remember enough. `gs.discard`
     holds the cards played but not WHO played them, and the strongest honest
     signal for judging a Wild Draw Four is exactly that: someone who played red
     two turns ago and then dumps a Draw Four on red probably still holds red;
     someone who DREW while red was in force probably doesn't. Neither fact is
     recoverable from the state as it stood.

     Purely additive. Nothing here is read by the rules — it changes no
     behaviour, only observability. Recorded at the semantic call sites rather
     than inside wcDraw(), so the opening deal isn't mistaken for seven players
     failing to find a colour. Capped like gs.log; the AI only looks back a few
     turns anyway.

     EVENT SHAPES
       { t:'play',      pi, kind, colour, wordIdx, face, inForce }
       { t:'colour',    pi, colour }                     wild resolved
       { t:'draw',      pi, n, inForce, why }            why: turn|pending|penalty
       { t:'challenge', pi, against, challenged, bluffed }
     `inForce` is the colour in force BEFORE the event, which is the one the
     player was unable (or unwilling) to follow. */
  function wcEvent(gs, ev) {
    if (!gs.events) gs.events = [];
    gs.events.push(ev);
    if (gs.events.length > 200) gs.events.shift();
  }

  /* --- Starting a round ------------------------------------------------- */

  function wcCreateGame(opts) {
    var gs = {
      words: opts.words,
      drawPile: [],
      discard: [],
      players: opts.players,
      turn: 0,
      dir: 1,
      colour: null,
      pending: 0,
      pendingKind: null,
      phase: 'play',
      stacking: opts.stacking,
      assist: opts.assist,
      /* Which matched-pair rule this round plays under. Captured here for the
         same reason stacking and assist are: a round must not change rules
         underneath itself, and §4 must not have to read a setting. Callers
         that supply nothing get whatever is configured right now, which keeps
         every game built by the older suites working unchanged. */
      matchEffect: wcMatchEffectValid(opts.matchEffect) ? opts.matchEffect : wcMatchEffect(),
      // Set when a Wild Draw Four is played: who played it, and whether they
      // were bluffing (held a card of the colour in force at that moment).
      challenge: null,
      // The card a player just drew, when they may still play that one card.
      drawnPlayable: null,
      finished: false,
      placements: [],
      log: [],
      // Public, machine-readable history. See wcEvent() — additive only.
      events: []
    };

    gs.drawPile = shuffle(wcBuildDeck(opts.words));

    // Deal 7 each.
    gs.players.forEach(function (p) { p.hand = []; });
    for (var r = 0; r < 7; r++) {
      for (var pi = 0; pi < gs.players.length; pi++) wcDraw(gs, pi, 1);
    }

    // Opening card. Official rules apply an action card's effect to the first
    // player, with special cases for the two wilds; we simply reshuffle until a
    // word card turns up. One line, no edge cases, invisible to the player.
    var guard = 0;
    while (guard++ < 500) {
      var card = gs.drawPile.pop();
      if (card.kind === 'word') { gs.discard.push(card); break; }
      gs.drawPile.unshift(card);      // put it back at the bottom and try again
    }
    gs.colour = wcTop(gs).colour;

    gs.turn = opts.startIndex || 0;
    wcLog(gs, 'Round begins. ' + gs.players[gs.turn].name + ' plays first.');
    return gs;
  }

  /* --- Playing a card ---------------------------------------------------- */

  /* Attempt to play a card.
     Returns { ok: true } or { ok: false, reason, penalty }.
     `reason` is a human-readable explanation of why the card doesn't match —
     shown after the penalty, because the lesson is the point. */
  function wcPlay(gs, pi, cardId, chosenColour) {
    if (gs.phase !== 'play' || gs.turn !== pi || gs.finished) {
      return { ok: false, reason: 'Not your turn.' };
    }
    var player = gs.players[pi];
    var at = player.hand.findIndex(function (c) { return c.id === cardId; });
    if (at === -1) return { ok: false, reason: 'Card not in hand.' };
    var card = player.hand[at];

    // Official rule: having chosen to draw, you may play THAT card and no
    // other. This is a procedural rule rather than a matching mistake, so it's
    // refused outright rather than penalised.
    if (gs.drawnPlayable && cardId !== gs.drawnPlayable) {
      return { ok: false, reason: 'You drew a card \u2014 you can play that one, or keep it and end your turn.' };
    }

    // If a draw stack is pending, only a legal pass-along is allowed.
    if (gs.pending > 0) {
      var canPass = (gs.stacking === 'on' && gs.pendingKind === 'draw2' && card.kind === 'draw2');
      if (!canPass) {
        return { ok: false, penalty: true,
                 reason: 'You must take the ' + gs.pending + ' cards \u2014 ' +
                         (gs.stacking === 'on'
                           ? 'only a Draw Two can be passed along.'
                           : 'a draw stack can\u2019t be passed along.') };
      }
    } else if (!wcIsPlayable(card, wcTop(gs), gs.colour)) {
      return { ok: false, penalty: true, reason: wcWhyNot(gs, card) };
    }

    // A Wild Draw Four played while holding the current colour is a bluff. Note
    // it now, before the hand changes, so a challenge can be judged fairly.
    if (card.kind === 'wild4') {
      gs.challenge = {
        by: pi,
        bluffed: wcHandHasColour(player.hand, gs.colour, card.id),
        colourAtPlay: gs.colour
      };
    } else {
      gs.challenge = null;
    }

    player.hand.splice(at, 1);
    gs.discard.push(card);
    gs.drawnPlayable = null;

    // gs.colour is still the colour this card had to answer, so record before
    // anything below overwrites it.
    wcEvent(gs, { t: 'play', pi: pi, kind: card.kind, colour: card.colour,
                  wordIdx: card.wordIdx, face: card.face, inForce: gs.colour });

    // Wilds need a colour. The caller may supply one (AI, or a human who has
    // already picked); otherwise we pause for the choice.
    if (card.kind === 'wild' || card.kind === 'wild4') {
      if (chosenColour) {
        gs.colour = chosenColour;
        wcEvent(gs, { t: 'colour', pi: pi, colour: chosenColour });
      } else {
        gs.phase = 'colour';
        wcLog(gs, player.name + ' plays ' + wcCardLabel(gs, card) + '.');
        return { ok: true, needsColour: true };
      }
    } else {
      gs.colour = card.colour;
    }

    wcLog(gs, player.name + ' plays ' + wcCardLabel(gs, card) +
              ((card.kind === 'wild' || card.kind === 'wild4')
                ? ' \u2192 ' + wcColourName(gs.colour) : ''));

    wcAfterPlay(gs, pi, card);
    return { ok: true };
  }

  // Human picked a colour for the wild they just played.
  function wcChooseColour(gs, colourId) {
    if (gs.phase !== 'colour') return { ok: false };
    gs.colour = colourId;
    var card = wcTop(gs);
    wcEvent(gs, { t: 'colour', pi: gs.turn, colour: colourId });
    wcLog(gs, '\u2192 ' + wcColourName(colourId));
    gs.phase = 'play';
    wcAfterPlay(gs, gs.turn, card);
    return { ok: true };
  }

  /* A matched pair resolves. WHAT it does is WC_MATCH_EFFECT's business (§1);
     this function's job is to do it, record it publicly, and say which rule
     was live — so that §7 can animate and narrate it without re-deriving the
     rule for itself. The same seam wcFlyEaten uses for a stack eaten inside
     wcPlay.

     The EVENT is emitted under all three settings, with `drew` empty for the
     two that cost nobody a card. That is deliberate and load-bearing: it is
     what keeps the confetti, the pile pop, the chime and the spoken Thai
     working identically whichever rule is in force, because every one of
     those is triggered by the event existing rather than by anyone drawing.

     Only the DRAW resolves here. The skip is applied by wcAfterPlay, because
     a skip is a change to whose turn it is and that belongs with the other
     turn-moving effects rather than half a screen away from them.

     Under 'draw' this resolves even when the match is the winning card, for
     the same reason a Draw Two played last still makes the next player draw:
     the effect is part of the card. Every opponent gains one, so the ranking
     by cards remaining is unchanged by it.

     Returns the effect that was applied. */
  function wcApplyMatch(gs, pi, card) {
    var effect = wcEffectOf(gs);
    var drew = [];
    if (effect === 'draw') {
      for (var i = 0; i < gs.players.length; i++) {
        if (i === pi) continue;
        var got = wcDraw(gs, i, WC_MATCH_DRAW);
        if (got.length) drew.push({ pi: i, n: got.length });
      }
    }
    wcEvent(gs, { t: 'match', pi: pi, wordIdx: card.wordIdx,
                  face: card.face, effect: effect, drew: drew });
    /* The skip's own line is written by wcAfterPlay, naming the seat it landed
       on — the same line a Skip card produces, from the same place. */
    wcLog(gs, gs.players[pi].name + ' matched ' + wcWordLabel(gs, card, true) +
              (effect === 'draw'
                ? ' \u2014 everyone else draws ' + WC_MATCH_DRAW + '.'
                : '!'));
    return effect;
  }

  // Resolve a played card's effect and hand the turn on.
  function wcAfterPlay(gs, pi, card) {
    gs.phase = 'play';

    /* The card UNDER the one just played — this card had to answer it, and if
       it answered by meaning rather than by colour, everyone else pays. Read
       before the turn moves, and before anything below can push again. */
    var under = gs.discard[gs.discard.length - 2] || null;
    /* Which rule this match fired, or null if it was not one. Read here
       because the turn has not moved yet and nothing below has pushed again;
       used by the else-branch further down to apply the skip. */
    var matchEffect = wcIsMatch(card, under) ? wcApplyMatch(gs, pi, card) : null;

    // Going out ends the round immediately — but an action card played as the
    // last card still resolves (it affects who ranks where).
    var wentOut = (gs.players[pi].hand.length === 0);

    var twoPlayer = (gs.players.length === 2);

    if (card.kind === 'skip') {
      wcAdvance(gs, 1);                       // step past the skipped player
      wcLog(gs, gs.players[gs.turn].name + ' is skipped.');
      wcAdvance(gs, 1);
    } else if (card.kind === 'reverse') {
      if (twoPlayer) {
        wcLog(gs, 'Reverse acts as a Skip with two players.');
        // Direction flip is a no-op with two players; the player goes again.
      } else {
        gs.dir = -gs.dir;
        wcLog(gs, 'Direction reversed.');
        wcAdvance(gs, 1);
      }
    } else if (card.kind === 'draw2') {
      gs.pending += 2;
      gs.pendingKind = 'draw2';
      wcAdvance(gs, 1);
    } else if (card.kind === 'wild4') {
      gs.pending += 4;
      gs.pendingKind = 'draw4';
      wcAdvance(gs, 1);
      gs.phase = 'challenge';                 // next player may challenge
    } else if (matchEffect === 'skip') {
      /* WC_MATCH_EFFECT === 'skip'. Deliberately the SAME three statements as
         the skip branch above rather than a call into it, because that is the
         whole claim being made: a match IS a Skip, and the two producing an
         identical log line from identical code is how they stay identical.

         Safe to sit in this branch and nowhere else. wcIsMatch requires BOTH
         cards to be kind 'word', and a word card can only ever reach here —
         skip, reverse, draw2 and wild4 are all caught above, and a wild can
         never be a match. A match also cannot happen while a stack is pending,
         because wcLegalMoves offers nothing but Draw Twos then.

         At two players this hands the turn straight back to the matcher, which
         is exactly what a Skip does at two players, by exactly this code. */
      wcAdvance(gs, 1);
      wcLog(gs, gs.players[gs.turn].name + ' is skipped.');
      wcAdvance(gs, 1);
    } else {
      wcAdvance(gs, 1);
    }

    if (wentOut) {
      // Official rule: a Draw Two or Wild Draw Four played as the LAST card
      // still makes the next player draw. That changes their final card count,
      // so it has to resolve before placements are worked out. No challenge is
      // offered — the round is already decided.
      if (gs.pending > 0) {
        var lastGot = wcDraw(gs, gs.turn, gs.pending);
        // Recorded like any other forced draw, so the table can show it. It was
        // the only involuntary draw in the file that resolved silently, and the
        // cards simply appeared in a hand.
        wcEvent(gs, { t: 'draw', pi: gs.turn, n: lastGot.length,
                      inForce: gs.colour, why: 'pending' });
        wcLog(gs, gs.players[gs.turn].name + ' still draws ' + gs.pending + '.');
        gs.pending = 0;
        gs.pendingKind = null;
      }
      gs.challenge = null;
      wcPlayerOut(gs, pi);
      return;
    }

    // A pending Draw Two that the next player can't (or won't be able to) pass
    // resolves when their turn is taken — see wcTakeTurnStart.
    wcTurnStart(gs);
  }

  /* --- The pending draw stack -------------------------------------------- */

  // Called when a player's turn begins. If a draw stack is waiting and they
  // have no legal pass-along, they eat it and lose the turn.
  function wcTurnStart(gs) {
    if (gs.finished || gs.phase === 'challenge' || gs.phase === 'colour') return;
    if (gs.pending <= 0) return;
    var pi = gs.turn;
    if (wcLegalMoves(gs, pi).length > 0) return;  // they can pass it along
    wcEatPending(gs, pi);
  }

  function wcEatPending(gs, pi) {
    var n = gs.pending;
    wcDraw(gs, pi, n);
    wcEvent(gs, { t: 'draw', pi: pi, n: n, inForce: gs.colour, why: 'pending' });
    wcLog(gs, gs.players[pi].name + ' draws ' + n + ' and loses the turn.');
    gs.pending = 0;
    gs.pendingKind = null;
    gs.challenge = null;
    wcAdvance(gs, 1);
    wcTurnStart(gs);
  }

  /* --- Wild Draw Four challenge ------------------------------------------ */

  /* Official rule. The player facing the Draw Four may challenge:
       guilty   — the bluffer draws 4 instead; the challenger keeps their turn
       innocent — the challenger draws 6 (the 4, plus 2) and loses the turn
     Declining just takes the 4 and loses the turn, as normal. */
  function wcResolveChallenge(gs, doChallenge) {
    if (gs.phase !== 'challenge' || !gs.challenge) return { ok: false };
    var accuser = gs.turn;
    var accused = gs.challenge.by;
    var bluffed = gs.challenge.bluffed;
    var colourAtPlay = gs.challenge.colourAtPlay;
    var revealed = gs.players[accused].hand.slice();

    gs.phase = 'play';

    // `bluffed` is only recorded when a challenge actually exposed the hand.
    // An unchallenged bluff is never revealed at a real table, so writing it
    // here would leak private information into a log the AI reads.
    wcEvent(gs, { t: 'challenge', pi: accuser, against: accused,
                  challenged: !!doChallenge,
                  bluffed: doChallenge ? bluffed : null });

    if (!doChallenge) {
      wcEatPending(gs, accuser);
      return { ok: true, challenged: false };
    }

    gs.pending = 0;
    gs.pendingKind = null;
    gs.challenge = null;

    if (bluffed) {
      var guiltyGot = wcDraw(gs, accused, WC_CHALLENGE_PENALTY_GUILTY);
      /* why:'challenge' rather than 'pending' — the stack was cancelled, this
         is the penalty for the bluff. The AI reads only why:'turn' draws (see
         wcSuspicion), so this is observability and nothing else. */
      wcEvent(gs, { t: 'draw', pi: accused, n: guiltyGot.length,
                    inForce: colourAtPlay, why: 'challenge' });
      wcLog(gs, gs.players[accuser].name + ' challenges \u2014 and is right! ' +
                gs.players[accused].name + ' was holding ' + wcColourName(colourAtPlay) +
                ' and draws ' + WC_CHALLENGE_PENALTY_GUILTY + '.');
      // The challenger keeps their turn.
      wcTurnStart(gs);
      return { ok: true, challenged: true, bluffed: true, revealed: revealed,
               accusedName: gs.players[accused].name };
    }

    var innocentGot = wcDraw(gs, accuser, WC_CHALLENGE_PENALTY_INNOCENT);
    wcEvent(gs, { t: 'draw', pi: accuser, n: innocentGot.length,
                  inForce: colourAtPlay, why: 'challenge' });
    wcLog(gs, gs.players[accuser].name + ' challenges \u2014 and is wrong. ' +
              gs.players[accused].name + ' held no ' + wcColourName(colourAtPlay) +
              '. Draws ' + WC_CHALLENGE_PENALTY_INNOCENT + ' and loses the turn.');
    wcAdvance(gs, 1);
    wcTurnStart(gs);
    return { ok: true, challenged: true, bluffed: false, revealed: revealed,
             accusedName: gs.players[accused].name };
  }

  /* --- Drawing on your turn ---------------------------------------------- */

  /* Official rule: you may draw even when holding a legal play. If the drawn
     card is playable you may play THAT card only; otherwise the turn passes. */
  function wcDrawTurn(gs, pi) {
    if (gs.phase !== 'play' || gs.turn !== pi || gs.finished) return { ok: false };
    if (gs.pending > 0) { wcEatPending(gs, pi); return { ok: true, ate: true }; }
    // You draw ONE card per turn. If a playable card is already sitting there
    // waiting to be played or kept, this turn's draw is spent.
    if (gs.drawnPlayable) {
      return { ok: false, reason: 'You have already drawn this turn.' };
    }

    var got = wcDraw(gs, pi, 1);
    if (got.length === 0) {          // deck truly exhausted — just pass
      wcLog(gs, 'No cards left to draw. ' + gs.players[pi].name + ' passes.');
      wcAdvance(gs, 1);
      wcTurnStart(gs);
      return { ok: true, empty: true };
    }
    var card = got[0];
    // Deliberately does NOT record whether they held a legal play — that
    // depends on a hidden hand and would be a leak the moment the AI read it.
    wcEvent(gs, { t: 'draw', pi: pi, n: 1, inForce: gs.colour, why: 'turn' });
    wcLog(gs, gs.players[pi].name + ' draws a card.');
    if (wcIsPlayable(card, wcTop(gs), gs.colour)) {
      gs.drawnPlayable = card.id;
      return { ok: true, drew: card, canPlay: true };
    }
    gs.drawnPlayable = null;
    wcAdvance(gs, 1);
    wcTurnStart(gs);
    return { ok: true, drew: card, canPlay: false };
  }

  // Keep the drawn card instead of playing it.
  function wcPassAfterDraw(gs, pi) {
    if (gs.turn !== pi || gs.drawnPlayable === null) return { ok: false };
    gs.drawnPlayable = null;
    wcLog(gs, gs.players[pi].name + ' keeps it.');
    wcAdvance(gs, 1);
    wcTurnStart(gs);
    return { ok: true };
  }

  /* --- The wrong-play penalty (Expert only) ------------------------------ */

  /* Take the card back, draw one, end the turn. Deliberately mild: if you had
     no legal play your move was to draw one anyway, so the penalty costs you
     only the chance to play what you drew. If you DID have a legal play, it
     costs that tempo plus a card. */
  function wcPenalty(gs, pi) {
    wcDraw(gs, pi, 1);
    wcEvent(gs, { t: 'draw', pi: pi, n: 1, inForce: gs.colour, why: 'penalty' });
    wcLog(gs, gs.players[pi].name + ' plays a card that doesn\u2019t match \u2014 ' +
              'takes it back, draws 1, turn ends.');
    gs.drawnPlayable = null;
    wcAdvance(gs, 1);
    wcTurnStart(gs);
  }

  /* --- Ending ------------------------------------------------------------ */

  function wcPlayerOut(gs, pi) {
    gs.placements.push(pi);
    wcLog(gs, '\uD83C\uDFC6 ' + gs.players[pi].name + ' is out of cards!');
    gs.finished = true;
    gs.phase = 'over';
    // Everyone else ranks by cards remaining, fewest first.
    var rest = gs.players
      .map(function (p, i) { return i; })
      .filter(function (i) { return i !== pi; })
      .sort(function (a, b) { return gs.players[a].hand.length - gs.players[b].hand.length; });
    gs.placements = gs.placements.concat(rest);
  }

  /* --- Explaining a rejected card ---------------------------------------- */

  // Why doesn't this card match? Shown after the penalty lands — the penalty
  // has already happened, so withholding the lesson would serve nobody.
  function wcWhyNot(gs, card) {
    var top = wcTop(gs);
    var bits = [];
    bits.push(wcColourName(card.colour) + ' \u2260 ' + wcColourName(gs.colour));
    if (card.kind === 'word' && top.kind === 'word') {
      bits.push('\u201C' + wcWordLabel(gs, card, true) + '\u201D \u2260 \u201C' +
                wcWordLabel(gs, top, true) + '\u201D');
    } else if (card.kind !== 'word' && top.kind !== 'word') {
      bits.push(wcKindName(card.kind) + ' \u2260 ' + wcKindName(top.kind));
    } else {
      bits.push('and one is a word card, the other isn\u2019t');
    }
    return 'Doesn\u2019t match: ' + bits.join(', ') + '.';
  }

  /* --- Labels (shared by the log, the debug view and, later, the table) --- */

  function wcColourName(id) {
    var c = WC_COLOURS.find(function (x) { return x.id === id; });
    return c ? c.en : 'no colour';
  }
  function wcColourThai(id) {
    var c = WC_COLOURS.find(function (x) { return x.id === id; });
    return c ? (c.th + ' ' + c.rom) : '';
  }
  function wcKindName(kind) {
    return WC_ACTIONS[kind] ? WC_ACTIONS[kind].en : 'word';
  }

  // The vocabulary text a word card shows, honouring the app's display mode.
  // `both` forces Thai+English together, used in explanations.
  function wcWordLabel(gs, card, both) {
    var w = gs.words[card.wordIdx];
    if (!w) return '?';
    if (both) return (card.face === 'th' ? w.rom : w.en);
    if (card.face === 'en') return w.en;
    var mode = state.displayMode;
    if (mode === 'thai') return w.th;
    if (mode === 'roman') return w.rom;
    return w.th + ' ' + w.rom;
  }

  function wcCardLabel(gs, card) {
    if (card.kind === 'word') {
      return '[' + wcColourName(card.colour) + '] ' + wcWordLabel(gs, card);
    }
    if (card.kind === 'wild' || card.kind === 'wild4') return WC_ACTIONS[card.kind].en;
    return '[' + wcColourName(card.colour) + '] ' + WC_ACTIONS[card.kind].en;
  }

  /* =======================================================================
     5 · AI
     -----------------------------------------------------------------------
     PHASE 4 · RUN A builds the architecture and the plumbing; Run B fills in
     the scoring. What is settled here, and shouldn't move again:

     THE AI CANNOT SEE A HIDDEN HAND. Not "doesn't", cannot. Every decision
     function takes a `view` built by wcPublicView() and never receives `gs`,
     so there is nothing to be careful about — a hidden hand is not reachable
     from the arguments. That turns "the CPU doesn't cheat" from a promise into
     a property, and into a test: shuffle every hidden hand, assert the chosen
     move is unchanged (test-ai.js §1).

     The three exported entry points keep their (gs, pi) signatures so the
     rules suite and the scheduler are unaffected; each one builds a view and
     immediately hands off.
     ======================================================================= */

  // Which behaviour tier a seat belongs to. Anything unrecognised — including
  // a player with no charId, as the rules tests construct — reads as casual.
  function wcTierOf(gs, pi) {
    var p = gs.players[pi];
    var id = p && p.charId;
    return (id && WC_SHARP_IDS.indexOf(id) !== -1) ? 'sharp' : 'casual';
  }

  /* Everything one seat legitimately knows, and nothing else.
     Included: its own hand, what it may legally play, the top card, the colour
     in force, direction, the pending stack, every seat's card COUNT, who sits
     next / after next / previous in the current direction, the full discard
     pile, and the public event log.
     Excluded, deliberately: any other hand, the draw pile's order, and
     gs.challenge.bluffed — which is the very fact a challenge decision is
     supposed to be a guess about. */
  function wcPublicView(gs, pi) {
    var n = gs.players.length;
    var seatAt = function (steps) {
      var idx = wcNextIndex(gs, pi, steps);
      return { pi: idx, count: gs.players[idx].hand.length, isHuman: !!gs.players[idx].isHuman };
    };
    var copy = function (c) {
      return { id: c.id, kind: c.kind, colour: c.colour, wordIdx: c.wordIdx, face: c.face };
    };
    var legalIds = {};
    wcLegalMoves(gs, pi).forEach(function (c) { legalIds[c.id] = true; });

    return {
      me: pi,
      tier: wcTierOf(gs, pi),
      players: n,
      hand: gs.players[pi].hand.map(copy),
      legal: gs.players[pi].hand.filter(function (c) { return legalIds[c.id]; }).map(copy),
      top: wcTop(gs) ? copy(wcTop(gs)) : null,
      colour: gs.colour,
      dir: gs.dir,
      pending: gs.pending,
      pendingKind: gs.pendingKind,
      drawnPlayable: gs.drawnPlayable,
      stacking: gs.stacking,
      // The matched-pair rule in force, so scoring a match is scoring what it
      // will actually DO. Public: every seat can read it off the setup screen.
      matchEffect: wcEffectOf(gs),
      counts: gs.players.map(function (p) { return p.hand.length; }),
      next: seatAt(1),
      afterNext: (n > 2) ? seatAt(2) : null,
      prev: (n > 2) ? seatAt(n - 1) : null,
      discard: gs.discard.map(copy),
      events: (gs.events || []).slice(),
      // Who played the Draw Four now awaiting a decision, and on which colour.
      // Whether they were bluffing is NOT here — that is the guess.
      accused: gs.challenge ? gs.challenge.by : null,
      accusedColour: gs.challenge ? gs.challenge.colourAtPlay : null
    };
  }

  /* --- Decisions (view only — no gs, by construction) --------------------- */

  /* How good is playing this card, right now? Higher wins. The absolute
     numbers mean nothing; only the gaps between them do.

     The shape of the thing: shed ordinary cards first and keep the useful ones
     back, prefer colours you can follow up on, and — if you are paying
     attention — hit whoever is about to go out.

     Action cards score BELOW plain word cards on a quiet table. They are
     ammunition: a Draw Two spent on someone holding seven cards is a Draw Two
     wasted, and the same card thrown at someone holding one ends the threat.
     That gap is what makes the threat branch below visible rather than
     decorative — without it a Draw Two would simply always outrank a word card
     and nothing the CPU noticed about the table could ever change its play.

     `elected` says a bluffing Wild Draw Four has already been chosen for this
     turn by wcAiChooseMove. A bluff has to be scored as something the CPU
     MEANS, or it loses to every ordinary card and never actually happens. */
  /* Which seat is on turn once this card has resolved — as far as the public
     view can know. Pure, and deliberately conservative: anything it is not
     sure about returns null, which costs the card no penalty at all.

       draw2 / wild4   null. The next seat receives the turn only after eating
                       a stack, and making somebody draw is never the same as
                       handing them the win. The threat branch already prices
                       these, and pricing them twice would stop a CPU using the
                       one card that actually answers a near-winner.
       reverse         the PREVIOUS seat — this is the whole point of the term.
                       At two seats a Reverse hands the turn back to you, so
                       there is no receiver.
       skip            two seats along. At two seats you go again, so again
                       there is no receiver.
       a match, under the skip rule, IS a skip — so it lands here too, which is
       how the house rule reaches the AI's tactical sense rather than only its
       card values.
       everything else the next seat. */
  function wcReceiverOf(view, card) {
    if (!card) return null;
    var two = (view.players === 2);
    if (card.kind === 'draw2' || card.kind === 'wild4') return null;
    if (card.kind === 'reverse') return two ? null : view.prev;
    var effect = wcMatchEffectValid(view.matchEffect) ? view.matchEffect : wcMatchEffect();
    var skips = (card.kind === 'skip') ||
                (effect === 'skip' && wcIsMatch(card, view.top));
    if (skips) return two ? null : view.afterNext;
    return view.next;
  }

  function wcScoreCard(view, card, elected) {
    var s = 0;
    var mine = view.hand.length;
    var nextCount = view.next ? view.next.count : 7;
    var threat = (view.tier === 'sharp') && nextCount <= WC_THREAT_AT;

    if (card.kind === 'word')         s = 10;
    else if (card.kind === 'reverse') s = 9;
    else if (card.kind === 'skip')    s = 8.5;
    else if (card.kind === 'draw2')   s = 8;
    // Wilds score lowest because their value is in being HELD: a wild matches
    // anything, so it is the card that guarantees you can still move later.
    else if (card.kind === 'wild')    s = 4;
    else if (card.kind === 'wild4')   s = 2;

    /* The matched pair. Worth more than any action card because it hits every
       opponent at once rather than one of them — and worth more still at a
       full table, where it is three cards rather than one.

       Deliberately additive to the base 10 a word card already scores, not a
       replacement for it: a match that ALSO continues your colour is better
       than one that abandons it, and the colour term below still says so.

       This is the only change §5 has taken since Phase 4, and it is here
       rather than in wcAiChooseMove because it is a judgement about a card's
       worth, which is exactly what this function is for. */
    /* What a match is WORTH depends on what it does, so the bonus follows
       WC_MATCH_EFFECT (§1). Under 'draw' it hits every opponent at once and is
       worth more at a full table; under 'skip' it is a word card that also
       skips, so it sits a little above a Skip's own 8.5; under 'none' it is
       worth almost nothing mechanically, and the small bonus that remains is
       there so the CPUs still DEMONSTRATE matches — seeing an opponent put the
       two halves of a word together is the lesson even when it costs nobody
       anything. */
    if (wcIsMatch(card, view.top)) {
      var mEff = wcMatchEffectValid(view.matchEffect) ? view.matchEffect : wcMatchEffect();
      s += (mEff === 'draw') ? 22 + (view.players - 2) * 6
         : (mEff === 'skip') ? 9
         : 2;
    }

    // Colour continuity — a card whose colour you hold more of leaves you able
    // to follow your own lead next turn.
    if (card.colour) {
      var same = 0;
      view.hand.forEach(function (c) { if (c !== card && c.colour === card.colour) same++; });
      s += Math.min(same, 4) * 1.5;
    }

    // Aim at whoever is about to win. Casual CPUs never reach this branch.
    if (threat) {
      if (card.kind === 'draw2')      s += 30;
      else if (card.kind === 'wild4') s += 15;
      else if (card.kind === 'skip')  s += 25;
      else if (card.kind === 'reverse') {
        // With two players Reverse IS a Skip, so it is just as good. With more,
        // it only helps if the player it turns play back toward is further from
        // winning than the one it was heading for.
        s += (view.players === 2) ? 25
           : (view.prev && view.prev.count > nextCount ? 20 : 0);
      }
    }

    // A bluff the CPU has committed to this turn.
    if (elected) s += 18;

    /* Who this card hands the turn to, and whether that is a gift. See
       WC_HANDOVER_P. Applied last because it is a judgement about the TABLE
       rather than about the card, and it has to be able to outweigh the
       card-quality terms above — handing a Reverse to somebody on one card is
       worse than any ordinary play is good. */
    var recv = wcReceiverOf(view, card);
    var hp = WC_HANDOVER_P[view.tier] || 0;
    if (hp && recv && typeof recv.count === 'number' && recv.count <= WC_HANDOVER_AT) {
      s -= hp * (WC_HANDOVER_AT + 1 - recv.count);
    }

    // Down to your last two, a wild is your guaranteed way out — play the
    // other card and keep it.
    if (mine === 2 && (card.kind === 'wild' || card.kind === 'wild4')) s -= 12;

    return s;
  }

  /* Would playing this Wild Draw Four be a bluff? Exactly the rule the
     challenge tests: are you still holding the colour in force. */
  function wcWouldBluff(view, card) {
    if (card.kind !== 'wild4') return false;
    return view.hand.some(function (c) { return c.colour === view.colour; });
  }

  function wcAiChooseMove(view) {
    var legal = view.legal;
    if (legal.length === 0) return { action: 'draw' };

    // Drop bluffs the CPU has decided not to attempt, then score whatever
    // survives. A surviving bluff is one it MEANT to make, which is what the
    // `elected` bonus in wcScoreCard reflects — otherwise a Wild Draw Four
    // would lose to every ordinary card and the bluff would never happen.
    // Dropping one can never empty the list: holding the colour in force means
    // that colour's card is legal too. The guard stays in case that changes.
    var bluffs = {};
    var candidates = legal.filter(function (c) {
      if (!wcWouldBluff(view, c)) return true;
      var bp = WC_BLUFF_P[view.tier];
      if (Math.random() >= (typeof bp === 'number' ? bp : 0)) return false;
      bluffs[c.id] = true;
      return true;
    });
    if (candidates.length === 0) candidates = legal;

    var scored = candidates.map(function (c) {
      return { card: c, score: wcScoreCard(view, c, !!bluffs[c.id]) };
    }).sort(function (a, b) { return b.score - a.score; });

    // The top band is everything effectively tied for best. A misplay is a
    // choice from OUTSIDE that band — always a genuine mistake, never a
    // coin-flip between equals dressed up as one. That is what lets
    // WC_MISPLAY_P mean the rate you actually see.
    var top = scored[0].score;
    var band = scored.filter(function (x) { return x.score > top - 0.001; });
    var rest = scored.filter(function (x) { return x.score <= top - 0.001; });

    var pick;
    var p = WC_MISPLAY_P[view.tier];
    if (rest.length && Math.random() < (typeof p === 'number' ? p : 0)) {
      pick = rest[Math.floor(Math.random() * rest.length)].card;
    } else {
      pick = band[Math.floor(Math.random() * band.length)].card;
    }

    var colour = null;
    if (pick.kind === 'wild' || pick.kind === 'wild4') colour = wcAiChooseColour(view);
    return { action: 'play', cardId: pick.id, colour: colour };
  }

  /* Name the colour this hand holds most of. Ties break at RANDOM rather than
     falling to the first colour in the palette, which made a tied CPU pick red
     every single time.

     A sharp CPU adds one public signal: a colour the next player recently drew
     on is a colour they probably cannot follow. CAPPED strictly below one
     card, so it decides ties and can never outrank a colour actually held —
     see WC_COLOUR_HINT_MAX for the bug that cap closes. */
  function wcAiChooseColour(view) {
    /* THE ENDGAME RULE. If naming a colour leaves exactly one coloured card in
       hand, name that card's colour: it is the only card the choice can
       possibly be about, and a CPU that names anything else has thrown the
       round away in front of a learner who will read it as the game being
       broken. Both tiers — this is not cleverness, it is not being broken.

       Wilds are excluded because they play on anything, so they never
       constrain the choice. Note view.hand still holds the wild being played
       when this is reached from wcAiChooseMove, and no longer does when it is
       reached from wcCpuColour after the play; filtering on `colour` gives the
       same answer either way.

       INSURANCE as things stand, and marked as such: with the cap above in
       place, one card of a colour (1.0) already beats any colour held none of
       (0.9 at most), so the counting below reaches the same answer. It is kept
       because it states the guarantee directly instead of leaving it as an
       arithmetic consequence of a constant somebody may later raise. */
    var coloured = view.hand.filter(function (c) { return c.colour; });
    if (coloured.length === 1) return coloured[0].colour;

    var counts = {};
    WC_COLOURS.forEach(function (c) { counts[c.id] = 0; });
    view.hand.forEach(function (c) { if (c.colour) counts[c.colour]++; });

    if (view.tier === 'sharp' && view.next) {
      /* Accumulated per colour FIRST, then capped, then added. Adding as it
         accumulated is what let three draw events be worth 1.5 cards. */
      var hint = {};
      wcRecentEvents(view).forEach(function (e) {
        if (e.t === 'draw' && e.why === 'turn' && e.pi === view.next.pi && e.inForce) {
          hint[e.inForce] = (hint[e.inForce] || 0) + WC_COLOUR_HINT;
        }
      });
      WC_COLOURS.forEach(function (c) {
        if (hint[c.id]) counts[c.id] += Math.min(hint[c.id], WC_COLOUR_HINT_MAX);
      });
    }

    var best = -1;
    WC_COLOURS.forEach(function (c) { if (counts[c.id] > best) best = counts[c.id]; });
    var tied = WC_COLOURS.filter(function (c) { return counts[c.id] === best; });
    return tied[Math.floor(Math.random() * tied.length)].id;
  }

  // The slice of public history the suspicion signals read.
  function wcRecentEvents(view) {
    var n = WC_SUSPICION_TURNS * Math.max(view.players, 2) * 2;
    return view.events.slice(-n);
  }

  /* How likely is it that the Draw Four just played was a bluff? Built only
     from what the whole table saw. Exported through wcRules for testing, so
     the judgement can be inspected without rolling dice against it. */
  function wcSuspicion(view) {
    var w = WC_SUSPICION[view.tier] || WC_SUSPICION.casual;
    var who = view.accused, colour = view.accusedColour;
    if (who === null || who === undefined || !colour) return 0;

    var p = w.base;
    var playedIt = false, choseIt = false, drewOnIt = false;

    wcRecentEvents(view).forEach(function (e) {
      if (e.pi !== who) return;
      // The card that started this whole thing doesn't count as evidence
      // against itself.
      if (e.t === 'play' && e.colour === colour) playedIt = true;
      if (e.t === 'colour' && e.colour === colour) choseIt = true;
      if (e.t === 'draw' && e.why === 'turn' && e.inForce === colour) drewOnIt = true;
    });

    if (playedIt) p += w.playedColour;
    if (choseIt)  p += w.choseColour;
    if (drewOnIt) p += w.drewOnColour;

    // A big hand simply has more chances of holding the colour; a small one
    // fewer. Counted from the hand as it is now, after the Draw Four left it.
    var held = view.counts[who];
    if (w.perCard && typeof held === 'number') p += w.perCard * (held - 5);

    return Math.max(w.min, Math.min(w.max, p));
  }

  function wcAiChooseChallenge(view) {
    return Math.random() < wcSuspicion(view);
  }

  /* --- Entry points ------------------------------------------------------- */

  function wcAiMove(gs, pi)       { return wcAiChooseMove(wcPublicView(gs, pi)); }
  function wcAiPickColour(gs, pi) { return wcAiChooseColour(wcPublicView(gs, pi)); }
  function wcAiChallenge(gs, pi)  { return wcAiChooseChallenge(wcPublicView(gs, pi)); }

  /* =======================================================================
     6 · SETUP SCREEN
     ======================================================================= */

  function wcOppSelected() {
    if (!Array.isArray(state.wcOpponents)) state.wcOpponents = [];
    return state.wcOpponents;
  }

  function wcToggleOpponent(id) {
    var list = wcOppSelected();
    var at = list.indexOf(id);
    if (at >= 0) {
      list.splice(at, 1);
    } else {
      if (list.length >= WC_MAX_OPPONENTS) return false; // cap reached
      list.push(id);
    }
    saveStorage();
    return true;
  }

  function wcRenderOpponents() {
    var root = document.getElementById('wc-opp-grid');
    if (!root) return;
    var selected = wcOppSelected();
    var full = selected.length >= WC_MAX_OPPONENTS;
    root.innerHTML = '';

    CHARACTERS.forEach(function (ch) {
      var isOn = selected.indexOf(ch.id) !== -1;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'wc-opp' + (isOn ? ' selected' : '') + (!isOn && full ? ' wc-opp-full' : '');
      card.dataset.wcOpp = ch.id;
      card.setAttribute('aria-pressed', isOn ? 'true' : 'false');

      /* Trophy tier, reusing the vs-Computer win counts and badge art.
         Switched off for this mode: the trophies record MEMORY GAME wins, and
         showing them while picking a Word Cards opponent claims a history that
         has nothing to do with the game about to be played. The vs-Computer
         screen and Progress still show them exactly as before — nothing here
         touches getBadgeTier, BADGE_IMG or state.cpuWins, all three of which
         are read-only from this file. */
      var badge = '';
      if (WC_SHOW_TROPHIES) {
        try {
          var wins = (state.cpuWins && state.cpuWins[ch.id]) || 0;
          var tier = getBadgeTier(wins);
          if (tier) {
            badge = '<img class="wc-opp-trophy" src="' + BADGE_IMG[tier] + '" alt="' +
                    escapeHtml(BADGE_LABEL[tier] + ' trophy') + '">';
          }
        } catch (e) { /* badges are decoration — never block the row */ }
      }

      card.innerHTML =
        '<img class="wc-opp-avatar" alt="" src="' + ch.avatar() + '">' + badge +
        '<span class="wc-opp-text">' +
          '<span class="wc-opp-en">' + escapeHtml(ch.en) + '</span><br>' +
          '<span class="wc-opp-th">' + ch.th + '</span> ' +
          '<span class="wc-opp-rom">' + escapeHtml(ch.rom) + '</span>' +
          /* How this opponent actually PLAYS. Read off wcLevelTier, which
             reads WC_SHARP_IDS — the same list the AI itself uses — so this
             can never advertise a level the seat does not deliver. */
          '<span class="wc-opp-level wc-opp-level-' + wcLevelTier(ch.id) + '">' +
            'Level: ' + escapeHtml(WC_LEVEL_LABEL[wcLevelTier(ch.id)]) +
          '</span>' +
          /* The brain pips are the memory game's difficulty scale. ch.diff does
             also drive the AI here — Grandma really is easier than Teacher —
             but a row of brain emoji reads as that other game's vocabulary.
             WC_SHOW_DIFF_PIPS brings them back if a difficulty cue is wanted. */
          (WC_SHOW_DIFF_PIPS ? '<span class="wc-opp-diff">' +
             '\uD83E\uDDE0'.repeat(ch.diff) + '</span>' : '') +
        '</span>' +
        '<span class="wc-opp-tick">' + (isOn ? '\u2713' : '') + '</span>';

      card.addEventListener('click', function () {
        var changed = wcToggleOpponent(ch.id);
        if (!changed) {
          // At the cap — say so under the grid, next to what was just clicked.
          wcSetOppMessage('You can play against up to ' + WC_MAX_OPPONENTS +
                          ' opponents. Untick one first.');
          if (typeof haptic === 'function') haptic(12);
          return;
        }
        // A successful tick or untick resolves whatever the message was about.
        wcSetOppMessage('');
        if (typeof playSound === 'function') playSound('snd-menu-click');
        wcRenderOpponents();
        wcRefreshStart();
      });

      root.appendChild(card);
    });
  }

  // Word Cards' own pool counter. It can't use updatePoolCounter() because the
  // requirement is different: 10 SHORT words, not 10 words of any length.
  function wcRenderPoolCounter() {
    var el = document.getElementById('wc-pool-counter');
    if (!el) return;
    var n = wcEligiblePool().length;
    var need = wcWordCount();
    el.classList.toggle('invalid', n < need);
    el.innerHTML = 'Pool: <strong>' + n + '</strong> words that fit on a card' +
                   ' \u00B7 need <strong>' + need + '</strong>';
  }

  // Feedback about the tick grid itself, shown directly under it. Separate from
  // the START validation line so each message sits next to what it refers to.
  function wcSetOppMessage(text) {
    var el = document.getElementById('wc-opp-msg');
    if (el) el.textContent = text || '';
  }

  // Validation. Order matters: report the first thing the player must fix.
  function wcRefreshStart() {
    wcRenderPoolCounter();

    var btn = document.getElementById('wc-start-btn');
    var msg = document.getElementById('wc-start-msg');
    if (!btn || !msg) return;

    var selected = wcOppSelected();
    var eligible = wcEligiblePool().length;
    var need = wcWordCount();
    var enabled = true;
    var message = '';

    if (selected.length === 0) {
      enabled = false;
      message = 'Choose at least one opponent to start.';
    } else if (selected.length > WC_MAX_OPPONENTS) {
      enabled = false;
      message = 'Choose up to ' + WC_MAX_OPPONENTS + ' opponents.';
    } else if (eligible < need) {
      enabled = false;
      message = 'Not enough short words in this pool \u2014 the deck needs ' + need +
                ' and this selection has ' + eligible +
                '. Add another lesson or category. (Very long words and phrases are left out ' +
                'because they don\u2019t fit on a card.)';
    }

    btn.disabled = !enabled;
    msg.textContent = message;
  }

  function wcInfo(text) {
    return '<span class="info-wrap" data-info>' +
             '<button type="button" class="info-icon" aria-label="What does this setting do?">i</button>' +
             '<span class="info-popup" role="tooltip">' + text + '</span>' +
           '</span>';
  }

  // Build the setup screen markup once. Re-entrant: rebuilding is safe, but we
  // only do it on first entry so the shared pool UI keeps its bound handlers.
  function wcBuildMenu() {
    var view = document.getElementById('view-wordcards');
    if (!view || view.dataset.wcBuilt === '1') return;

    view.innerHTML =
      '<div class="screen-header">' +
        '<h2 class="screen-title">Word Cards</h2>' +
        '<p class="screen-subtitle">Vocabulary Card Game</p>' +
        '<p class="screen-rom"><span class="th">ฝึกคำศัพท์ fèuk kam sàp</span></p>' +
        // The How to play guide (§6b). Offered only when index.html provides the
        // guide, so an older cached index.html never shows a dead button.
        (wcGuideAvailable()
          ? '<button type="button" class="bguide-open-btn" id="wc-howto-btn">' +
              '<span aria-hidden="true">\u2753</span> How to play</button>'
          : '') +
      '</div>' +

      '<div class="menu-section" id="wc-help-section">' +
        '<div class="sb-help" id="wc-help">' +
          '<div class="sb-help-body">' +
            /* Deliberately short. This box is read once, standing in a menu, by
               somebody who wants to start playing — so it carries only what is
               different about THIS game and points at the Guide for the rest.
               The full rules, UNO and otherwise, live in one place rather than
               being half-duplicated here where they go stale.

               The lead line is load-bearing: test-phase1 §5c asserts the box
               names UNO and explains the difference. */
            '<p class="sb-help-lead">\u2139\uFE0F <strong>It\u2019s UNO, but with words instead of numbers.</strong></p>' +
            '<p class="sb-help-note">Match the card on the pile by <strong>colour</strong> or by <strong>word</strong> \u2014 ' +
            'and a Thai card matches its English twin, so <span class="th">กิน</span> <em>gin</em> and ' +
            '\u201Cto eat\u201D can be played on each other. Nothing is highlighted for you: spotting the ' +
            'match is the exercise. First player to run out of cards wins.</p>' +
            '<p class="sb-help-note">New to UNO, or want the full rules and what the settings below do? ' +
            '<strong>Main menu \u2192 \u2753 Guide \u2192 Word Cards</strong>.</p>' +
            '<p class="sb-help-note">Best played with the screen sideways. Adjust the opponents\u2019 thinking time ' +
            'any time in <strong>Settings</strong> \u2192 Speed.</p>' +
          '</div>' +
          '<button type="button" class="sb-help-ok" id="wc-help-ok">\u2713 OK \u2014 Don\u2019t show again</button>' +
        '</div>' +
      '</div>' +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Your Player</div>' +
        '<div class="player-row">' +
          '<input type="text" class="player-input" id="wc-p1-name" maxlength="10" placeholder="Player 1">' +
        '</div>' +
      '</div>' +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Starting Player' +
          wcInfo('Who plays the first card.') +
        '</div>' +
        '<div class="toggle-group" id="wc-start-toggle">' +
          '<button class="toggle-opt" data-wc-start="you">You</button>' +
          '<button class="toggle-opt" data-wc-start="random">Random</button>' +
        '</div>' +
      '</div>' +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Vocabulary Pool' +
          wcInfo('Choose which words become the cards.<br><br><strong>Lessons</strong> and ' +
                 '<strong>Categories</strong> hold the <em>same</em> words, organised differently. ' +
                 '<strong>Extra</strong> is bonus vocabulary beyond the course. <strong>\u2B50</strong> uses ' +
                 'the words you\u2019ve starred.<br><br>Ten words are picked from your selection each round. ' +
                 'Very long words and phrases are left out because they don\u2019t fit on a card.') +
        '</div>' +
        '<div class="vocab-filter-toggle" data-vocab-filter="wordcards"></div>' +
        '<div class="cat-grid" data-cats="wordcards"></div>' +
        '<div class="wc-pool-counter" id="wc-pool-counter"></div>' +
      '</div>' +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Words in Deck' +
          wcInfo('How many different words become cards this round.<br><br>Every word appears the same ' +
                 'number of times whichever you pick, so a bigger deck doesn\u2019t mean less repetition \u2014 ' +
                 'it just drills <em>more</em> vocabulary per round, and makes matching a little harder ' +
                 'because there\u2019s more to scan.<br><br><strong>10</strong> is the classic UNO deck ' +
                 '(112 cards). <strong>12</strong> and <strong>14</strong> add more words ' +
                 '(128 and 144 cards) with slightly fewer action cards.') +
        '</div>' +
        '<div class="toggle-group" id="wc-words-toggle">' +
          WC_WORD_COUNTS.map(function (n) {
            return '<button class="toggle-opt" data-wc-words="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Read Cards Aloud' +
          wcInfo('<strong>On:</strong> when a card is played Thai side up, the word is spoken, ' +
                 'and the table waits for it before anyone moves. Playing a card on its ' +
                 'matching pair chimes first, then speaks.<br><br>' +
                 '<strong>Off:</strong> the round plays silently and a little faster.<br><br>' +
                 'English-side cards are never spoken \u2014 the Thai is the half worth ' +
                 'hearing. Needs a Thai voice installed on your device; without one this ' +
                 'setting does nothing.') +
        '</div>' +
        '<div class="toggle-group" id="wc-speak-toggle">' +
          '<button class="toggle-opt" data-wc-speak="on">On</button>' +
          '<button class="toggle-opt" data-wc-speak="off">Off</button>' +
        '</div>' +
      '</div>' +

      /* Reading Time. Hidden while WC_SHOW_READ_SETTING is false, exactly the
         way Help Level is hidden while WC_FORCE_ASSIST names a level — the
         markup is skipped rather than deleted, and wcBindToggle and
         wcSyncToggle both no-op on a container that is not there. */
      (WC_SHOW_READ_SETTING ?
        '<div class="menu-section">' +
          '<div class="menu-section-label">Reading Time' +
            wcInfo('How long a card stays on the pile before anyone is allowed to cover ' +
                   'it. These are words you have to <em>read</em>, not numbers you ' +
                   'recognise, so the table waits for you.<br><br>' +
                   '<strong>Relaxed</strong> if you are still sounding out Thai script. ' +
                   '<strong>Brisk</strong> once you are reading it at a glance.<br><br>' +
                   'This is separate from Settings \\u2192 Speed, which is how long the ' +
                   'opponents spend thinking. That one sets the pace; this one sets how ' +
                   'long you get \\u2014 whichever is longer wins, so raising this never ' +
                   'makes the game faster.') +
          '</div>' +
          '<div class="toggle-group" id="wc-read-toggle">' +
            '<button class="toggle-opt" data-wc-read="relaxed">Relaxed</button>' +
            '<button class="toggle-opt" data-wc-read="normal">Normal</button>' +
            '<button class="toggle-opt" data-wc-read="brisk">Brisk</button>' +
          '</div>' +
        '</div>'
      : '') +

      // Help Level. Omitted entirely while WC_FORCE_ASSIST names a level — see
      // §1. wcBindToggle/wcSyncToggle both no-op on a missing element, so
      // clearing that constant brings the section, the binding and the saved
      // preference all back with no other change.
      (WC_FORCE_ASSIST ? '' :
      '<div class="menu-section">' +
        '<div class="menu-section-label">Help Level' +
          wcInfo('<strong>Easy:</strong> cards you can legally play are highlighted, and you can\u2019t play a ' +
                 'wrong one by mistake.<br><br><strong>Expert:</strong> nothing is highlighted. Play a card that ' +
                 'doesn\u2019t match and you take it back, draw one card, and your turn ends.') +
        '</div>' +
        '<div class="toggle-group" id="wc-assist-toggle">' +
          '<button class="toggle-opt" data-wc-assist="easy">Easy</button>' +
          '<button class="toggle-opt" data-wc-assist="expert">Expert</button>' +
        '</div>' +
      '</div>') +

      /* HOUSE RULES. A group label rather than two more loose sections: both
         of these change how the GAME works rather than how it looks or reads,
         and a player deciding whether to turn one on wants to see the other.
         Reuses index.html's .menu-group-label — the same device the main menu
         uses for "Memory Game" and "Other Games".

         Placed exactly where Stacking Draw Two already sat. test-phase1's
         section-order assertion filters to a whitelist of labels, so the new
         section is invisible to it — but only while Stacking stays between
         "Words in Deck" and "Opponents". Moving this group breaks that. */
      '<div class="menu-group-label">House Rules</div>' +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Stacking Draw Two' +
          wcInfo('<strong>Off</strong> is the official rule \u2014 if someone plays a Draw Two on you, ' +
                 'you take the two cards and lose your turn.<br><br><strong>On</strong> is the popular house ' +
                 'rule: play a Draw Two of your own to pass the whole pile to the next player, who then ' +
                 'draws the lot unless they can pass it on too.<br><br>Wild Draw Four never stacks.') +
        '</div>' +
        '<div class="toggle-group" id="wc-stacking-toggle">' +
          '<button class="toggle-opt" data-wc-stacking="off">Off</button>' +
          '<button class="toggle-opt" data-wc-stacking="on">On</button>' +
        '</div>' +
      '</div>' +

      /* Matched Pair. Hidden the same way Reading Time and Help Level are when
         their switch is off — markup skipped, state key still saved, and
         wcBindToggle/wcSyncToggle both no-op on a container that is not there. */
      (WC_SHOW_MATCH_SETTING ?
        '<div class="menu-section">' +
          '<div class="menu-section-label">Matched Pair' +
            wcInfo('What happens when you play a word on its own translation \u2014 ' +
                   '<span class="th">\u0E01\u0E34\u0E19</span> on \u201Cto eat\u201D, or the other way round. ' +
                   'Spotting that pair is the whole point of this mode, so it is worth something.<br><br>' +
                   '<strong>Skip:</strong> it works like a Skip card \u2014 the next player loses ' +
                   'their turn. Quick, and the default.<br><br>' +
                   '<strong>Draw 1:</strong> every other player draws a card. The strongest of the ' +
                   'three, but it puts cards back into play and makes rounds noticeably longer.<br><br>' +
                   '<strong>Nothing:</strong> no effect on the game. The celebration, the sound and ' +
                   'the spoken word still happen \u2014 matching is still marked as the thing worth ' +
                   'doing, it just does not change the play.') +
          '</div>' +
          '<div class="toggle-group" id="wc-match-toggle">' +
            '<button class="toggle-opt" data-wc-match="skip">Skip</button>' +
            '<button class="toggle-opt" data-wc-match="draw">Draw 1</button>' +
            '<button class="toggle-opt" data-wc-match="none">Nothing</button>' +
          '</div>' +
        '</div>'
      : '') +

      '<div class="menu-section">' +
        '<div class="menu-section-label">Opponents' +
          wcInfo('Tick up to ' + WC_MAX_OPPONENTS + ' computer opponents. Two players make a quick duel; ' +
                 'four make a longer, more chaotic game.<br><br>Trophies you have already earned against ' +
                 'these opponents in <strong>Play vs Computer</strong> are shown here too.') +
        '</div>' +
        '<div class="wc-opp-grid" id="wc-opp-grid"></div>' +
        // Feedback about the tick grid itself (e.g. the 3-opponent cap) belongs
        // directly under the grid, next to what was clicked — not down beside
        // START, which is reserved for "why can't I start yet" validation.
        '<div class="wc-opp-msg" id="wc-opp-msg"></div>' +
      '</div>' +

      '<div class="menu-section">' +
        // NOTE: deliberately NOT data-start="wordcards". index.html binds every
        // button[data-start] at load time to startGameFromMenu(), which builds a
        // MEMORY-game board from a layout id. This mode has no layout, so being
        // picked up by that handler would start the wrong game entirely. Using a
        // dedicated id keeps the shared styling and rules that out permanently.
        '<button class="start-btn" id="wc-start-btn" disabled>Start</button>' +
        '<div class="start-msg" id="wc-start-msg"></div>' +
      '</div>' +

      '<div class="menu-section menu-back-section">' +
        '<button type="button" class="menu-back-btn" data-back>Back</button>' +
      '</div>';

    view.dataset.wcBuilt = '1';
    wcBindMenu();
  }

  // Wire the controls that belong to this screen. The vocabulary-pool UI binds
  // its own handlers inside renderVocabFilterToggle/renderCategoryChips, and the
  // Back button is picked up by the app's delegated [data-back] handler.
  function wcBindMenu() {
    // Help box — remove it outright if already dismissed.
    var helpSection = document.getElementById('wc-help-section');
    if (helpSection) {
      if (state.wcHideHelp) {
        helpSection.remove();
      } else {
        var ok = document.getElementById('wc-help-ok');
        if (ok) {
          ok.addEventListener('click', function () {
            state.wcHideHelp = true;
            saveStorage();
            helpSection.remove();
            if (typeof haptic === 'function') haptic(8);
          });
        }
      }
    }

    // Player name — shares state.p1Name with vs Computer and Multiplayer, so a
    // nickname set anywhere shows up everywhere.
    var nameInput = document.getElementById('wc-p1-name');
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        state.p1Name = nameInput.value;
        saveStorage();
      });
    }

    // Simple toggle groups: each writes one state key and re-validates.
    wcBindToggle('wc-words-toggle',    'wcWords',    'wcWordCount', true);
    wcBindToggle('wc-speak-toggle',    'wcSpeak',    'wcSpeak');
    wcBindToggle('wc-read-toggle',     'wcRead',     'wcRead');
    wcBindToggle('wc-assist-toggle',   'wcAssist',   'wcAssist');
    wcBindToggle('wc-start-toggle',    'wcStart',    'wcStartingPlayer');
    wcBindToggle('wc-stacking-toggle', 'wcStacking', 'wcStacking');
    wcBindToggle('wc-match-toggle',    'wcMatch',    'wcMatchEffect');

    // START — through the How to play guide the first time (§6b).
    var startBtn = document.getElementById('wc-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        if (startBtn.disabled) return;
        wcStartFromMenu();
      });
    }

    // How to play (§6b) — review only, never starts a round.
    var howtoBtn = document.getElementById('wc-howto-btn');
    if (howtoBtn) howtoBtn.addEventListener('click', wcOpenGuideReview);
  }

  // containerId: element holding the .toggle-opt buttons
  // datasetKey:  the camelCase dataset name on each button (data-wc-assist -> wcAssist)
  // stateKey:    which state field it writes
  // numeric:     true when the value is a number rather than a string, so the
  //              saved value round-trips through loadStorage's === checks
  function wcBindToggle(containerId, datasetKey, stateKey, numeric) {
    var root = document.getElementById(containerId);
    if (!root) return;
    root.querySelectorAll('.toggle-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.dataset[datasetKey];
        if (numeric) val = parseInt(val, 10);
        if (state[stateKey] === val) return;
        state[stateKey] = val;
        saveStorage();
        wcSyncToggle(containerId, datasetKey, stateKey, numeric);
        if (typeof playSound === 'function') playSound('snd-menu-click');
        wcRefreshStart();
      });
    });
  }

  function wcSyncToggle(containerId, datasetKey, stateKey, numeric) {
    var root = document.getElementById(containerId);
    if (!root) return;
    root.querySelectorAll('.toggle-opt').forEach(function (btn) {
      var val = numeric ? parseInt(btn.dataset[datasetKey], 10) : btn.dataset[datasetKey];
      btn.classList.toggle('active', val === state[stateKey]);
    });
  }

  // Entry point called by navigate('wordcards').
  function renderWordCardsMenu() {
    wcBuildMenu();

    var nameInput = document.getElementById('wc-p1-name');
    if (nameInput) nameInput.value = state.p1Name || '';

    wcSyncToggle('wc-words-toggle',    'wcWords',    'wcWordCount', true);
    wcSyncToggle('wc-speak-toggle',    'wcSpeak',    'wcSpeak');
    wcSyncToggle('wc-read-toggle',     'wcRead',     'wcRead');
    wcSyncToggle('wc-assist-toggle',   'wcAssist',   'wcAssist');
    wcSyncToggle('wc-start-toggle',    'wcStart',    'wcStartingPlayer');
    wcSyncToggle('wc-stacking-toggle', 'wcStacking', 'wcStacking');
    wcSyncToggle('wc-match-toggle',    'wcMatch',    'wcMatchEffect');

    // Shared vocabulary-pool UI. These bind their own handlers, which route
    // back here through refreshStartForMode('wordcards') -> wcRefreshStart().
    renderVocabFilterToggle('wordcards');
    renderCategoryChips('wordcards');

    wcRenderOpponents();
    wcSetOppMessage('');   // stale cap warning shouldn't survive leaving and returning
    wcRefreshStart();
  }

  /* =======================================================================
     6b · HOW TO PLAY GUIDE
     -----------------------------------------------------------------------
     Five illustrated slides, shown once before the first round and on demand
     from the setup screen's "How to play" button.

     index.html owns the guide itself — the overlay, its layout on every
     screen size, the navigation, the saved "seen" flag and every way of
     closing it — and exposes it as window.openHowToGuide(def, mode). This
     section owns only what is specific to Word Cards: the slides, their
     pictures, and their styles (WC_GUIDE_CSS, injected beside WC_CSS).

     The pictures are drawn with this file's own card renderer, so the cards
     in the guide ARE game cards: same art, same fonts, same Display setting.
     Every size is in em of --bgd-fs, the one value the guide's layouts change,
     so the pictures scale with the rest of the guide.

     FAIL-SAFE. The guide must never stand between the player and a round. If
     index.html's guide is missing (an older cached copy), declines to open,
     or anything here throws, Start simply starts the round.

     Nothing here touches §4 or §5, and nothing here sets a timer: all motion
     is CSS, and it stops the moment the guide closes.
     ======================================================================= */

  // Real course words (Lessons 4-6), written out here so the pictures never
  // depend on which pool the player has picked.
  var WCG_GS = { words: [
    { th: 'หนัง',  rom: 'năng',    en: 'movie' },
    { th: 'อาหาร', rom: 'aa-hăan', en: 'food' },
    { th: 'หมา',   rom: 'măa',     en: 'dog' }
  ] };
  var WCG_MOVIE = 0, WCG_FOOD = 1, WCG_DOG = 2;

  function wcgCard(kind, colour, wordIdx, face) {
    return wcCardFaceHtml(WCG_GS, {
      id: 'guide', kind: kind, colour: colour || null,
      wordIdx: (typeof wordIdx === 'number') ? wordIdx : null,
      face: face || null
    }, 'wcg-c');
  }

  function wcgBack() { return wcCardBackHtml('wcg-c'); }

  var WCG_TICK  = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                  '<path d="M5.5 12.5l4.2 4.2L18.5 7.8"/></svg>';
  var WCG_CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                  '<path d="M7 7l10 10M17 7L7 17"/></svg>';

  function wcgMark(ok, extra) {
    return '<span class="wcg-mark ' + (ok ? 'is-ok' : 'is-no') + (extra ? ' ' + extra : '') + '">' +
           (ok ? WCG_TICK : WCG_CROSS) + '</span>';
  }

  function wcgHead(title, th, rom) {
    return '<div class="bguide-head">' +
             '<h2 class="bguide-title" id="bguide-title">' + title + '</h2>' +
             '<div class="bguide-thai"><span class="mt-th">' + th + '</span>' +
             '<span class="mt-rom">' + rom + '</span></div>' +
           '</div>';
  }

  // An opponent's seat: a person icon, a name, optionally a card count, and
  // optionally a badge that appears under it.
  function wcgSeat(name, count, badge) {
    return '<span class="wcg-seat">' +
             '<span class="wcg-seat-av" aria-hidden="true">\uD83D\uDC64</span>' +
             '<span>' + name + '</span>' +
             (typeof count === 'number' ? '<span class="wcg-seat-n">' + count + '</span>' : '') +
             (badge || '') +
           '</span>';
  }

  // The confetti/sparkle burst over the pile. Directions are fixed so the
  // picture is the same every time.
  var WCG_BITS = [
    ['0em', '-3.4em', '#e8b71f'], ['2.5em', '-2.4em', '#3f9243'], ['3.4em', '0em', '#d5443a'],
    ['2.4em', '2.4em', '#2f6fc4'], ['0em', '3.2em', '#e8b71f'], ['-2.4em', '2.4em', '#3f9243'],
    ['-3.4em', '0em', '#2f6fc4'], ['-2.5em', '-2.4em', '#d5443a'], ['1.3em', '-3.1em', '#2f6fc4'],
    ['-1.3em', '-3.1em', '#e8b71f']
  ];
  function wcgBurst() {
    return '<span class="wcg-burst">' + WCG_BITS.map(function (b) {
      return '<span class="wcg-bit" style="--dx:' + b[0] + ';--dy:' + b[1] + ';--c:' + b[2] + '"></span>';
    }).join('') + '</span>';
  }

  // --- 1. What fits -------------------------------------------------------
  function wcgSlideFits() {
    function slot(i, cardHtml, ok, why, wideOnly) {
      return '<div class="wcg-slot' + (ok ? '' : ' is-no') + (wideOnly ? ' wcg-wide' : '') +
               '" style="--i:' + i + '">' +
               '<span class="wcg-cardwrap">' + cardHtml + wcgMark(ok) + '</span>' +
               '<span class="wcg-why">' + why + '</span>' +
             '</div>';
    }
    return wcgHead('What can you play?', 'ฝึกคำศัพท์', 'fèuk kam sàp') +
      '<div class="bguide-body is-stacked">' +
        '<div class="bguide-stage wcg-s1" aria-hidden="true">' +
          '<div class="wcg-deal">' +
            '<div class="wcg-top">' +
              '<span class="wcg-tag">Top card</span>' +
              wcgCard('word', 'green', WCG_MOVIE, 'th') +
            '</div>' +
            '<div class="wcg-hand">' +
              '<span class="wcg-tag">Your hand</span>' +
              '<div class="wcg-row">' +
                slot(0, wcgCard('word', 'yellow', WCG_MOVIE, 'en'), true, 'same word') +
                slot(1, wcgCard('word', 'red', WCG_FOOD, 'th'), false, 'no match') +
                slot(2, wcgCard('word', 'green', WCG_DOG, 'th'), true, 'same colour') +
                // Wide screens only: the room is there, and these two answer the
                // questions the first three leave open.
                slot(3, wcgCard('word', 'blue', WCG_MOVIE, 'th'), true, 'same word', true) +
                slot(4, wcgCard('wild'), true, 'always fits', true) +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bguide-text">' +
          '<p>Play a card that matches the top card by <strong>colour</strong> or by <strong>word</strong>. ' +
          'Thai and English count as the same word, so <em>movie</em> fits on ' +
          '<span class="wcg-th">หนัง</span> <span class="bguide-rom">năng</span>.</p>' +
          '<p>The same word in any colour fits too, and a <strong>Wild</strong> fits on anything.</p>' +
          '<p class="bguide-note">Special cards (next page) fit on their own colour, or on the same special card in any colour.</p>' +
        '</div>' +
      '</div>';
  }

  // --- 2. The action cards ------------------------------------------------
  function wcgSlideActions() {
    var rows = [
      ['skip',    'red',   'Skip',           'The next player misses a turn.'],
      ['reverse', 'blue',  'Reverse',        'Changes direction. With 2 players, you go again.'],
      ['draw2',   'green', 'Draw Two',       'The next player draws 2 and misses a turn.'],
      ['wild',    null,    'Wild',           'Fits on anything. You pick the colour.'],
      ['wild4',   null,    'Wild Draw Four', 'You pick the colour. The next player draws 4 and misses a turn.']
    ];
    var items = rows.map(function (r, i) {
      return '<li class="wcg-leg" style="--i:' + i + '">' +
               '<span class="wcg-leg-card" aria-hidden="true">' + wcgCard(r[0], r[1]) + '</span>' +
               '<span class="wcg-leg-txt"><strong>' + r[2] + '</strong><span>' + r[3] + '</span></span>' +
             '</li>';
    }).join('');
    var stacking = (state.wcStacking === 'on')
      ? '<p class="bguide-note"><strong>Stacking Draw Two</strong> is on, so a Draw Two can also be passed along with another Draw Two.</p>'
      : '';
    return wcgHead('Special cards', 'การ์ดพิเศษ', 'gáat pí-sèt') +
      '<div class="bguide-body is-stacked">' +
        '<div class="bguide-stage wcg-s2"><ul class="wcg-legend">' + items + '</ul></div>' +
        '<div class="bguide-text">' +
          '<p class="bguide-note"><strong>Wild Draw Four</strong> is only allowed when you have no card of the current colour. ' +
          'The next player may <strong>challenge</strong> it: if you broke that rule you draw 4 instead, and if not, they draw 6.</p>' +
          stacking +
        '</div>' +
      '</div>';
  }

  // --- 3. The matched pair (follows the Matched Pair setting) ---------------
  function wcgSlidePair() {
    var effect = wcMatchEffect();
    var badgeNext = '', badgeOther = '', effectText;
    if (effect === 'skip') {
      badgeNext = '<span class="wcg-badge is-skip">' + WC_ICONS.skip + 'Skipped</span>';
      effectText = 'With your current setting, <strong>Skip</strong>, the next player misses their turn.';
    } else if (effect === 'draw') {
      badgeNext = badgeOther = '<span class="wcg-badge is-draw">+1 card</span>';
      effectText = 'With your current setting, <strong>Draw 1</strong>, every other player draws a card.';
    } else {
      effectText = 'With your current setting, <strong>Nothing</strong>, it doesn\u2019t change the game, ' +
                   'but you still get the celebration.';
    }
    return wcgHead('Matched pair', 'จับคู่', 'jàp kôo') +
      '<div class="bguide-body">' +
        '<div class="bguide-stage wcg-s3" aria-hidden="true">' +
          '<div class="wcg-tbl">' +
            '<div class="wcg-seats">' + wcgSeat('Next player', null, badgeNext) +
                                         wcgSeat('Player 3', null, badgeOther) + '</div>' +
            '<span class="wcg-at wcg-deck2">' + wcgBack() + '</span>' +
            '<span class="wcg-at wcg-deck">' + wcgBack() + '</span>' +
            '<span class="wcg-at wcg-pile">' + wcgCard('word', 'green', WCG_MOVIE, 'th') + '</span>' +
            '<span class="wcg-at wcg-h1">' + wcgCard('word', 'blue', WCG_DOG, 'en') + '</span>' +
            '<span class="wcg-at wcg-h2">' + wcgCard('word', 'red', WCG_FOOD, 'en') + '</span>' +
            '<span class="wcg-fly">' + wcgCard('word', 'yellow', WCG_MOVIE, 'en') + '</span>' +
            wcgBurst() +
            '<span class="wcg-pill wcg-pairlbl"><span class="wcg-pill-t">\u2728 Matched pair!</span></span>' +
          '</div>' +
        '</div>' +
        '<div class="bguide-text">' +
          '<p>Put a word on its <strong>translation</strong>, like <em>movie</em> on ' +
          '<span class="wcg-th">หนัง</span> <span class="bguide-rom">năng</span>, and it\u2019s a ' +
          '<strong>matched pair</strong>: the best move in the game.</p>' +
          '<p>' + effectText + '</p>' +
          '<p class="bguide-note">You can change this under <strong>Matched Pair</strong> in the setup menu. ' +
          '<span class="wcg-th">หนัง</span> on <span class="wcg-th">หนัง</span> fits too, but it isn\u2019t a matched pair.</p>' +
        '</div>' +
      '</div>';
  }

  // --- 4. Nothing fits: draw ------------------------------------------------
  function wcgSlideDraw() {
    return wcgHead('Can\u2019t play?', 'จั่ว', 'jùa') +
      '<div class="bguide-body">' +
        '<div class="bguide-stage wcg-s4" aria-hidden="true">' +
          '<div class="wcg-tbl">' +
            '<span class="wcg-turn">' +
              '<span class="wcg-c1">Your turn: nothing fits</span>' +
              '<span class="wcg-c2">Tap Draw to take a card</span>' +
              '<span class="wcg-c3">It fits: play it, or keep it</span>' +
            '</span>' +
            '<span class="wcg-at wcg-deck2">' + wcgBack() + '</span>' +
            '<span class="wcg-at wcg-deck">' + wcgBack() + '</span>' +
            '<span class="wcg-at wcg-pile">' + wcgCard('word', 'red', WCG_FOOD, 'th') + '</span>' +
            '<span class="wcg-at wcg-h0"><span class="wcg-cardwrap">' +
              wcgCard('word', 'blue', WCG_DOG, 'en') + wcgMark(false, 'wcg-nomark') + '</span></span>' +
            '<span class="wcg-at wcg-h1"><span class="wcg-cardwrap">' +
              wcgCard('word', 'green', WCG_MOVIE, 'en') + wcgMark(false, 'wcg-nomark') + '</span></span>' +
            '<span class="wcg-fly">' +
              '<span class="wcg-fly-back">' + wcgBack() + '</span>' +
              '<span class="wcg-fly-face wcg-cardwrap">' + wcgCard('word', 'red', WCG_DOG, 'th') +
                wcgMark(true) + '</span>' +
            '</span>' +
            '<span class="wcg-acts">' +
              '<span class="wc-act-btn wcg-act-draw"><span class="th">จั่ว</span> Draw</span>' +
              '<span class="wc-act-btn wc-act-primary wcg-act-play">Play it</span>' +
              '<span class="wc-act-btn wcg-act-keep">Keep it</span>' +
              '<span class="wcg-pointer">\uD83D\uDC46</span>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="bguide-text">' +
          '<p>No card that fits? Tap <strong><span class="wcg-th">จั่ว</span> Draw</strong> to take one from the deck. ' +
          'If it fits, you can play it right away, or keep it.</p>' +
          '<p><strong>Careful:</strong> nothing is highlighted for you. If you play a card that doesn\u2019t fit, ' +
          'it goes back to your hand, you draw 1 card as a penalty, and your turn ends.</p>' +
          '<p class="bguide-note">The game then shows you why it didn\u2019t fit.</p>' +
        '</div>' +
      '</div>';
  }

  // --- 5. Going out -----------------------------------------------------------
  function wcgSlideWin() {
    return wcgHead('Empty your hand to win', 'คุณชนะแล้ว', 'kun chá-ná láew') +
      '<div class="bguide-body">' +
        '<div class="bguide-stage wcg-s5" aria-hidden="true">' +
          '<div class="wcg-tbl">' +
            '<div class="wcg-seats">' +
              wcgSeat('Player 2', 3, '<span class="wcg-badge is-rank">2nd</span>') +
              wcgSeat('Player 3', 5, '<span class="wcg-badge is-rank">3rd</span>') +
            '</div>' +
            '<span class="wcg-at wcg-deck2">' + wcgBack() + '</span>' +
            '<span class="wcg-at wcg-deck">' + wcgBack() + '</span>' +
            '<span class="wcg-at wcg-pile">' + wcgCard('word', 'green', WCG_MOVIE, 'en') + '</span>' +
            '<span class="wcg-fly">' + wcgCard('word', 'green', WCG_DOG, 'th') + '</span>' +
            '<span class="wcg-lasttag"><span>Last card!</span></span>' +
            wcgBurst() +
            '<span class="wcg-pill wcg-winlbl"><span class="wcg-pill-t">\uD83C\uDFC6 You win!</span></span>' +
          '</div>' +
        '</div>' +
        '<div class="bguide-text">' +
          '<p>The first player to play their <strong>last card</strong> wins the round. ' +
          'Everyone else is ranked by how many cards they have left.</p>' +
          '<p>No need to shout \u201CUNO!\u201D: when a player is down to one card, the game announces it for you.</p>' +
          '<p class="bguide-note">Your wins are saved in \uD83C\uDFC6 Progress.</p>' +
        '</div>' +
      '</div>';
  }

  var WC_GUIDE = {
    id: 'wordcards',
    label: '\uD83C\uDCCF Word Cards: how to play',
    slides: [wcgSlideFits, wcgSlideActions, wcgSlidePair, wcgSlideDraw, wcgSlideWin],
    seenKey: 'wcGuideSeen',
    onStart: function () { wcStartRound(); }   // deals the round, with its usual sounds
  };

  function wcGuideAvailable() {
    return typeof window.openHowToGuide === 'function';
  }

  function wcGuideWanted() {
    return WC_ALWAYS_SHOW_GUIDE || !state.wcGuideSeen;
  }

  // The same checks wcRefreshStart/wcStartRound make, so the guide only ever
  // appears when a round really follows it.
  function wcRoundWouldStart() {
    var n = wcOppSelected().length;
    return n > 0 && n <= WC_MAX_OPPONENTS && wcEligiblePool().length >= wcWordCount();
  }

  /* START. First time: the guide, then the round (WC_GUIDE.onStart). Every
     other time — or if the guide cannot open for ANY reason — the round starts
     at once, exactly as it did before the guide existed. No sound here: the
     app's shared click handler already clicks for .start-btn. */
  function wcStartFromMenu() {
    var opened = false;
    try {
      if (wcGuideWanted() && wcGuideAvailable() && wcRoundWouldStart()) {
        opened = window.openHowToGuide(WC_GUIDE, 'start') === true;
      }
    } catch (e) {
      opened = false;
    }
    if (!opened) wcStartRound();
  }

  // The setup screen's "How to play" button. Never starts a round.
  function wcOpenGuideReview() {
    try {
      if (wcGuideAvailable() && window.openHowToGuide(WC_GUIDE, 'review') === true &&
          typeof playSound === 'function') {
        playSound('snd-menu-click');
      }
    } catch (e) { /* the button simply does nothing */ }
  }

  function wcInjectGuideStyles() {
    if (document.getElementById('wc-guide-styles')) return;
    var el = document.createElement('style');
    el.id = 'wc-guide-styles';
    el.textContent = WC_GUIDE_CSS;
    document.head.appendChild(el);
  }

  /* =======================================================================
     7 · GAME VIEW  (Phase 3: the card table)
     -----------------------------------------------------------------------
     Landscape-first. Height is the scarce dimension in landscape, so the whole
     table is sized from the available height through three custom properties
     (--wc-hand-h, --wc-table-h, --wc-seat-h) recomputed on every resize. Card
     WIDTH follows height at the 3:4 ratio; font size scales on its own curve
     with a hard floor, because text stops being readable long before a card
     stops being tappable.

     Nothing in this section is called by the rules core — it only reads game
     state and calls into §4. Replacing the visuals never risks the rules.
     ======================================================================= */

  var WC_CARD_RATIO = 0.75;     // width ÷ height (3:4 portrait)
  var wcTimer = null;           // pending CPU move, cleared on teardown
  var wcGS = null;              // the live game state
  var wcSelected = null;        // card id lifted out of the fan, awaiting confirm
  var wcReveal = null;          // a challenged hand, shown until the next action
  var wcSeatFx = null;          // { pi, label, kind } — an announcement on one seat
  var wcHolding = false;        // true while the table is waiting on an announcement
  var wcStateMsg = null;        // what the state line says instead of whose turn it is
  var wcMoveLog = [];           // the last few moves, oldest first
  var wcTopbarForced = false;   // true if WE collapsed the topbar on entry
  var wcTurnSounded = false;    // latched while the turn is yours — see wcTurnSound
  var wcFlights = [];           // sprites currently in the air — see wcClearFlights
  var wcFlyHidden = null;       // { cardId: true } — slots a card is flying INTO
  var wcFlyHoldTop = null;      // { card, colour } — what the discard shows mid-flight
  var wcSeatHold = null;        // { pi: n } — cards counted but still crossing to a seat
  var wcResultReady = false;    // has the pause after the winning card elapsed?
  var wcResultTimer = null;
  /* The landmark this win just unlocked, or null. Computed ONCE in
     wcOnFinished — where the counter is actually bumped — and only READ by the
     renderer, because wcRenderOverlay rebuilds through innerHTML on every
     render and would otherwise re-detect (and re-award) on each one. */
  var wcResultBadge = null;
  /* When the direction last reversed, as a timestamp — or null. Read by
     wcRenderCentre to decide whether the arrow is mid-flourish and, if so, how
     far in. A timestamp rather than a boolean precisely so that a re-render
     during the flourish resumes it instead of restarting it. */
  var wcDirAt = null;
  /* When the colour in force last changed, for the chip's flourish, and
     which seats are currently sitting out. Both live here rather than in
     the DOM for the reason §7's header gives: the renderers rebuild their
     containers with innerHTML, so anything written into the markup after a
     render is destroyed by the next one. State the renderers READ survives;
     state they are handed does not. */
  var wcSkipMarks = {};        // { pi: label } — cleared when play returns
  /* A forced draw that must not start until an overlay has been dismissed.
     The challenge reveal sits at z-index 20 and the flight layer at 18, so
     cards launched while it is up would fly BEHIND the panel showing the hand
     that caused them. Holds the event-log mark, and wcFlyEaten replays from it
     the moment the panel goes. */
  var wcHeldDraw = null;

  // Monotonic-ish clock. Date.now() is fine here: the only thing measured is
  // how long ago a reverse happened, over a sub-second span, for a decoration.
  function wcNow() { return Date.now(); }

  /* ---- speech ----------------------------------------------------------
     wcSpeaking   the table is holding for a card being read aloud
     wcSpeakTimer the ONE timer this layer owns at a time — the gap before a
                  match's voice, then the watchdog, then the deferred release.
                  Cleared by teardown, which audit.js checks.
     wcSpeakOwed  the pause the next scheduled step was owed when the gate
                  turned it away, so releasing does not silently drop an
                  announcement's hold. */
  var wcSpeaking   = false;
  var wcSpeakTimer = null;
  var wcSpeakOwed  = 0;
  // Has this round's result been banked? Separate from wcResultReady because
  // the panel may now be held back by speech, so wcOnFinished can legitimately
  // run more than once per round — and wins must be counted exactly once.
  var wcResultBanked = false;

  /* Called after a play, with the direction as it was BEFORE. Records the
     moment only when the direction actually changed — a Reverse in a
     two-player game still flips gs.dir, which is correct and worth showing,
     but a Skip or a word card must not set this off. */
  function wcMarkReverse(g, prevDir) {
    if (g && prevDir !== undefined && g.dir !== prevDir) wcDirAt = wcNow();
  }

  /* The arrow's attributes. A node created 300ms into an 800ms flourish is
     handed animation-delay:-300ms, which starts it 300ms in — so it lands
     exactly where its predecessor was rather than snapping back to the start. */
  function wcDirAttrs(gs) {
    var cls = 'wc-dir' + (gs.dir === 1 ? '' : ' wc-dir-rev');
    var style = '';
    if (wcDirAt !== null) {
      var elapsed = wcNow() - wcDirAt;
      if (elapsed >= 0 && elapsed < WC_DIR_MS) {
        cls += ' wc-dir-turn';
        style = ' style="animation-delay:-' + elapsed + 'ms"';
      }
    }
    return 'class="' + cls + '"' + style;
  }

  /* --- Focus, for the four panels that own the table ---------------------
     The colour picker, the challenge question, the challenge reveal and the
     end-of-round panel all stop the game until they are answered. Before
     Phase 7 none of them touched focus at all — the word `focus(` did not
     appear once in this file — so a keyboard player's focus stayed wherever
     it was, usually on a hand card that was now behind a modal and disabled.

     Three rules, and the third is the one that is easy to get wrong:
       1. When a panel opens, focus its first control.
       2. Tab cycles inside it and cannot leave.
       3. Focus is moved ONCE PER PANEL, not once per render. wcRenderOverlay
          rebuilds its markup through innerHTML on every render, and a round
          renders many times while a panel is open — re-focusing each time
          would drag the caret back to the first button every few hundred
          milliseconds while the player was trying to tab away from it. The
          key below is what makes "the same panel" a thing that can be
          recognised across those rebuilds. */
  var wcOverlayKey = null;      // which panel is currently up
  var wcFocusReturn = null;     // what had focus before it opened
  var wcOverlayFocusIdx = -1;   // where focus was, by index, before a rebuild

  function wcOverlayFocusables(root) {
    return [].slice.call(root.querySelectorAll('button:not([disabled])'));
  }

  /* Read BEFORE the panel's markup is rewritten. innerHTML destroys the node
     that has focus, and a destroyed node cannot be refocused — so what
     survives a rebuild is its POSITION, not its identity. Called at the top of
     wcRenderOverlay, which is the last moment the old DOM still exists. */
  function wcNoteOverlayFocus(root) {
    wcOverlayFocusIdx = -1;
    var a;
    try { a = document.activeElement; } catch (e) { return; }
    if (!a || !root.contains(a)) return;
    var i = wcOverlayFocusables(root).indexOf(a);
    if (i >= 0) wcOverlayFocusIdx = i;
  }

  /* Called after wcRenderOverlay has written its markup, with a key naming
     what it wrote. A null key means the overlay is empty. */
  function wcSyncOverlayFocus(root, key) {
    if (key === wcOverlayKey) {
      /* Same panel, rebuilt. Whatever had focus a moment ago no longer exists,
         so focus has silently fallen to <body> and a keyboard player is
         stranded behind a modal they cannot reach. Put it back where it was —
         by index, because that is all that survived. Doing nothing here is
         what the first draft did, and it lost focus on every render. */
      if (key !== null && wcOverlayFocusIdx >= 0) {
        var f = wcOverlayFocusables(root);
        var want = f[Math.min(wcOverlayFocusIdx, f.length - 1)];
        var cur;
        try { cur = document.activeElement; } catch (e) { cur = null; }
        if (want && (!cur || !root.contains(cur))) { try { want.focus(); } catch (e) {} }
      }
      return;
    }
    var opening = (wcOverlayKey === null && key !== null);
    var closing = (key === null && wcOverlayKey !== null);
    wcOverlayKey = key;

    if (closing) {
      var back = wcFocusReturn;
      wcFocusReturn = null;
      // Back where they came from, if it is still on the page — a panel that
      // ends the round removes the hand it was opened from.
      try {
        if (back && back.isConnected && typeof back.focus === 'function') back.focus();
        else {
          /* Everything inside the table is rebuilt by innerHTML on the very
             next render, so handing focus to a hand card or the draw pile
             works for one frame and then drops to <body> — which is what the
             first two attempts at this did. The handbar is part of the shell:
             built once, never replaced. It carries tabindex="-1" purely so it
             can receive focus without entering the tab order, which is the
             standard anchor pattern for exactly this. */
          var anchor = document.querySelector('.wc-handbar');
          if (anchor) { try { anchor.focus(); } catch (e) {} }
        }
      } catch (e) { /* focus is a courtesy, never a dependency */ }
      return;
    }
    if (opening) {
      try {
        var a = document.activeElement;
        wcFocusReturn = (a && a !== document.body) ? a : null;
      } catch (e) { wcFocusReturn = null; }
    }
    var first = wcOverlayFocusables(root)[0];
    if (first) { try { first.focus(); } catch (e) {} }
  }

  /* The trap. Bound once to the overlay element, which the shell builds and
     never replaces — binding it to the panel markup would attach a listener
     that the next innerHTML silently discards, which is the mistake §7's
     header says has already been made twice here. */
  function wcBindOverlayKeys(root) {
    if (!root || root.dataset.wcKeys === '1') return;
    root.dataset.wcKeys = '1';
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = wcOverlayFocusables(root);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* The one place the glyph switch is read. state.wcColourGlyphs is still
     honoured underneath it, so restoring the feature is a single constant in
     §1 — and until then a stale `true` in someone's localStorage cannot turn
     the symbols back on by itself. */
  function wcGlyphsOn() {
    return WC_COLOUR_GLYPHS && state.wcColourGlyphs !== false;
  }

  /* --- Handing the turn over ---------------------------------------------
     The rules commit and re-render the instant a card is played, so the next
     seat used to light up while the previous player's card was still crossing
     the table. This holds the highlight back by WC_TURN_HOLD_MS so the play
     and its consequence are two events rather than one.

     It delays a CLASS and nothing else. No rule consults it, no flight waits
     on it, and the scheduler's own delay is far longer — so a round with
     motion off, or a tab in the background, plays exactly as it did. */
  var wcTurnAt = null, wcTurnLast = null;
  var wcMatchAt = null;        // when the last matched pair landed

  /* Stamped from wcRender, the only place that sees every turn change however
     it was caused — a play, a draw, a skip resolving inside the rules. */
  /* Push the highlight's arrival back by however long the motion for this
     move was COMPUTED to take. The turn advances inside the rules the instant
     a card is played — long before its sprite lands, and much longer before a
     +4's four cards have finished flying — so stamping at state-commit lit the
     next seat while the previous player's cards were still in the air. That is
     the whole complaint: the highlight and the consequence arrive together and
     read as one event.

     Computed, never observed: the flights already report their own duration
     before anything moves, and this reuses that number. Nothing waits on a
     sprite, so a table with motion off behaves exactly as before. */
  function wcDelayTurnArrival(ms) {
    if (!ms || ms <= 0 || wcTurnAt === null) return;
    var until = wcNow() + ms;
    if (until > wcTurnAt) wcTurnAt = until;
  }

  function wcNoteTurn(gs) {
    if (!gs || gs.turn === wcTurnLast) return;
    wcTurnLast = gs.turn;
    wcTurnAt = wcNow();
    /* Spoken on the EDGE into a turn, never on a re-render — the same latch
       the "your turn" sound uses, and for the same reason: a live region fed
       on every render is a stutter, not an announcement. Deliberately not
       spoken during the deal, when the turn is not yet anybody's. */
    if (!gs.finished && !wcDealing()) {
      try {
        wcSay(gs.players[gs.turn].isHuman
          ? 'Your turn. ' + wcHandSummary(gs)
          : gs.players[gs.turn].name + ' is thinking');
      } catch (e) { /* see wcSayInto: commentary never blocks a render */ }
    }
  }

  /* What a screen-reader player needs at the top of their turn and cannot get
     by looking: what is on the pile, what colour is in force, and how many
     cards they are holding. */
  function wcHandSummary(gs) {
    var top = wcTop(gs);
    var col = wcColourOf(gs.colour);
    var n = gs.players[0].hand.length;
    return 'Pile: ' + (top ? wcCardLabel(gs, top) : 'empty') +
           '. Colour: ' + (col ? col.en : 'none') +
           '. You hold ' + n + (n === 1 ? ' card.' : ' cards.');
  }

  /* The delay is spent entirely in CSS, and that is the point. An earlier
     draft scheduled a re-render when the hold expired — which put a second
     timer into a scheduler whose whole design is ONE timer at a time, and two
     suites hung on it within a minute. Nothing is scheduled now: the seat is
     given an animation whose first WC_TURN_HOLD_MS hold the un-highlighted
     look, and the browser does the waiting.

     The negative delay is the wcDirAttrs trick again, and it is not optional
     here — innerHTML rebuilds the seats on every render, and a fresh node
     restarts its animation. Without this, any render landing during a CPU's
     turn would drop that seat back to unhighlighted and light it up a second
     time. That is the bug the handoff says has already been made twice. */
  function wcTurnAttrs() {
    var total = WC_TURN_HOLD_MS + WC_TURN_IN_MS;
    var elapsed = (wcTurnAt === null) ? total : (wcNow() - wcTurnAt);
    if (typeof elapsed !== 'number' || isNaN(elapsed)) elapsed = total;
    /* NEGATIVE means the arrival is still in the future — motion from the
       previous move has not finished. The same expression handles both cases:
       a positive delay holds the animation's un-highlighted first frame until
       its moment, a negative one drops it into an animation already running.
       Floored so an unusually long draw cannot park the highlight for seconds. */
    if (elapsed < -WC_TURN_WAIT_MAX_MS) elapsed = -WC_TURN_WAIT_MAX_MS;
    if (elapsed > total) elapsed = total;
    return ' style="animation-delay:' + Math.round(-elapsed) + 'ms,' +
           Math.round(total - elapsed) + 'ms"';
  }

  /* A seat stops sitting out the moment play reaches it again — which is the
     honest definition, and it means the mark can never outlive what it
     describes. Called from wcRender, before anything is drawn. */
  function wcExpireSkipMarks(gs) {
    if (!gs) return;
    if (wcSkipMarks[gs.turn] !== undefined) delete wcSkipMarks[gs.turn];
  }

  /* Seat 0 is marked too, even though it has no box in the row. The hand is
     its box: wcRenderHand dims it, which is the only feedback a human had that
     they had LOST a turn rather than simply being between turns. Cleared by
     wcExpireSkipMarks the moment play reaches them again, exactly like a CPU's. */
  function wcMarkSkipped(pi, label) {
    if (pi >= 0 && label) wcSkipMarks[pi] = label;
  }

  function wcClearTimer() {
    if (wcTimer) { clearTimeout(wcTimer); wcTimer = null; }
  }

  /* Announcements do NOT expire on a timer of their own.

     They used to, and it made the pause invisible: the badge cleared after
     WC_EVENT_MS while the next CPU was scheduled at think + WC_EVENT_MS, so
     the message vanished and then over a second of empty table went by before
     anything moved. The wait was real and was being spent on a blank screen.

     Now an announcement stays up until the next thing actually happens — it is
     cleared at the START of the next CPU step, and when you act. The table is
     never blank while it is waiting, and when the turn comes back to you the
     last thing that happened is still on screen. */
  function wcClearFx() {
    wcSeatFx = null;
    wcHolding = false;
    wcStateMsg = null;
  }

  /* --- Saying things out loud -------------------------------------------
     Text into a live region. Written as textContent, never innerHTML: the log
     and the announcements carry <strong> markup for the eye, and a screen
     reader reading tag soup is worse than one reading nothing.

     Repeats are the trap. A live region only fires when its content CHANGES,
     so two identical announcements in a row are silent — and "your turn"
     twice running is a real sequence in this game. A zero-width space is
     appended on alternate writes so the string always differs while the
     spoken result does not. */
  var wcSaidToggle = false;

  /* NOTHING may depend on this, and nothing may be taken down by it. The
     commentary is assembled from card labels, player names and colours — all
     of which are derived from game state that a test, or a corrupt save, can
     hand over malformed. wcNoteTurn runs at the top of wcRender, so a throw
     in here aborts the entire render and silently takes the card sounds,
     the seats and the hand with it. That is not hypothetical: it cost the
     CPU's Draw Two sound, and test-sound.js caught it.

     Same standing as the trophy badges on the setup screen — decoration that
     is never allowed to block the thing it decorates. */
  function wcSayInto(id, text) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById(id);
    if (!el) return;
    var t = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) { el.textContent = ''; return; }
    wcSaidToggle = !wcSaidToggle;
    el.textContent = wcSaidToggle ? t : t + '\u200B';
  }

  function wcSay(text)   { wcSayInto('wc-live', text); }
  function wcAlert(text) { wcSayInto('wc-alert', text); }

  // One line in the move log. Rolls at WC_LOG_LINES; never scrolls, never
  // clears — it is the thing you glance at after looking away.
  function wcLogMove(text) {
    wcMoveLog.push(text);
    while (wcMoveLog.length > WC_LOG_LINES) wcMoveLog.shift();
    /* The log already receives every move, by you and by every CPU, with the
       card named. Hanging the commentary here rather than at each call site
       means the two can never drift apart — and it is the same reasoning that
       put the card sounds on their own single seam. */
    try { wcSay(text); } catch (e) { /* never block the log with its narration */ }
  }

  /* --- Sound ------------------------------------------------------------- */

  /* The sound a played card makes, for a CPU or for you. An action card
     REPLACES the generic play click rather than sounding on top of it — see
     WC_CARD_SOUND in §1.

     Deliberately NOT called from wcAnnounceCard, which is where the visible
     announcement for these same cards lives. That function returns early once
     g.finished is set, because the results screen covers a won round; routing
     audio through it would silence the Draw Two that WINS the game, which is
     the single most satisfying one in the deck. */
  function wcCardSound(card, byCpu, isMatch) {
    if (typeof playSound !== 'function') return;
    var id = card && WC_CARD_SOUND[card.kind];
    // A match REPLACES the click too. It can never collide with the line above:
    // a match is a word card by definition, and word cards are not in the table.
    if (!id && isMatch) id = WC_MATCH_SOUND;
    playSound(id || (byCpu ? 'snd-cpu-click' : 'snd-sentence-put'));
  }

  /* Is speech wanted AND possible right now? Every clause is a first-class
     bail, in the same spirit as unmeasurable geometry in the flight layer: no
     setting, no engine, no Thai voice — no speech, no gate, and the round
     plays exactly as it did before any of this existed. `tts` is a const in
     index.html, so a bare reference would throw where this file is loaded
     without it; typeof is what makes that safe. */
  function wcSpeakOn() {
    if (state.wcSpeak === 'off') return false;
    if (typeof tts === 'undefined' || !tts) return false;
    if (tts.supported !== true || typeof tts.speak !== 'function') return false;
    return (typeof tts.hasThaiVoice === 'function') ? !!tts.hasThaiVoice() : false;
  }

  /* Speak a played card, if it is one that should be spoken. Returns whether
     the table is now holding. Called AFTER the state is committed, like every
     other presentation layer here — nothing about the rules waits on a voice. */
  function wcSpeakCard(gs, card, isMatch) {
    if (!card || card.kind !== 'word') return false;
    /* Thai side up speaks. English side is silent — hearing the same word
       twice per pair halves how much either hearing registers.
       EXCEPT on a match, which speaks whichever way round it was played: that
       is the moment the two halves are shown to be one word, and it is worth
       hearing the Thai for it even when the English is the card you laid. */
    if (card.face !== 'th' && !isMatch) return false;
    if (!wcSpeakOn()) return false;
    var w = gs.words[card.wordIdx];
    if (!w || !w.th) return false;
    wcSpeakBegin(w.th, isMatch ? WC_SPEAK_MATCH_GAP_MS : 0);
    return true;
  }

  /* What a match did, on the state line. Deliberately NOT wcAnnounce: that
     holds the table, and this play already has a chime, a gap and a spoken
     word attached to it. The line is cleared by wcClearFx at the next step,
     like every other message here. */
  /* Who matched what, with no consequence attached. Split out because under
     WC_MATCH_EFFECT 'skip' the same opening clause has to be reused by
     wcAnnounceCard, which builds the rest of the sentence itself. */
  function wcMatchLead(gs, pi, card) {
    var who = (pi === 0) ? 'You matched' : escapeHtml(gs.players[pi].name) + ' matched';
    return who + ' \u201C' + escapeHtml(wcWordLabel(gs, card, true)) + '\u201D';
  }

  /* NOT called under 'skip' — see the callers. That rule holds the table, so
     its message is an announcement rather than a bare state line, and
     wcAnnounce would clear anything written here before it. */
  function wcMatchMessage(gs, pi, card) {
    wcStateMsg = wcMatchLead(gs, pi, card) +
      (wcEffectOf(gs) === 'draw'
        ? ' \u2014 everyone else draws ' + WC_MATCH_DRAW + '.'
        : '!');
  }

  function wcSpeakBegin(text, delayMs) {
    wcSpeakStop();
    wcSpeaking = true;
    if (delayMs > 0) {
      wcSpeakTimer = setTimeout(function () { wcSpeakTimer = null; wcSpeakGo(text); }, delayMs);
    } else {
      wcSpeakGo(text);
    }
  }

  function wcSpeakGo(text) {
    var fired = false;
    /* The release is ALWAYS deferred by a tick, never run on the caller's
       stack. tts.speak() calls onDone synchronously when it has nothing to
       say, and a synchronous release would re-enter wcMaybeCpu from inside the
       play that started it — scheduling a CPU that the play is about to
       schedule again. */
    var finish = function () {
      if (fired) return;
      fired = true;
      if (wcSpeakTimer) { clearTimeout(wcSpeakTimer); wcSpeakTimer = null; }
      wcSpeakTimer = setTimeout(function () { wcSpeakTimer = null; wcSpeakRelease(); }, 0);
    };
    // Armed BEFORE the utterance, so a speak() that throws or never calls back
    // is still on a clock.
    wcSpeakTimer = setTimeout(finish, WC_SPEAK_MAX_MS);
    try { tts.speak(text, null, { onDone: finish }); }
    catch (e) { finish(); }
  }

  // Speech ended (or ran out of patience). Hand the table back.
  function wcSpeakRelease() {
    if (wcSpeakTimer) { clearTimeout(wcSpeakTimer); wcSpeakTimer = null; }
    if (!wcSpeaking) return;
    wcSpeaking = false;
    var owed = wcSpeakOwed;
    wcSpeakOwed = 0;
    if (!wcGS) return;
    /* A round won on a spoken card: the panel was waiting for this. Routed
       back through wcOnFinished rather than straight to wcArmResultPanel so
       that there is exactly ONE way a finished round is handled — which is
       also what makes wcResultBanked load-bearing rather than decorative. */
    if (wcGS.finished) { wcOnFinished(); return; }
    wcMaybeCpu(owed);
  }

  /* Cut speech off outright. Used when the player acts — they have moved on,
     and a voice describing the previous move is now just noise — and when the
     round is torn down. Does NOT re-enter the scheduler: whatever called this
     is about to schedule for itself. */
  function wcSpeakStop() {
    if (wcSpeakTimer) { clearTimeout(wcSpeakTimer); wcSpeakTimer = null; }
    wcSpeaking = false;
    wcSpeakOwed = 0;
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {}
  }

  /* THE INVARIANT: nothing may cancel the thing the scheduler is waiting on
     without also releasing the scheduler.

     wcSpeakStop() on its own is correct for teardown and for starting a round
     — there is no table left to re-arm. It is NOT correct mid-round: while
     wcSpeaking is true the scheduler has bailed and is holding wcSpeakOwed,
     and stopping the voice without handing that beat back leaves the table
     waiting for a release that can never come. That is a permanent freeze, and
     it is what the off-turn guard above now prevents from being reachable.
     This is the second lock on the same door. */
  function wcSpeakCut() {
    var wasHolding = wcSpeaking;
    var owed = wcSpeakOwed;
    wcSpeakStop();
    if (wasHolding && wcGS && !wcGS.finished) wcMaybeCpu(owed);
  }

  /* "It's your turn" has no event of its own. The turn simply arrives, from a
     dozen different paths — a CPU played, a stack was eaten, a challenge
     resolved, someone was skipped — and no single call site sees all of them.
     So it is derived from rendered state instead, and LATCHED: the cue fires
     on the edge INTO your turn and not again until the turn has genuinely
     left you.

     The latch is what keeps it honest. Drawing a playable card and pausing
     over it, or picking a colour, are all still your turn, and each of them
     re-renders several times — an unlatched cue would fire on every one of
     them. Conversely a successful challenge hands your turn back through the
     'challenge' phase, which clears the latch on the way past, so getting
     your turn back is announced. That is correct: you did just get it back.

     Round start is pre-latched in wcStartRound so this never lands in the
     same instant as snd-start. */
  function wcTurnSound(gs) {
    var mine = (!gs.finished && !wcDealing() && gs.turn === 0 && gs.phase === 'play');
    if (!mine) { wcTurnSounded = false; return; }
    if (wcTurnSounded) return;
    wcTurnSounded = true;
    if (typeof playSound === 'function') playSound('snd-uno-turn');
  }

  /* --- Cards in flight ---------------------------------------------------

     THE ORDERING IS THE DESIGN. Every flight runs strictly after the game
     state has already changed:

         capture where the card is now
         mutate gs, render                    <- the table is CORRECT here
         capture where the card ended up
         hide the destination, fly a sprite into it
         on landing: unhide, render again

     Nothing waits on a sprite and no rule consults one. A flight that never
     starts, or never finishes — reduced motion, a backgrounded tab, teardown
     mid-air — costs a cosmetic suppression flag and nothing else. The reverse
     ordering, animating first and committing on landing, would put the rules
     behind a timer and make every one of those cases a wedged table.

     WHY THE HIDING IS RENDERER STATE, not a style written onto a node: §7
     rebuilds its containers through innerHTML on every render, so anything
     applied to an element afterwards is gone by the next frame. That mistake
     has been made twice in this file already, and cost an unpainted colour
     badge both times. wcFlyHidden and wcFlyHoldTop are read BY the renderers,
     which is the only arrangement that survives a re-render mid-flight. */

  // The view is the coordinate space: .wc-game-view is position:relative, so
  // every pose below is expressed relative to its own top-left corner.
  function wcViewEl() { return document.getElementById('view-wordcards-game'); }

  /* A rect, or null if the element cannot be measured.

     Null is a FIRST-CLASS answer, not an error path. An element that is
     hidden, detached, or not yet laid out has no meaningful position, and
     flying a card to or from nowhere is worse than not flying it. It is also
     what makes this whole layer inert under test: jsdom has no layout engine
     and returns zeroes for everything, so no flight ever starts and none of
     the existing suites had to be touched to accommodate one. */
  function wcRectOf(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    var r = el.getBoundingClientRect();
    if (!r || !(r.width > 0) || !(r.height > 0)) return null;
    return r;
  }

  /* The seat box for a player. Seat 0 is you and has no box at all.

     BY IDENTITY, NOT BY POSITION. This used to return root.children[pi - 1],
     which was true right up until the direction arrows were interleaved into
     the same row — after that the children are [seat, arrow, seat, arrow,
     seat] and every lookup past the first was off. Seat 2 resolved to an arrow
     and seat 3 to seat 2, so at three or four players every drawn card flew to
     the wrong player: a +2, a +4, a challenge penalty, a matched-pair draw.

     The suites did not catch it because their fake layout hands every seat the
     same rectangle, so a flight to the wrong seat lands in the right place.
     test-clarity gives each seat a distinct rect for exactly this reason.

     A data attribute rather than an index into the matches, because the next
     thing added to this row should not be able to break it either. */
  function wcSeatEl(pi) {
    var root = document.getElementById('wc-seats');
    if (!root || pi < 1) return null;
    return root.querySelector('[data-wc-seat="' + pi + '"]') || null;
  }

  /* Where a card should START from, or LAND on, for a given seat.

     For an opponent that is the little fan under their name — the last mini in
     the stack, so a card leaves from and arrives at the pile it belongs to.
     The mini is 11–18px tall against a table card's 100-plus, which is where
     the shrink and the grow come from: the sizes are already right, the
     animation only has to travel between them. */
  function wcSeatCardEl(pi) {
    var seat = wcSeatEl(pi);
    if (!seat) return null;
    var minis = seat.querySelectorAll('.wc-mini');
    if (minis.length) return minis[minis.length - 1];
    return seat.querySelector('.wc-seat-stack') || seat;
  }

  function wcHandCardEl(cardId) {
    var hand = document.getElementById('wc-hand');
    if (!hand || !cardId) return null;
    var btn = hand.querySelector('[data-wc-arg="' + cardId + '"]');
    return btn ? (btn.querySelector('.wc-c') || btn) : null;
  }

  function wcPileEl(which) {
    var sel = (which === 'draw') ? '.wc-pile-draw .wc-c' : '.wc-pile-discard .wc-c';
    return document.querySelector(sel);
  }

  /* Is motion wanted at all? matchMedia is typeof-guarded because jsdom does
     not implement it — an unguarded call throws at load and takes every test
     suite with it. */
  function wcAnimOn() {
    if (!WC_ANIM_ENABLED) return false;
    try {
      if (typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* no matchMedia — assume motion is fine */ }
    return true;
  }

  /* Turn a target rect into a pose for a sprite of the given natural size.

     The sprite is always built at ONE size — the hand card, the largest the
     table uses — and scaled to fit wherever it is going. Rendering small and
     scaling up would be soft; animating width and height instead of transform
     would force a reflow per frame, which on a phone is the difference between
     a flight and a stutter.

     Scale is taken from height, and the result is centred horizontally on the
     target. That matters at the seats: .wc-mini is 0.70 wide for its height
     where a card is 0.75, so matching height exactly and centring the small
     difference is closer than matching either edge. */
  function wcFlyPose(rect, layer, w, h) {
    var s = rect.height / h;
    return {
      x: (rect.left - layer.left) + (rect.width - w * s) / 2,
      y: (rect.top - layer.top),
      s: s
    };
  }
  function wcPoseCss(p) {
    return 'translate(' + p.x.toFixed(2) + 'px,' + p.y.toFixed(2) + 'px) scale(' + p.s.toFixed(4) + ')';
  }

  /* Remove every sprite in the air and put the table back the way it should
     look. Called at the three points where a flight can be orphaned: teardown,
     the start of a new round, and a player skipping a held announcement.

     NOT called from wcClearFx(). That runs at the start of every CPU step —
     but also from inside wcAnnounce(), which happens DURING a step, after the
     step's own flight has already set off. Clearing there would cancel each
     flight a few lines after launching it. */
  function wcClearFlights(silent) {
    while (wcFlights.length) {
      var f = wcFlights.pop();
      if (f.timer) clearTimeout(f.timer);
      if (f.el && f.el.parentNode) f.el.parentNode.removeChild(f.el);
    }
    var had = wcFlyHidden || wcFlyHoldTop || wcSeatHold;
    wcFlyHidden = null;
    wcFlyHoldTop = null;
    wcSeatHold = null;
    if (had && !silent && wcGS) wcRender();
  }

  /* Build a two-faced sprite and send it from one pose to the other.

     `opt.faceCard`  the card to show face-up (null for a back-only sprite)
     `opt.startDown` true to set off face-down and turn over in flight
     `opt.hideId`    the card id this sprite is uncovering, if any
     `opt.releaseTop` true if landing should put the played card on the pile
     `opt.onLand`    run when it arrives

     Returns the total time the sprite will be in the air, or 0 if no flight
     was possible — in which case the caller has already done everything that
     actually matters. */
  function wcFlySprite(from, to, opt) {
    var layerEl = document.getElementById('wc-fly-layer');
    var view = wcViewEl();
    if (!layerEl || !view || !from || !to) return 0;
    var layer = wcRectOf(view);
    if (!layer) return 0;

    // The sprite's natural size, straight from the variables the stylesheet
    // uses. Unreadable (again: no layout engine under test) means no flight.
    var cs = window.getComputedStyle(view);
    var w = parseFloat(cs.getPropertyValue('--wc-hand-w'));
    var h = parseFloat(cs.getPropertyValue('--wc-hand-h'));
    if (!(w > 0) || !(h > 0)) return 0;

    var gs = wcGS;
    var faceHtml = (opt.faceCard && gs) ? wcCardFaceHtml(gs, opt.faceCard, 'wc-c-hand') : '';
    var backHtml = wcCardBackHtml('wc-c-hand');
    var flip = !!(opt.startDown && faceHtml);

    var el = document.createElement('div');
    el.className = 'wc-fly wc-c-hand';
    el.innerHTML = '<div class="wc-fly-inner">' +
      (flip ? backHtml + faceHtml.replace('class="wc-c ', 'class="wc-fly-b wc-c ')
            : (faceHtml || backHtml)) +
      '</div>';

    var flyMs  = WC_FLY_MS[wcSpeedKey()];
    var flipMs = WC_FLIP_MS[wcSpeedKey()];
    var flipAt = Math.round(flyMs * WC_FLIP_AT);
    var total  = flip ? Math.max(flyMs, flipAt + flipMs) : flyMs;

    var a = wcFlyPose(from, layer, w, h);
    var b = wcFlyPose(to,   layer, w, h);
    el.style.transform = wcPoseCss(a);
    layerEl.appendChild(el);

    var inner = el.firstChild;
    // Committing the start pose before transitions exist is what makes the
    // browser animate from A to B rather than jumping straight to B.
    void el.offsetWidth;
    el.style.transition = 'transform ' + flyMs + 'ms cubic-bezier(.33,.9,.35,1)';
    el.style.transform = wcPoseCss(b);
    if (flip) {
      inner.style.transition = 'transform ' + flipMs + 'ms cubic-bezier(.34,1.15,.5,1) ' + flipAt + 'ms';
      inner.classList.add('wc-fly-turn');
    }

    var rec = { el: el, timer: null };
    /* setTimeout, not transitionend. transitionend never fires in jsdom, and
       in a real browser it does not fire either if the element is removed or
       the transition is interrupted — so waiting on it is how a sprite and its
       suppression flag leak. A leaked wcFlash timer is already on this
       project's record as a genuine bug. */
    rec.timer = setTimeout(function () {
      var i = wcFlights.indexOf(rec);
      if (i !== -1) wcFlights.splice(i, 1);
      if (el.parentNode) el.parentNode.removeChild(el);
      var changed = false;
      /* Uncover THIS card, not every card. Sprites overlap — a stagger of 75ms
         against a flight of 260ms keeps three in the air at once — so waiting
         for the registry to empty would hold every landed card invisible until
         the last one arrived. On a 28-card deal that is the difference between
         cards appearing as they land and the whole hand snapping in at the
         end. The registry-empty branch below stays as a safety net. */
      if (opt.hideId && wcFlyHidden && wcFlyHidden[opt.hideId]) {
        delete wcFlyHidden[opt.hideId];
        changed = true;
      }
      /* The pile takes the played card when THAT card lands, not when the
         registry happens to empty. A Draw Two chains an eat behind it, so the
         registry is still busy long after the card itself is down — waiting
         for empty would leave the wrong card showing on the pile for the whole
         length of the eat. */
      if (opt.releaseTop && wcFlyHoldTop) { wcFlyHoldTop = null; changed = true; }
      if (!wcFlights.length) {
        if (wcFlyHidden)  { wcFlyHidden = null;  changed = true; }
        if (wcFlyHoldTop) { wcFlyHoldTop = null; changed = true; }
        if (wcSeatHold)   { wcSeatHold = null;   changed = true; }
      }
      if (typeof opt.onLand === 'function') opt.onLand();
      if (changed && wcGS) wcRender();
    }, total + 20);
    wcFlights.push(rec);
    return total;
  }

  /* A card leaving a hand for the discard pile.

     Call AFTER the play has been committed and rendered. `srcRect` has to be
     captured before that, because by now the card is gone from wherever it
     was. `prevTop`/`prevColour` likewise: the pile has to keep showing the
     card that was on it until the new one actually lands, or the played card
     appears on the pile and is then flown a duplicate of itself.

     Your own cards fly face-up — you chose them. An opponent's set off
     face-down from their seat and turn over on the way in, which is both the
     honest depiction (their hand is hidden until they commit) and the moment
     the vocabulary on the card becomes legible. */
  function wcFlyPlay(gs, pi, card, srcRect, prevTop, prevColour) {
    if (!wcAnimOn() || !card || !srcRect) return 0;
    var dst = wcRectOf(wcPileEl('discard'));
    if (!dst) return 0;
    if (prevTop) { wcFlyHoldTop = { card: prevTop, colour: prevColour }; wcRender(); }
    var ms = wcFlySprite(srcRect, dst, {
      faceCard: card, startDown: (pi !== 0), releaseTop: true
    });
    if (!ms) { wcFlyHoldTop = null; wcRender(); }
    return ms;
  }

  /* Cards coming off the draw pile. `cards` are the ones that just arrived, in
     the order they were drawn — the last N of that player's hand.

     Yours land in the fan and turn face-up; an opponent's shrink into the fan
     under their name and stay face-down, because you never see what they took.
     Multiple cards (a Draw Two or Four being eaten) set off in sequence rather
     than together, so four cards read as four. */
  function wcFlyDraw(gs, pi, cards, srcRect, opt) {
    opt = opt || {};
    if (!wcAnimOn() || !cards || !cards.length || !srcRect) return 0;
    var mine = (pi === 0);
    var stagger = WC_FLY_STAGGER[wcSpeedKey()];
    var targets = [];
    cards.forEach(function (c) {
      targets.push(mine ? wcRectOf(wcHandCardEl(c.id)) : wcRectOf(wcSeatCardEl(pi)));
    });
    if (!targets[0]) return 0;

    /* Hide every destination up front, in one pass, BEFORE the first sprite
       moves. Two reasons: the fan must not shuffle between the measurement
       above and the sprites below, and — for a chained eat, which starts a
       beat after the card that caused it — the cards must never be visible in
       the first place. Revealing four cards and then hiding them again to fly
       them in is worse than not animating at all. */
    if (mine) {
      if (!wcFlyHidden) wcFlyHidden = {};
      cards.forEach(function (c, i) { if (targets[i]) wcFlyHidden[c.id] = true; });
    } else {
      if (!wcSeatHold) wcSeatHold = {};
      wcSeatHold[pi] = (wcSeatHold[pi] || 0) + targets.filter(Boolean).length;
    }
    wcRender();

    var wait = opt.delay || 0;
    var last = wait;
    cards.forEach(function (c, i) {
      if (!targets[i]) return;
      var launch = function () {
        // One cue for the whole draw, on the first card. `quiet` is for the
        // penalty, which has already said something louder of its own.
        if (i === 0 && !opt.quiet && typeof playSound === 'function') playSound(WC_DRAW_SOUND);
        var ms = wcFlySprite(srcRect, targets[i], {
          faceCard: mine ? c : null, startDown: mine, hideId: mine ? c.id : null,
          onLand: mine ? null : function () {
            if (wcSeatHold && wcSeatHold[pi]) { wcSeatHold[pi]--; if (wcGS) wcRender(); }
          }
        });
        if (!ms) {
          if (mine && wcFlyHidden) delete wcFlyHidden[c.id];
          if (!mine && wcSeatHold && wcSeatHold[pi]) wcSeatHold[pi]--;
          wcRender();
        }
      };
      var at = wait + i * stagger;
      if (at <= 0) { launch(); }
      else {
        last = at;
        var rec = { el: null, timer: null };
        rec.timer = setTimeout(function () {
          var k = wcFlights.indexOf(rec);
          if (k !== -1) wcFlights.splice(k, 1);
          launch();
        }, at);
        wcFlights.push(rec);
      }
    });
    return last + WC_FLY_MS[wcSpeedKey()];
  }

  /* Cards eaten INSIDE the rules, which §7 never sees happen.

     When a Draw Two lands on somebody who cannot pass it along, wcTurnStart()
     makes them eat it then and there — deep inside wcPlay(), several frames
     before this layer is told anything. The hand simply grows. There is no
     draw action to hang a flight on, and §4 must not learn about animation.

     Phase 4's event log is the seam. It records every draw with a `why`, so a
     caller can mark the log before a rules call and read back afterwards what
     the rules did on their behalf. Additive, public, and exactly what it was
     put there for.

     The flight is DELAYED behind the card that caused it: the Draw Two lands
     on the pile, and only then do the cards go out. That is the order it reads
     in, and it is the order it happens in at a real table. */
  /* One card out to every opponent, for a matched pair. Reads the {t:'match'}
     event rather than recomputing who drew, so §7 never has to know the rule —
     the same seam wcFlyEaten uses.

     Staggered, so three cards leaving the pile read as three cards and not as
     one thick one. Quiet, because the match already has a sound of its own and
     three card-flips under it would be the layering §1 forbids.

     Returns how long the whole thing LASTS, so the scheduler can wait that
     long — the same contract as wcFlyEaten, and read by wcHoldFor at both call
     sites. It used to return the sprite COUNT, which those call sites then
     max'd against a duration in milliseconds: a number between 0 and 3, so the
     matched-pair flights were effectively given no hold at all and the next
     card could land over them. */
  function wcFlyMatch(gs, mark) {
    if (!gs.events) return 0;
    var evs = gs.events.slice(mark).filter(function (e) { return e.t === 'match'; });
    if (!evs.length) return 0;
    var drew = evs[evs.length - 1].drew || [];
    if (!wcAnimOn()) return 0;
    /* The celebration. Stamped rather than drawn: wcRenderCentre reads the
       timestamp and gives the pile its animation with a negative delay, so a
       render landing mid-burst JOINS it instead of restarting — the same
       contract as the direction arrow and the colour flourish. The confetti
       goes into the flight layer, which is the one container renders do not
       rebuild. */
    wcMatchAt = wcNow();
    wcMatchBurst();
    var from = wcRectOf(wcPileEl('draw'));
    var longest = 0;
    drew.forEach(function (d, i) {
      var ms = wcFlyDraw(gs, d.pi, wcJustDrawn(gs, d.pi, d.n), from,
                         { delay: i * WC_FLY_STAGGER[wcSpeedKey()], quiet: true });
      if (ms > longest) longest = ms;
    });
    return longest;
  }

  /* Confetti over the discard. Appended to the flight layer — the only
     container in the table that renders leave alone — and removed by a single
     timer this file owns, because a leaked node here would sit over the pile
     for the rest of the round. Geometry that cannot be measured is a bail, as
     everywhere else in this layer. */
  var wcMatchTimer = null;

  function wcClearMatchBits() {
    if (wcMatchTimer) { clearTimeout(wcMatchTimer); wcMatchTimer = null; }
    var layer = document.getElementById('wc-fly-layer');
    if (!layer) return;
    var bits = layer.querySelectorAll('.wc-match-bit');
    for (var i = 0; i < bits.length; i++) {
      if (bits[i].parentNode) bits[i].parentNode.removeChild(bits[i]);
    }
  }

  function wcMatchBurst() {
    if (!wcAnimOn()) return;
    var layer = document.getElementById('wc-fly-layer');
    var pile = wcRectOf(wcPileEl('discard'));
    var view = wcRectOf(document.getElementById('view-wordcards-game'));
    if (!layer || !pile || !view || !pile.width) return;   // unmeasurable: bail
    wcClearMatchBits();
    var cx = (pile.left - view.left) + pile.width / 2;
    var cy = (pile.top - view.top) + pile.height / 2;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < WC_MATCH_BITS; i++) {
      var b = document.createElement('i');
      b.className = 'wc-match-bit wc-match-bit-' + (i % 4);
      /* Spread deterministically rather than randomly: the suites replace
         Math.random to control the AI, and a decoration that consumes draws
         from the same generator would shift every roll after it. */
      var ang = (i / WC_MATCH_BITS) * Math.PI * 2;
      var dist = 46 + (i % 5) * 13;
      b.style.left = cx + 'px';
      b.style.top = cy + 'px';
      b.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
      b.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 18) + 'px');
      b.style.animationDelay = (i % 3) * 40 + 'ms';
      frag.appendChild(b);
    }
    layer.appendChild(frag);
    wcMatchTimer = setTimeout(function () {
      wcMatchTimer = null;
      wcClearMatchBits();
    }, WC_MATCH_MS + 260);
  }

  /* Every card a player was MADE to take, flying out of the pile one after
     another. Returns how long the whole thing lasts, so the scheduler can wait
     that long — see wcHoldFor.

     Two things this used to get wrong. It matched only why:'pending', which
     meant the 4 a caught bluffer draws and the 6 a wrong challenger draws were
     never animated — they simply appeared in a hand. And it animated only the
     LAST matching event, so when a single resolution made two different people
     draw, one of them was invisible.

     Stacked draws are staggered against each other as well as within
     themselves, so two seats drawing never overlap into one blur. */
  function wcFlyEaten(gs, mark, delayMs) {
    if (!wcAnimOn() || !gs.events) return 0;
    var evs = gs.events.slice(mark).filter(function (e) {
      return e.t === 'draw' && (e.why === 'pending' || e.why === 'challenge') && e.n > 0;
    });
    if (!evs.length) return 0;
    var from = wcRectOf(wcPileEl('draw'));
    var at = delayMs || 0;
    var longest = 0;
    var stagger = WC_FLY_STAGGER[wcSpeedKey()];
    evs.forEach(function (ev) {
      var ms = wcFlyDraw(gs, ev.pi, wcJustDrawn(gs, ev.pi, ev.n), from, { delay: at });
      if (ms > longest) longest = ms;
      if (ms) at += ev.n * stagger;
    });
    return longest;
  }

  // Somebody ate a stack but nothing is flying — no motion, or nothing
  // measurable. The cue still belongs to the moment.
  function wcEatSound(gs, mark) {
    if (!gs.events) return;
    var ate = gs.events.slice(mark).some(function (e) {
      return e.t === 'draw' && (e.why === 'pending' || e.why === 'challenge');
    });
    if (ate && typeof playSound === 'function') playSound(WC_DRAW_SOUND);
  }

  // The last n cards of a hand — what a draw or a penalty just added.
  function wcJustDrawn(gs, pi, n) {
    var hand = gs.players[pi] ? gs.players[pi].hand : [];
    return (n > 0) ? hand.slice(Math.max(0, hand.length - n)) : [];
  }

  /* --- The deal ----------------------------------------------------------

     wcCreateGame() has already dealt every card before any of this runs. What
     follows only decides how much of that is VISIBLE yet: wcDeal.shown[pi] is
     how many of player pi's cards have arrived, and the renderers read it. The
     game state is complete and correct throughout, which is what makes the
     whole sequence safely skippable.

     Three phases, one timer chain:
       shuffle   the deck riffles in place while uno-shuffle.mp3 plays
       dealing   7 x players cards, in passes, one card per step
       opening   the starter card flies to the discard and turns over

     Nothing here is required. If the table cannot be measured — no browser, or
     a view that has not been laid out — wcDealStart() declines and the round
     opens fully dealt, exactly as it did before this existed. That is also why
     the five older suites did not have to change. */

  var wcDeal = null;        // { phase, shown[], dealt, total, openingDone }
  var wcDealTimer = null;

  function wcDealing() { return !!wcDeal; }

  /* The one place a deal ends, by every route there is: finishing normally,
     being tapped away, a new round starting over the top of it, or teardown.
     The bed is stopped here so no route can leave it running — wcDealOpening
     starts the ramp early for the sound of it, and this is the guarantee. */
  function wcClearDeal() {
    if (wcDealTimer) { clearTimeout(wcDealTimer); wcDealTimer = null; }
    wcDealSoundStop(false);
    wcDeal = null;
  }

  // How many of this player's cards have arrived. Everything outside a deal
  // sees the whole hand, so callers never need to know whether one is running.
  function wcShown(gs, pi) {
    var n = wcDeal ? Math.min(wcDeal.shown[pi] || 0, gs.players[pi].hand.length)
                   : gs.players[pi].hand.length;
    // Cards already in their hand but still crossing the table to them. Same
    // idea as wcFlyHidden for your own fan: the rules are ahead of the eye,
    // and the seat number should follow the eye.
    if (wcSeatHold && wcSeatHold[pi]) n = Math.max(0, n - wcSeatHold[pi]);
    return n;
  }

  /* Cards still notionally face-down on the deck: everything not yet dealt,
     plus the starter card if it has not landed. Without this the pile shows
     its post-deal count from the first frame and visibly fails to go down. */
  function wcDealPileExtra() {
    if (!wcDeal) return 0;
    return (wcDeal.total - wcDeal.dealt) + (wcDeal.openingDone ? 0 : 1);
  }

  /* --- The dealing bed ---------------------------------------------------
     Every other sound in this mode is a one-shot: playSound() fires it and
     forgets it. uno-deal.mp3 is not — it runs underneath the deal for as long
     as the deal lasts, which is a length nothing knows in advance and which
     the file certainly does not match. So this layer owns the element
     directly rather than going through playSound(), because it needs a handle
     to stop with.

     Stopping is a ramp, not a cut. A sustained sound paused at full volume
     clicks; seven steps over 140ms does not. The ramp is setTimeout-driven
     for the same reason the flights are — there is no Web Animations API here
     and nothing may depend on a media event that a torn-down element will
     never fire.

     Every timer it creates is held in wcDealSndT so teardown can cancel the
     lot. audit.js asserts nothing is pending after teardown, and a fade left
     half-run would be exactly that. */
  var wcDealSndT = [];
  var wcDealSndOn = false;      // is the bed actually playing?

  function wcDealSoundClearTimers() {
    for (var i = 0; i < wcDealSndT.length; i++) clearTimeout(wcDealSndT[i]);
    wcDealSndT = [];
  }

  function wcDealSoundEl() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('snd-uno-deal');
  }

  function wcDealSoundStart() {
    if (state.muted) return;
    var el = wcDealSoundEl();
    if (!el) return;
    // A restart lands on top of a fade if the previous deal was skipped fast:
    // cancel the ramp and put the volume back before playing.
    wcDealSoundClearTimers();
    var cfg = WC_SOUNDS['snd-uno-deal'];
    try { el.volume = cfg ? cfg.volume : 0.4; } catch (e) { /* volume is a nicety */ }
    /* Started through the shared playSound() seam rather than el.play(), for
       three reasons: it is the single place the global mute is honoured, it
       is what every other sound in the app goes through, and it is what the
       suites replace with a spy. A direct el.play() bypasses all three — and
       lands on jsdom's unimplemented media pipeline, which reports an
       uncaught error that two suites correctly count. Only STOPPING needs the
       element itself, because playSound has no way to express it. */
    if (typeof playSound === 'function') playSound('snd-uno-deal');
    wcDealSndOn = true;
  }

  /* `instant` is teardown: cut now, leave nothing pending. Everything else
     rides the ramp down. Safe to call when nothing is playing, when the
     element does not exist, and twice in a row — all three happen.

     THE GUARD IS LOAD-BEARING. wcClearDeal() runs on every round start and
     every deal end, including the ones where no deal ever ran, and a ramp is
     seven timers. Without the flag those seven fire whether or not there is
     anything to fade, which puts a 20ms timer at the head of the scheduler's
     queue and makes every assertion about "what is pending" measure the fade
     instead of the turn. That is not hypothetical — it is what this cost. */
  function wcDealSoundStop(instant) {
    wcDealSoundClearTimers();
    if (!wcDealSndOn) return;
    wcDealSndOn = false;
    var el = wcDealSoundEl();
    if (!el) return;
    var cfg = WC_SOUNDS['snd-uno-deal'];
    var full = cfg ? cfg.volume : 0.4;
    /* Pause only something that is actually playing. In a browser that is the
       bed; with no media pipeline at all — jsdom, or a file that failed to
       load — el.paused never went false, there is nothing to stop, and this
       becomes the same first-class bail the flights use for unmeasurable
       geometry. The volume ramp above is safe everywhere and runs regardless. */
    var kill = function () {
      try {
        if (el.paused === false) { el.pause(); el.currentTime = 0; }
        el.volume = full;
      } catch (e) { /* nothing to stop */ }
    };
    if (instant || !WC_DEAL_FADE_MS || !WC_DEAL_FADE_STEPS) { kill(); return; }
    var stepMs = Math.max(1, Math.round(WC_DEAL_FADE_MS / WC_DEAL_FADE_STEPS));
    for (var i = 1; i <= WC_DEAL_FADE_STEPS; i++) {
      (function (n) {
        wcDealSndT.push(setTimeout(function () {
          if (n >= WC_DEAL_FADE_STEPS) { wcDealSoundClearTimers(); kill(); return; }
          try { el.volume = Math.max(0, full * (1 - n / WC_DEAL_FADE_STEPS)); } catch (e) {}
        }, stepMs * n));
      })(i);
    }
  }

  function wcDealStart(gs) {
    if (!wcAnimOn()) return false;
    // The deal is a sequence of flights; if one could not fly, none can.
    if (!wcRectOf(wcPileEl('draw')) || !wcRectOf(wcViewEl())) return false;

    wcDeal = {
      phase: 'shuffle',
      shown: gs.players.map(function () { return 0; }),
      dealt: 0,
      total: gs.players.length * 7,
      openingDone: false
    };
    wcRender();
    // Replaces snd-start rather than sounding over it: the shuffle IS the
    // start, and two cues in one instant read as one glitched sound.
    if (typeof playSound === 'function') playSound('snd-uno-shuffle');
    wcDealTimer = setTimeout(wcDealNext, WC_SHUFFLE_MS);
    return true;
  }

  /* One card out of the deck. Dealt in PASSES — one to each player, then round
     again — because that is how a hand is really dealt, and because seven
     cards landing on one seat before the next seat gets any reads as an error.
     wcCreateGame deals in the same order, so shown[] and the hands line up. */
  function wcDealNext() {
    wcDealTimer = null;
    var gs = wcGS;
    if (!gs || !wcDeal) return;

    /* The bed starts on the shuffle-to-dealing edge, not at wcDealStart —
       the shuffle has its own sound and layering the two would be the same
       mistake the card sounds are careful not to make. */
    if (wcDeal.phase === 'shuffle') {
      wcDeal.phase = 'dealing';
      wcDealSoundStart();
    }

    if (wcDeal.dealt >= wcDeal.total) { wcDealOpening(); return; }

    var n = gs.players.length;
    var pi = wcDeal.dealt % n;
    var idx = Math.floor(wcDeal.dealt / n);
    var cardObj = gs.players[pi].hand[idx];
    wcDeal.dealt++;

    var from = wcRectOf(wcPileEl('draw'));
    if (!cardObj || !from) { wcDealFinish(); return; }

    if (pi === 0) {
      /* Your card joins the fan immediately but invisibly, so the slot exists
         to be measured and to be flown into — and so the fan widens as cards
         arrive rather than jumping at the end. Same mechanism as a draw. */
      wcDeal.shown[0]++;
      if (!wcFlyHidden) wcFlyHidden = {};
      wcFlyHidden[cardObj.id] = true;
      wcRender();
      var to = wcRectOf(wcHandCardEl(cardObj.id));
      if (to) {
        wcFlySprite(from, to, { faceCard: cardObj, startDown: true, hideId: cardObj.id });
      } else {
        delete wcFlyHidden[cardObj.id];
        wcRender();
      }
    } else {
      // An opponent's seat is always there to fly at, so the count can wait
      // until the card actually lands. Face-down the whole way: you never see
      // what they were dealt.
      var seat = wcRectOf(wcSeatCardEl(pi));
      var bump = function () { if (wcDeal) { wcDeal.shown[pi]++; wcRender(); } };
      if (seat) wcFlySprite(from, seat, { faceCard: null, startDown: false, onLand: bump });
      else bump();
      wcRender();
    }

    wcDealTimer = setTimeout(wcDealNext, WC_DEAL_MS[wcSpeedKey()]);
  }

  // The starter card, last. It turns over like one of yours, because it is the
  // first card everybody has to read.
  function wcDealOpening() {
    var gs = wcGS;
    if (!gs || !wcDeal) return;
    wcDeal.phase = 'opening';
    /* The hands are out; the bed's job is done. Fading here rather than at
       wcDealFinish means the starter card — the first card everyone has to
       read — turns over into silence, which is the only emphasis it gets. */
    wcDealSoundStop(false);
    var top = wcTop(gs);
    var from = wcRectOf(wcPileEl('draw'));
    var to = wcRectOf(wcPileEl('discard'));
    if (!top || !from || !to) { wcDealFinish(); return; }

    var ms = wcFlySprite(from, to, {
      faceCard: top, startDown: true,
      onLand: function () { if (wcDeal) { wcDeal.openingDone = true; wcRender(); } }
    });
    wcDealTimer = setTimeout(wcDealFinish, (ms || 0) + wcBeatMs());
  }

  /* Hand the table over. The turn latch is released here rather than at round
     start, so the first "your turn" cue lands when the deal ENDS — which is
     the moment it means something — instead of four seconds earlier under the
     shuffle. */
  function wcDealFinish() {
    wcClearDeal();
    var gs = wcGS;
    if (!gs) return;
    wcTurnSounded = false;
    wcRender();
    wcApplyScale();
    /* The starter card is the first card everybody has to read and nobody
       played it, so the floor is owed here rather than from a play. If the
       round opens on you this is discharged unspent — you are already sitting
       there looking at it. */
    wcOweRead(wcTop(gs), 0);
    wcMaybeCpu();
  }

  // Tapping anywhere lands the whole deal at once. The state was already
  // complete, so this is only ever a change of mind about watching it.
  function wcDealSkip() {
    if (!wcDeal) return;
    wcClearFlights(true);
    wcDealFinish();
  }

  /* --- Sizing ------------------------------------------------------------ */



  function wcApplyScale() {
    var view = document.getElementById('view-wordcards-game');
    if (!view || view.classList.contains('hidden')) return;
    var h = view.clientHeight || window.innerHeight;
    var w = view.clientWidth || window.innerWidth;

    // Vertical budget. The clamps matter more than the fractions: below the
    // floor a card stops being readable, above the ceiling it just wastes space.
    var handH  = Math.max(104, Math.min(h * 0.33, 214));
    var tableH = Math.max(84,  Math.min(h * 0.27, 184));
    var seatH  = Math.max(44,  Math.min(h * 0.16, 104));

    view.style.setProperty('--wc-hand-h',  Math.round(handH) + 'px');
    view.style.setProperty('--wc-hand-w',  Math.round(handH * WC_CARD_RATIO) + 'px');
    view.style.setProperty('--wc-table-h', Math.round(tableH) + 'px');
    view.style.setProperty('--wc-table-w', Math.round(tableH * WC_CARD_RATIO) + 'px');
    view.style.setProperty('--wc-seat-h',  Math.round(seatH) + 'px');

    // Layout modes, not just scale: below these the arrangement itself changes.
    view.classList.toggle('wc-compact', h < 520);
    view.classList.toggle('wc-tiny',    h < 400);
    view.classList.toggle('wc-narrow',  w < 620);

    wcLayoutFan();
  }

  /* Lay the hand out as an overlapping fan. Cards are absolutely positioned so
     the overlap can tighten smoothly as the hand grows, instead of the row
     wrapping or the cards shrinking below readability. */
  function wcLayoutFan() {
    var hand = document.getElementById('wc-hand');
    if (!hand) return;
    var cards = [].slice.call(hand.children);
    var n = cards.length;
    if (!n) { hand.style.width = '0px'; return; }

    var view = document.getElementById('view-wordcards-game');
    var cw = parseFloat(getComputedStyle(view).getPropertyValue('--wc-hand-w')) || 90;
    var avail = (hand.parentNode ? hand.parentNode.clientWidth : window.innerWidth) - 16;

    var step = cw + 8;                                   // no overlap when there's room
    if (n * step > avail) {
      step = Math.max(cw * 0.30, (avail - cw) / (n - 1)); // tighten, never past 30%
    }
    var total = (n - 1) * step + cw;
    hand.style.width = Math.ceil(total) + 'px';
    cards.forEach(function (el, i) {
      el.style.left = Math.round(i * step) + 'px';
      el.style.zIndex = String(i + 1);
    });
  }

  /* --- Card rendering ---------------------------------------------------- */

  function wcColourOf(id) {
    return WC_COLOURS.find(function (c) { return c.id === id; }) || null;
  }

  /* The vocabulary or action text a card shows, honouring the app's display
     mode. One shared helper so word cards and action cards stay consistent. */
  function wcThaiPair(th, rom) {
    var mode = state.displayMode;
    if (mode === 'thai')  return { main: '<span class="th">' + th + '</span>', rom: '' };
    if (mode === 'roman') return { main: escapeHtml(rom), rom: '' };
    return { main: '<span class="th">' + th + '</span>', rom: escapeHtml(rom) };
  }

  /* The mark that goes in a card's two corners. SVG wherever the shape has to
     land precisely; text only for "+2" / "+4", where digits behave. */
  function wcIndexMark(card) {
    if (card.kind === 'word') {
      if (!wcGlyphsOn()) return '';
      var icon = WC_COLOUR_ICON[card.colour];
      return icon ? WC_ICONS[icon] : '';
    }
    if (card.kind === 'skip')    return WC_ICONS.skip;
    if (card.kind === 'reverse') return WC_ICONS.reverse;
    if (card.kind === 'wild')    return WC_ICONS.wild;
    return '<span class="wc-idx-text">' + WC_ACTIONS[card.kind].symbol + '</span>';
  }

  function wcCardFaceHtml(gs, card, sizeClass) {
    var col = wcColourOf(card.colour);
    var colourClass = card.colour ? ('wc-c-' + card.colour) : 'wc-c-wild';
    var body, lang = '';

    if (card.kind === 'word') {
      var w = gs.words[card.wordIdx];
      var main, rom = '';
      if (card.face === 'en') {
        main = escapeHtml(w.en);
      } else {
        var pair = wcThaiPair(w.th, w.rom);
        main = pair.main;
        rom = pair.rom;
      }
      // Each text run is its own element. Bare text inside a flex box becomes
      // an anonymous flex item that will not wrap — see the note on .wc-c-band.
      body = '<span class="wc-c-main wc-c-word">' +
               '<span class="wc-c-line">' + main + '</span>' +
               (rom ? '<span class="wc-c-rom">' + rom + '</span>' : '') +
             '</span>';
      // The ไทย/EN marker is noise when the two faces already look different —
      // Thai script is unmistakable. It earns its place only in romanization-
      // only mode, where both faces are Latin and genuinely ambiguous.
      if (state.displayMode === 'roman') lang = (card.face === 'en') ? 'EN' : 'ไทย';
    } else {
      var a = WC_ACTIONS[card.kind];
      var ap = wcThaiPair(a.th, a.rom);
      var symbol;
      if (card.kind === 'skip')         symbol = '<span class="wc-c-symbol">' + WC_ICONS.skip + '</span>';
      else if (card.kind === 'reverse') symbol = '<span class="wc-c-symbol">' + WC_ICONS.reverse + '</span>';
      else if (card.kind === 'wild')    symbol = '<span class="wc-c-symbol">' + WC_ICONS.wild + '</span>';
      else                              symbol = '<span class="wc-c-symtext">' + a.symbol + '</span>';
      body = '<span class="wc-c-main wc-c-action">' + symbol +
               '<span class="wc-c-actth">' + ap.main + '</span>' +
               (ap.rom ? '<span class="wc-c-actrom">' + ap.rom + '</span>' : '') +
             '</span>';
    }

    var mark = wcIndexMark(card);
    return '<span class="wc-c ' + colourClass + ' ' + (sizeClass || '') + '">' +
             '<span class="wc-c-band">' + body + '</span>' +
             (mark ? '<span class="wc-idx wc-idx-tl">' + mark + '</span>' : '') +
             (mark ? '<span class="wc-idx wc-idx-br">' + mark + '</span>' : '') +
             (lang ? '<span class="wc-c-lang">' + lang + '</span>' : '') +
           '</span>';
  }

  function wcCardBackHtml(sizeClass) {
    return '<span class="wc-c wc-c-back ' + (sizeClass || '') + '"></span>';
  }

  /* --- Seats ------------------------------------------------------------- */

  function wcRenderSeats(gs) {
    var root = document.getElementById('wc-seats');
    if (!root) return;
    // Everyone except you, in play order starting after you, so the seat order
    // on screen matches the order they'll actually take turns.
    var order = [];
    for (var k = 1; k < gs.players.length; k++) order.push(k);

    // Dim the off-turn seats only while an opponent is actually playing. During
    // your own turn nobody in this row is active, so leaving it dimmed would
    // read as "switched off" rather than "waiting".
    // Nobody is "on turn" while the cards are still going out.
    var cpuOnTurn = (!gs.finished && !wcDealing() && !gs.players[gs.turn].isHuman);
    root.className = 'wc-seats' + (cpuOnTurn ? ' wc-seats-active' : '');

    /* Who plays after you. Only while it is YOUR turn — during a CPU's turn
       the active highlight already carries the row — and only with three or
       more players, since at two the answer is never in doubt.

       Computed here rather than asked of §4: it is (turn + dir) wrapped, the
       rules expose no helper for it, and inventing a reason to reach into the
       rules layer for one line of arithmetic is how that boundary erodes.

       It is the next seat IN ORDER, which is not always who actually plays —
       a Skip or a +2 from your hand will jump past them. The preview corrects
       itself the moment you play, so the only window in which it can be wrong
       is the one where nothing has happened yet. */
    var n = gs.players.length;
    var humanOnTurn = (!gs.finished && !wcDealing() && gs.players[gs.turn].isHuman);
    var nextPi = (n > 2 && humanOnTurn) ? (((gs.turn + gs.dir) % n) + n) % n : -1;

    /* Arrows between the seats, so the order of play is legible without
       decoding the direction icon in the middle of the table. One arrow per
       gap: two opponents get one, three get two. At two players there is no
       gap and no ambiguity, so none.

       They flip and pulse on a reversal using the same negative animation-delay
       as the direction icon — a render landing mid-flip JOINS it rather than
       restarting it, which is the trap §7's header names twice. */
    var arrowHtml = '';
    // INSURANCE, for the n === 2 case: one opponent means one seat, and join()
    // inserts no separator into a single-element array, so no arrow could
    // appear regardless. Kept so the intent is stated where the markup is.
    if (n > 2) {
      var acls = 'wc-seat-arrow' + (gs.dir === 1 ? '' : ' wc-seat-arrow-rev');
      var astyle = '';
      if (wcDirAt !== null) {
        var aEl = wcNow() - wcDirAt;
        if (aEl >= 0 && aEl < WC_DIR_MS) {
          acls += ' wc-seat-arrow-turn';
          astyle = ' style="animation-delay:-' + Math.round(aEl) + 'ms"';
        }
      }
      arrowHtml = '<div class="' + acls + '"' + astyle + ' aria-hidden="true">\u279C</div>';
    }

    var seatsHtml = order.map(function (pi) {
      var p = gs.players[pi];
      var ch = p.charId ? CHARACTERS.find(function (c) { return c.id === p.charId; }) : null;
      var isTurn = (pi === gs.turn && !gs.finished && !wcDealing());
      var held = wcShown(gs, pi);
      // "Last card" is about a hand played down to one, not a hand that has
      // only been dealt one so far.
      var last = (!wcDealing() && p.hand.length === 1);
      // An announcement lives in module state, not in the DOM, because this
      // function replaces root.innerHTML wholesale on every render — anything
      // written straight into the markup would be wiped by the next one.
      var fx = (wcSeatFx && wcSeatFx.pi === pi) ? wcSeatFx : null;
      /* Sitting out. Suppressed while an announcement is pinned to this seat —
         a live badge outranks a standing condition, and showing both would say
         the same thing twice.

         `!isTurn` is INSURANCE, not active coverage. wcExpireSkipMarks() runs
         at the top of every wcRender and deletes the mark for the seat whose
         turn it is, so this can never be the thing that suppresses it, and a
         mutation removing it is not detectable. It is kept so that the
         renderer states its own invariant rather than inheriting it from a
         caller — the same standing as wcFlySprite's registry-empty net. Do not
         believe a green run says anything about it. */
      var isOut = (!isTurn && !wcDealing() && wcSkipMarks[pi] !== undefined);
      /* The DIMMING lands in the same frame as the card that caused it —
         waiting for the badge to expire put it most of a turn late, which is
         exactly when it stops answering the question "why was that seat
         skipped?". The TOKEN still waits: while the badge is up it is saying
         the same thing, louder and with a name on it. */
      /* All three chips now share one anchor, so only one may be shown. The
         precedence is NEXT over the out-token, and it is not arbitrary: a seat
         CAN be both, and often is. Play a +2 on seat 1 of a four-player table
         and the turn goes 0-2-3-0, never reaching seat 1 — so its mark is
         still standing when it becomes the seat that plays after you. What the
         player needs at that moment is "they are up next"; that they sat out
         is already said by the dimming, which stays either way. */
      var isNext = (pi === nextPi && !isTurn);
      var outMark = (isOut && !fx && !isNext) ? wcSkipMarks[pi] : null;
      var mini = Math.min(held, 6);
      var stack = '';
      for (var i = 0; i < mini; i++) stack += '<span class="wc-mini"></span>';
      /* Classes assembled first, then the element — the arrival animation
         needs a style attribute between the class list and the closing '>',
         and threading one through a single concatenated string is how the
         class list silently ends up inside the wrong attribute. */
      var seatCls = 'wc-seat' + (isTurn ? ' wc-seat-turn' : '') +
                    (isNext ? ' wc-seat-next' : '') +
                    (last ? ' wc-seat-last' : '') +
                    (isOut ? ' wc-seat-out' : '') +
                    (fx ? ' wc-seat-fx-on wc-seat-fx-' + fx.kind : '');
      /* One label per seat rather than four unlabelled fragments (avatar,
         name, a fan of card backs, a numeral). The card backs and the badge
         are decoration once the seat says this much. */
      var seatLabel = p.name + ': ' + held + (held === 1 ? ' card' : ' cards') +
                      (isTurn ? ', on turn' : '') +
                      (isNext ? ', plays next' : '') +
                      (isOut ? ', sitting out this turn' : '') +
                      (last ? ', last card' : '');
      return '<div class="' + seatCls + '" data-wc-seat="' + pi + '" role="group" aria-label="' +
               escapeHtml(seatLabel) + '"' + (isTurn ? wcTurnAttrs() : '') + '>' +
               (isNext ? '<div class="wc-seat-nextmark">next</div>' : '') +
               (outMark ? '<div class="wc-seat-outmark">' + outMark + '</div>' : '') +
               (fx ? '<div class="wc-seat-fx"' +
                       (fx.bg ? ' style="background:' + fx.bg + ';color:#fff"' : '') +
                     '>' + fx.label + '</div>' : '') +
               (ch ? '<img class="wc-seat-av" src="' + ch.avatar() + '" alt="">' : '') +
               '<div class="wc-seat-body">' +
                 '<div class="wc-seat-name">' + escapeHtml(p.name) + '</div>' +
                 '<div class="wc-seat-stack">' + stack +
                   '<span class="wc-seat-n">' + held + '</span>' +
                 '</div>' +
               '</div>' +
               (isTurn ? '<div class="wc-think"><i></i><i></i><i></i></div>' : '') +
               (last ? '<div class="wc-last-badge">1</div>' : '') +
             '</div>';
    });

    /* Interleaved, not appended: an arrow belongs BETWEEN two seats, so it is
       joined into the gaps and can never land on an end. */
    root.innerHTML = seatsHtml.join(arrowHtml);
  }

  /* --- Table centre ------------------------------------------------------ */

  function wcRenderCentre(gs) {
    var root = document.getElementById('wc-centre');
    if (!root) return;
    /* While a card is in the air the pile must keep showing the card it is
       being played ON, not the one still crossing the table — otherwise the
       played card appears on the pile and is then sent a flying duplicate of
       itself. The colour ring is held with it, for the same one frame. */
    var top = wcFlyHoldTop ? wcFlyHoldTop.card : wcTop(gs);
    var colourId = wcFlyHoldTop ? wcFlyHoldTop.colour : gs.colour;
    if (!top) top = wcTop(gs);
    var col = wcColourOf(colourId);
    var canPlayHere = (wcSelected !== null && !wcDealing());
    var shuffling = !!(wcDeal && wcDeal.phase === 'shuffle');
    /* A wild on top is the case the ring exists for: the face is four
       quadrants and tells you nothing about what is actually in force. */
    var wildTop = !!(top && (top.kind === 'wild' || top.kind === 'wild4'));
    /* The matched-pair pop. Negative delay so a re-render joins the animation
       already in progress rather than snapping it back to the start. */
    var matchCls = '';
    if (wcMatchAt !== null) {
      var mEl = wcNow() - wcMatchAt;
      if (mEl >= 0 && mEl < WC_MATCH_MS) matchCls = ' wc-pile-match';
    }
    // Until the starter card lands there is nothing on the discard at all.
    var emptyPile = !!(wcDeal && !wcDeal.openingDone);

    // The colour in force rings the discard pile itself rather than sitting in
    // a capsule beside it. It reads at the point of use — which matters most
    // right after a Wild, when the top card's own colour tells you nothing —
    // and it leaves the two piles symmetrically centred instead of shunted left.
    root.innerHTML =
      '<button type="button" class="wc-pile wc-pile-draw" data-wc-act="draw" ' +
        'aria-label="Draw a card">' +
        wcCardBackHtml('wc-c-table') +
        (shuffling ? '<span class="wc-shuf-g wc-shuf-g1">' + wcCardBackHtml('wc-c-table') + '</span>' +
                     '<span class="wc-shuf-g wc-shuf-g2">' + wcCardBackHtml('wc-c-table') + '</span>' : '') +
        '<span class="wc-pile-count">' + (gs.drawPile.length + wcDealPileExtra()) + '</span>' +
      '</button>' +

      '<div class="wc-centre-mid">' +
        (wcDealing() ? '' :
        '<div ' + wcDirAttrs(gs) + '>' +
          (gs.dir === 1 ? '\u21BB' : '\u21BA') + '</div>') +
        (gs.pending > 0 ? '<div class="wc-pending">+' + gs.pending + '</div>' : '') +
      '</div>' +

      '<button type="button" class="wc-pile wc-pile-discard' +
        (canPlayHere ? ' wc-pile-target' : '') + (emptyPile ? ' wc-pile-empty' : '') +
        (wildTop && !emptyPile && col ? ' wc-pile-wild' : '') + matchCls +
        '" data-wc-act="confirm" ' +
        'style="--wc-now:' + (emptyPile ? 'transparent' : (col ? col.hex : '#888')) +
          (matchCls ? ';animation-delay:-' + Math.round(wcNow() - wcMatchAt) + 'ms' : '') + '" ' +
        'aria-label="' + (emptyPile ? 'Discard pile' :
          'Play the selected card here. Colour in force: ' +
          (col ? escapeHtml(col.en) : 'none')) + '">' +
        (emptyPile ? '<span class="wc-c wc-c-slot wc-c-table"></span>'
                   : wcCardFaceHtml(gs, top, 'wc-c-table')) +
      '</button>';
  }

  /* --- Your hand --------------------------------------------------------- */

  function wcRenderHand(gs) {
    var root = document.getElementById('wc-hand');
    if (!root) return;
    var me = 0;
    var hand = gs.players[me].hand.slice(0, wcShown(gs, me));
    var mine = (gs.turn === me && gs.phase === 'play' && !gs.finished && !wcDealing());

    var legalIds = {};
    if (mine) wcLegalMoves(gs, me).forEach(function (c) { legalIds[c.id] = true; });
    var restricted = mine && gs.drawnPlayable;

    root.innerHTML = hand.map(function (card) {
      var playable = mine && legalIds[card.id] && (!restricted || card.id === gs.drawnPlayable);
      var cls = 'wc-hand-card';
      // Easy marks what's legal and blocks the rest. Expert shows nothing —
      // judging it is the exercise, and a wrong card costs you a card.
      if (gs.assist === 'easy') cls += playable ? ' wc-ok' : ' wc-no';
      if (wcSelected === card.id) cls += ' wc-sel';
      // The card that just came off the pile, when it turned out to be
      // playable. In Expert nothing else in the fan is marked, so without this
      // the rules restrict you to one card and never say which.
      var isDrawn = (mine && gs.drawnPlayable === card.id);
      if (isDrawn) cls += ' wc-just-drawn';
      // A card still crossing the table keeps its slot in the fan but shows
      // nothing, so the hand does not reflow when it lands.
      if (wcFlyHidden && wcFlyHidden[card.id]) cls += ' wc-fly-gap';
      /* The card faces are built from SVG marked aria-hidden plus styled
         spans, so without this a screen reader reaches a row of unlabelled
         buttons. wcCardLabel is the same naming the move log uses, so what is
         read aloud and what is written down are the same words. */
      var label = wcCardLabel(gs, card) +
                  (wcSelected === card.id ? ', selected' : '') +
                  (isDrawn ? ', just drawn' : '');
      return '<button type="button" class="' + cls + '" data-wc-act="pick" ' +
             'aria-label="' + escapeHtml(label) + '"' +
             (wcSelected === card.id ? ' aria-pressed="true"' : '') +
             ' data-wc-arg="' + card.id + '"' + (mine ? '' : ' disabled') + '>' +
             (isDrawn ? '<span class="wc-drawn-tag">just drawn</span>' : '') +
             wcCardFaceHtml(gs, card, 'wc-c-hand') + '</button>';
    }).join('');

    wcLayoutFan();

    /* The turn cue that cannot be pre-empted. Set on the handbar — which is
       built once and never replaced, unlike everything innerHTML rebuilds —
       and re-applied on every render, so even a rebuilt shell recovers it. */
    var bar = document.querySelector('.wc-handbar');
    if (bar) {
      if (mine) bar.classList.add('wc-my-turn');
      else bar.classList.remove('wc-my-turn');
      /* You lost this turn — skipped, or you ate a stack. Opponents get a
         dimmed seat for this and you had nothing at all, so "was I skipped, or
         is it just not my turn yet?" had no answer on screen. Same treatment
         as a seat, on the thing that stands in for your seat. */
      /* `!mine` is INSURANCE, like the matching guard in wcRenderSeats and for
         the same reason: wcExpireSkipMarks deletes seat 0's mark at the top of
         every wcRender once play reaches you, so it can never be set while
         `mine` is true and a mutation removing this is undetectable. Kept so
         the renderer states its own invariant rather than inheriting it. */
      var iSatOut = (!mine && wcSkipMarks[0] !== undefined);
      if (iSatOut) bar.classList.add('wc-hand-out');
      else bar.classList.remove('wc-hand-out');
    }

    var count = document.getElementById('wc-hand-count');
    if (count) {
      /* Count what has LANDED, not what is on its way. A card in flight
         already occupies its slot in the fan — that is what stops the hand
         reflowing when it arrives — but it is not showing anything yet, and a
         footer reading "You · 3" over two visible cards is just wrong. The
         opponents' counts tick up on landing for the same reason. */
      var landed = hand.length;
      if (wcFlyHidden) {
        landed = hand.filter(function (c) { return !wcFlyHidden[c.id]; }).length;
      }
      count.innerHTML = escapeHtml(gs.players[me].name) +
        ' \u00B7 <strong>' + landed + '</strong>' +
        (landed === 1 && !wcDealing() ? ' <span class="wc-you-last">last card!</span>' : '');
    }
  }

  /* --- The action strip beside the hand ---------------------------------- */

  function wcRenderActions(gs) {
    var root = document.getElementById('wc-actions');
    if (!root) return;
    var me = 0;
    var mine = (gs.turn === me && gs.phase === 'play' && !gs.finished && !wcDealing());
    if (!mine) { root.innerHTML = ''; return; }

    var bits = [];
    if (gs.pending > 0) {
      var canPass = wcLegalMoves(gs, me).length > 0;
      bits.push('<button type="button" class="wc-act-btn wc-act-primary" data-wc-act="draw">' +
                'Take +' + gs.pending + '</button>');
      if (canPass) bits.push('<span class="wc-act-hint">or pass it on</span>');
    } else if (gs.drawnPlayable) {
      /* The card is already selected (see the draw handler), so the discard is
         lit and Play it is the primary action. Two buttons and no ambiguity —
         the old strip offered a passive hint that never said WHICH card. */
      bits.push('<button type="button" class="wc-act-btn wc-act-primary" data-wc-act="confirm">Play it</button>');
      bits.push('<button type="button" class="wc-act-btn" data-wc-act="pass">Keep it</button>');
      bits.push('<span class="wc-act-hint">you drew a card you can play</span>');
    } else if (!wcSelected) {
      /* Draw is hidden while a card is lifted: the only two things worth doing
         from here are playing it or putting it back, and a third button that
         abandons the choice you have just made is noise. The draw pile itself
         is still live, so drawing costs one tap either way. */
      bits.push('<button type="button" class="wc-act-btn" data-wc-act="draw">' +
                '<span class="th">จั่ว</span> Draw</button>');
    }
    if (wcSelected && !gs.drawnPlayable) {
      bits.push('<button type="button" class="wc-act-btn wc-act-primary" data-wc-act="confirm">Play it</button>');
      bits.push('<button type="button" class="wc-act-btn" data-wc-act="cancel">Cancel</button>');
    }
    root.innerHTML = bits.join('');
  }

  /* --- The end-of-round panel ---------------------------------------------
     Built to read the same way the vs Computer end screen does: the result and
     the standings on one side, the artwork on the other, the round's whole
     word list underneath. Rebuilt inside THIS mode's #wc-overlay rather than
     borrowing index.html's #win-modal, because that shell is shared by four
     other modes, hides and shows six sub-elements per mode, and its Play Again
     button routes through replayCurrent() -> startGameFromMenu(state.gameMode)
     — which for 'wordcards' would try to build a MEMORY board. Reusing it
     would have meant editing a path four other modes depend on.

     Everything here is derived from gs and from module state that wcOnFinished
     already settled. Nothing is computed for the first time during a render,
     because this panel re-renders on every wcRender() while the round is over. */

  // Names of everyone except you, in finishing order, as prose.
  function wcNameList(gs) {
    var names = gs.placements
      .filter(function (pi) { return pi !== 0 && gs.players[pi]; })
      .map(function (pi) { return escapeHtml(gs.players[pi].name); });
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /* The Thai/roman halves of a vocabulary entry, honouring the app-wide
     display mode exactly as wcWordLabel does for the cards themselves — a
     student reading romanisation on the table should not be handed Thai script
     in the review list. English is always shown: it is the other half of the
     pair, and the pairing is the point of the mode. */
  function wcWordListParts(w) {
    var mode = state.displayMode;
    var out = [];
    if (mode !== 'roman') out.push('<span class="wc-word-th th">' + escapeHtml(w.th) + '</span>');
    if (mode !== 'thai')  out.push('<span class="wc-word-rom">' + escapeHtml(w.rom) + '</span>');
    return out.join(' ');
  }

  function wcEndWordsHtml(gs) {
    var words = gs.words || [];
    if (!words.length) return '';
    /* Every word of the round, plainly listed. An earlier draft marked the ones
       YOU had played and counted them ("you played 6 of 10"), derived from
       gs.events. Cut deliberately: the list is here to be READ, and scoring it
       turned a review into a report card — as well as making a claim that the
       200-entry cap on gs.events could not always honour. */
    var rows = words.map(function (w) {
      if (!w) return '';
      return '<div class="wc-word">' +
               '<span class="wc-word-line">' + wcWordListParts(w) + '</span>' +
               '<span class="wc-word-en">' + escapeHtml(w.en) + '</span>' +
             '</div>';
    }).join('');
    return '<div class="wc-end-words">' +
             '<div class="wc-end-words-head">' +
               '<span class="wc-end-words-title">Words this round</span>' +
             '</div>' +
             '<div class="wc-end-words-grid">' + rows + '</div>' +
           '</div>';
  }

  /* The artwork column. Your win gets WC_WIN_ART; a CPU's win gets that
     character's own defeated-you artwork through index.html's cpuEndArt(),
     whose `outcome` argument is HUMAN-perspective — so 'lose' correctly
     resolves to the character's *_won art, and every branch of it already
     falls back to ch.img(). onerror removes the whole column, so a missing or
     mistyped file costs the illustration and never shows a broken image. */
  /* Resolve a character's end-of-round picture, or '' if we cannot. Every step
     is optional: cpuEndArt() and ch.img() both live in index.html, and neither
     is guaranteed to a caller that loaded this file on its own. An artwork that
     cannot be resolved is not an error — it is simply no artwork, the same way
     an element that cannot be measured is simply no sprite. */
  function wcCharArtSrc(ch) {
    if (!ch) return '';
    var src = '';
    try {
      if (typeof cpuEndArt === 'function') src = cpuEndArt(ch, 'lose');
      if (!src && typeof ch.img === 'function') src = ch.img();
    } catch (e) { src = ''; }
    return (typeof src === 'string') ? src : '';
  }

  function wcEndArtHtml(gs, humanWon) {
    // Removes the whole column rather than leaving a broken-image icon in it.
    var hide = "this.closest('.wc-end-art').style.display='none';";
    if (humanWon) {
      if (!WC_WIN_ART) return '';
      return '<div class="wc-end-art">' +
               '<div class="wc-end-art-inner wc-end-art-plain">' +
                 '<img class="wc-end-art-img" alt="" src="' + escapeHtml(WC_WIN_ART) + '" ' +
                      'onerror="' + hide + '">' +
               '</div>' +
             '</div>';
    }
    var winner = gs.players[gs.placements[0]];
    var ch = null;
    if (winner && winner.charId && typeof CHARACTERS !== 'undefined' && CHARACTERS) {
      ch = CHARACTERS.find(function (c) { return c && c.id === winner.charId; }) || null;
    }
    var src = wcCharArtSrc(ch);
    if (!src) return '';
    return '<div class="wc-end-art">' +
             '<div class="wc-end-art-inner">' +
               '<img class="wc-end-art-img" alt="' + escapeHtml(ch.en || '') + '" ' +
                    'src="' + escapeHtml(src) + '" onerror="' + hide + '">' +
             '</div>' +
             '<div class="wc-end-art-name"><span class="th">' + escapeHtml(ch.th || '') + '</span>' +
               '<span class="wc-end-art-en">' + escapeHtml(ch.en || '') + '</span></div>' +
           '</div>';
  }

  function wcEndPanelHtml(gs) {
    var me = 0;
    /* A finished round with no placements should be impossible — wcPlayerOut
       fills the array before it sets finished — but this renderer runs inside a
       delegated click handler, where dispatchEvent SWALLOWS exceptions and
       routes them to the console. A throw here would silently skip everything
       downstream rather than failing loudly, so the degenerate case returns a
       panel that still lets the player leave. */
    var champion = gs.placements && gs.placements.length
      ? gs.players[gs.placements[0]] : null;
    var actions =
      '<div class="wc-panel-actions">' +
        '<button type="button" class="wc-act-btn wc-act-primary" data-wc-act="again">Play again</button>' +
        '<button type="button" class="wc-act-btn" data-wc-act="menu">Back to menu</button>' +
      '</div>';
    if (!champion) {
      return '<div class="wc-panel"><h3 class="wc-panel-title">Round over</h3>' + actions + '</div>';
    }

    var humanWon = (gs.placements[0] === me);
    var others = wcNameList(gs);
    var title = humanWon
      ? '\uD83C\uDF89 You win!'
      : '\uD83D\uDCDA ' + escapeHtml(champion.name) + ' wins';
    var line = humanWon
      ? (others ? 'You beat ' + others + '.' : 'You went out first.')
      : escapeHtml(champion.name) + ' went out first.';

    var badge = wcResultBadge
      ? '<div class="record-badge tier-' + wcResultBadge.id + '">' +
          wcResultBadge.emoji + ' ' + escapeHtml(wcResultBadge.label) +
          ' landmark unlocked! ' + wcResultBadge.emoji +
        '</div>'
      : '';

    var places = gs.placements.map(function (pi, rank) {
      var p = gs.players[pi];
      if (!p) return '';
      return '<div class="wc-place' + (pi === me ? ' wc-place-you' : '') + '">' +
               '<span class="wc-place-rank">' + (rank + 1) + '</span>' +
               '<span class="wc-place-name">' + escapeHtml(p.name) + '</span>' +
               '<span class="wc-place-cards">' +
                 (p.hand.length === 0 ? 'out' : p.hand.length + ' left') + '</span>' +
             '</div>';
    }).join('');

    return '<div class="wc-panel wc-panel-end">' +
             '<div class="wc-end-grid">' +
               '<div class="wc-end-main">' +
                 '<h3 class="wc-panel-title">' + title + '</h3>' +
                 '<p class="wc-end-line">' + line + '</p>' +
                 badge +
                 '<div class="wc-places">' + places + '</div>' +
               '</div>' +
               wcEndArtHtml(gs, humanWon) +
             '</div>' +
             wcEndWordsHtml(gs) +
             actions +
           '</div>';
  }

  /* --- Overlays: colour picker, challenge, end of round ------------------ */

  function wcRenderOverlay(gs) {
    var root = document.getElementById('wc-overlay');
    if (!root) return;
    var me = 0;
    wcBindOverlayKeys(root);
    wcNoteOverlayFocus(root);      // last moment the old panel still exists

    if (gs.finished) {
      // The winning card gets its moment before anything covers it.
      if (!wcResultReady) {
        root.className = 'wc-overlay'; root.innerHTML = '';
        wcSyncOverlayFocus(root, null); return;
      }
      root.className = 'wc-overlay wc-overlay-on';
      root.innerHTML = wcEndPanelHtml(gs);
      wcSyncOverlayFocus(root, 'end');
      return;
    }

    if (gs.phase === 'colour' && gs.turn === me) {
      root.className = 'wc-overlay wc-overlay-on';
      root.innerHTML =
        '<div class="wc-panel">' +
          '<h3 class="wc-panel-title">Choose a colour</h3>' +
          '<div class="wc-pick">' +
            WC_COLOURS.map(function (c) {
              return '<button type="button" class="wc-pick-btn wc-c-' + c.id + '" ' +
                     'data-wc-act="colour" data-wc-arg="' + c.id + '">' +
                     (wcGlyphsOn() ? '<span class="wc-pick-glyph">' + c.glyph + '</span>' : '') +
                     '<span class="wc-pick-th th">' + c.th + '</span>' +
                     '<span class="wc-pick-rom">' + escapeHtml(c.rom) + '</span>' +
                     '</button>';
            }).join('') +
          '</div>' +
        '</div>';
      wcSyncOverlayFocus(root, 'colour');
      return;
    }

    if (gs.phase === 'challenge' && gs.turn === me && gs.challenge) {
      var col = wcColourOf(gs.challenge.colourAtPlay);
      root.className = 'wc-overlay wc-overlay-on';
      root.innerHTML =
        '<div class="wc-panel">' +
          '<h3 class="wc-panel-title">Wild Draw Four</h3>' +
          '<p class="wc-panel-body">' +
            '<strong>' + escapeHtml(gs.players[gs.challenge.by].name) + '</strong> played it on you. ' +
            'That\u2019s only allowed while holding no ' +
            '<span class="wc-inline-chip wc-c-' + gs.challenge.colourAtPlay + '">' +
              (col ? col.en : '') + '</span> card. Challenge?' +
          '</p>' +
          '<p class="wc-panel-note">Right \u2192 they draw 4 and you keep your turn. ' +
             'Wrong \u2192 you draw 6 and lose your turn.</p>' +
          '<div class="wc-panel-actions">' +
            '<button type="button" class="wc-act-btn wc-act-primary" data-wc-act="challenge" data-wc-arg="1">Challenge</button>' +
            '<button type="button" class="wc-act-btn" data-wc-act="challenge" data-wc-arg="0">Take the 4</button>' +
          '</div>' +
        '</div>';
      wcSyncOverlayFocus(root, 'challenge');
      return;
    }

    if (wcReveal) {
      root.className = 'wc-overlay wc-overlay-on';
      root.innerHTML =
        '<div class="wc-panel">' +
          '<h3 class="wc-panel-title">' + escapeHtml(wcReveal.title) + '</h3>' +
          '<div class="wc-reveal">' +
            wcReveal.cards.map(function (c) { return wcCardFaceHtml(gs, c, 'wc-c-mini'); }).join('') +
          '</div>' +
          '<div class="wc-panel-actions">' +
            '<button type="button" class="wc-act-btn wc-act-primary" data-wc-act="dismiss">OK</button>' +
          '</div>' +
        '</div>';
      wcSyncOverlayFocus(root, 'reveal');
      return;
    }

    root.className = 'wc-overlay';
    root.innerHTML = '';
    wcSyncOverlayFocus(root, null);
  }

  /* --- Status ticker ----------------------------------------------------- */

  /* The state line under the piles. It used to be a static hint that never
     changed; it now reports the table's live condition — the colour just
     named, the direction reversing, a card refused and why — and falls back to
     whose turn it is when there is nothing to report.

     The Expert warning it used to carry has moved to the setup screen's help
     box, where it is read once rather than every round. */
  function wcRenderTicker(gs) {
    var el = document.getElementById('wc-ticker');
    if (!el) return;
    if (gs.finished) { el.textContent = ''; return; }
    if (wcDealing()) {
      el.innerHTML = '<span class="wc-tick-sub">' +
        (wcDeal.phase === 'shuffle' ? 'Shuffling\u2026' : 'Dealing\u2026') + '</span>';
      return;
    }
    /* The turn cue used to LOSE to a state message. Measured across eight
       four-player rounds, 17% of the times the turn arrived at your seat the
       ticker was saying something else — and the commonest something else was
       the Reverse that had just handed you the turn. The two are not rivals:
       the state message says what happened, the cue says what to do about it,
       and you need both at exactly that moment. So both are shown, cue last
       because it is the instruction. */
    var mine = (gs.turn === 0 && gs.phase === 'play');
    if (wcStateMsg) {
      el.innerHTML = '<span class="wc-state-msg">' + wcStateMsg + '</span>' +
        (mine ? ' <span class="wc-your-turn">Your turn</span>' : '');
      return;
    }
    if (mine) {
      el.innerHTML = '<span class="wc-your-turn">Your turn</span>';
    } else if (!gs.players[gs.turn].isHuman) {
      el.innerHTML = '<span class="wc-tick-sub">' +
        escapeHtml(gs.players[gs.turn].name) + ' is thinking\u2026</span>';
    } else {
      el.innerHTML = '';
    }
  }

  /* The move log. Permanent, not transient: it is what you read after looking
     away for a few seconds, so it must still be there when you look back. Five
     lines, newest at the bottom and emphasised, rolling off the top. */
  function wcRenderLog() {
    var root = document.getElementById('wc-log');
    if (!root) return;
    var open = (state.wcLogOpen !== false);
    root.innerHTML =
      '<button type="button" class="wc-log-toggle" data-wc-act="logtoggle" ' +
        'aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span>' + (open ? '\u25BE' : '\u25B8') + '</span><span>Log</span>' +
      '</button>' +
      (open
        ? '<div class="wc-log-list">' +
            (wcMoveLog.length
              ? wcMoveLog.map(function (t) { return '<div class="wc-log-line">' + t + '</div>'; }).join('')
              : '<div class="wc-log-empty">No moves yet</div>') +
          '</div>'
        : '');
  }

  function wcRender() {
    var gs = wcGS;
    if (!gs) return;
    // Before anything is drawn: a seat that play has reached is no longer out,
    // and a turn that has just moved is not yet shown as moved.
    wcExpireSkipMarks(gs);
    wcNoteTurn(gs);
    wcRenderHud(gs);
    wcRenderSeats(gs);
    wcRenderCentre(gs);
    wcRenderHand(gs);
    wcRenderActions(gs);
    wcRenderLog();
    wcRenderTicker(gs);
    wcRenderOverlay(gs);
    var skip = document.getElementById('wc-dealskip');
    if (skip) skip.hidden = !wcDealing();
    // Last, so the cue follows the table it describes rather than preceding it.
    wcTurnSound(gs);
  }

  /* The top bar used to carry the colour in force, the direction and the
     draw-pile count. All three are on the table itself — the colour rings the
     discard, the arrow sits between the piles, the count sits on the pile —
     and the bar is the first thing players collapse for screen space. A second
     copy of information you already have, in the place you cannot see, is
     worse than none.

     The capsule builder is kept rather than deleted: WC_HUD_ENABLED brings all
     three back with no other change, and index.html still owns the #wc-hud
     span either way. */
  var WC_HUD_ENABLED = false;

  function wcRenderHud(gs) {
    var hud = document.getElementById('wc-hud');
    if (!hud) return;
    if (!WC_HUD_ENABLED) { hud.innerHTML = ''; return; }
    var col = wcColourOf(gs.colour);
    hud.innerHTML =
      '<span class="wc-hud-colour" style="background:' + (col ? col.hex : '#888') + '">' +
        (wcGlyphsOn() && col ? col.glyph + ' ' : '') +
        '<span class="th">' + (col ? col.th : '') + '</span>' +
        (col ? ' <span class="wc-hud-rom">' + escapeHtml(col.rom) + '</span>' : '') +
      '</span>' +
      '<span class="wc-hud-dir">' + (gs.dir === 1 ? '\u21BB' : '\u21BA') + '</span>' +
      '<span>\u25A4 <strong>' + gs.drawPile.length + '</strong></span>';
  }

  /* --- Building the view ------------------------------------------------- */

  function wcBuildGameView() {
    var view = document.getElementById('view-wordcards-game');
    if (!view || view.dataset.wcBuilt === '1') return;

    view.innerHTML =
      '<div class="wc-stage">' +
        '<div class="wc-seats" id="wc-seats"></div>' +
        '<div class="wc-centre-wrap">' +
          '<div class="wc-log" id="wc-log"></div>' +
          '<div class="wc-centre" id="wc-centre"></div>' +
          /* The control panel. It mirrors the log rather than sitting under
             the hand: both are absolutely positioned against the centre row
             at top:50%, so they line up with each other BY CONSTRUCTION
             instead of by two hand-tuned numbers that drift apart the first
             time either side changes. Moving it off the bottom also gives the
             ticker its own line back — it was almost touching the hand. */
          '<div class="wc-side" id="wc-side">' +
            '<div class="wc-hand-count" id="wc-hand-count"></div>' +
            '<div class="wc-actions" id="wc-actions"></div>' +
          '</div>' +
        '</div>' +
        '<div class="wc-ticker" id="wc-ticker"></div>' +
        '<div class="wc-handbar" tabindex="-1">' +
          '<div class="wc-hand-scroll"><div class="wc-hand" id="wc-hand"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="wc-flash-layer" id="wc-flash-layer"></div>' +
      /* Two live regions, both invisible, because everything this table says
         it says by moving something on screen. A sighted player reads the
         discard, the seats and the ticker; without these a screen-reader
         player is told nothing at all — there were zero live regions in this
         file before Phase 7.

         Politeness is split on urgency, not on importance. #wc-live carries
         the running commentary (moves, whose turn) and must never interrupt;
         #wc-alert carries the things that have just cost you something (a
         wrong card, a stack landing on you) and must. */
      '<div class="wc-sr" id="wc-live" role="status" aria-live="polite" aria-atomic="true"></div>' +
      '<div class="wc-sr" id="wc-alert" role="alert" aria-live="assertive" aria-atomic="true"></div>' +
      '<div class="wc-fly-layer" id="wc-fly-layer"></div>' +
      '<button type="button" class="wc-dealskip" id="wc-dealskip" ' +
        'data-wc-act="dealskip" hidden aria-label="Skip the deal">' +
        '<span class="wc-dealskip-hint">tap to deal instantly</span>' +
      '</button>' +
      '<div class="wc-overlay" id="wc-overlay"></div>' +
      '<div class="wc-rotate">' +
        '<div class="wc-rotate-icon">\uD83D\uDCF1</div>' +
        '<div class="wc-rotate-th"><span class="th">หมุนหน้าจอ</span></div>' +
        '<div class="wc-rotate-rom">mŭn nâa jor</div>' +
        '<div class="wc-rotate-en">Turn your device sideways to play Word Cards. ' +
        'The table needs the extra width.</div>' +
      '</div>';

    view.dataset.wcBuilt = '1';
  }

  function wcEnterGameView() {
    wcBuildGameView();
    document.body.classList.add('wc-in-game');
    // On very short screens the topbar is a sixth of the play area. Collapse it
    // on the way in and restore it on the way out — without saving, so the
    // player's own preference is never overwritten.
    if (window.innerHeight < 430 && !state.topbarHidden) {
      state.topbarHidden = true;
      wcTopbarForced = true;
    }
    if (typeof window.enterWordCardsGameView === 'function') {
      window.enterWordCardsGameView();
    }
    requestAnimationFrame(wcApplyScale);
  }

  function wcStartRound() {
    wcClearFx();
    // Anything still in the air, or still being dealt, belongs to the round
    // that just ended.
    wcClearFlights(true);
    wcClearDeal();
    wcClearResultHold();
    wcSpeakStop();
    wcDirAt = null;
    wcSkipMarks = {};
    wcHeldDraw = null;
    wcReadOwed = 0;
    wcTurnAt = null;
    wcTurnLast = null;
    wcOverlayKey = null;
    wcFocusReturn = null;
    wcOverlayFocusIdx = -1;
    wcClearSayTimer();
    wcClearMatchBits();
    wcMatchAt = null;
    wcMoveLog = [];
    var opponents = wcOppSelected().slice(0, WC_MAX_OPPONENTS);
    var pool = wcEligiblePool();
    var need = wcWordCount();
    if (opponents.length === 0 || pool.length < need) { wcRefreshStart(); return; }

    var words = shuffle(pool).slice(0, need);
    var players = [{
      name: (state.p1Name || '').trim() || 'You', isHuman: true, charId: null, hand: []
    }];
    opponents.forEach(function (id) {
      var ch = CHARACTERS.find(function (c) { return c.id === id; });
      players.push({ name: ch ? ch.en : id, isHuman: false, charId: id, hand: [] });
    });

    var startIndex = (state.wcStartingPlayer === 'you')
      ? 0 : Math.floor(Math.random() * players.length);

    wcGS = wcCreateGame({
      words: words, players: players,
      stacking: state.wcStacking,
      matchEffect: wcMatchEffect(),
      // Forced here rather than at the default, so a stored 'easy' from before
      // the toggle was removed can't survive with no way left to change it.
      assist: WC_FORCE_ASSIST || state.wcAssist,
      startIndex: startIndex
    });

    state.wcSession = wcGS;
    state.gameMode = 'wordcards';
    wcSelected = null;
    wcReveal = null;
    // Pre-latch when the opening turn is already yours: snd-start announces the
    // round, and two cues in the same instant read as one glitched sound. Set
    // BEFORE the first wcRender() below, which is what evaluates the latch.
    wcTurnSounded = (wcGS.turn === 0);

    wcEnterGameView();
    wcRender();
    wcApplyScale();

    /* One render had to happen first so the piles exist to be measured. If the
       deal declines — no motion, or nothing measurable — the round opens fully
       dealt with the usual start chime, which is exactly what it did before
       any of this existed. */
    if (!wcDealStart(wcGS)) {
      wcMaybeCpu();
      if (typeof playSound === 'function') playSound('snd-start');
    }
    if (typeof haptic === 'function') haptic(25);
  }

  /* --- Input ------------------------------------------------------------- */

  function wcFlash(text, kind, ms) {
    var layer = document.getElementById('wc-flash-layer');
    if (!layer) return null;
    var el = document.createElement('div');
    el.className = 'wc-flash' + (kind ? ' wc-flash-' + kind : '');
    el.innerHTML = text;
    layer.appendChild(el);
    /* A toast is always addressed to YOU and always reports something that has
       already happened to your hand — a wrong card, a stack landing. That is
       the definition of assertive. */
    try { wcAlert(text); } catch (e) { /* never block a toast with its narration */ }
    // The id is parked on the element so wcClearFx can cancel it. A held toast
    // is scheduled to live essentially forever — it is meant to be dismissed by
    // the table moving on, not by a clock — and without this, leaving the game
    // with one on screen left that timer pending for the whole of its life.
    el._wcT = setTimeout(function () {
      el.classList.add('wc-flash-out');
      el._wcT = setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, (typeof ms === 'number') ? ms : 2600);
    return el;
  }

  /* --- Announcements ------------------------------------------------------
     Show what just happened, and tell the caller how long the table should
     wait for it. Every consequence in this game used to resolve inside a
     single synchronous call and then vanish; this is what gives each one a
     moment on screen before the next thing moves.

     Events landing on a CPU get a badge over that seat. Events landing on YOU
     get a toast, because seat 0 has no box in the row — and the toast is
     tappable, so understanding it early skips the wait.

     Returns the hold in ms, which the CPU scheduler adds to its next delay. */
  function wcAnnounce(gs, pi, label, kind, ms, bg) {
    var hold = (typeof ms === 'number') ? ms : wcEventMs();
    /* A badge over an opponent's seat is invisible to a screen reader twice
       over: it is a visual position AND it is transient. Named here, with the
       seat it belongs to, because "Skipped" on its own says nothing about who.
       Seat 0's toast speaks for itself through wcFlash. */
    try {
      if (pi !== 0 && gs && gs.players[pi]) wcSay(gs.players[pi].name + ': ' + label);
    } catch (e) { /* never block an announcement with its own narration */ }
    // Seat 0's message used to reach a screen reader through wcFlash's alert
    // region. It is on the ticker now, so it is announced here instead.
    if (pi === 0) { try { wcAlert(label); } catch (e) {} }
    wcClearFx();
    wcHolding = true;
    if (pi === 0) {
      /* On the ticker, which is the one line that already reports what is
         happening. This used to be a toast with its own "tap to continue"
         affordance — a second channel saying the same kind of thing in a
         different place, and the only message in the mode that arrived
         somewhere other than the status line.

         Nothing about the TIMING changes: the hold returned to the caller is
         the same number it always was. Only where the words appear, and that
         the gesture which ends it early is now a tap anywhere rather than a tap
         on one specific box (see the click handler). */
      wcStateMsg = label +
        ' <span class="wc-tick-tap">tap to continue</span>';
      wcSay(label);
    } else {
      wcSeatFx = { pi: pi, label: label, kind: kind || 'on', bg: bg || null };
    }
    return hold;
  }

  // Tapping a held toast: drop the message and let the table move at once.
  function wcSkipHold() {
    if (!wcHolding) return;
    wcClearFx();
    // The player is fast-forwarding. A sprite still crossing the table is
    // depicting a move they have already read, so drop it and land the state.
    wcClearFlights(true);
    wcRender();
    wcClearTimer();
    wcMaybeCpu(0);
  }

  function wcOnAction(act, arg) {
    var gs = wcGS;
    if (!gs) return;
    var me = 0;

    if (act === 'menu')    { navigate('main'); return; }
    if (act === 'again')   { wcClearTimer(); wcClearFx(); wcMoveLog = []; wcStartRound(); return; }
    if (act === 'dismiss') {
      wcReveal = null;
      wcRender();
      // Whatever the challenge cost, flying now that the panel is out of the way.
      var heldMs = 0;
      if (wcHeldDraw !== null) { heldMs = wcFlyEaten(gs, wcHeldDraw, 0); wcHeldDraw = null; }
      /* This one does not pass through wcHoldFor, so it owes the debt directly
         — and unlike every other path there is no render after it, so the
         seat markup would keep the delay computed before the flights existed.
         Rendering again is what actually puts the wait on screen. */
      if (heldMs) { wcDelayTurnArrival(heldMs); wcRender(); }
      wcMaybeCpu(heldMs);
      return;
    }
    if (act === 'skiphold') { wcSkipHold(); return; }
    if (act === 'dealskip') { wcDealSkip(); return; }
    if (act === 'logtoggle') {
      state.wcLogOpen = (state.wcLogOpen === false);
      saveStorage();
      wcRenderLog();
      return;
    }
    if (act === 'cancel')  { wcSelected = null; wcRender(); return; }

    /* ---- OFF-TURN INPUT STOPS HERE -------------------------------------
       Everything above this line is legitimate whenever the table is on
       screen: leaving, restarting, dismissing a panel, skipping a deal,
       toggling the log, dropping a selection. Everything BELOW it is a move,
       and a move by someone whose turn it is not is not a move.

       This guard used to sit forty lines further down, after the speech cut —
       and that gap was a hard freeze. The piles are real buttons and are never
       disabled, so tapping the draw pile while a CPU's turn was held for
       speech ran wcSpeakStop(), which cancelled the very thing the scheduler
       was waiting for, and THEN hit the turn check and returned. Nothing was
       left to re-arm the scheduler: the seat sat "thinking" forever. A player
       tapping around while waiting reproduced it three times out of three.

       Guarding the input rather than patching that one path is the fix,
       because the same shape would come back with the next action added. */
    if (gs.turn !== me || gs.finished || wcDealing()) return;

    /* Anything that moves the game cuts a card that is still being read. The
       player has moved on, so the voice is describing history — and holding
       the table for it would mean their own action waits on the previous one.
       Deliberately NOT in wcClearFx(), which wcCpuStep also calls: that would
       cancel the very speech the table is waiting for. */
    if (act === 'draw' || act === 'pass' || act === 'confirm' ||
        act === 'colour' || act === 'challenge' || act === 'skiphold') {
      wcSpeakCut();
    }

    if (act === 'colour') {
      wcClearFx();
      // Naming the colour is what finally resolves the wild — including a
      // Draw Four's stack, which lands on its victim inside wcChooseColour.
      var evMarkC = (gs.events || []).length;
      wcChooseColour(gs, arg);
      // Your own choice gets no badge and no toast, but the table still waits
      // for the announcement — otherwise the next card lands over the voice.
      var saidCol = wcColourVoice(arg);
      var cn = wcColourName(arg);
      wcLogMove('<strong>You</strong> chose ' + escapeHtml(cn.charAt(0).toUpperCase() + cn.slice(1)));
      wcRender();
      var colDrawMs = wcFlyEaten(gs, evMarkC, 0);
      if (!colDrawMs) wcEatSound(gs, evMarkC);
      wcAfterHuman(wcHoldFor(Math.max(wcAnnounceLastCard(gs, me), saidCol), colDrawMs));
      return;
    }

    if (act === 'challenge') {
      // The only state-changing branch that used to skip this, so the colour
      // badge from the wild that STARTED the challenge was still on screen
      // after it resolved, looking as if it had just been chosen.
      wcClearFx();
      var evMarkCh = (gs.events || []).length;
      var res = wcResolveChallenge(gs, arg === '1');
      if (res.challenged) {
        wcReveal = {
          title: res.bluffed
            ? res.accusedName + ' was bluffing \u2014 they draw 4'
            : res.accusedName + ' was clean \u2014 you draw 6',
          cards: res.revealed
        };
        if (typeof playSound === 'function') playSound(res.bluffed ? 'snd-match' : 'snd-fail');
        // The 4 or the 6 flies once the revealed hand has been read, not behind it.
        wcHeldDraw = evMarkCh;
        wcAfterHuman();
      } else {
        // You waved it through and took the four — worth saying so.
        wcRender();
        var chDrawMs = wcFlyEaten(gs, evMarkCh, 0);
        if (!chDrawMs) wcEatSound(gs, evMarkCh);
        wcAfterHuman(wcHoldFor(wcAnnounceAte(gs, me, WC_CHALLENGE_PENALTY_GUILTY), chDrawMs));
      }
      return;
    }

    // (the turn guard now lives above, before anything can cut the speech)

    if (act === 'draw')  {
      wcSelected = null;
      wcClearFx();
      var nBefore = gs.players[me].hand.length;
      // Measured before the draw, while the pile is still the size it was.
      var pileFrom = wcAnimOn() ? wcRectOf(wcPileEl('draw')) : null;
      var d = wcDrawTurn(gs, me);
      var got = gs.players[me].hand.length - nBefore;
      wcLogMove('<strong>You</strong> ' + (d.ate ? 'took +' + got : 'drew a card'));
      /* Drew something playable: select it for them. The rules already
         restrict the turn to this one card, so selecting it states out loud
         what was previously only enforced — the discard lights up, Play it
         appears, and a second tap on the card commits exactly as it would for
         a card chosen by hand. Nothing about the rules changes. */
      if (gs.drawnPlayable) wcSelected = gs.drawnPlayable;
      wcRender();
      if (!wcFlyDraw(gs, me, wcJustDrawn(gs, me, got), pileFrom) &&
          typeof playSound === 'function') playSound(WC_DRAW_SOUND);
      wcAfterHuman(d.ate ? wcAnnounceAte(gs, me, gs.players[me].hand.length - nBefore) : 0);
      return;
    }
    if (act === 'pass')  {
      wcSelected = null;
      wcClearFx();
      wcPassAfterDraw(gs, me);
      wcLogMove('<strong>You</strong> kept it');
      wcAfterHuman();
      return;
    }

    // Two-step commit: the first tap lifts a card out of the fan and lights up
    // the discard pile; the second plays it. With a penalty riding on the
    // choice, a stray tap should never cost you a card.
    if (act === 'pick') {
      if (wcSelected === arg) { wcCommit(); return; }
      wcSelected = arg;
      if (typeof haptic === 'function') haptic(6);
      wcRender();
      return;
    }

    if (act === 'confirm') { wcCommit(); return; }
  }

  function wcCommit() {
    var gs = wcGS;
    var me = 0;
    if (!gs || !wcSelected || gs.turn !== me) return;
    var cardId = wcSelected;
    wcClearFx();

    if (gs.assist === 'easy') {
      var legal = wcLegalMoves(gs, me).some(function (c) { return c.id === cardId; });
      var allowed = legal && (!gs.drawnPlayable || cardId === gs.drawnPlayable);
      if (!allowed) {
        var card = gs.players[me].hand.find(function (c) { return c.id === cardId; });
        wcFlash(card ? escapeHtml(wcWhyNot(gs, card)) : 'You can\u2019t play that one.', 'warn');
        if (typeof haptic === 'function') haptic(12);
        wcSelected = null;
        wcRender();
        return;
      }
    }

    // Who this card is aimed at, read before the play moves the turn.
    var target = wcNextIndex(gs, me, 1);
    var targetBefore = gs.players[target].hand.length;
    var card = gs.players[me].hand.find(function (c) { return c.id === cardId; });
    /* Everything the flight needs, measured while it is all still true: where
       the card is sitting, and what the pile looks like underneath it. After
       wcPlay() the card has left the fan and the pile has already changed. */
    var flyFrom = wcAnimOn() ? wcRectOf(wcHandCardEl(cardId)) : null;
    var prevTop = wcTop(gs), prevColour = gs.colour, prevDir = gs.dir;
    // Where the event log stands before the rules run, so anything they do on
    // our behalf — a stack eaten by whoever could not pass it — can be read
    // back and animated. See wcFlyEaten.
    var evMark = (gs.events || []).length;

    var r = wcPlay(gs, me, cardId);
    wcSelected = null;
    if (!r.ok) {
      if (r.penalty) {
        var nBeforePen = gs.players[me].hand.length;
        wcPenalty(gs, me);
        if (typeof playSound === 'function') playSound('snd-uno-wrong');
        if (typeof haptic === 'function') haptic(20);
        wcLogMove('<strong>You</strong> tried ' +
                  escapeHtml(card ? wcCardLabel(gs, card) : 'a card') + ' \u2014 wrong');
        wcRender();
        // The penalty card comes off the pile like any other draw.
        wcFlyDraw(gs, me, wcJustDrawn(gs, me, gs.players[me].hand.length - nBeforePen),
                  wcAnimOn() ? wcRectOf(wcPileEl('draw')) : null, { quiet: true });
        // THE teaching moment of the mode. It used to scroll past while the
        // opponents played on over it; now the table waits, and a tap on the
        // message continues at once for anyone who already sees the problem.
        wcAfterHuman(wcAnnounce(gs, me,
          escapeHtml(r.reason) + '<br><em>Take it back, draw 1, turn ends.</em>',
          'bad', wcLessonMs()));
        return;
      }
      wcFlash(escapeHtml(r.reason), 'warn');
      wcRender();
      return;
    }

    var isMatch = wcIsMatch(card, prevTop);
    wcCardSound(card, false, isMatch);
    wcLogMove('<strong>You</strong> played ' + escapeHtml(wcCardLabel(gs, card)) +
              (isMatch ? ' \u2014 <strong>match!</strong>' : ''));
    // Before the render, so the arrow's first frame already carries the turn.
    wcMarkReverse(gs, prevDir);
    // Under 'skip' the message is part of the announcement instead, and is
    // written by wcAnnounceCard below — see the ordering note there.
    if (isMatch && wcEffectOf(gs) !== 'skip') wcMatchMessage(gs, me, card);
    wcRender();
    var flewP = wcFlyPlay(gs, me, card, flyFrom, prevTop, prevColour);
    // The opponents' cards set off under the chime, before the voice.
    var matchMs = wcFlyMatch(gs, evMark);
    var drawMs = wcFlyEaten(gs, evMark, flewP);
    if (!drawMs) wcEatSound(gs, evMark);
    var hold = r.needsColour ? 0 : wcAnnounceCard(gs, me, card, target, targetBefore, isMatch);
    if (!hold && !r.needsColour) hold = wcAnnounceLastCard(gs, me);
    hold = wcHoldFor(hold, Math.max(drawMs, matchMs));
    // Before wcAfterHuman, so the gate is up by the time it schedules.
    wcSpeakCard(gs, card, isMatch);
    wcAfterHuman(hold);
  }

  // `hold` is how long the table should wait before the next CPU moves —
  // an announcement, or the longer pause after a wrong card. Without it a
  // penalty message appeared and the opponents carried straight on over it.
  /* Combine an announcement's hold with a flight's duration. They run at the
     same time, so the table waits for the LONGER of the two rather than the
     sum — and a flight that never started contributes nothing, which is how
     this stays true with no browser and no motion.

     Nothing here observes a sprite. The number is worked out from the card
     count and the configured durations before anything moves, so a flight that
     is torn down mid-air still leaves the scheduler with a correct plan. That
     is the same ordering rule as everywhere else in this layer. */
  /* Every path with motion funnels through here to tell the SCHEDULER how long
     to wait. The highlight owes the same debt, so it is collected in the same
     place rather than at each of the seven call sites — which is how the two
     would drift apart. */
  function wcHoldFor(hold, drawMs) {
    wcDelayTurnArrival(drawMs || 0);
    return Math.max(hold || 0, drawMs || 0);
  }

  function wcAfterHuman(hold) {
    wcRender();
    if (wcGS && wcGS.finished) { wcOnFinished(); return; }
    wcMaybeCpu(hold || 0);
  }

  /* --- CPU pacing --------------------------------------------------------
     Three scales from §1, all indexed by the app-wide Settings -> Speed value.
     Only the think time is multiplied, by the character's own speedMult and by
     the table multiplier; beats stay flat so a consequence reads at the same
     tempo whoever caused it.

     index.html's cpuTimingMult() is NOT reusable here: it reads
     state.currentCharacter, a single-opponent notion from the memory game.
     This table seats up to three CPUs at once, so the multiplier has to be
     looked up per player. ------------------------------------------------- */

  function wcSpeedKey() {
    var s = state.speed;
    return (s === 'fast' || s === 'slow') ? s : 'medium';
  }

  /* Every seat thinks for the same length of time. See WC_USE_CHARACTER_SPEED
     in §1 for why: the roster's speedMult is memory-game flavour, and at this
     table it was silently deciding how long you got to read the previous
     card. The lookup is kept intact behind the switch — the roster is not
     edited, so index.html's cpuTimingMult() and the memory game keep using
     the same field exactly as before. */
  function wcSpeedMultFor(gs, pi) {
    if (!WC_USE_CHARACTER_SPEED) return 1;
    var p = gs.players[pi];
    if (!p || !p.charId || typeof CHARACTERS === 'undefined') return 1;
    var ch = CHARACTERS.find(function (c) { return c.id === p.charId; });
    return (ch && typeof ch.speedMult === 'number') ? ch.speedMult : 1;
  }

  function wcTablePace(gs) {
    if (!WC_TABLE_PACE_ENABLED) return 1;
    var m = WC_TABLE_PACE[gs.players.length - 1];
    return (typeof m === 'number') ? m : 1;
  }

  function wcThinkMs(gs, pi) {
    return Math.round(WC_THINK_MS[wcSpeedKey()] * wcSpeedMultFor(gs, pi) * wcTablePace(gs));
  }
  function wcBeatMs()   { return WC_BEAT_MS[wcSpeedKey()]; }
  function wcColourMs() { return WC_COLOUR_MS[wcSpeedKey()]; }
  function wcEventMs()  { return WC_EVENT_MS[wcSpeedKey()]; }
  function wcLessonMs() { return WC_LESSON_MS[wcSpeedKey()]; }

  // What the next scheduled step should wait. A pending colour choice is a
  // short reveal beat; everything else is that seat's thinking time.
  function wcCpuDelay(gs, extra) {
    var base = (gs.phase === 'colour') ? wcColourMs() : wcThinkMs(gs, gs.turn);
    return base + (extra || 0);
  }

  /* --- The reading floor -------------------------------------------------
     WHAT IT IS: a minimum, not an addition. A card that has just landed owes
     the table `wcReadOwed` milliseconds of stillness; the next scheduled step
     takes the LONGER of that and whatever it was going to wait anyway. A seat
     that already thinks for 3s contributes the floor nothing.

     WHY IT IS OWED RATHER THAN CHECKED: the scheduler is entered from six
     places and turned away at four of them (a reveal, the deal, speech, a
     human on turn). Reading the clock at the point of scheduling would either
     lose the floor across a bail or restart it on every re-entry. Carrying it
     as a debt that exactly one scheduled timer discharges makes both
     impossible, and it is the same shape as wcSpeakOwed directly above.

     WHY IT IS NOT A TIMESTAMP: there is no clock here that a test can move.
     The suites replace setTimeout and never Date.now, so a floor measured
     against wall time would be correct in a browser and meaningless in every
     suite that covers it. A number handed to the scheduler is the same number
     under both, which is the whole reason wcHoldFor works.

     WHOSE CARDS COUNT: only a CPU's. You do not need three seconds to read a
     card you chose out of your own hand, and charging you for it would put
     the floor on the one play that never needed it. */

  var wcReadOwed = 0;

  function wcReadScale() {
    // Hidden control: the shipped default wins over anything stored.
    if (!WC_SHOW_READ_SETTING) return WC_READ_SCALE[WC_READ_DEFAULT];
    var s = WC_READ_SCALE[state.wcRead];
    return (typeof s === 'number') ? s : WC_READ_SCALE[WC_READ_DEFAULT];
  }

  /* `flewMs` is what the card's flight was COMPUTED to take — the pile keeps
     showing the card underneath until the sprite lands (wcFlyHoldTop), so the
     new card is not readable until then and the floor starts after it. Read
     from the same return value wcHoldFor uses, before anything moves; a
     flight that never runs reports 0 and the floor simply starts at once. */
  function wcReadMsFor(card, flewMs) {
    if (!WC_READ_ENABLED || !card) return 0;
    var base = (card.kind === 'word') ? WC_READ_MS.word : WC_READ_MS.action;
    return Math.round(base * wcReadScale()) + (flewMs || 0);
  }

  function wcOweRead(card, flewMs) {
    var ms = wcReadMsFor(card, flewMs);
    if (ms > wcReadOwed) wcReadOwed = ms;
  }

  // Does this card change the flow enough to deserve a pause after it lands?
  function wcConsequential(card) {
    return !!card && (card.kind === 'skip' || card.kind === 'reverse' ||
                      card.kind === 'draw2' || card.kind === 'wild4');
  }

  /* --- CPU turns ---------------------------------------------------------
     One timer at a time, always. Each step does exactly ONE visible thing and
     then schedules the next, so a CPU turn plays out as a sequence a human can
     follow rather than arriving complete in a single frame:

       think -> play
       think -> wild lands -> colour beat -> colour named
       think -> draw       -> think        -> play it, or keep it
       ...any consequential card adds a beat before whatever comes next.
     --------------------------------------------------------------------- */

  function wcMaybeCpu(extraMs) {
    var gs = wcGS;
    if (!gs || gs.finished) return;
    // A challenge reveal owns the table until the player dismisses it. Nothing
    // may race their reading of the revealed hand.
    if (wcReveal) return;
    // Neither may anything race the deal. wcDealFinish() re-enters here.
    if (wcDealing()) return;
    /* A card is being read aloud. Holding is the whole point of speaking it —
       a CPU moving over the top of the voice is the same as not playing it.
       The pause this step was owed is remembered rather than dropped, and
       wcSpeakRelease re-enters with it. */
    if (wcSpeaking) {
      wcSpeakOwed = Math.max(wcSpeakOwed, extraMs || 0);
      /* Speech IS the reading time, and a better version of it — the word is
         being said out loud while the card sits there. Holding a silent floor
         on top of the release would double the pause for the one card that
         needs it least. The debt is discharged here, by the voice. */
      wcReadOwed = 0;
      return;
    }
    // A human is NEVER scheduled — not even mid-wild, while the colour picker
    // is open. The phase==='colour' branch below exists only for a CPU that
    // owes a colour choice; letting a human fall through to it meant the
    // scheduler answered your own colour picker before you could read it.
    if (gs.players[gs.turn].isHuman) {
      /* And a human on turn discharges the floor too, for the plainest
         possible reason: they are looking at the card and nothing will move
         until they act. Left standing, the debt would survive their turn and
         be charged to the card THEY play — delaying the wrong card entirely. */
      wcReadOwed = 0;
      return;
    }

    wcClearTimer();
    /* The floor is a minimum under the pace, not a delay added to it. A seat
       that was already going to think for longer takes the longer number and
       the floor costs nothing; a fast one is held to it. */
    var delay = wcCpuDelay(gs, extraMs);
    if (wcReadOwed > delay) delay = wcReadOwed;
    wcReadOwed = 0;                       // exactly one timer discharges it
    wcTimer = setTimeout(wcCpuStep, delay);
  }

  function wcCpuStep() {
    wcTimer = null;
    var g = wcGS;
    if (!g || g.finished) return;
    // The previous announcement has had the whole of this delay on screen.
    // Clearing it HERE rather than on its own timer is what keeps the table
    // from going blank halfway through the pause.
    wcClearFx();
    var pi = g.turn;
    // A timer that lands on a human is stale — the turn passed back while it
    // was in flight — and must do nothing.
    if (g.players[pi].isHuman) return;

    var beat = 0;
    if (g.phase === 'challenge')    beat = wcCpuChallenge(g, pi);
    else if (g.phase === 'colour')  beat = wcCpuColour(g, pi);
    else if (g.drawnPlayable)       beat = wcCpuPlayDrawn(g, pi);
    else                            beat = wcCpuTurn(g, pi);

    wcRender();
    if (g.finished) { wcOnFinished(); return; }
    wcMaybeCpu(beat);
  }

  // A CPU facing a Wild Draw Four. D1: the reveal panel — the best drama in the
  // game — used to happen only when YOU challenged. A CPU challenge resolved
  // silently inside the scheduler and res.revealed was thrown away, so the
  // moment your own bluff got caught was invisible. It now raises the same
  // panel and holds the table until you dismiss it.
  function wcCpuChallenge(g, pi) {
    var evMarkCh = (g.events || []).length;
    var res = wcResolveChallenge(g, wcAiChallenge(g, pi));
    if (res.challenged) {
      wcReveal = {
        title: g.players[pi].name + ' challenges \u2014 ' +
               (res.bluffed
                 ? res.accusedName + ' was bluffing, and draws ' + WC_CHALLENGE_PENALTY_GUILTY
                 : res.accusedName + ' was clean, so ' + g.players[pi].name +
                   ' draws ' + WC_CHALLENGE_PENALTY_INNOCENT),
        cards: res.revealed
      };
      if (typeof playSound === 'function') playSound(res.bluffed ? 'snd-match' : 'snd-fail');
      // Held until the panel is dismissed — see wcHeldDraw.
      wcHeldDraw = evMarkCh;
      return wcBeatMs();
    }
    // Waved it through and took the four. Silent until now.
    wcRender();
    var cpuChDrawMs = wcFlyEaten(g, evMarkCh, 0);
    if (!cpuChDrawMs) wcEatSound(g, evMarkCh);
    return wcHoldFor(wcAnnounceAte(g, pi, WC_CHALLENGE_PENALTY_GUILTY), cpuChDrawMs);
  }

  function wcCpuColour(g, pi) {
    var colour = wcAiPickColour(g, pi);
    // A Draw Four's stack lands on its victim in here, not when the card was
    // played — the colour is what resolves the wild. Same seam as wcCommit.
    var evMark = (g.events || []).length;
    wcChooseColour(g, colour);
    wcRender();                                   // so the badge has a seat to sit on
    var colDrawMs = wcFlyEaten(g, evMark, 0);
    if (!colDrawMs) wcEatSound(g, evMark);
    return wcHoldFor(wcAnnounceColour(g, pi, colour) || wcBeatMs(), colDrawMs);
  }

  // The CPU drew last step and the card is playable. This is a separate step
  // purely so it reads as a decision: it picked a card up, looked at it, and
  // then chose. Run A always plays it (what the placeholder did); Run B scores
  // play-versus-keep.
  function wcCpuPlayDrawn(g, pi) {
    return wcCpuPlay(g, pi, g.drawnPlayable);
  }

  /* Pick a card that genuinely does not match, if this CPU is going to make
     that mistake this turn. Table layer only — see WC_WRONGCARD_P in §1 for
     why this must never live inside wcAiChooseMove. */
  function wcCpuWrongCard(g, pi) {
    var p = WC_WRONGCARD_P[wcTierOf(g, pi)];
    if (!(Math.random() < (typeof p === 'number' ? p : 0))) return null;
    if (g.pending > 0 || g.drawnPlayable) return null;   // not while a stack is live
    var legal = {};
    wcLegalMoves(g, pi).forEach(function (c) { legal[c.id] = true; });
    var bad = g.players[pi].hand.filter(function (c) { return !legal[c.id]; });
    if (!bad.length) return null;
    return bad[Math.floor(Math.random() * bad.length)];
  }

  function wcCpuTurn(g, pi) {
    // A visible, teachable mistake: it plays something that doesn't match, is
    // refused, takes the card back and draws one — with the same explanation
    // you get, against its own seat.
    var wrong = wcCpuWrongCard(g, pi);
    if (wrong) {
      var why = wcWhyNot(g, wrong);
      var label = wcCardLabel(g, wrong);
      var nBeforeWrong = g.players[pi].hand.length;
      var wrongPile = wcAnimOn() ? wcRectOf(wcPileEl('draw')) : null;
      wcPenalty(g, pi);
      if (typeof playSound === 'function') playSound('snd-uno-wrong');
      wcLogMove('<strong>' + escapeHtml(g.players[pi].name) + '</strong> tried ' +
                escapeHtml(label) + ' \u2014 wrong');
      wcRender();
      wcFlyDraw(g, pi, wcJustDrawn(g, pi, g.players[pi].hand.length - nBeforeWrong),
                wrongPile, { quiet: true });
      var hold = wcAnnounce(g, pi, 'Wrong card', 'bad', wcLessonMs());
      wcStateMsg = escapeHtml(g.players[pi].name) + ' tried ' + escapeHtml(label) +
                   ' \u2014 ' + escapeHtml(why);
      return hold;
    }

    var mv = wcAiMove(g, pi);
    if (mv.action !== 'draw') return wcCpuPlay(g, pi, mv.cardId);

    var before = g.players[pi].hand.length;
    var drawPile = wcAnimOn() ? wcRectOf(wcPileEl('draw')) : null;
    var d = wcDrawTurn(g, pi);
    if (d.ate) {
      var n = g.players[pi].hand.length - before;
      wcLogMove('<strong>' + escapeHtml(g.players[pi].name) + '</strong> took +' + n);
      wcRender();
      if (!wcFlyDraw(g, pi, wcJustDrawn(g, pi, n), drawPile) &&
          typeof playSound === 'function') playSound(WC_DRAW_SOUND);
      return wcAnnounceAte(g, pi, n);
    }
    wcLogMove('<strong>' + escapeHtml(g.players[pi].name) + '</strong> drew a card');
    wcRender();
    if (!wcFlyDraw(g, pi, wcJustDrawn(g, pi, g.players[pi].hand.length - before), drawPile) &&
        typeof playSound === 'function') playSound(WC_DRAW_SOUND);
    // If the drawn card is playable, g.drawnPlayable is now set and the NEXT
    // step handles it after a full think — the CPU visibly considering the
    // card it just picked up, rather than drawing and playing in one frame.
    return 0;
  }

  function wcCpuPlay(g, pi, cardId) {
    var card = g.players[pi].hand.find(function (c) { return c.id === cardId; });
    // Who this card is aimed at, in the direction that applies right now. Read
    // before the play, because Skip and Reverse both move the turn. The hand
    // size goes with it: if you can't pass a Draw Two along you will already
    // have eaten it by the time we announce, and gs.pending will be back to 0.
    var target = wcNextIndex(g, pi, 1);
    var targetBefore = g.players[target].hand.length;
    /* Where the card sets off from, and what the pile shows until it lands —
       both only true until wcPlay() runs, so both are read here. */
    var flyFrom = wcAnimOn() ? wcRectOf(wcSeatCardEl(pi)) : null;
    var prevTop = wcTop(g), prevColour = g.colour, prevDir = g.dir;
    var evMark = (g.events || []).length;

    // Wilds are deliberately played WITHOUT a colour even though wcAiMove
    // supplies one, so the round goes through the 'colour' phase and the
    // player gets the card, a beat, and then the colour. (Headless callers —
    // the rules fuzz — pass mv.colour and resolve it in one step.)
    var r = wcPlay(g, pi, cardId);

    if (!r.ok) {
      // D2. A refused play leaves the turn exactly as it was, so the scheduler
      // would re-offer the same move forever. Nothing should ever reach here —
      // wcAiChooseMove only returns cards from view.legal — but a wedged table
      // is a far worse failure than a CPU that hesitates, and both fallbacks
      // below are guaranteed to move the turn on.
      wcLog(g, g.players[pi].name + ' thinks better of it and draws instead.');
      if (g.drawnPlayable) wcPassAfterDraw(g, pi);
      else                 wcDrawTurn(g, pi);
      return 0;
    }

    var isMatch = wcIsMatch(card, prevTop);
    wcCardSound(card, true, isMatch);
    wcLogMove('<strong>' + escapeHtml(g.players[pi].name) + '</strong> played ' +
              escapeHtml(wcCardLabel(g, card)) +
              (isMatch ? ' \u2014 <strong>match!</strong>' : ''));
    // A wild hasn't finished landing yet — the colour is still to come, and
    // wcCpuColour supplies that hold. Adding one here would double it.
    /* A wild owes NO reading floor. The play is not finished — the colour is
       still to come, and the two-beat sequence that delivers it (card lands,
       short beat, colour named) already has holds of its own that the floor
       would swamp. There is also nothing here to read: the face is four
       quadrants of colour, not a word. The colour badge is the thing worth
       time, and wcAnnounceColour is what gives it. */
    if (r.needsColour) {
      wcRender();
      wcFlyPlay(g, pi, card, flyFrom, prevTop, prevColour);
      return 0;
    }
    wcMarkReverse(g, prevDir);
    // Under 'skip' the message is part of the announcement instead, and is
    // written by wcAnnounceCard below — see the ordering note there.
    if (isMatch && wcEffectOf(g) !== 'skip') wcMatchMessage(g, pi, card);
    wcRender();                                   // seats exist before a badge is pinned
    var flewP = wcFlyPlay(g, pi, card, flyFrom, prevTop, prevColour);
    /* This is the card you have to read, and this is where the table learns
       how long it owes you for it. Passed the flight's COMPUTED duration, not
       an observed one — the pile shows the card underneath until the sprite
       lands, so the window starts there. */
    wcOweRead(card, flewP);
    wcDelayTurnArrival(flewP);
    var matchMs = wcFlyMatch(g, evMark);
    var drawMs = wcFlyEaten(g, evMark, flewP);
    if (!drawMs) wcEatSound(g, evMark);
    var hold = wcAnnounceCard(g, pi, card, target, targetBefore, isMatch);
    // Going out on this card is the win, which the finished screen covers.
    if (!hold) hold = wcAnnounceLastCard(g, pi);
    hold = wcHoldFor(hold, Math.max(drawMs, matchMs));
    /* The returned hold is what wcCpuStep passes to wcMaybeCpu — which, if
       this card is being read aloud, records it and waits. */
    wcSpeakCard(g, card, isMatch);
    return hold || (wcConsequential(card) ? wcBeatMs() : 0);
  }

  /* What just happened, shown where it happened, held long enough to read.
     Called after every play — by a CPU or by you — and returns how long the
     table should wait before anything else moves.

     Only consequential cards announce. An ordinary word card resolving in
     silence is correct; a Skip resolving in silence is what made the game
     unreadable. Reverse only announces with three or more players, because at
     two it simply means "go again" and saying so would be noise. */
  function wcAnnounceCard(g, pi, card, target, targetBefore, isMatch) {
    if (!card || g.finished) return 0;
    var who = escapeHtml(g.players[pi].name);
    var them = (target >= 0 && g.players[target]) ? escapeHtml(g.players[target].name) : '';

    /* A match under WC_MATCH_EFFECT 'skip'. Everything a Skip card announces,
       through the same three functions, so the two are the same event to the
       player: the mark that dims the seat (or the hand, for seat 0), the badge
       or the held toast, and the spoken cue.

       THE ORDERING HERE IS LOAD-BEARING. wcAnnounce calls wcClearFx, which
       nulls wcStateMsg — so a match message written BEFORE this point is
       destroyed, and the play would report "Skipped" without ever saying a
       match caused it. Which side of the announce the sentence goes therefore
       depends on who is being skipped:

         target !== 0  the announce puts a badge on their SEAT and leaves the
                       ticker alone, so the combined line is written after it,
                       exactly as the Reverse branch below does.
         target === 0  the announce IS the ticker line, and it carries its own
                       "tap to continue" affordance. The whole sentence has to
                       be its label; writing wcStateMsg afterwards would delete
                       the only gesture that ends the hold early. */
    if (isMatch && wcEffectOf(g) === 'skip') {
      wcMarkSkipped(target, 'skipped');
      var mHold;
      if (target === 0) {
        mHold = wcAnnounce(g, 0, wcMatchLead(g, pi, card) +
                           ' \u2014 your turn is skipped.', 'bad');
      } else {
        mHold = wcAnnounce(g, target, 'Skipped', 'bad');
        wcStateMsg = wcMatchLead(g, pi, card) + ' \u2014 ' + them + ' is skipped.';
      }
      return mHold + (WC_MATCH_SKIP_VOICE ? wcSaySkip() : 0);
    }

    if (card.kind === 'skip') {
      wcMarkSkipped(target, 'skipped');
      var skipHold = (target === 0)
        ? wcAnnounce(g, 0, who + ' plays <strong>Skip</strong> \u2014 your turn is skipped.', 'bad')
        : wcAnnounce(g, target, 'Skipped', 'bad');
      return skipHold + wcSaySkip();
    }

    if (card.kind === 'draw2') {
      // Either it is still sitting there to be answered, or the target has
      // already had to take it — both are worth naming, with the real number.
      var took = g.players[target].hand.length - targetBefore;
      var n = (took > 0) ? took : g.pending;
      /* Only a stack that has actually been EATEN costs the turn. One still
         sitting there to be answered leaves the target free to pass it along.

         INSURANCE, like the !isTurn guard in wcRenderSeats, and unreachable
         for the same reason: an unanswered stack advances the turn TO the
         target, so wcExpireSkipMarks deletes any mark on them before the next
         frame is drawn. A mutation removing this guard is not detectable.
         Kept so the statement is true where it is written rather than true
         only because of what runs afterwards. */
      if (took > 0) wcMarkSkipped(target, '+' + took + ' \u00B7 out');
      return (target === 0)
        ? wcAnnounce(g, 0, who + ' plays <strong>Draw Two</strong> \u2014 ' +
                     (took > 0 ? 'you take +' + took + '.' : '+' + n + ' to you.'), 'bad')
        : wcAnnounce(g, target, (took > 0 ? 'Took +' + took : '+' + n), 'bad');
    }

    /* At two players a Reverse IS a Skip — it hands the turn straight back —
       and until now it said nothing at all, on the reasoning that "go again"
       needs no explanation. It does: measured over eight rounds, a Reverse was
       the single most common reason the turn arrived at your seat with the
       table announcing something other than your turn. Both halves of the
       table now say so. */
    if (card.kind === 'reverse' && g.players.length === 2) {
      wcMarkSkipped(target, 'skipped');
      /* The SKIP voice, not the reverse one. At two seats nothing reverses —
         the turn simply comes straight back — which is exactly why the badge
         says "Skipped" here rather than "Reversed". The voice matches what the
         table says and what actually happens, not the card art. */
      var revHold = (pi === 0) ? 0 : wcAnnounce(g, target, 'Skipped', 'bad');
      return revHold + wcSaySkip();
    }

    if (card.kind === 'reverse' && g.players.length > 2) {
      var dir = (g.dir === 1) ? 'clockwise' : 'anti-clockwise';
      /* A held toast is for something that HAPPENED TO YOU and that you have
         to acknowledge — a stack landing, a turn lost. A Reverse you played
         yourself is neither: you chose it, you know what it does, and a
         "tap to continue" over your own move is an interruption asking you to
         confirm you meant it. The ticker already says it, in exactly the words
         a CPU's reverse gets, so both now read the same. */
      var hold = (pi === 0)
        ? wcEventMs()
        : wcAnnounce(g, pi, 'Reversed \u21BA', 'on');
      wcStateMsg = 'Direction reversed \u2014 now ' + dir;
      return hold + wcSayReverse();
    }
    return 0;
  }

  /* The colour named after a wild. The single most consequential decision in
     the game, and — since the colours are vocabulary — worth showing in Thai.
     The badge is painted in the colour itself, so it reads before it is read. */
  function wcAnnounceColour(g, pi, colourId) {
    var say = wcColourVoice(colourId);
    var col = wcColourOf(colourId);
    var name = wcColourName(colourId);
    var label = escapeHtml(name.charAt(0).toUpperCase() + name.slice(1)) +
                ' \u00B7 ' + escapeHtml(wcColourThai(colourId));
    // You chose it, so no badge and no toast — but the table still waits for
    // the announcement, or the next card lands over the top of it.
    if (pi === 0) return say;
    // The badge is painted in the colour that was actually named — the fastest
    // reading of it. Passed as STATE, not written into the DOM afterwards:
    // wcRenderSeats rebuilds its markup on every render, so an inline style
    // set here would be gone by the next frame.
    var hold = wcAnnounce(g, pi, label, 'on', undefined, col ? col.hex : null);
    wcStateMsg = escapeHtml(g.players[pi].name) + ' chose ' + label;
    wcLogMove('<strong>' + escapeHtml(g.players[pi].name) + '</strong> chose ' + label);
    return Math.max(hold, say);
  }

  /* Somebody is one card from winning. The most important state change on the
     table, and it used to be a small numeral you had to be looking for.

     The cue sits INSIDE the guard, so it sounds exactly when the badge or
     toast appears and never on its own. The callers only reach here when no
     louder consequence already claimed the moment, which also means it can
     never double up with an action sound. */
  function wcAnnounceLastCard(g, pi) {
    if (!g.players[pi] || g.players[pi].hand.length !== 1 || g.finished) return 0;
    if (typeof playSound === 'function') playSound('snd-uno-1left');
    /* Your own last card gets the chime and nothing else. You are looking at
       your hand; you can see it is one card. The toast told you something you
       already knew and then held the table while you read it.

       An OPPONENT reaching one card is the opposite: it is off at the edge of
       the screen, it is the single most important thing on the table, and the
       badge over their seat is the only thing that says so. That stays. */
    if (pi === 0) return 0;
    return wcAnnounce(g, pi, 'Last card!', 'bad');
  }

  function wcAnnounceAte(g, pi, n) {
    // Eating a stack ends the turn, so the seat is out until play comes round.
    wcMarkSkipped(pi, '+' + n + ' \u00B7 out');
    return (pi === 0)
      ? wcAnnounce(g, 0, 'You take <strong>+' + n + '</strong> and lose the turn.', 'bad')
      : wcAnnounce(g, pi, 'Took +' + n, 'bad');
  }

  function wcOnFinished() {
    wcClearTimer();
    var gs = wcGS;
    if (!gs) return;
    /* Banked EXACTLY once. This function can now legitimately run more than
       once for a single round — the panel may be waiting on speech, and
       wcSpeakRelease comes back through here — so the counters need a guard
       the old single-call version did not. */
    if (wcResultBanked) { wcRender(); wcArmResultPanel(); return; }
    wcResultBanked = true;

    var humanWon = (gs.placements[0] === 0);
    wcResultBadge = null;
    if (humanWon) {
      /* Read BEFORE the bump, so the crossing can be detected. The counter
         itself is unchanged — this only observes it. wordCardsBadgeUnlockedBy
         lives in index.html beside every other mode's; guarded because this
         file must keep working if it is ever loaded without one. */
      var prevWins = state.wcWins || 0;
      state.wcWins = prevWins + 1;
      if (typeof wordCardsBadgeUnlockedBy === 'function') {
        try { wcResultBadge = wordCardsBadgeUnlockedBy(prevWins, state.wcWins); }
        catch (e) { wcResultBadge = null; }
      }
    }
    if (!state.stats) state.stats = {};
    state.stats.wcFinished = (state.stats.wcFinished || 0) + 1;
    saveStorage();
    if (typeof checkAchievements === 'function') { try { checkAchievements(true); } catch (e) {} }
    wcRender();

    /* Only the PANEL waits. Everything above is a fact the moment the last
       card is down, whatever the screen still shows — the win is banked and
       saved before any of this. wcRenderOverlay holds the panel back until
       wcResultReady, giving the winning card WC_RESULT_MS of clear air.

       The chime waits with the panel rather than firing here: a fanfare over a
       card nobody has read yet is just noise arriving early. */
    wcArmResultPanel();
  }

  /* Start the clock that puts the results panel up. Split out of wcOnFinished
     so it can be re-entered: a round won on a spoken card holds the panel
     until the voice is done, because a screen sliding over the table while the
     winning word is still being read is two things competing for one moment. */
  function wcArmResultPanel() {
    var gs = wcGS;
    if (!gs || !gs.finished) return;
    if (wcResultTimer || wcResultReady) return;
    // wcSpeakRelease calls back here the instant it is free.
    if (wcSpeaking) return;
    var humanWon = (gs.placements[0] === 0);
    wcResultTimer = setTimeout(function () {
      wcResultTimer = null;
      wcResultReady = true;
      /* Deliberately NOT tiered by whether a landmark unlocked, the way the vs
         Computer screen picks between snd-win and snd-win-2. That would be a
         nicety nobody asked for, and test-fly.js §"the results panel waits"
         asserts exactly one of snd-win/snd-lose fires here — a claim worth
         more than the nicety. If the tiering is ever wanted, it is this line
         plus that assertion, together. */
      if (typeof playSound === 'function') playSound(humanWon ? 'snd-win' : 'snd-lose');
      if (wcGS) wcRender();
    }, WC_RESULT_MS);
  }

  function wcClearResultHold() {
    if (wcResultTimer) { clearTimeout(wcResultTimer); wcResultTimer = null; }
    wcResultReady = false;
    wcResultBadge = null;
    wcResultBanked = false;
  }

  function teardownWordCards() {
    wcClearTimer();
    wcClearFx();
    // Silent: wcGS is about to go, so there is nothing left to re-render into.
    wcClearFlights(true);
    wcClearDeal();
    // wcClearDeal starts a 140ms ramp; leaving is not the moment for one.
    // Instant, and it cancels the ramp's timers — audit.js asserts teardown
    // leaves nothing pending, and a half-run fade would be exactly that.
    wcDealSoundStop(true);
    wcClearResultHold();
    // Silences the voice and clears the one timer this layer owns.
    wcSpeakStop();
    wcDirAt = null;
    wcSkipMarks = {};
    wcHeldDraw = null;
    wcReadOwed = 0;
    wcTurnAt = null;
    wcTurnLast = null;
    wcOverlayKey = null;
    wcFocusReturn = null;
    wcOverlayFocusIdx = -1;
    // A voice scheduled into a round that has ended must not arrive over the menu.
    wcClearSayTimer();
    wcClearMatchBits();
    wcMatchAt = null;
    wcMoveLog = [];
    var bar = document.querySelector('.wc-handbar');
    if (bar) { bar.classList.remove('wc-my-turn'); bar.classList.remove('wc-hand-out'); }
    document.body.classList.remove('wc-in-game');
    // Restore the topbar if WE collapsed it on the way in.
    if (wcTopbarForced) {
      state.topbarHidden = false;
      wcTopbarForced = false;
      if (typeof applyTopbarVisibility === 'function') applyTopbarVisibility();
    }
    state.wcSession = null;
    wcGS = null;
    wcSelected = null;
    wcReveal = null;
    // Otherwise a round quit on your turn leaves the latch set, and the next
    // round's first turn is silent.
    wcTurnSounded = false;
    var hud = document.getElementById('wc-hud');
    if (hud) hud.innerHTML = '';
  }

  // One delegated listener for the whole table, so re-rendering never leaves
  // stale handlers behind.
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('wc-in-game')) return;
    var btn = e.target.closest ? e.target.closest('[data-wc-act]') : null;

    /* A HELD ANNOUNCEMENT ENDS ON A TAP ANYWHERE.

       It used to be a toast that carried data-wc-act="skiphold" on itself, so
       the gesture only worked on that one box. The message now lives on the
       ticker, which is not a control, so the gesture has to live on the table.

       Two things are still let through. Anything that is not a MOVE — leaving,
       restarting, the log, skipping the deal — because a held message must not
       trap the player in the view. And, when the turn is genuinely yours, your
       own controls: their handlers call wcClearFx() and clear the hold as part
       of acting, so swallowing the first tap would cost you a move to dismiss
       a message you had already read. */
    if (wcHolding) {
      var a = btn ? btn.dataset.wcAct : null;
      var passthrough = (a === 'menu' || a === 'again' || a === 'logtoggle' ||
                         a === 'dealskip' || a === 'dismiss' || a === 'skiphold');
      var yours = !!(wcGS && !wcGS.finished && !wcDealing() && wcGS.turn === 0);
      if (!passthrough && !(yours && btn)) {
        e.preventDefault();
        wcSkipHold();
        return;
      }
    }

    if (btn) {
      e.preventDefault();
      wcOnAction(btn.dataset.wcAct, btn.dataset.wcArg);
      return;
    }
    /* Tapping the empty table puts a lifted card back. Bounded deliberately:
       only when something is actually selected, only outside the overlay (a
       panel owns the table while it is up and its backdrop must not double as
       a cancel), and only outside the log, whose toggle is a real control that
       happens not to carry a data-wc-act. Without those three the same gesture
       would cancel a colour choice or close nothing at all. */
    // INSURANCE: cancelling with nothing selected is already a no-op, so this
    // cannot be caught by a test. It stops every stray tap during a CPU turn
    // from running a pointless action and re-render.
    if (wcSelected === null) return;
    if (!e.target.closest) return;
    if (e.target.closest('.wc-overlay-on') || e.target.closest('.wc-log')) return;
    if (!e.target.closest('#view-wordcards-game')) return;
    wcOnAction('cancel');
  });

  window.addEventListener('resize', function () {
    if (document.body.classList.contains('wc-in-game')) wcApplyScale();
  });
  window.addEventListener('orientationchange', function () {
    if (document.body.classList.contains('wc-in-game')) setTimeout(wcApplyScale, 120);
  });

  /* =======================================================================
     8 · EXPORTS
     ======================================================================= */

  wcInjectStyles();
  wcInjectGuideStyles();
  wcRegisterSounds();

  window.renderWordCardsMenu    = renderWordCardsMenu;
  window.wcRefreshStart         = wcRefreshStart;
  window.teardownWordCards      = teardownWordCards;

  /* The rules core, exposed for testing. Nothing in the app calls these — the
     game view above uses the closure originals directly — but having them
     reachable means the rules can be exercised without a UI, which is the whole
     reason §4 is written as pure functions. */
  window.wcRules = {
    buildDeck: wcBuildDeck, createGame: wcCreateGame, isPlayable: wcIsPlayable,
    legalMoves: wcLegalMoves, play: wcPlay, chooseColour: wcChooseColour,
    drawTurn: wcDrawTurn, passAfterDraw: wcPassAfterDraw, penalty: wcPenalty,
    resolveChallenge: wcResolveChallenge, top: wcTop, draw: wcDraw,
    isMatch: wcIsMatch, matchDraw: WC_MATCH_DRAW,
    /* What a match does. A FUNCTION, not a value: matchDraw above is captured
       at export time, which is fine for a constant nobody flips, but a suite
       that exercises all three rules would read a stale copy of this one. */
    matchEffect: function () { return wcMatchEffect(); },
    /* Test-only, mirroring setReadEnabled and setTablePaceEnabled. The shipped
       controls are the Matched Pair toggle on the setup screen and, behind it,
       WC_MATCH_EFFECT in §1.

       Writes BOTH, because since the control shipped the accessor prefers
       state.wcMatchEffect and would ignore the constant alone. Neither write is
       validated, deliberately: a suite has to be able to prove that
       wcMatchEffect() falls back rather than passing a bad value on. */
    setMatchEffect: function (v) { WC_MATCH_EFFECT = v; state.wcMatchEffect = v; },
    // The rule a LIVE game is playing under, which is snapshotted at creation
    // and is the thing §4 actually reads. Not the same question as the setting.
    effectOf: function (gs) { return wcEffectOf(gs); },
    aiMove: wcAiMove, aiPickColour: wcAiPickColour, aiChallenge: wcAiChallenge,

    /* Phase 4. The public view is exported so a test can assert what the AI
       can and cannot see; the decision functions are exported so they can be
       driven with a hand-built view and no game at all. */
    publicView: wcPublicView, tierOf: wcTierOf,
    chooseMove: wcAiChooseMove, chooseColour: wcAiChooseColour,
    chooseChallenge: wcAiChooseChallenge,
    scoreCard: wcScoreCard, suspicion: wcSuspicion, wouldBluff: wcWouldBluff,

    /* Pacing and tuning, read straight from the constants so tests assert
       against the real values rather than a second copy that can drift. */
    /* Phase 8 AI. Exported as the constants themselves so a suite asserts the
       shipped numbers, plus the receiver helper — the one piece of the new
       judgement that is a pure function of the view and worth testing alone. */
    receiverOf: wcReceiverOf,
    handoverAt: WC_HANDOVER_AT, handoverP: WC_HANDOVER_P,
    colourHint: WC_COLOUR_HINT, colourHintMax: WC_COLOUR_HINT_MAX,

    pacing: {
      think: WC_THINK_MS, beat: WC_BEAT_MS, colour: WC_COLOUR_MS,
      tablePace: WC_TABLE_PACE, sharpIds: WC_SHARP_IDS,
      misplayP: WC_MISPLAY_P, bluffP: WC_BLUFF_P,
      suspicion: WC_SUSPICION, threatAt: WC_THREAT_AT,
      forceAssist: WC_FORCE_ASSIST,
      tablePaceEnabled: function () { return WC_TABLE_PACE_ENABLED; },
      // Test-only. The shipped switch is the WC_TABLE_PACE_ENABLED constant in
      // §1, which is what you edit to play without the multiplier.
      setTablePaceEnabled: function (v) { WC_TABLE_PACE_ENABLED = !!v; },

      /* Phase 7. The reading floor and the character-speed switch. Both are
         exported as the constants themselves, so a suite asserts against the
         shipped numbers rather than a second copy of them that can drift —
         and `owed` is the debt itself, which is the one piece of internal
         state worth watching, because a floor that is never discharged and a
         floor that is discharged twice look identical from outside. */
      read: WC_READ_MS, readScale: WC_READ_SCALE, readDefault: WC_READ_DEFAULT,
      readEnabled: function () { return WC_READ_ENABLED; },
      setReadEnabled: function (v) { WC_READ_ENABLED = !!v; },
      readMsFor: function (card, flewMs) { return wcReadMsFor(card, flewMs); },
      owed: function () { return wcReadOwed; },
      turnHoldMs: WC_TURN_HOLD_MS,
      turnInMs: WC_TURN_IN_MS,
      turnWaitMaxMs: WC_TURN_WAIT_MAX_MS,
      overlayKey: function () { return wcOverlayKey; },
      /* Is the game's own scheduler holding a turn? Exported in Phase 7
         because focusing a panel makes jsdom queue internal timers of its own
         (selectionchange), so counting the global timer queue stopped meaning
         "the table is about to move". This is the thing that was always
         actually being asserted. */
      pending: function () { return !!wcTimer; },
      holding: function () { return !!wcHolding; },
      glyphs: function () { return wcGlyphsOn(); },
      hud: function () { return WC_HUD_ENABLED; },
      trophies: function () { return WC_SHOW_TROPHIES; },
      diffPips: function () { return WC_SHOW_DIFF_PIPS; },
      readSetting: function () { return WC_SHOW_READ_SETTING; },
      matchMs: WC_MATCH_MS,
      matchBits: WC_MATCH_BITS,
      matchAt: function () { return wcMatchAt; },
      sayDelayMs: WC_SAY_DELAY_MS, sayMaxMs: WC_SAY_MAX_MS,
      sayLengthMs: function (id) { return wcSayLengthMs(id); },
      useCharacterSpeed: function () { return WC_USE_CHARACTER_SPEED; },
      setUseCharacterSpeed: function (v) { WC_USE_CHARACTER_SPEED = !!v; },
      speedMultFor: function (gs, pi) { return wcSpeedMultFor(gs, pi); },
      thinkMs: function (gs, pi) { return wcThinkMs(gs, pi); }
    },

    /* Phase 5. Exported so a test can assert that every id in the table has a
       registered element and that the card→sound mapping covers exactly the
       kinds it should, without needing audio to be playable. */
    sounds: WC_SOUNDS, cardSound: WC_CARD_SOUND,

    /* Card motion. `enabled` is the shipped switch — WC_ANIM_ENABLED in §1 —
       and setEnabled is test-only, mirroring setTablePaceEnabled. `inFlight`
       reports how many sprites are in the air, which is the one thing worth
       asserting about a layer whose geometry is unmeasurable without a
       browser. */
    anim: {
      fly: WC_FLY_MS, flip: WC_FLIP_MS, stagger: WC_FLY_STAGGER, flipAt: WC_FLIP_AT,
      enabled: function () { return WC_ANIM_ENABLED; },
      on: function () { return wcAnimOn(); },
      setEnabled: function (v) { WC_ANIM_ENABLED = !!v; },
      inFlight: function () { return wcFlights.length; },
      clear: function () { wcClearFlights(true); },
      dealMs: WC_DEAL_MS, shuffleMs: WC_SHUFFLE_MS,
      resultMs: WC_RESULT_MS,
      dealing: function () { return wcDealing(); },
    // Phase 7 fix: exported so a suite can assert a seat resolves to ITSELF.
    seatEl: function (pi) { return wcSeatEl(pi); },
    // Where a card actually lands for that seat — the point every draw flight
    // aims at. The wrong-seat bug was invisible until this could be compared.
    seatCardEl: function (pi) { return wcSeatCardEl(pi); },
      deal: function () { return wcDeal; },
      skipDeal: function () { wcDealSkip(); },
      // Phase 7. The dealing bed — the one sound that runs rather than fires.
      dealFadeMs: WC_DEAL_FADE_MS, dealFadeSteps: WC_DEAL_FADE_STEPS
    },

    /* Phase 6. The voice and the reverse flourish. `speaking` is the one thing
       worth asserting about a layer whose audio is unreachable in jsdom, the
       same way anim.inFlight is for a layer whose geometry is. */
    speech: {
      matchSound: WC_MATCH_SOUND, gapMs: WC_SPEAK_MATCH_GAP_MS,
      maxMs: WC_SPEAK_MAX_MS, defaultOn: WC_SPEAK_DEFAULT,
      speaking: function () { return wcSpeaking; },
      owed: function () { return wcSpeakOwed; },
      isMatch: wcIsMatch, enabled: function () { return wcSpeakOn(); },
      matchDraw: WC_MATCH_DRAW,
      stop: function () { wcSpeakStop(); }
    },
    dir: { ms: WC_DIR_MS, at: function () { return wcDirAt; } },

    /* Phase 7 clarity. The colour flourish keeps the same shape as dir; the
       skip marks are exported as the live object so a suite can assert both
       that a seat is marked AND that the mark is gone once play returns —
       which is the half that a single-frame assertion cannot see. */
    skipMarks: function () { return wcSkipMarks; },
    /* Phase 7 accessibility. Exported so the live-region behaviour a screen
       reader depends on can be asserted without one — in particular that two
       identical announcements in a row still produce two distinct writes. */
    say: function (t) { wcSay(t); },
    alertSr: function (t) { wcAlert(t); },
    /* Test-only. wcStateMsg is set from six places deep inside play paths, and
       the thing worth asserting — that a state message can no longer displace
       the turn cue — needs the message present and the turn yours at the same
       instant. Building that position through real plays takes a specific hand
       AND a specific seat order; setting the message directly tests the
       renderer's priority rule, which is the actual claim. */
    stateMsg: function (t) { wcStateMsg = t; wcRender(); },

    colours: WC_COLOURS, actions: WC_ACTIONS, wordCount: wcWordCount,
    geo: WC_GEO, fits: wcFits, textEm: wcTextEm, longestTokenEm: wcLongestTokenEm,
    usableW: WC_USABLE_W, usableH: WC_USABLE_H, maxLines: WC_MAX_LINES, icons: WC_ICONS
  };

})();
