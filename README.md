# YoutubAlMuslim

An Islamic Knowledge Hub — a YouTube-exact clone featuring 227+ curated Islamic videos across 6 major topics and 11 languages.

## Features

- 🎬 **YouTube-exact UI** — Grid layout, watch modal, sidebar navigation
- 🔍 **Search & Filter** — Search by keyword, filter by topic, subtopic, and language
- 🌍 **11 Languages** — English, Arabic, Urdu, Turkish, Malay, French, Indonesian, Beng Hausa, Swahili, Chinese
- 📚 **6 Major Topics** — Based on "THE RECORD" comprehensive Islamic knowledge base
- 🔖 **Bookmarks** — Save videos to watch later (localStorage)
- 🎲 **Inspire Me** — Random video discovery
- 🌙 **Dark/Light Theme** — Toggle appearance
- ⌨️ **Keyboard Shortcuts** — `/` to search, `Esc` to close modal

## Topics Covered

1. **The Foundation** — Allah & Pre-Eternity
2. **Primordial Creation** — Sea, Throne, Pen, Book
3. **Unseen Realms** — Souls, Angels, Jinn
4. **Celestial Realms** — Jannah & Jahannam
5. **Earth: The Human Story** — Creation, Test, Guidance
6. **The Hereafter** — Death, Resurrection, Judgment

## Quick Start

```bash
cd "YoutubAlMuslim"
python3 -m http.server 8080
# Open http://localhost:8080
```

No build step required. Pure HTML/CSS/JS.

## Tech Stack

- Pure HTML, CSS, JavaScript (no frameworks)
- YouTube iframe embeds for video playback
- IntersectionObserver for infinite scroll
- localStorage for bookmarks and theme

## Data

Video data is stored in `data/topics.json`. Each topic contains subtopics, and each subtopic contains video entries with YouTube IDs, speakers, difficulty levels, and language tags.

## License

Educational use — videos are embedded from YouTube with proper attribution.
