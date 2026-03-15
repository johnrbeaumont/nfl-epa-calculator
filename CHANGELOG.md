# Changelog

All notable changes to this project. Most recent first.

---

## 2026-03-01

### Added
- **Home page** (`HomePage.jsx`) — dark terminal landing screen with two module selection tiles (EPA Calculator, NGS Terminal). Replaces the old Tailwind light-theme App.jsx wrapper as the entry point.
- **Navigation consistency** — all three pages now share the same dark terminal aesthetic. `⌂ HOME` button added to both EPACalculator and NGSTerminal headers.
- **Teams tab redesign** — replaced single-team dropdown with a full 32-team grid organised by division (AFC/NFC, 2-column layout). Clicking a team loads a full roster view with separate QB / RB / WR / TE sections, each with position-specific stats. Year selector (2016–2024) defaults to 2024. Clicking any player opens the existing game log modal.

### Fixed
- **Career stats showed only one player (Joe Burrow)** — `player_gsis_id` was missing from all four Pydantic response models in `ngs_endpoints.py`. All API responses now include this field. Added fallback in `aggregateCareerStats` to use `player_display_name` if ID is absent.

### Changed
- `App.jsx` simplified to 18 lines — clean three-way router (home / calculator / stats), no wrapper HTML.
- `EPACalculator` now accepts `onNavigate` prop and renders its own `⌂ HOME` button. Removed the outer light-theme page wrapper that was in App.jsx.
- NGSTerminal `← BACK` button relabelled `⌂ HOME` and now navigates to home page instead of the calculator.

---

## 2026-02-09 (approximate)

### Added
- NGS Terminal (`NGSTerminal.jsx`) — full Next Gen Stats explorer with PLAYERS and TEAMS tabs.
- Player game log modal — click any player to see week-by-week stats across all seasons.
- Career stats mode — aggregate stats across multiple selected seasons.
- Multi-position, multi-year filtering on PLAYERS tab.

---

## 2026-02-02

### Deployed
- Backend to Render: https://nfl-epa-api.onrender.com
- Frontend to Vercel: https://nfl-epa-calculator.vercel.app

---

## 2026-02-01

### Completed
- EPA XGBoost model trained (R² 0.962, MAE 0.228, 285,657 plays, 2016-2024).
- Win Probability XGBoost model trained (AUC-ROC 0.801, 71.7% accuracy).
- FastAPI backend with `/api/calculate`, `/api/win-probability`, `/api/health`.
- NGS data pipeline — SQLite database populated via `ngs_scraper.py`.
- React frontend with team logos, scenario presets, result display.
