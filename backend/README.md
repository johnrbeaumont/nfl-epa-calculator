# Backend — API Reference

FastAPI backend serving XGBoost ML models and NFL Next Gen Stats data.

**Local**: http://localhost:8000
**Production**: https://nfl-epa-api.onrender.com
**Interactive docs**: https://nfl-epa-api.onrender.com/docs

---

## Start locally

```bash
# From nfl-epa-calculator/
source venv/bin/activate
cd backend && uvicorn app.main:app --reload
```

---

## File structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, model loading, EPA + WP endpoints
│   ├── ngs_endpoints.py  # All /api/ngs/* routes + Pydantic response models
│   ├── ngs_scraper.py    # NGSDataImporter — downloads & upserts NGS data
│   └── database.py       # SQLAlchemy ORM models (NGSPassing, NGSRushing, etc.)
├── data/
│   └── ngs_stats.db      # SQLite database (gitignored)
├── requirements.txt
├── render.yaml           # Render deployment config
├── runtime.txt           # Python version pin
├── test_api.py           # EPA/WP endpoint tests
└── test_both_apis.py     # Full test suite
```

---

## Endpoints

### ML Models

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + model status |
| `POST` | `/api/calculate` | EPA prediction |
| `POST` | `/api/win-probability` | Win probability prediction |

**POST /api/calculate** request body:
```json
{
  "homeTeam": "KC", "awayTeam": "SF",
  "down": 3, "distance": 7, "yardsToGoal": 35,
  "homeScore": 14, "awayScore": 10,
  "timeRemaining": 480,
  "homeTimeouts": 2, "awayTimeouts": 3,
  "possession": "home"
}
```

**POST /api/win-probability** — same body, plus `"quarter": 3`.

---

### Next Gen Stats — `/api/ngs/*`

| Method | Path | Key params |
|---|---|---|
| `GET` | `/api/ngs/passing` | `season`, `week`, `team`, `min_attempts`, `limit` |
| `GET` | `/api/ngs/rushing` | `season`, `week`, `team`, `min_attempts`, `limit` |
| `GET` | `/api/ngs/receiving` | `season`, `week`, `team`, `min_targets`, `limit` |
| `GET` | `/api/ngs/defense` | `season`, `week`, `team`, `position`, `min_tackles`, `limit` |
| `GET` | `/api/ngs/team-stats` | `season`, `week`, `team` |
| `GET` | `/api/ngs/leaders/{stat_type}` | `season`, `metric`, `min_threshold`, `limit` |
| `GET` | `/api/ngs/stats` | Database row counts + refresh log |
| `POST` | `/api/ngs/refresh` | `mode=incremental\|full`, `season` |

**Key param notes:**
- `week=0` — season aggregate (most common)
- `week=1–18` — regular season; `week=19–22` — playoffs
- `limit` defaults to 100, max 500
- Omit volume params (`min_attempts` etc.) to return all players with no filter

**Example calls:**
```bash
# All QBs 2024 with 200+ attempts
curl "http://localhost:8000/api/ngs/passing?season=2024&week=0&min_attempts=200"

# Full CIN roster (no volume filter)
curl "http://localhost:8000/api/ngs/passing?season=2024&week=0&team=CIN&limit=500"
curl "http://localhost:8000/api/ngs/rushing?season=2024&week=0&team=CIN&limit=500"
curl "http://localhost:8000/api/ngs/receiving?season=2024&week=0&team=CIN&limit=500"

# Refresh NGS data
curl -X POST "http://localhost:8000/api/ngs/refresh?mode=incremental"
```

---

## Database schema

Each NGS table (`ngs_passing`, `ngs_rushing`, `ngs_receiving`, `ngs_defense`) shares:

| Column | Type | Notes |
|---|---|---|
| `player_gsis_id` | String | **Must be in Pydantic response model** — omitting breaks career aggregation in frontend |
| `player_display_name` | String | |
| `player_position` | String | QB / RB / WR / TE / DL / LB / DB |
| `team_abbr` | String | |
| `season` | Integer | |
| `week` | Integer | 0 = season aggregate |

Unique constraint on `(season, season_type, week, player_gsis_id)` — safe to re-run imports.

---

## CORS

Allowed origins in `app/main.py`:
- `http://localhost:3000`
- `https://nfl-epa-calculator.vercel.app`
- `https://*.vercel.app`

---

## Input validation (EPA/WP)

| Field | Range |
|---|---|
| `down` | 1–4 |
| `distance` | 1–99 |
| `yardsToGoal` | 1–99 |
| `homeScore`, `awayScore` | 0–99 |
| `timeRemaining` | 0–3600 seconds |
| `homeTimeouts`, `awayTimeouts` | 0–3 |

Invalid inputs return `422 Unprocessable Entity`.

---

## Gotchas

- `player_gsis_id` **must be included** in every Pydantic NGS response model or career stats in the frontend collapse all players into one entry.
- Models load at startup from a path relative to `main.py` — backend won't start if `.joblib` files are missing from `/models`.
- Render free tier spins down after 15 min inactivity — first cold request takes ~10s.
