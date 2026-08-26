# Ten Clips

A single static page that plays ten short audio clips as a grid of gradient
tiles. No build step, no dependencies, no network calls — just `index.html`,
`playlist.js`, and the audio files beside them.

## Running it

Open `index.html` directly and it works, but **serve it over http for the full
behaviour**:

```sh
python3 -m http.server 8000     # then http://localhost:8000
```

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
| `spotify` | no | track URL, `spotify:track:…` URI, or bare 22-char id |
| `title` | no | used for a Spotify *search* when `spotify` is absent |

Only the `t0…t1` window is ever played, and the tile shows that window's length
(`t1 - t0`), never the file's. Track numbers are derived from array position, so
reordering renumbers automatically.

`window.SITE_TITLE` sets the on-page heading. `window.ARTIST` is appended to
Discovery searches — set it to an artist name to sharpen them.

## The two toggles

- **Last 3s** — every clip starts at `t1 - 3` instead of `t0` (never before
  `t0`, so a shorter segment plays in full). Flipping it re-cues whatever is
  loaded. The segment itself is unchanged, so the elapsed readout opens partway
  through and the dial starts near full.
- **Discovery** — reveals a Spotify button on each tile. Clips with no
  `spotify` or `title` show an inert button whose tooltip says what to add.

Both persist in `localStorage` under an `ntb:` prefix.

## When the playlist is wrong

Two rules are enforced rather than papered over, and either one replaces the
whole app with an "oops" screen naming the offending clips:

- `t0 < t1`, checked at page load.
- `t1` within the file's real length, checked the first time a clip plays —
  that length is unknowable until the browser has the file's metadata, which
  still happens before the first sample is heard. A 250ms tolerance absorbs the
  difference between the container's declared duration and the decoded stream.

## Publishing to GitHub Pages

Put `index.html` at the repo root and enable Pages on `main` / `/`. All paths
are relative, so it works from a `/<repo>/` subpath. Note that a Pages URL is
public — if the clips are excerpts of commercial recordings, that is worth a
thought before pushing.

`pm-bass.m4a` is gitignored: 7MB and nothing loads it.
