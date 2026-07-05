![astolfyLogo](src/assets/astolfyLogo.png)

# 🎵 Astolfy Music

A modern, responsive music streaming web app built with **Ionic React 8 + React 19 + Vite 5**, featuring **multi-source aggregation**, **full-track playback** (no 30-second previews), and an **intelligent fallback engine** that bypasses YouTube embed restrictions (Error 150) to play virtually any song, including officially-restricted music videos.

Works seamlessly on desktop, mobile web, and as a native Android app via Capacitor.

---

## ✨ Features

### Playback
- 🎵 **Full-track streaming** — no 30-second preview clips, ever
- 🔀 **Multi-source aggregation** — YouTube + Audius merged & deduped
- 🛡️ **Error 150 bypass** — uses [Piped](https://github.com/TeamPiped/Piped) instances to fetch direct audio streams for restricted videos (e.g. official music videos that block embedding)
- 🎚️ **Full player controls** — play/pause, next/previous, seek, volume, mute
- 🔀 **Shuffle & repeat** (off → all → one)
- 📋 **Queue management** — auto-queue from search/trending, manual add/remove
- ⏭️ **Auto-skip on failure** — if a track can't be played, the next one starts automatically (with a safety cap of 8 consecutive errors)
- 🎛️ **Now Playing modal** — fullscreen view with album art, scrubber, and queue preview

### Discovery
- 🏠 **Home** — trending music from all sources, interleaved
- 🔍 **Search** — debounced, race-condition-safe search across sources
- 📚 **Library** — current queue, current song, remove/clear

### UX & Design
- 📱 **Fully responsive** — mobile-first, adapts to tablet/desktop
- 🌙 **Dark theme** out of the box
- 🎨 **Tailwind CSS** integrated (preflight disabled to coexist with Ionic)
- 🏷️ **Source badges** — each song shows where it's playing from (YouTube/Audius)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + Ionic React 8 |
| **Build** | Vite 5 |
| **Language** | TypeScript 5.9 |
| **Styling** | CSS + Tailwind CSS 3 (preflight off) |
| **State** | React Context API (`PlayerContext`) |
| **HTTP** | Axios |
| **Native** | Capacitor (Android build) |
| **Testing** | Cypress (E2E) |

### Audio Backends
- **YouTube IFrame API** — primary for YouTube videos (with Piped direct-stream as first attempt)
- **HTML5 `<audio>`** — for Audius streams and Piped direct audio URLs
- **Piped API** — bypasses embed restrictions (Error 150) by resolving direct audio URLs

### Data Sources
- **YouTube** — via internal InnerTube-style scraping (no API key required for search/trending)
- **Audius** — open-source music protocol with free full-track streaming
- **Piped** — public instances for unrestricted YouTube audio streams
- ~~iTunes~~ — removed from search (only 30s previews); kept as a fallback utility only

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **npm** or **pnpm**

### Installation

```bash
# 1. Clone & install
git clone <repo-url>
cd astolfy
npm install
# or: pnpm install

# 2. (Optional) Configure environment
cp .env.example .env
# Edit .env if you want to plug in a YouTube Data API key for higher quotas.
# The app works WITHOUT a key — it falls back to scraping.

# 3. Run the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

### Android (via Capacitor)

```bash
./build-android.sh   # builds web + syncs + opens Android Studio
```

---

## 🧠 Architecture

### Playback Engine (`PlayerContext.tsx`)

The player supports **two backends** and switches automatically per-song:

```
playSong(song)
  │
  ├── source === 'audius'
  │     → resolve Audius stream URL → <audio>.play()
  │
  └── source === 'youtube'
        │
        ├── PRIMARY: try Piped (7 instances in sequence)
        │     → fetch /streams/{videoId}
        │     → pick best M4A/OPUS audio stream
        │     → <audio>.play()   ✅ bypasses Error 150 entirely
        │
        └── FALLBACK: YouTube IFrame API
              → loadVideoById(videoId)
              → on Error 150 → auto-skip to next queue item
```

**Why Piped first?** Many official music videos (e.g. *BABYMETAL – Gimme Chocolate!!*) block embedding via Content-ID, causing YouTube IFrame **Error 150**. Piped returns the raw audio stream URL with no such restrictions, so playback always works.

**Resilience patterns:**
- Frozen YouTube IFrame event handlers read state through **refs** (the handlers are registered once and can't see fresh closure values)
- Stable **dispatcher refs** (`playNextRef`, `handleSongEndRef`, `handleYouTubeErrorRef`) let the frozen handlers call always-current logic
- **Consecutive-error counter** stops infinite skip loops (cap = 8)

### Multi-Source Aggregator (`musicService.ts`)

```
searchAll(query) / getTrendingAll()
  │
  ├── Promise.all([
  │     youtubeMusicService.searchSongs(query),
  │     audiusService.searchTracks(query)
  │   ])
  │
  ├── mergeAndDedupe()
  │     → normalize (strip accents, punctuation, "official"/"audio" tags)
  │     → dedupe by artist::title
  │     → round-robin interleave so sources are mixed, not concatenated
  │
  └── return Song[]
```

iTunes is intentionally **excluded from search/trending** because it only provides 30-second previews.

### Key Files

```
src/
├── components/
│   ├── PlayerBar.tsx          # Bottom mini-player
│   ├── NowPlayingModal.tsx    # Fullscreen now-playing overlay
│   └── SongCard.tsx           # Song row with source badge
├── context/
│   └── PlayerContext.tsx      # Global player state + dual-backend engine
├── pages/
│   ├── Home.tsx               # Trending (multi-source)
│   ├── Search.tsx             # Debounced multi-source search
│   └── Library.tsx            # Queue & current track
├── services/
│   ├── musicService.ts        # Aggregator + dedupe + interleaving
│   ├── youtubeMusicApi.ts     # YouTube search/trending (no key needed)
│   ├── audiusApi.ts           # Audius full-track streaming
│   ├── pipedApi.ts            # Piped direct-audio resolver (Error 150 bypass)
│   └── itunesApi.ts           # (Utility, not used in search)
├── types/
│   └── music.ts               # Song, PlayerState, SongSource types
├── theme/
│   └── variables.css          # Ionic palette (light/dark)
├── App.tsx                    # Routes + NowPlayingModal mount
└── App.css                    # Global styles + Tailwind directives
```

### Styling: Tailwind + Ionic

Tailwind is configured with **`corePlugins.preflight: false`** so its CSS reset doesn't fight Ionic's own reset. Ionic color variables are mapped into Tailwind's theme, so you can write:

```tsx
<IonCard className="rounded-xl shadow-lg p-4 hover:scale-105 transition-transform">
  <h3 className="text-lg font-bold text-primary">Title</h3>
  <span className="text-xs text-medium">Subtitle</span>
</IonCard>
```

`text-primary`, `bg-secondary`, etc. automatically follow the active Ionic theme (including dark mode).

---

## 🔧 Configuration

### Environment Variables (`.env`)

All variables are **optional** — the app works out of the box using public scraping endpoints.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_YOUTUBE_API_KEY` | ❌ no | YouTube Data API v3 key (raises quota; without it the app scrapes) |

> **Note:** Piped instances are hardcoded in `src/services/pipedApi.ts`. For heavy use, self-host a Piped instance and update the `PIPED_INSTANCES` list.

---

## 📖 Usage

### Home
- Trending tracks from YouTube + Audius, interleaved
- **Play All** starts the queue from the first result
- Tap any card to play from that position

### Search
- Type at least 2 characters — results stream in after a 600ms debounce
- Each keystroke cancels the previous pending request (no flicker, no stale results)
- Tap a result to play it; the rest of the results become the queue

### Library
- View the current queue and the now-playing track
- Remove individual songs or clear the queue
- Tap a queued song to jump to it

### Player
- **Bottom bar**: mini-player with play/pause, prev/next, scrubber
- **Tap the bar** → opens the **Now Playing** fullscreen modal
- Modal: large album art, seek bar, shuffle/repeat, volume, upcoming preview

---

## 🩺 Troubleshooting

### A song won't play / skips immediately
- Check the console for `YouTube Player Error: 150` — this means the video blocks embedding **and** all Piped instances failed
- The app will auto-skip to the next playable track
- If you see many errors in a row, all sources may be rate-limited; wait and retry

### Search returns nothing
- The YouTube scraper and/or Audius API may be temporarily unreachable
- Check the browser console for network errors
- Both sources run in parallel; if one fails, the other still returns results

### Audio is silent
- Check the volume slider in the Now Playing modal
- Verify the device isn't muted
- Some browsers block autoplay until the user interacts with the page — tap play once

### Piped streams fail (all instances down)
- The app falls back to the YouTube IFrame player automatically
- For reliability, consider self-hosting a Piped instance and adding it to `PIPED_INSTANCES`

### Build errors
- `rm -rf node_modules && npm install`
- Ensure Node.js v18+
- Check TypeScript errors in the console

---

## ⚠️ Known Limitations

- **Piped instances** are community-run and may be rate-limited or temporarily down. The 7-instance fallback + IFrame fallback mitigate this, but occasional gaps can occur.
- **YouTube IFrame API** requires a user gesture for the first play in some browsers.
- **Background playback** on mobile may pause when the tab is backgrounded (browser policy).
- **Region restrictions**: some videos are geo-blocked regardless of backend.
- The YouTube search path uses scraping and may break if YouTube changes their internal API.

---

## 🔒 Security

- `.env` is gitignored — never commit API keys
- Only `VITE_`-prefixed variables are exposed to the frontend
- No user authentication or personal data is stored

---

## 🛣️ Roadmap

- 💾 Persistent playlists & favorites (localStorage / IndexedDB)
- 🔐 User authentication
- 📊 Listening statistics
- 🎵 Audio quality selector
- 🎨 Light theme + theme picker
- 📻 Lyrics integration
- ⬇️ Offline downloads (via Service Worker)

---

## 📜 License

MIT — open source, free to use and modify.

## 🤝 Contributing

Pull requests and issues are welcome.

---

Built with ❤️ using Ionic React, React 19, Vite, Tailwind CSS, and a healthy dose of Piped.