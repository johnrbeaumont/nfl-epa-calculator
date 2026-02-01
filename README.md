# NFL EPA & Win Probability Calculator

A web application that calculates Expected Points Added (EPA) and Win Probability for NFL game situations in real-time.

## Overview

This project provides NFL analysts, fans, and bettors with a tool to calculate:
- **Expected Points Added (EPA)**: Expected points from the current field position and game state
- **Win Probability**: Likelihood of the home team winning based on score, time, and field position

## Project Status

**Current Phase**: Phase 1 - Project Setup ✅
**Next Phase**: Phase 2a - EPA Model Development

## Features

- Real-time EPA and Win Probability calculations
- Interactive form interface with NFL team logos
- Responsive design for desktop and mobile
- Fast API responses (<500ms)
- Based on historical NFL play-by-play data (2016-2024)

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Axios for API calls

### Backend
- Python 3.9+
- FastAPI
- XGBoost for modeling
- Pandas for data processing

### Data & Models
- **Data Source**: nflfastR play-by-play data
- **EPA Model**: XGBoost trained on competitive game situations
- **Validation**: Leave-One-Season-Out (LOSO) cross-validation
- **Target Metrics**: Calibration error < 0.01, R² > 0.85, MAE < 0.5

## Project Structure

```
nfl-epa-calculator/
├── REQUIREMENTS.md          # Detailed project requirements
├── README.md               # This file
├── frontend/               # React application (Phase 4)
├── backend/                # FastAPI application (Phase 3)
├── models/                 # Trained ML models (Phase 2)
├── notebooks/              # Jupyter notebooks for EDA and training (Phase 2)
└── data/                   # nflfastR data (gitignored)
```

## Development Phases

### ✅ Phase 1: Project Setup & Requirements
- Project structure created
- Comprehensive requirements documented
- Git repository initialized

### 🔄 Phase 2a: EPA Model Development (Current)
1. Download nflfastR data (2016-2024)
2. Exploratory Data Analysis (EDA)
3. Data cleaning and blowout filtering
4. Build and train XGBoost EPA model
5. Evaluate model (calibration error, MAE, RMSE, R²)
6. Save trained model

### ⏳ Phase 2b: Win Probability Model (Future)
- Build Win Probability model after EPA model is complete

### ⏳ Phase 3: Backend Development
- FastAPI setup
- Model serving
- API endpoints (`/api/calculate`, `/api/health`)
- Input validation

### ⏳ Phase 4: Frontend Development
- React app with team selection
- Input form for game state
- Results display
- Team logos integration

### ⏳ Phase 5: Deployment
- Deploy backend (Railway/Render)
- Deploy frontend (Vercel)
- Production testing

## Getting Started (Phase 2)

### Prerequisites
- Python 3.9+
- pip or conda for package management
- Jupyter Notebook (for EDA)

### Installation

```bash
# Clone repository
cd nfl-epa-calculator

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (to be created in Phase 2)
pip install -r requirements.txt
```

### Phase 2: Download Data

```bash
# Download nflfastR data
# Instructions to be added during Phase 2
```

## Model Specifications

### Expected Points (EP) Model

**Definition**: Expected points for the next scoring play by either team (not just current drive).

**Algorithm**: XGBoost (Gradient Boosting)

**Input Features**:
- Down (1-4)
- Distance to first down (1-99 yards)
- Yards to goal (1-99)
- Red zone flag (inside 20-yard line)
- Home field advantage

**Training Approach**:
- Leave-One-Season-Out (LOSO) cross-validation
- Trained only on competitive games (blowout filtering)
- Quarter-based filtering: 10 pts (Q1/Q3), 17 pts (Q2), 21 pts (Q4)

**Performance Targets**:
- Calibration error < 0.01
- R² > 0.85
- MAE < 0.5 points

**Special Validations**:
- Field position zones (red zone, midfield, own territory)
- Turnover contexts (INT ~-4 EPA, pick-six ~-8 EPA)
- End-of-half situations

### Win Probability Model (Future - Phase 2b)

To be developed after EPA model is complete.

## Known Limitations

- **Player-Level EPA**: Out of scope - focuses on situational EPA only
- **"Cliffs" Problem**: First down conversions create large EPA swings due to chance
- **Sample Size**: Single-play EPA values have high variance
- **MVP Scope**: Does not account for team quality, injuries, weather, or playoffs

## Data Source

- **nflfastR**: https://github.com/nflverse/nflfastR-data
- Play-by-play data from 2016-2024 NFL seasons
- ~40,000 plays per season

## References

- [nflfastR Documentation](https://nflfastr.com/)
- [Open Source Football](https://opensourcefootball.com/)
- [Expected Points Explained](http://www.advancedfootballanalytics.com/2010/01/expected-points-ep-and-expected-points.html)
- [nflfastR EP/WP Models](https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/)

## Contributing

This is a personal project for learning NFL analytics and full-stack development.

## License

MIT License (to be added)

## Author

Built with guidance from Claude Code

---

**Current Version**: 1.0.0
**Last Updated**: 2025-02-01
**Status**: Phase 1 Complete, Phase 2a Starting
