# Frontend — Component Reference

React + Vite frontend for the NFL Analytics Terminal.

**Local**: http://localhost:3000
**Production**: https://nfl-epa-calculator.vercel.app

---

## Start locally

```bash
# From nfl-epa-calculator/frontend/
npm install
npm run dev -- --port 3000
```

Requires backend running at http://localhost:8000.

---

## Routing

Navigation is managed entirely in `App.jsx` with a single `activeView` state — no router library.

```
'home'        → HomePage.jsx
'calculator'  → EPACalculator.jsx
'stats'       → NGSTerminal.jsx
```

All three views are full-screen. Switching views is done via `onNavigate` props.

---

## Component map

```
src/
├── App.jsx                    # 3-way router: home / calculator / stats
├── main.jsx                   # React entry point
├── index.css                  # Tailwind base (mostly unused — components use inline styles)
├── data/
│   └── teams.json             # 32 NFL teams: { abbr, name, logo }
└── components/
    ├── HomePage.jsx           # Landing screen — two module selection tiles
    ├── EPACalculator.jsx      # EPA + Win Probability calculator form + results
    ├── NGSTerminal.jsx        # Full Next Gen Stats explorer (~1480 lines)
    └── NGSStatsExplorer.jsx   # UNUSED legacy component — do not modify
```

---

## Design system

All active components use **inline styles** with this shared dark terminal palette:

| Token | Value | Usage |
|---|---|---|
| Background | `#0a0a0f` | Page background |
| Surface | `#1a1a1f` | Cards, panels |
| Surface hover | `#252530` | Row hover |
| Border | `#333` | Default borders |
| Border active | `#4a9eff` | Focus, selected |
| Text primary | `#e0e0e0` | Body text |
| Text muted | `#888` | Labels, hints |
| Accent | `#4a9eff` | Headings, buttons, links |
| Positive | `#0f0` | TDs, positive EPA |
| Negative | `#f00` | INTs, negative EPA |
| Warning | `#f80` | Borderline values |
| Font | `'Courier New', monospace` | All text |

---

## NGSTerminal — key state

`NGSTerminal.jsx` is the most complex component. Key state at a glance:

**PLAYERS tab:**
- `selectedPositions` — array, multi-select (QB / RB / WR / TE / DL / LB / DB)
- `selectedSeasons` — array, multi-select (2016–2024)
- `viewMode` — `'yearly'` | `'career'`
- `data` — raw fetched records; `displayedData` = career-aggregated or raw depending on mode
- `sortBy`, `sortDesc` — column sort state

**TEAMS tab:**
- `selectedTeamForRoster` — `null` (show grid) | `'KC'` etc. (show roster)
- `teamRosterSeason` — year for roster view (default 2024)
- `teamRoster` — `{ qbs: [], rbs: [], receivers: [] }`
- `rosterLoading`

**Shared (both tabs):**
- `selectedPlayer` + `playerGameLogs` + `playerLogsLoading` — game log modal

**Data fetching:**
- `fetchPlayerData()` — parallel fetch for all position × season combos
- `fetchTeamRoster(team, season)` — 3 parallel fetches (passing / rushing / receiving) for a team
- `fetchPlayerGameLogs(player)` — fetches all weeks × all seasons (2016–2024) for one player
- `aggregateCareerStats(data)` — groups by `player_gsis_id` (falls back to `player_display_name`)

---

## Environment variables

| Variable | Dev value | Prod value (Vercel) |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` (fallback) | `https://nfl-epa-api.onrender.com` |

Set in Vercel dashboard under Project Settings → Environment Variables.

---

## Build

```bash
npm run build    # Output: dist/
npm run preview  # Preview production build locally
```

Vercel auto-deploys on push to `main`.

---

## Gotchas

- `NGSStatsExplorer.jsx` is an older component that is **not rendered anywhere** — ignore it.
- Tailwind is configured but the active components use inline styles exclusively. `index.css` provides some base card/button utility classes used only by EPACalculator.
- Team logos come from ESPN CDN: `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png`
