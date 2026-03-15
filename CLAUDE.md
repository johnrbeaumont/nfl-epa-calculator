# NFL Analytics Terminal — Claude Context

## What this project is

A deployed full-stack NFL analytics web app with two modules:
1. **EPA Calculator** — XGBoost model predicts Expected Points Added + Win Probability for any game situation
2. **NGS Terminal** — Next Gen Stats explorer: player leaderboards, career stats, team rosters (2016-2024)

## Live URLs
- Frontend: https://nfl-epa-calculator.vercel.app/
- Backend API: https://nfl-epa-api.onrender.com/
- API Docs: https://nfl-epa-api.onrender.com/docs
- GitHub: https://github.com/johnrbeaumont/nfl-epa-calculator

## Local dev commands

```bash
# Backend (run from nfl-epa-calculator/)
source venv/bin/activate
cd backend && uvicorn app.main:app --reload      # http://localhost:8000

# Frontend (run from nfl-epa-calculator/)
cd frontend && npm run dev -- --port 3000        # http://localhost:3000

# Test APIs
python test_both_apis.py
```

## Architecture

```
nfl-epa-calculator/
├── backend/               # FastAPI + XGBoost + SQLite (NGS data)
│   └── app/
│       ├── main.py        # API entry point, CORS, model loading
│       ├── ngs_endpoints.py  # /api/ngs/* routes (passing/rushing/receiving/defense)
│       ├── ngs_scraper.py    # Data importer from nfl_data_py
│       └── database.py    # SQLAlchemy models: NGSPassing, NGSRushing, NGSReceiving, NGSDefense
├── frontend/
│   └── src/
│       ├── App.jsx        # Router: home / calculator / stats (3-way state)
│       └── components/
│           ├── HomePage.jsx       # Landing screen — selects module
│           ├── EPACalculator.jsx  # EPA + Win Probability calculator
│           ├── NGSTerminal.jsx    # Full stats explorer (~1480 lines)
│           └── NGSStatsExplorer.jsx  # UNUSED — legacy component
├── models/                # Trained .joblib model files (served by backend)
├── notebooks/             # Jupyter: EDA, EPA training, WP training
└── data/                  # nflfastR parquet files (gitignored, large)
```

## Design system (dark terminal style)

All three active components share this aesthetic — use inline styles, not Tailwind:

| Token | Value |
|---|---|
| Background | `#0a0a0f` |
| Surface | `#1a1a1f` |
| Surface hover | `#252530` |
| Border default | `#333` |
| Border active | `#4a9eff` |
| Text primary | `#e0e0e0` |
| Text muted | `#888` |
| Accent blue | `#4a9eff` |
| Positive (green) | `#0f0` |
| Negative (red) | `#f00` |
| Warning | `#f80` |
| Font | `'Courier New', monospace` |

## API endpoints (key)

| Method | Path | Description |
|---|---|---|
| POST | `/api/calculate` | EPA prediction |
| POST | `/api/win-probability` | Win probability prediction |
| GET | `/api/health` | Health check |
| GET | `/api/ngs/passing` | QB stats (params: season, week, team, min_attempts) |
| GET | `/api/ngs/rushing` | RB stats (params: season, week, team, min_attempts) |
| GET | `/api/ngs/receiving` | WR/TE stats (params: season, week, team, min_targets) |
| GET | `/api/ngs/defense` | Defense stats (params: season, week, team, position) |
| GET | `/api/ngs/team-stats` | Aggregated team stats |
| POST | `/api/ngs/refresh` | Trigger data refresh (incremental or full) |

All NGS endpoints accept `limit` (default 100, max 500) and `week` (0 = season aggregate).

## Model performance

| Model | Key metric | Value |
|---|---|---|
| EPA (XGBoost) | R² | 0.962 |
| EPA | MAE | 0.228 |
| EPA | Training plays | 285,657 |
| Win Probability | AUC-ROC | 0.801 |
| Win Probability | Accuracy | 71.7% |
| Win Probability | Brier Score | 0.180 |

## Environment variables

| Variable | Where | Value |
|---|---|---|
| `VITE_API_URL` | Vercel (frontend) | `https://nfl-epa-api.onrender.com` |
| `PORT` | Render (backend) | Auto-set by Render |

## Common tasks

**Update CORS** → `backend/app/main.py` → `allow_origins` list

**Re-train models** → run notebooks 02 and 03, replace `.joblib` files in `/models`, push to git

**Update NGS data** → `POST /api/ngs/refresh?mode=incremental` or `mode=full`

**Add a team** → `frontend/src/data/teams.json`

## Deployment

Push to `main` on GitHub → Render (backend) and Vercel (frontend) auto-deploy.

## Known issues / gotchas

- `NGSStatsExplorer.jsx` is an older, unused component — do not modify or rely on it
- NGS Pydantic response models must include `player_gsis_id` or career aggregation breaks (groups all players under `undefined` key)
- Render free tier spins down after 15 min inactivity — first request after idle takes ~10s
- Backend loads models at startup from path relative to `main.py` — models must exist in `/models` before starting
