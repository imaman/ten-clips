# Ten Clips

A single static page that plays ten short audio clips as a grid of gradient
tiles. No build step and no dependencies — just `index.html`, `playlist.js`, and
the audio files beside them. Nothing is fetched from a third party; the page
makes no network call it does not serve itself.

Live at **<https://imaman.github.io/ten-clips/>**.

## Running it

Open `index.html` directly and it works, but **serve it over http for the full
behaviour**:

```sh
python3 -m http.server 8000     # then http://localhost:8000
```

Serve it from *inside* this folder, or hit a URL with a trailing slash. Loaded
as `…/ten-clips?dev=true`, the browser reads the last segment as a filename and
resolves `playlist.js` against the parent folder, which 404s and takes the whole
page with it. A guard in `<head>` adds the missing slash and reloads, so this
self-corrects; GitHub Pages already redirects for the same reason.

Two things only work over `http(s)`:

- **The exact cut at `t1`.** Playback is silenced by a Web Audio gain ramp
  scheduled on the audio clock, which is sample-accurate. That needs an
  untainted media source, which `file://` is not — there, the cut falls back to
  a `requestAnimationFrame` check and lands about one frame late.
- **Exact seeking to `t0`**, which wants a server that honours Range requests.
  Python's `http.server` does not, but the files are small enough to buffer
  whole. GitHub Pages does honour them.

## Configuring the playlist

Everything lives in `playlist.js`. One entry per clip, in playing order:

```js
window.TRACKS = [
  { file: 'a-03.mp4', t1: 12.05, spotify: 'https://open.spotify.com/track/…' },
  { file: 'e-08.mp4', t0: 15.00, t1: 31.72, title: 'Lady Madonna' },
];
```

| field | required | meaning |
|---|---|---|
| `file` | yes | audio file, relative to this folder |
| `t1` | **yes** | where the segment ends, in seconds into the file |
| `t0` | no | where it starts. Defaults to `0` |
| `fullFile` | no | the whole recording. Defaults to `file` with a `0.m4a` tail |
| `spotify` | no | track URL, `spotify:track:…` URI, or bare 22-char id |
| `title` | no | used for a Spotify *search* when `spotify` is absent |

`spotify` and `title` no longer decide what the green button *does* — only where
a ⌘/ctrl-click on it goes.

Only the `t0…t1` window is ever played, and the tile shows that window's length
(`t1 - t0`), never the file's. Track numbers are derived from array position, so
reordering renumbers automatically.

`window.SITE_TITLE` sets the on-page heading. `window.ARTIST` is appended to
Discovery searches — set it to an artist name to sharpen them.

## The toggles

- **Discovery** — reveals a green button on each tile that plays the whole
  recording the clip was cut from, in the dock at the bottom (see below).
- **Last 3s** — **only on `?dev=true`.** Every clip starts at `t1 - 3` instead
  of `t0` (never before `t0`, so a shorter segment plays in full). Flipping it
  re-cues whatever is loaded. The segment itself is unchanged, so the elapsed
  readout opens partway through and the dial starts near full. It is for finding
  where a clip should end, which is nothing a visitor came here to do — so the
  switch is hidden without the parameter, and forced off while hidden however
  `localStorage` last left it. A dev session is also the only one that writes
  that key, so an ordinary load cannot erase the setting `?dev=true` wants back.

Both persist in `localStorage` under an `ntb:` prefix.

## The full track

Every clip is an excerpt of a longer recording that sits beside it: `a.mp4` was
cut from `a0.m4a`. Discovery's green button plays that file — in the page's own
dock, with the same play/pause, prev/next, dial and elapsed readout as a clip.
The dock's title says `Track Three · full track` so the two are never confused,
and the button turns white while its track is the one loaded. Press it again to
pause, press the tile to drop back to the clip, or hit `Esc`.

The naming rule is the whole configuration: strip the clip's extension, append
`0.m4a`. An entry can override it with `fullFile` when its recording is called
something else.

Four details worth knowing:

- **It is one player, not two.** The full track is loaded into the same
  `<audio>` element as the clips, as a segment that happens to run from `0` to
  the end of the file. So there is no second source to keep in sync, and nothing
  to mute when the other one starts — that problem no longer exists.
- **`t1` is not known when the segment loads.** A clip's end is authored in
  `playlist.js`; a full track's is whatever the file turns out to be, which the
  browser only knows once it has read the metadata. `SEG` loads it as
  `t1: Infinity` and resolves it there, so the dock's total appears a moment
  after the title does. The length check that guards clips is skipped for it —
  a segment asking for the whole file cannot overrun it.
- **Last 3s does not apply.** It exists to find where a clip should end, and a
  full track has no end to find, so it cues from the start regardless.
- **The button is still a link.** Where the entry has a `spotify` address (or a
  `title` to search for), ⌘/ctrl/shift-click still opens Spotify in a new tab,
  exactly as before. Entries with neither render a plain `<button>` instead of an
  `<a>` — same control, one fewer thing it can do.

If the `0.m4a` file is missing, the dock says so (`Track Three · no c0.m4a`)
rather than replacing the page with the oops screen: a mis-derived filename is
not a broken playlist, and every clip still plays.

## When the playlist is wrong

Two rules are enforced rather than papered over, and either one replaces the
whole app with an "oops" screen naming the offending clips:

- `t0 < t1`, checked at page load.
- `t1` within the file's real length, checked the first time a clip plays —
  that length is unknowable until the browser has the file's metadata, which
  still happens before the first sample is heard. A 250ms tolerance absorbs the
  difference between the container's declared duration and the decoded stream.

## Publishing to GitHub Pages

This repo is published at <https://imaman.github.io/ten-clips/>: `index.html`
sits at the repo root and Pages is set to deploy from `main` / `/` (Settings →
Pages), so every push to `main` redeploys. All paths are relative, so it works
from a `/<repo>/` subpath. Note that a Pages URL is public — if the clips are
excerpts of commercial recordings, that is worth a thought before pushing.

`pm-bass.m4a` is gitignored: 7MB and nothing loads it. The `*0.m4a` full
recordings are not — the green button needs them served alongside the clips.
