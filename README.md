# NFL Analytics Terminal

A full-stack NFL analytics web application with two tools: an EPA/Win Probability calculator and a Next Gen Stats explorer.

**Live app**: https://nfl-epa-calculator.vercel.app/

---

## What it does

### EPA Calculator
Enter any NFL game situation (down, distance, field position, score, time, timeouts) and get instant machine-learning predictions for:
- **Expected Points Added (EPA)** — how many points this situation is worth
- **Win Probability** — likelihood of the home team winning from this state

### NGS Terminal
Explore NFL Next Gen Stats (RFID tracking data) from 2016–2024:
- Player leaderboards by position (QB, RB, WR, TE) with advanced metrics
- Career stats aggregated across selected seasons
- Team roster view — all 32 teams organised by division, click any team to see full QB/RB/WR/TE roster with stats
- Game log modal — click any player to see their week-by-week history

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + inline styles (dark terminal theme) |
| Backend | Python 3.11 + FastAPI |
| ML Models | XGBoost (EPA + Win Probability) |
| NGS Database | SQLite via SQLAlchemy |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Model performance

| Model | R² | MAE | AUC-ROC | Training plays |
|---|---|---|---|---|
| EPA (XGBoost) | 0.962 | 0.228 | — | 285,657 |
| Win Probability | — | — | 0.801 | 203,877 |

Training data: nflfastR play-by-play, 2016–2024 NFL seasons.

---

## Local development

**Prerequisites**: Python 3.11+, Node.js 18+

```bash
# Clone
git clone https://github.com/johnrbeaumont/nfl-epa-calculator.git
cd nfl-epa-calculator

# Backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --reload
# → http://localhost:8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev -- --port 3000
# → http://localhost:3000
```

---

## Project structure

```
nfl-epa-calculator/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, model loading
│   │   ├── ngs_endpoints.py  # /api/ngs/* routes
│   │   ├── ngs_scraper.py    # NGS data importer
│   │   └── database.py       # SQLAlchemy ORM models
│   ├── requirements.txt
│   └── render.yaml           # Render deployment config
├── frontend/
│   └── src/
│       ├── App.jsx           # Top-level router (home/calculator/stats)
│       └── components/
│           ├── HomePage.jsx
│           ├── EPACalculator.jsx
│           └── NGSTerminal.jsx
├── models/                   # Trained .joblib model files
├── notebooks/                # Jupyter: EDA, model training
└── data/                     # nflfastR parquet files (gitignored)
```

---

## Deployment

Both services auto-deploy when you push to `main` on GitHub.

| Service | Platform | Config |
|---|---|---|
| Backend API | Render | `backend/render.yaml` |
| Frontend | Vercel | Auto-detected (Vite) |

See `DEPLOYMENT.md` for initial setup instructions.

---

## Data source

NFL Next Gen Stats via [nfl_data_py](https://github.com/cooperdff/nfl_data_py).
Play-by-play data via [nflfastR](https://www.nflfastr.com/).
