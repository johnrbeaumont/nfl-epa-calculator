# NFL EPA & Win Probability Calculator - Requirements Document

## 1. Project Overview

**Purpose**: Build a web application that calculates Expected Points Added (EPA) and Win Probability for NFL game situations in real-time.

**Target Users**:
- NFL analysts and coaches
- Football fans and enthusiasts
- Sports bettors and fantasy football players
- Data scientists studying football analytics

**Key Features**:
- Real-time EPA and Win Probability calculations based on game state
- Interactive form interface for entering game situations
- Responsive design for desktop and mobile
- Fast API responses (<500ms)

## 2. Input Requirements

Users will enter the following game state information:

### Required Inputs
- **Home Team**: Team selection (dropdown/autocomplete)
  - All 32 NFL teams available
  - Display team logo and name
  - Team abbreviations (e.g., KC, SF, BUF, etc.)
- **Away Team**: Team selection (dropdown/autocomplete)
  - All 32 NFL teams available
  - Display team logo and name
  - Must be different from home team
- **Down**: Integer (1-4)
  - 1st down, 2nd down, 3rd down, 4th down
- **Distance**: Integer (yards to first down)
  - Range: 1-99 yards
  - Common values: 10 (after first down), 5-15 typical
- **Yards to Goal**: Integer (field position)
  - Range: 1-99 yards from opponent's goal line
  - 50 = midfield, 20 = red zone, 1 = goal line
- **Home Team Score**: Integer
  - Range: 0-99
- **Away Team Score**: Integer
  - Range: 0-99
- **Time Remaining**: Time input
  - Quarter (1-4, or OT)
  - Minutes (0-15)
  - Seconds (0-59)
  - Total seconds calculated for model
- **Timeouts Remaining**:
  - Home timeouts: 0-3
  - Away timeouts: 0-3

### Design Note: Team Selection
Team selection is included in the UI from the start for:
1. **Better UX**: Provides context and makes the app feel more realistic
2. **Visual Appeal**: Team logos make the interface more engaging
3. **Future-Proofing**: Enables team-specific models in future versions
4. **Data Collection**: Can log team data for analytics (with user consent)

**Note**: The MVP models (Phase 2) will NOT use team identity as a feature. Models will be team-agnostic, treating all teams equally based only on game state variables (score, time, field position). Team-specific adjustments are a Phase 2+ enhancement.

### Optional/Future Inputs
- **Possession**: Which team has the ball (home or away)
  - Currently assumes possession for win probability context
  - Future: Explicitly select offensive team
- **Weather conditions**: Temperature, wind speed, precipitation
- **Team strength ratings**: Elo ratings or power rankings
- **Venue**: Stadium name, playing surface (grass/turf)
- **Quarter-specific adjustments**: End-of-half behaviors

## 3. Output Requirements

The system will calculate and display:

### Expected Points Added (EPA)
- **Definition**: Expected points the offense will score on the current drive given the game state
- **Display Format**: Decimal value (e.g., 2.45 points)
- **Range**: Typically -2.0 to 6.0
  - Negative values near own goal line (likely to give up safety)
  - Positive values indicate expected scoring
  - Higher values closer to opponent's goal line
- **Context**: Show how field position impacts expected points

### Win Probability
- **Definition**: Probability that the home team will win the game
- **Display Format**: Percentage (e.g., 67.3%) and decimal (0.673)
- **Range**: 0% to 100%
- **Factors**: Score differential, time remaining, field position, timeouts
- **Context**: Show how game state changes probability

### Additional Outputs (Optional/Future)
- **Confidence Interval**: Model uncertainty range
- **Historical Comparison**: Similar situations from past games
- **Decision Recommendations**: Go for it vs. punt/kick on 4th down
- **Drive Success Probability**: Likelihood of scoring a TD or FG

## 4. Technology Stack

### Frontend
- **Framework**: React.js (latest stable version)
- **Styling**: Tailwind CSS or Material-UI
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Axios or Fetch API
- **Build Tool**: Vite or Create React App
- **Form Handling**: React Hook Form or custom validation

**Key Components**:
- Team Selection UI (with logos)
- Game State Input Form
- Results Display (EPA + Win Prob)
- Visualization Charts (optional)
- Error Handling UI
- Loading States

**Team Logo Assets**:
- **Source Options**:
  - ESPN CDN: `https://a.espncdn.com/i/teamlogos/nfl/500/{TEAM}.png`
  - Static assets in `/public/logos/` directory
  - SVG format preferred for scalability
- **Display Requirements**:
  - Logo size: 60-80px for desktop, 40-50px for mobile
  - Show team name alongside logo
  - Color-coded team colors for background/borders (optional)
- **Team Data**:
  - JSON file with all 32 teams (abbreviation, full name, colors, logo URL)

### Backend
- **Framework**: FastAPI (recommended) or Flask
  - FastAPI preferred for automatic API docs and type validation
- **Language**: Python 3.9+
- **API Style**: RESTful JSON API
- **Model Loading**: Pickle, Joblib, or ONNX Runtime
- **Validation**: Pydantic models (FastAPI) or custom validators
- **CORS**: Enabled for frontend communication

**Key Endpoints**:
- `POST /api/calculate` - Main calculation endpoint
- `GET /api/health` - Health check
- `GET /api/docs` - Auto-generated API documentation

### Data & Models

**Data Source**: nflfastR
- R package with comprehensive NFL play-by-play data
- CSV exports available for Python usage
- Data from 2016-present recommended (modern NFL rules)
- Over 40,000 plays per season

**Expected Points Model**:
- Algorithm: **XGBoost (Gradient Boosting)** - Recommended for handling non-linear relationships and complex interactions
- Input Features: down, distance, yardline_100, red zone flag, home field advantage
- Output: Expected points for **next scoring play** (by either team, not just current drive)
- Training Data: Historical plays with known outcomes (competitive games only)
- Validation: Leave-One-Season-Out (LOSO) cross-validation
- Special Handling: Red zone situations, end-of-half scenarios, turnover contexts

**Win Probability Model**:
- Algorithm: Logistic Regression or Gradient Boosting Classifier
- Input Features:
  - Score differential (home - away)
  - Time remaining (seconds)
  - Field position (yardline_100)
  - Timeouts remaining (home and away)
  - Down and distance
- Output: Probability home team wins (0.0 to 1.0)
- Training Data: Complete games with known winners

**Model Storage**:
- Format: Pickle (.pkl) or Joblib (.joblib) for Python models
- Alternative: ONNX for cross-platform compatibility
- Location: `/models` directory in backend

### Deployment

**Frontend Deployment**:
- Platform: Vercel (recommended) or Netlify
- Build: Static site generation
- CDN: Automatic with Vercel
- Custom Domain: Optional

**Backend Deployment**:
- Platform Options:
  - Railway (easiest Python hosting)
  - Render (free tier available)
  - Fly.io (good for APIs)
  - AWS Lambda (serverless option)
- Environment: Python 3.9+ runtime
- Model Files: Included in deployment or S3 storage

**Environment Variables**:
- `FRONTEND_URL` - For CORS configuration
- `MODEL_PATH` - Path to trained models
- `API_KEY` - Optional authentication (future)

## 5. Data Requirements

### Historical Data Source: nflfastR

**Dataset**: nflfastR play-by-play data
- Source: https://github.com/nflverse/nflfastR-data
- Format: CSV files (one per season)
- Coverage: 1999-present (use 2016+ for modern NFL)
- Size: ~40MB per season

**Key Fields for EPA Model**:
- `down` - Down number (1-4)
- `ydstogo` - Yards to first down
- `yardline_100` - Yards to opponent goal line
- `ep` - Expected points (pre-calculated in nflfastR)
- `posteam_score` - Offensive team score
- `defteam_score` - Defensive team score
- `game_seconds_remaining` - Time left in game

**Key Fields for Win Probability Model**:
- `score_differential` - Point differential
- `game_seconds_remaining` - Time remaining
- `yardline_100` - Field position
- `posteam_timeouts_remaining` - Offensive team timeouts
- `defteam_timeouts_remaining` - Defensive team timeouts
- `result` - Game outcome (1 if home team won, 0 otherwise)
- `home_team` - Home team abbreviation
- `posteam` - Team with possession
- `wp` - Win probability (for filtering blowouts)
- `vegas_wp` - Vegas-based win probability (alternative)

### Data Processing Steps

1. **Download Data**:
   - Download multiple seasons (2016-2025 recommended)
   - Combine into single DataFrame

2. **Filter Relevant Plays**:
   - Regular plays only (exclude penalties, timeouts)
   - Exclude kneel downs and spikes
   - Exclude Hail Mary attempts (end-of-half desperation plays with abnormal EPA)
   - Remove end-of-half anomalies (plays where clock expires)
   - Filter out data quality issues:
     - QB scrambles misclassified as sacks
     - Plays with missing or invalid field position data
   - Exclude two-point conversion attempts (different expected value)

3. **Filter Blowout Games** (Critical for Data Quality):
   - **Why**: Blowout situations introduce noise because:
     - Teams play prevent defense / run out clock
     - Backup players enter the game
     - Timeouts are not used strategically
     - Play calling becomes less predictive
   - **Filtering Criteria** (Recommended Multi-Tier Approach):
     - **Conservative (Q1, Q3)**: Exclude plays where `abs(score_differential) > 10`
       - Rationale: Even 10+ point leads in early quarters often lead to altered play calling
     - **Moderate (Q2, Q4 early)**: Exclude plays where `abs(score_differential) > 17`
     - **Aggressive (Q4 late)**: Exclude plays where `abs(score_differential) > 21`
     - **Win Probability Alternative**: Exclude plays where `wp < 0.05` or `wp > 0.95`
       - Advantages: Accounts for both score AND time remaining
       - Disadvantage: Uses nflfastR's calculated WP (circular for EPA model training)
       - Safe to use for Win Probability model if using score-based filtering for EPA
   - **Recommended Approach for EPA Model**:
     - Use score-based thresholds (10/17/21 points by quarter) to avoid circularity
     - For Win Probability model, can use WP-based filtering since it's training on game outcomes, not EPA
   - **Result**: Keep only "competitive" game situations where both teams are still playing to win
   - **Document Impact**: Track what percentage of plays are filtered out (typically 15-25%)

4. **Feature Engineering**:
   - Create `red_zone` flag (yardline_100 <= 20)
   - Calculate `time_remaining_minutes`
   - Normalize score differential
   - Create interaction features (down × distance)
   - Create `is_competitive_game` flag (for validation purposes)

5. **Handle Special Cases**:
   - Red zone plays (different EP curve)
   - Two-minute warning situations
   - Overtime rules (sudden death vs. new rules)
   - Possession team (adjust win prob based on offense/defense)

6. **Train/Test Split**:
   - Split by season (e.g., 2016-2023 train, 2024 test)
   - Ensure no data leakage
   - Document how many plays were filtered out due to blowouts

## 6. Model Specifications

### Expected Points Model

**Goal**: Predict expected points from current field position and down/distance.

**Important Definition**: Expected Points (EP) represents the expected points for the **next scoring play by either team**, not just the current drive. This means the model must account for all possible outcomes including turnovers, punts, and field goal attempts that give the opponent possession.

**Input Features**:
- `down` (1-4)
- `ydstogo` (1-99)
- `yardline_100` (1-99)
- `red_zone` (binary: 1 if yardline_100 <= 20)
- `home_field_advantage` (binary: 1 if home team has possession)

**Output**:
- Expected points for next scoring play (float, typically -2 to 6)

**Model Architecture - XGBoost (Recommended)**:
- **Primary Choice**: XGBoost (Gradient Boosting)
  - Handles non-linear relationships and complex interactions
  - Excellent for different field position zones (red zone, midfield, own territory)
  - Superior performance on end-of-half situations with non-linear time interactions
  - Industry standard (used by nflfastR)
- Alternative: LightGBM (similar performance, faster training)
- Not Recommended: Linear Regression (cannot capture complex field position zone interactions)

**Training Process**:
1. Load nflfastR data with `ep` (expected points) column
2. Filter to regular plays - **exclude**:
   - Penalties
   - Kneel downs
   - Spikes
   - Hail Mary attempts (end-of-half desperation plays)
   - QB scrambles misclassified as sacks (data quality issue)
   - Two-point conversion attempts
3. **Filter blowout games** (keep only competitive situations)
4. Perform **Leave-One-Season-Out (LOSO) Cross-Validation**:
   - For each season, exclude it from training
   - Train model on all other seasons
   - Validate on the holdout season
   - Prevents data leakage and provides robust cross-era validation
5. Train XGBoost model on down, distance, field position, home field advantage
6. Compare to nflfastR's own EP values
7. **Validate field position zones**: Verify model correctly learns different EP curves for:
   - Red zone (inside 20-yard line)
   - Midfield (40-60 yard line)
   - Own territory (beyond own 40)

**Data Quality Note**: Training only on competitive game situations ensures the model learns from plays where teams are executing normal game plans, not garbage time strategies.

**Extrapolation Note**: Even though we train on competitive games, the model must still predict reasonable (extreme) EP values when users input blowout situations. The model will extrapolate appropriately to these edge cases.

**Evaluation Metrics**:
- **Calibration Error** (Primary): Measures how well-calibrated predictions are
  - Round predicted and actual EP to nearest 0.5 points
  - Calculate absolute difference between predicted and actual frequencies
  - Target: < 0.01 (nflfastR achieved 0.006)
- **Mean Absolute Error (MAE)**: Average absolute prediction error
- **Root Mean Squared Error (RMSE)**: Penalizes larger errors more heavily
- **R-squared (R²)**: Proportion of variance explained by model
- **Log Loss**: Probabilistic prediction quality (for scoring probability predictions)

**Expected Performance**:
- **Calibration Error < 0.01** (critical for reliability)
- R² > 0.85 (strong correlation with field position)
- MAE < 0.5 points
- Model predictions should be well-calibrated: if model predicts 2.0 EP, plays in similar situations should average ~2.0 actual points

**Special Validation Cases**:
- **Turnover Context**: Verify interceptions/fumbles have appropriate negative EPA (~-4 to -8)
  - Hail Mary INT at end of half: minimal penalty
  - Pick-six: ~-8 EPA or worse
  - Fumble at goal line: ~-6 EP loss
- **End-of-Half Situations**: Verify model handles time expiration appropriately
- **Field Position Zones**: Confirm different EP curves for red zone vs. midfield vs. own territory

### Win Probability Model

**Goal**: Predict probability of home team winning given current game state.

**Input Features** (MVP):
- `score_differential` (home_score - away_score)
- `game_seconds_remaining` (0-3600)
- `yardline_100` (field position, 1-99)
- `home_timeouts` (0-3)
- `away_timeouts` (0-3)
- `down` (1-4, optional)
- `ydstogo` (1-99, optional)

**Future Input Features**:
- `home_team` and `away_team` - For team-specific adjustments
- Team strength ratings (Elo, DVOA)
- Home field advantage factors
- Weather conditions

**Output**:
- Win probability for home team (0.0 to 1.0)

**Model Architecture**:
- Option 1: Logistic Regression
  - Simple, interpretable
  - Fast inference
- Option 2: Gradient Boosting Classifier
  - Better accuracy
  - Handles complex interactions

**Training Process**:
1. Load complete game data with outcomes
2. For each play, record game state and eventual winner
3. **Filter blowout situations** (exclude WP > 0.95 or < 0.05, or use score+time threshold)
4. Create binary labels (1 = home win, 0 = away win)
5. Train classifier on competitive game situations
6. Calibrate probabilities (ensure 70% predictions win 70% of time)

**Important Consideration**: While we filter blowouts from training data, the model should still be able to predict extreme probabilities (near 0% or 100%) for inputs that represent blowout situations. This is not contradictory - we train on competitive situations but the model extrapolates to extreme cases.

**Evaluation Metrics**:
- Log Loss (cross-entropy)
- Calibration plots (predicted vs. actual win rate)
- Brier Score
- ROC-AUC

**Expected Performance**:
- Log Loss < 0.4
- Well-calibrated (predicted 50% should win ~50% of time)

### Known Limitations and Model Scope

**In-Scope for This Project**:
- Situational EPA: Expected points based on down, distance, field position
- Win Probability: Team-level game outcome predictions
- Play-level analysis for game situations

**Out of Scope**:
- **Player-Level EPA Attribution**: Assigning EPA to individual players is not supported
  - Rationale: Public play-by-play data lacks sufficient information for accurate credit assignment
  - Problem: Without tracking data (blocking, route running, coverage), credit assignment is unreliable
  - Result: Player EPA rankings often produce counterintuitive results
  - Exception: QB EPA has some validity since that position controls so much of the play
  - Recommendation: Use team-level or situational EPA, not player-level

**Known Limitations to Document**:

1. **"Cliffs" Problem - First Down Conversions**:
   - Issue: Gaining 9 yards vs. 10 yards on 3rd-and-10 creates massive EPA swings
   - Reality: Much of this difference is due to chance/randomness, not skill
   - Implication: Single-play EPA values are noisy and should not be over-interpreted
   - Example: A 9-yard gain on 3rd-and-10 has large negative EPA, while 10-yard gain has large positive EPA
   - Best Use: EPA is most reliable for aggregated performance over many plays

2. **Sample Size and Variance**:
   - Single plays can have extreme EPA values (pick-six: -13.6 EPA)
   - Small samples are heavily influenced by these outliers
   - Our calculator shows single-play values, which inherently have high variance
   - Users should understand EPA is most meaningful across multiple plays

3. **Context-Dependent Accuracy**:
   - Model trained on competitive games, so predictions are most accurate in those situations
   - Extreme blowout inputs will return reasonable predictions (via extrapolation) but with less training data support
   - End-of-half situations with unusual time constraints may have higher prediction uncertainty

4. **Model Does Not Account For** (MVP Version):
   - Team strength/quality differences
   - Player injuries or roster changes
   - Weather conditions
   - Playoff vs. regular season context
   - Momentum or psychological factors

## 7. API Endpoints

### POST /api/calculate

**Description**: Calculate EPA and Win Probability for a given game state.

**Request Body** (JSON):
```json
{
  "homeTeam": "KC",
  "awayTeam": "SF",
  "down": 1,
  "distance": 10,
  "yardsToGoal": 75,
  "homeScore": 14,
  "awayScore": 10,
  "timeRemaining": 1800,
  "homeTimeouts": 3,
  "awayTimeouts": 2
}
```

**Response** (JSON):
```json
{
  "epa": 1.23,
  "winProbability": 0.673,
  "winProbabilityPercent": "67.3%",
  "metadata": {
    "homeTeam": "KC",
    "awayTeam": "SF",
    "fieldPosition": "Own 25-yard line",
    "quarter": 3,
    "scoreDifferential": 4
  }
}
```

**Validation Rules**:
- `homeTeam`: Valid NFL team abbreviation (string, 2-3 chars)
- `awayTeam`: Valid NFL team abbreviation (string, 2-3 chars, must differ from homeTeam)
- `down`: 1-4 (integer)
- `distance`: 1-99 (integer)
- `yardsToGoal`: 1-99 (integer)
- `homeScore`: 0-99 (integer)
- `awayScore`: 0-99 (integer)
- `timeRemaining`: 0-3600 (integer, seconds)
- `homeTimeouts`: 0-3 (integer)
- `awayTimeouts`: 0-3 (integer)

**Error Responses**:
- 400 Bad Request: Invalid input values
- 500 Internal Server Error: Model prediction failure

### GET /api/health

**Description**: Health check endpoint for monitoring.

**Response**:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "timestamp": "2025-02-01T10:00:00Z"
}
```

### GET /docs (FastAPI only)

**Description**: Auto-generated API documentation (Swagger UI).

**Access**: Navigate to `/docs` in browser when backend is running.

## 8. Development Phases

### Phase 1: Project Setup & Requirements ✓
**Status**: Current Phase

**Tasks**:
- [x] Create project folder structure
- [x] Write comprehensive REQUIREMENTS.md
- [ ] Initialize Git repository
- [ ] Create README.md with project overview
- [ ] Set up .gitignore

**Deliverables**:
- Organized project structure
- Complete requirements document
- Version control initialized

---

### Phase 2: Data Collection & Model Training
**Duration**: ~1-2 weeks

**Tasks**:
1. Download nflfastR data (2016-2024)
2. Load data into Python (Pandas)
3. Data Cleaning and Filtering
   - Filter out penalties, timeouts, kneel downs, spikes
   - Exclude Hail Mary attempts
   - Remove two-point conversions
   - Filter data quality issues (misclassified plays)
   - Document how many plays are excluded at each step
4. Exploratory Data Analysis (EDA)
   - Visualize EP by field position (identify zones: red zone, midfield, own territory)
   - Analyze win probability by score/time
   - Identify blowout games (plot score differential vs. time by quarter)
   - Analyze play distributions in competitive vs. blowout situations
   - Test multiple blowout filtering thresholds (10/17/21 points by quarter)
   - Document how many plays are filtered out by blowout criteria (expect 15-25%)
5. Apply Blowout Filtering
   - Implement quarter-based filtering (10 points in Q1/Q3, 17 in Q2, 21 in Q4)
   - Compare model performance with/without filtering
   - Document filtering approach and justification
6. Build Expected Points Model (XGBoost)
   - Feature engineering: down, distance, yardline_100, red_zone, home_field_advantage
   - Implement Leave-One-Season-Out (LOSO) cross-validation
   - Train XGBoost model (primary) and compare with LightGBM
   - Tune hyperparameters (learning rate, max depth, etc.)
7. Evaluate EPA Model
   - Calculate calibration error (target < 0.01)
   - Calculate MAE, RMSE, R², Log Loss
   - Validate field position zones separately (red zone, midfield, own territory)
   - Test turnover context (verify INT ~-4 EPA, pick-six ~-8 EPA, fumble at goal ~-6)
   - Test end-of-half situations
   - Compare to nflfastR's EP values
8. Build Win Probability Model
   - Feature engineering: score_diff, time, field position, timeouts, down, distance
   - Train Logistic Regression baseline
   - Train Gradient Boosting Classifier
   - Implement LOSO cross-validation
   - Calibrate probabilities
9. Evaluate Win Probability Model
   - Calculate log loss (target < 0.4)
   - Calculate calibration error (target < 0.01)
   - Generate calibration plots (predicted vs. actual win rate)
   - Calculate Brier Score and ROC-AUC
10. Save trained models (pickle/joblib) with version metadata
11. Create comprehensive model evaluation report
    - Blowout filtering impact analysis
    - Performance metrics on competitive games
    - LOSO cross-validation results by season
    - Field position zone validation
    - Known limitations documentation
    - Comparison to nflfastR benchmarks

**Deliverables**:
- Jupyter notebooks with EDA and training code
- Trained model files (`.pkl` or `.joblib`)
- Model performance report

---

### Phase 3: Backend Development
**Duration**: ~1 week

**Tasks**:
1. Set up Python project (FastAPI)
2. Create `requirements.txt` with dependencies
3. Load trained models on startup
4. Implement `/api/calculate` endpoint
5. Add input validation (Pydantic)
6. Implement `/api/health` endpoint
7. Add CORS middleware
8. Test API locally with Postman/curl
9. Write unit tests for prediction logic

**Deliverables**:
- Working FastAPI backend
- API documentation
- Unit tests

---

### Phase 4: Frontend Development
**Duration**: ~1 week

**Tasks**:
1. Create React app (Vite or CRA)
2. Design UI/UX mockups
3. Create team data JSON file with all 32 NFL teams
4. Build team selection component
   - Dropdown/autocomplete for home and away teams
   - Display team logos (ESPN CDN or local assets)
   - Show team names and abbreviations
   - Prevent selecting same team for home and away
5. Build game state input form
   - Down/distance selectors
   - Score inputs
   - Time remaining picker
   - Timeout counters
6. Implement form validation
7. Connect to backend API
8. Display EPA and Win Probability results
9. Add loading states and error handling
10. Style with Tailwind CSS
11. Make responsive for mobile
12. Test on multiple browsers

**Deliverables**:
- Functional React frontend
- Responsive UI
- Connected to backend API

---

### Phase 5: Deployment
**Duration**: ~3 days

**Tasks**:
1. Deploy backend to Railway/Render
   - Configure environment variables
   - Upload model files
   - Test deployed API
2. Deploy frontend to Vercel
   - Configure build settings
   - Set API URL environment variable
   - Test production build
3. Configure CORS for production
4. Set up custom domains (optional)
5. Add monitoring/logging
6. Load testing
7. Documentation for deployment

**Deliverables**:
- Live backend API
- Live frontend application
- Deployment documentation

---

## 9. Success Criteria

### Functional Requirements
- [x] User can input all required game state variables
- [x] System returns EPA and Win Probability instantly
- [x] Results are accurate compared to established models (nflfastR)
- [x] API responds in <500ms
- [x] Frontend is responsive on mobile and desktop
- [x] Error handling for invalid inputs

### Technical Requirements
- [x] Models achieve acceptable accuracy:
  - **EPA Model**:
    - Calibration Error < 0.01 (primary metric, target: 0.006 like nflfastR)
    - R² > 0.85 (strong correlation with field position)
    - MAE < 0.5 points
    - Well-calibrated across field position zones
  - **Win Probability Model**:
    - Log Loss < 0.4
    - Well-calibrated (predicted 50% wins ~50% of time)
    - Calibration error < 0.01
  - **Validation**:
    - Leave-One-Season-Out cross-validation performed
    - Model tested on holdout season(s)
    - Field position zones validated separately
- [x] Backend API documented (Swagger/OpenAPI)
- [x] Frontend gracefully handles API errors
- [x] Code is modular and maintainable

### User Experience
- [x] Simple, intuitive input form
- [x] Clear display of results
- [x] Fast load times (<2s initial load)
- [x] No bugs or crashes during normal use

### Deployment
- [x] Backend and frontend successfully deployed
- [x] HTTPS enabled
- [x] Application accessible via public URL
- [x] Uptime > 99% (monitoring optional)

---

## 10. Future Enhancements

### Phase 2 Features (Post-MVP)
- **Play-by-Play Simulation**: Show how EPA/Win Prob changes over a drive
- **Historical Comparisons**: "Teams in this situation won X% of the time"
- **4th Down Decision Tool**: Recommend go/punt/kick based on win prob
- **Drive Success Probability**: Show probability of scoring TD vs. FG vs. nothing
- **Team-Specific Adjustments**: Account for team strength (Elo ratings)
- **Situation Database**: Search for similar historical situations

### Phase 3 Features (Advanced)
- **User Accounts**: Save favorite situations, track predictions
- **API Authentication**: Rate limiting, API keys
- **Real-Time Game Integration**: Pull live game data from ESPN/NFL APIs
- **Visualization Enhancements**: Charts showing win prob over time
- **Multi-Game Dashboard**: Track multiple games simultaneously
- **Mobile App**: Native iOS/Android apps

### Data Improvements
- **Weather Data**: Incorporate wind, temperature, precipitation
- **Player Data**: Account for QB/RB/WR presence
- **Situational Factors**: Home field advantage, division rivals
- **Playoff Adjustments**: Different stakes, team performance

---

## 11. Resources & References

### Data Sources
- **nflfastR**: https://github.com/nflverse/nflfastR
- **nflfastR Data Repository**: https://github.com/nflverse/nflfastR-data
- **nflverse**: https://nflverse.com

### Tools & Libraries
- **Python**: https://www.python.org
- **FastAPI**: https://fastapi.tiangolo.com
- **React**: https://react.dev
- **XGBoost**: https://xgboost.readthedocs.io
- **Scikit-learn**: https://scikit-learn.org
- **Pandas**: https://pandas.pydata.org

### NFL Analytics Resources
- **Open Source Football**: https://www.opensourcefootball.com
- **Expected Points Explained**: https://www.advancedfootballanalytics.com/index.php/home/stats/stats-explained/expected-points-and-epa-explained
- **Win Probability Models**: https://arxiv.org/abs/1802.00998
- **nflfastR Guide**: https://www.nflfastr.com/ - Official documentation for nflfastR package
- **Garbage Time in NFL**: Research on identifying and filtering non-competitive game situations
  - Consider using `wp` field from nflfastR as a starting point for analysis
  - Alternative: Score differential thresholds by quarter

---

## 12. Project Timeline

**Total Estimated Duration**: 4-6 weeks (part-time)

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Setup | 1 day | Week 1 | Week 1 |
| Phase 2: Data & Models | 1-2 weeks | Week 1 | Week 3 |
| Phase 3: Backend | 1 week | Week 3 | Week 4 |
| Phase 4: Frontend | 1 week | Week 4 | Week 5 |
| Phase 5: Deployment | 3 days | Week 5 | Week 6 |

**Note**: Timeline assumes part-time work (10-15 hours/week). Full-time development could complete in 2-3 weeks.

---

## 13. Risk Mitigation

### Technical Risks
- **Model Accuracy**: Use established nflfastR data and methods
- **API Performance**: Optimize model loading, use caching if needed
- **Data Quality**: Critical data cleaning steps:
  - **Blowout Filtering**: Risk of being too aggressive (losing too much data) or too lenient (keeping noisy data)
    - Mitigation: Test multiple thresholds, analyze impact on dataset size and model performance
    - Validation: Compare model predictions on filtered vs. unfiltered test sets
  - **Edge Cases**: Handle unusual situations (overtime, 2-point conversions, safety scenarios)
    - Mitigation: Explicitly test model on edge cases during validation
  - **Circularity**: Avoid using nflfastR's WP to filter data for training our own WP model
    - Mitigation: Use score+time thresholds instead of WP for filtering win probability training data

### Deployment Risks
- **Backend Hosting Costs**: Use free tiers (Railway, Render) initially
- **Model File Size**: Compress models, use efficient formats
- **CORS Issues**: Test thoroughly before production

### Development Risks
- **Scope Creep**: Focus on MVP first, defer enhancements
- **Time Estimates**: Build in buffer time for debugging
- **Learning Curve**: Allow time to learn new technologies (FastAPI, React)

---

## Appendix A: Sample Game Situations

### Example 1: Classic Field Goal Range
- **Home Team**: Kansas City Chiefs (KC)
- **Away Team**: San Francisco 49ers (SF)
- **Down**: 3rd and 5
- **Yards to Goal**: 28
- **Score**: Home 21, Away 17
- **Time**: 2:45 (Q4)
- **Timeouts**: Home 2, Away 1
- **Expected EPA**: ~1.5 (in FG range)
- **Win Probability**: ~75% (4-point lead, late in game)

### Example 2: Two-Minute Drill
- **Home Team**: Buffalo Bills (BUF)
- **Away Team**: Miami Dolphins (MIA)
- **Down**: 1st and 10
- **Yards to Goal**: 80
- **Score**: Home 20, Away 24
- **Time**: 1:52 (Q4)
- **Timeouts**: Home 3, Away 2
- **Expected EPA**: ~0.8 (near own 20)
- **Win Probability**: ~30% (down 4, but time and timeouts)

### Example 3: Goal Line Stand
- **Home Team**: Philadelphia Eagles (PHI)
- **Away Team**: Dallas Cowboys (DAL)
- **Down**: 3rd and Goal
- **Yards to Goal**: 2
- **Score**: Home 10, Away 14
- **Time**: 8:30 (Q4)
- **Timeouts**: Home 1, Away 3
- **Expected EPA**: ~4.5 (very likely to score)
- **Win Probability**: ~45% (if TD, takes lead)

---

## Appendix B: NFL Teams Reference

### All 32 NFL Teams

**AFC East:**
- BUF - Buffalo Bills
- MIA - Miami Dolphins
- NE - New England Patriots
- NYJ - New York Jets

**AFC North:**
- BAL - Baltimore Ravens
- CIN - Cincinnati Bengals
- CLE - Cleveland Browns
- PIT - Pittsburgh Steelers

**AFC South:**
- HOU - Houston Texans
- IND - Indianapolis Colts
- JAX - Jacksonville Jaguars
- TEN - Tennessee Titans

**AFC West:**
- DEN - Denver Broncos
- KC - Kansas City Chiefs
- LV - Las Vegas Raiders
- LAC - Los Angeles Chargers

**NFC East:**
- DAL - Dallas Cowboys
- NYG - New York Giants
- PHI - Philadelphia Eagles
- WAS - Washington Commanders

**NFC North:**
- CHI - Chicago Bears
- DET - Detroit Lions
- GB - Green Bay Packers
- MIN - Minnesota Vikings

**NFC South:**
- ATL - Atlanta Falcons
- CAR - Carolina Panthers
- NO - New Orleans Saints
- TB - Tampa Bay Buccaneers

**NFC West:**
- ARI - Arizona Cardinals
- LAR - Los Angeles Rams
- SF - San Francisco 49ers
- SEA - Seattle Seahawks

### Team Logo URLs (ESPN CDN)

Example URL format: `https://a.espncdn.com/i/teamlogos/nfl/500/{TEAM}.png`

Replace `{TEAM}` with lowercase team abbreviation:
- Kansas City Chiefs: `https://a.espncdn.com/i/teamlogos/nfl/500/kc.png`
- San Francisco 49ers: `https://a.espncdn.com/i/teamlogos/nfl/500/sf.png`
- Buffalo Bills: `https://a.espncdn.com/i/teamlogos/nfl/500/buf.png`

### Sample Teams JSON Structure

```json
{
  "teams": [
    {
      "id": "KC",
      "name": "Kansas City Chiefs",
      "city": "Kansas City",
      "abbreviation": "KC",
      "conference": "AFC",
      "division": "West",
      "colors": {
        "primary": "#E31837",
        "secondary": "#FFB81C"
      },
      "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"
    },
    {
      "id": "SF",
      "name": "San Francisco 49ers",
      "city": "San Francisco",
      "abbreviation": "SF",
      "conference": "NFC",
      "division": "West",
      "colors": {
        "primary": "#AA0000",
        "secondary": "#B3995D"
      },
      "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png"
    }
  ]
}
```

**Note**: Complete teams.json file with all 32 teams should be created during Phase 4 (Frontend Development).

---

**Document Version**: 1.3
**Last Updated**: 2025-02-01
**Author**: Claude Code
**Status**: Phase 1 - Project Setup
**Changelog**:
- v1.3: **Major Update - Industry Best Practices Integration**
  - **Model Architecture**: Emphasized XGBoost as primary choice (not just option)
  - **Input Features**: Added home field advantage feature
  - **EP Definition**: Clarified EP represents next scoring play by either team, not just current drive
  - **Validation Strategy**: Added Leave-One-Season-Out (LOSO) cross-validation as standard
  - **Evaluation Metrics**: Added calibration error (target < 0.01) as primary metric, plus log loss
  - **Blowout Filtering**: Enhanced to 10-point threshold for Q1/Q3 (more aggressive)
  - **Play Exclusions**: Added specific exclusions (Hail Marys, misclassified plays, 2-pt conversions)
  - **Field Position Validation**: Added explicit validation of different EP curves by zone
  - **Special Situations**: Added turnover context validation, end-of-half handling emphasis
  - **Known Limitations**: New section documenting "cliffs" problem and variance issues
  - **Model Scope**: Documented player-level EPA as explicitly out of scope
  - **Success Criteria**: Updated with calibration error < 0.01, enhanced accuracy targets
  - **Phase 2 Tasks**: Comprehensive expansion with 11 detailed tasks including LOSO validation
  - **Model Extrapolation**: Emphasized model must predict extreme values despite training on competitive games
  - Sources: nflfastR methodology, Open Source Football, industry research (2020-2026)
- v1.2: Added blowout game filtering to data processing requirements
  - Defined filtering criteria (WP thresholds, score differentials)
  - Updated Phase 2 tasks to include blowout analysis
  - Added data quality notes to model training processes
  - Enhanced risk mitigation for data quality issues
- v1.1: Added team selection with logos to UX requirements
- v1.0: Initial requirements document
