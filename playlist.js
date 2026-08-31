/* Playlist for index.html. Add, remove, or reorder entries here only.
 *
 *   file : the audio file, relative to this folder
 *   t1   : REQUIRED — where the segment ends, in seconds into the file.
 *          Seeded below with each file's full length, so the default is
 *          "play the whole clip"; lower it to trim the tail.
 *   t0   : optional — where the segment starts. Defaults to 0.
 *   title / spotify : optional — what the clip actually is, for Discovery mode.
 *          Discovery's button plays the full recording in the page's own player;
 *          `spotify` (a track URL, a spotify:track: URI, or a bare 22-char id)
 *          and `title` only decide where a ⌘/ctrl-click goes instead — the track
 *          itself, or a Spotify search for the title. With neither, that
 *          modified click does nothing and the plain click still plays.
 *   fullFile : optional — the full recording's filename. Defaults to the clip's
 *          with a '0.m4a' tail, so 'x.mp4' plays back in full from 'x0.m4a'.
 *
 * Only the t0…t1 window is ever played, and the page shows the segment's
 * length (t1 - t0), not the file's. Order below is the playing order.
 *
 * Two rules are enforced rather than papered over. t0 < t1 is checked here, at
 * load. t1 <= the file's real length is checked the first time a track plays,
 * since that length is unknowable until the browser has the file's metadata.
 * Either violation stops the app and shows the oops screen instead.
 */
window.SITE_TITLE = 'Ten Clips';

/* Appended to Discovery search queries — e.g. 'Paul McCartney'. Left blank
   because I don't know what these recordings are; set it and searches sharpen. */
window.ARTIST = '';

/* Add title / spotify per entry to light up Discovery mode, e.g.
     { file: 'a-03.mp4', t1: 12.05, title: 'Something' },
     { file: 'b-07.mp4', t1: 16.74, spotify: 'https://open.spotify.com/track/xxxxxxxxxxxxxxxxxxxxxx' }, */
window.TRACKS = [
  { file: 'd.mp4', t0: 16, t1: 180.0, spotify: 'https://open.spotify.com/track/5xYC2ZJJ9TMJL8BOl85O2R' },
  { file: 'b.mp4', t0: 9, t1: 180.0, spotify: 'https://open.spotify.com/track/3BQHpFgAp4l80e1XslIjNI' },
  { file: 'h.mp4', t0: 10, t1: 172.0, spotify: 'https://open.spotify.com/track/1gFNm7cXfG1vSMcxPpSxec' },
  { file: 'c.mp4', t0: 6, t1: 180.0, spotify: 'https://open.spotify.com/track/2EqlS6tkEnglzr7tkKAAYD' },
  { file: 'e.mp4', t0: 2, t1: 180.0, spotify: 'https://open.spotify.com/track/1raiIrqaqRAqZmQWZlLuBd' },
  { file: 'f.mp4', t0: 17, t1: 144.0, spotify: 'https://open.spotify.com/track/4BRkPBUxOYffM2QXVlq7aC' },
  { file: 'g.mp4', t0: 0, t1: 180.0, spotify: 'https://open.spotify.com/track/6W35n1UlkvqhfMZstB4BXs' },
  { file: 'i.mp4', t0: 0, t1: 180.0, spotify: 'https://open.spotify.com/track/3ZZ7z7hgG9PHaCW4CYyZiI' },
  { file: 'a.mp4', t0: 17, t1: 180.0, spotify: 'https://open.spotify.com/track/3hNUYt4dMM9RhcWmty8oKF' },
  { file: 'j.mp4', t0: 10, t1: 180.0, spotify: 'https://open.spotify.com/track/0KBiapvpNxIP3t96GCNYF4' },
];




/* Derive n / t0 / dur, and collect anything that cannot be played.
   A non-empty TRACK_ERRORS means index.html refuses to boot. */
window.TRACK_ERRORS = [];
window.TRACKS.forEach(function (t, k) {
  t.n   = String(k + 1).padStart(2, '0');
  t.t0  = Math.max(0, t.t0 || 0);
  t.dur = t.t1 - t.t0;

  const bad = function (msg) {
    window.TRACK_ERRORS.push({ n: t.n, file: t.file, msg: msg });
  };
  if (typeof t.t1 !== 'number' || !isFinite(t.t1) || t.t1 <= 0) {
    bad('has no usable <b>t1</b> — it is required. The clip’s full length is a fine value.');
  } else if (t.t0 >= t.t1) {
    bad('starts at <b>' + t.t0 + 's</b> and ends at <b>' + t.t1 + 's</b>.');
  }
});

/* Where Discovery mode's button points, or null when the clip has no identity
   configured yet. A track id/URI wins; otherwise search for the title. */
window.spotifyURL = function (t) {
  if (t.spotify) {
    if (/^spotify:track:/.test(t.spotify)) return 'https://open.spotify.com/track/' + t.spotify.split(':').pop();
    if (/^[A-Za-z0-9]{22}$/.test(t.spotify)) return 'https://open.spotify.com/track/' + t.spotify;
    return t.spotify;
  }
  if (t.title) return 'https://open.spotify.com/search/' + encodeURIComponent((t.title + ' ' + window.ARTIST).trim());
  return null;
};

/* The whole recording behind a clip, as a segment SEG can load: 'x.mp4' plays
   back in full from 'x0.m4a' unless the entry names the file itself.

   t1 is Infinity because the end of a file is not knowable until the browser has
   read its metadata; SEG resolves it there and writes it back. That is also why
   this is built once and cached on the entry — reopening a full track should not
   start from "length unknown" a second time. */
window.fullOf = function (t) {
  if (!t._full) t._full = {
    file: t.fullFile || t.file.replace(/\.[^.\/]+$/, '') + '0.m4a',
    t0: 0, t1: Infinity, dur: Infinity, n: t.n, full: true,
  };
  return t._full;
};

/* mm:ss */
window.fmt = function (s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m + ':' + String(r).padStart(2, '0');
};

/* Segment playback. Wraps one <audio> element so the rest of the code can talk
 * in segment time: now() / dur() / prog() are all relative to t0, and playback
 * is stopped at t1. Times are clamped to the segment, so seeking cannot leave it.
 *
 * The cut at t1 happens twice over, on purpose:
 *   - audibly, by scheduling a gain ramp to 0 on the Web Audio clock, which the
 *     audio thread honours to the sample no matter what the main thread is doing;
 *   - mechanically, a frame later, when the rAF loop pauses the element and tells
 *     the page (by then it is already silent, so being late is inaudible).
 * The gain path needs an untainted source, so it is skipped on file:// and the
 * rAF pause becomes the only cut — roughly one animation frame late. */
window.SEG = (function () {
  const S = new WeakMap();      // audio element -> current segment state
  const BOUND = new WeakSet();  // elements whose 'ended' listener is attached
  const G = new WeakMap();      // audio element -> {ctx, gain} (null once tried and failed)
  const FADE = 0.008;           // 8ms ramp; a hard cut mid-waveform clicks
  const SLACK = 0.25;           // t1-vs-length tolerance, see check() below
  let TAIL = 0;                 // 0 = start at t0; N = start N seconds before t1

  /* Where playback begins for a track. Never earlier than t0, so a segment
     shorter than TAIL just plays in full. TAIL is a tool for finding where a clip
     should end, so it is ignored for a full track, which has no end to find. */
  function cue(t) { return TAIL && !t.full ? Math.max(t.t0, t.t1 - TAIL) : t.t0; }

  /* createMediaElementSource on a tainted element outputs silence, so only build
     the graph over http(s). Created lazily, inside the click that starts playback,
     so the AudioContext is allowed to run. */
  const CAN_GRAPH = (location.protocol === 'http:' || location.protocol === 'https:') &&
                    !!(window.AudioContext || window.webkitAudioContext);

  function graph(a) {
    if (!CAN_GRAPH) return null;
    if (G.has(a)) return G.get(a);
    let g = null;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      ctx.createMediaElementSource(a).connect(gain);   // once per element, ever
      gain.connect(ctx.destination);
      g = { ctx: ctx, gain: gain };
    } catch (e) { g = null; }
    G.set(a, g);
    return g;
  }

  /* (Re)schedule the audible cut. Must run on every play and every seek: the
     element clock and the audio clock are independent, so the gap between them
     is only valid at the moment it is measured. */
  function arm(a) {
    const st = S.get(a), g = graph(a);
    if (!st || !g) return;
    const p = g.gain.gain, now = g.ctx.currentTime, t = st.t;
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now);
    p.linearRampToValueAtTime(1, now + FADE);      // fade in, or recover from a stale ramp
    /* An unresolved end has no cut to schedule — only the fade-in above matters,
       and it must still run to lift the gain a previous segment left at 0.
       load()'s ready() re-arms once metadata gives t1 a number. */
    if (!isFinite(t.t1)) return;
    const left = (t.t1 - a.currentTime) / (a.playbackRate || 1);
    const cut = Math.max(now + 2 * FADE, now + left);
    p.setValueAtTime(1, cut - FADE);
    p.linearRampToValueAtTime(0, cut);
  }

  function seek(a, sec) {
    const st = S.get(a); if (!st) return;
    const t = st.t;
    const v = Math.max(t.t0, Math.min(sec, t.t1 - 0.05));
    try { a.currentTime = v; } catch (e) { /* pre-metadata */ }
  }

  function finish(a) {
    const st = S.get(a); if (!st || st.done) return;
    st.done = true; st.raf = 0;
    a.pause();
    if (st.onEnd) st.onEnd();
  }

  function tick(a) {
    const st = S.get(a); if (!st) return;
    if (a.paused) { st.raf = 0; return; }
    if (a.currentTime >= st.t.t1) { finish(a); return; }
    st.raf = requestAnimationFrame(function () { tick(a); });
  }

  /* Is t1 actually inside the file? Only answerable once metadata is in, which
     is still before the first sample is heard. The SLACK exists because the two
     numbers come from different clocks: t1 is authored from the container's
     declared duration, a.duration from the decoded stream, and they can differ
     by a frame or so. A false alarm would take the whole app down, while a miss
     costs nothing (playback just ends at the real end), so the tolerance is
     deliberately generous. */
  function check(a) {
    const st = S.get(a); if (!st) return true;
    const t = st.t, len = a.duration;
    if (!isFinite(t.t1)) return true;                 // asks for the whole file, so it fits
    if (!isFinite(len) || len <= 0) return true;      // nothing to compare against yet
    if (t.t1 <= len + SLACK) return true;
    a.pause();
    if (st.onBad) st.onBad(t, len);
    return false;
  }

  return {
    /* hooks: {onEnd, onBad} — onEnd when the segment finishes, onBad(t, len)
       when the file turns out to be shorter than the segment asks for. */
    load: function (a, t, hooks) {
      hooks = hooks || {};
      const st = { t: t, onEnd: hooks.onEnd, onBad: hooks.onBad, done: false, raf: 0 };
      S.set(a, st);
      a.src = t.file;
      const ready = function () {
        /* "to the end of the file" becomes a number the moment there is one, so
           dur/prog/arm downstream never have to know it was ever open-ended. */
        if (!isFinite(t.t1) && isFinite(a.duration) && a.duration > 0) {
          t.t1 = a.duration; t.dur = t.t1 - t.t0;
        }
        if (!check(a)) return;
        seek(a, cue(t));
        if (!a.paused) arm(a);     // the pre-metadata arm in play() was t0 seconds off
      };
      if (a.readyState >= 1) ready();
      else a.addEventListener('loadedmetadata', ready, { once: true });
      if (!BOUND.has(a)) { BOUND.add(a); a.addEventListener('ended', function () { finish(a); }); }
    },
    play: function (a) {
      const st = S.get(a); if (!st) return;
      const t = st.t;
      if (st.done || a.currentTime < t.t0 - 0.01 || a.currentTime >= t.t1 - 0.05) seek(a, cue(t));
      st.done = false;
      const g = graph(a);
      if (g && g.ctx.state === 'suspended') g.ctx.resume();
      const p = a.play();
      arm(a);
      if (!st.raf) tick(a);
      return p;
    },
    /* sec = 0 plays each segment from t0; sec = 3 starts 3s before t1.
       Call recue() afterwards to move a already-loaded track. */
    tail:  function (sec) { TAIL = Math.max(0, sec || 0); },
    recue: function (a) {
      const st = S.get(a); if (!st) return;
      st.done = false;
      seek(a, cue(st.t));
      if (!a.paused) arm(a);
    },
    dur:   function (a) { const st = S.get(a); return st ? st.t.dur : 0; },
    now:   function (a) {
      const st = S.get(a); if (!st) return 0;
      return Math.max(0, Math.min(a.currentTime - st.t.t0, st.t.dur));
    },
    prog:  function (a) {
      const st = S.get(a); if (!st || !st.t.dur) return 0;
      return Math.max(0, Math.min(this.now(a) / st.t.dur, 1));
    },
    /* p in 0..1 across the segment */
    seekProg: function (a, p) {
      const st = S.get(a); if (!st) return;
      seek(a, st.t.t0 + Math.max(0, Math.min(p, 1)) * st.t.dur);
      if (!a.paused) arm(a);      // the cut moved
    },
  };
})();
