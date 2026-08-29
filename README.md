# YoutubAlMuslim

A YouTube-exact UI for curated Islamic video lectures. Built as a static site (no build step) with a single JSON dataset driving a fast, filterable grid.

## Quick Start

```bash
# Serve locally
python3 -m http.server 8000
# open http://localhost:8000
```

## Stack

- Plain HTML / CSS / vanilla JS — no framework, no bundler
- `data/topics.json` is the single source of truth (16 topics, 470+ videos, 11 languages)
- PWA: `manifest.json` + `sw.js` for offline shell

## Features

- 16 Islamic topics across 3 learning paths (Aqeedah, Hereafter, Unseen Realms)
- 11 language filters (en, ar, ur, tr, ms, fr, id, bn, ha, sw, zh)
- Difficulty tiers (Beginner → Scholar) with color badges
- Search, topic + subtopic chips, infinite scroll
- Bookmarks (persisted to `localStorage`)
- "Inspire Me" random play
- Dark / light theme
- Real watch-progress tracking via the YouTube IFrame API
- YouTube-accurate two-column watch view with related videos
- Mobile responsive (sidebar drawer below 1024px)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Esc` | Close watch modal |
| Click outside sidebar (mobile) | Close drawer |

## Project Layout

```
index.html        page shell + masthead + sidebar + watch overlay
app.js            data fetch, filter, grid render, modal, bookmarks, theme
style.css         YouTube-accurate dark + light theme
data/topics.json  video dataset (source of truth)
data/Docs/        editorial notes / source links (not loaded at runtime)
sw.js             service worker
manifest.json     PWA manifest
tests/            Playwright e2e
```

## Updating Content

Add / edit videos in `data/topics.json`. Schema:

```json
{
  "id": "YouTubeID",
  "title": "Display title",
  "speaker": "Scholar name",
  "difficulty": 1,
  "language": "en",
  "duration": 1234,
  "tags": ["tag1", "tag2"]
}
```

`difficulty`: 1=Beginner, 2=Intermediate, 3=Advanced, 4=Scholar.
`duration`: seconds. `language`: ISO 639-1 code from the language list at the top of `topics.json`.

## Tests

```bash
./run-tests.sh
```

## License

Educational / non-commercial use. All video links go to YouTube.
