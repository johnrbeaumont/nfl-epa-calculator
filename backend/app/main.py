"""
NFL EPA Calculator - FastAPI Backend

Serves trained XGBoost models for EPA and Win Probability predictions via REST API.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Optional
import hashlib
import joblib
import numpy as np
import json
import os
from pathlib import Path
from datetime import datetime
import logging

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# NGS Database imports
from .database import init_db, SessionLocal, NGSPassing, SeasonalStats
from .ngs_endpoints import router as ngs_router
from .live_endpoints import router as live_router
from .ngs_scraper import NGSDataImporter

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="America/New_York")
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="NFL EPA & Win Probability API",
    description="Calculate Expected Points Added (EPA) and Win Probability for NFL game situations",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration — only allow known origins (no wildcards)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "https://nfl-epa-calculator.vercel.app",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(ngs_router)
app.include_router(live_router)

# Global variables for models and metadata
epa_model = None
epa_metadata = None
win_prob_model = None
win_prob_metadata = None

MODELS_DIR = Path(__file__).parent.parent.parent / "models"

# Prefer new LightGBM models; fall back to legacy XGBoost
EPA_MODEL_PATH = (
    MODELS_DIR / "ep_model_lgbm.joblib"
    if (MODELS_DIR / "ep_model_lgbm.joblib").exists()
    else MODELS_DIR / "epa_model_xgboost.joblib"
)
EPA_METADATA_PATH = (
    MODELS_DIR / "ep_model_metadata.json"
    if (MODELS_DIR / "ep_model_metadata.json").exists()
    else MODELS_DIR / "epa_model_metadata.json"
)
WIN_PROB_MODEL_PATH = (
    MODELS_DIR / "wp_model_lgbm_calibrated.joblib"
    if (MODELS_DIR / "wp_model_lgbm_calibrated.joblib").exists()
    else MODELS_DIR / "win_probability_model_xgboost.joblib"
)
WIN_PROB_METADATA_PATH = (
    MODELS_DIR / "wp_model_metadata.json"
    if (MODELS_DIR / "wp_model_metadata.json").exists()
    else MODELS_DIR / "win_probability_model_metadata.json"
)


def _sha256(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _verify_model_checksum(path: Path, name: str) -> None:
    """
    Compare the file's SHA-256 against MODEL_CHECKSUMS env var.
    Format: MODEL_CHECKSUMS=epa:<hex>,wp:<hex>
    If the env var is absent, logs the current checksum so the operator can record it.
    Raises RuntimeError if checksum is present but doesn't match.
    """
    digest = _sha256(path)
    checksums_raw = os.getenv("MODEL_CHECKSUMS", "")
    checksums = dict(pair.split(":", 1) for pair in checksums_raw.split(",") if ":" in pair)

    if not checksums:
        logger.warning(
            f"MODEL_CHECKSUMS not set — cannot verify {name}. "
            f"Current SHA-256: {name}:{digest}  (set MODEL_CHECKSUMS env var to enable integrity checks)"
        )
        return

    expected = checksums.get(name)
    if expected is None:
        logger.warning(f"No checksum entry for '{name}' in MODEL_CHECKSUMS — skipping verification")
        return

    if digest != expected:
        raise RuntimeError(
            f"Model integrity check FAILED for {name}. "
            f"Expected {expected[:12]}…, got {digest[:12]}…. "
            "The model file may have been tampered with."
        )


# Pydantic Models for Request/Response
class EPARequest(BaseModel):
    """Request model for EPA calculation"""
    homeTeam: str = Field(..., description="Home team abbreviation (e.g., 'KC', 'SF')")
    awayTeam: str = Field(..., description="Away team abbreviation (e.g., 'BUF', 'MIA')")
    down: int = Field(..., ge=1, le=4, description="Down (1-4)")
    distance: int = Field(..., ge=1, le=99, description="Yards to first down (1-99)", alias="ydstogo")
    yardsToGoal: int = Field(..., ge=1, le=99, description="Yards to opponent's goal line (1-99)", alias="yardline_100")
    homeScore: int = Field(..., ge=0, le=99, description="Home team score")
    awayScore: int = Field(..., ge=0, le=99, description="Away team score")
    timeRemaining: int = Field(..., ge=0, le=3600, description="Time remaining in seconds")
    homeTimeouts: int = Field(..., ge=0, le=3, description="Home team timeouts remaining")
    awayTimeouts: int = Field(..., ge=0, le=3, description="Away team timeouts remaining")
    possession: Optional[str] = Field("home", description="Which team has possession ('home' or 'away')")
    quarter: Optional[int] = Field(2, ge=1, le=5, description="Current quarter (1-4, 5=OT)")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "homeTeam": "KC",
                "awayTeam": "SF",
                "down": 3,
                "distance": 5,
                "yardsToGoal": 28,
                "homeScore": 21,
                "awayScore": 17,
                "timeRemaining": 165,
                "homeTimeouts": 2,
                "awayTimeouts": 1,
                "possession": "home",
                "quarter": 3
            }
        }

    @validator('homeTeam', 'awayTeam')
    def validate_teams_different(cls, v, values):
        """Ensure home and away teams are different"""
        if 'homeTeam' in values and 'awayTeam' in values:
            if values.get('homeTeam') == v:
                raise ValueError('Home team and away team must be different')
        return v.upper()


class EPAResponse(BaseModel):
    """Response model for EPA calculation"""
    epa: float = Field(..., description="Expected Points Added")
    metadata: dict = Field(..., description="Additional context about the prediction")

    class Config:
        json_schema_extra = {
            "example": {
                "epa": 1.23,
                "metadata": {
                    "homeTeam": "KC",
                    "awayTeam": "SF",
                    "down": 3,
                    "distance": 5,
                    "fieldPosition": "Opponent 28-yard line",
                    "redZone": False,
                    "homeFieldAdvantage": True,
                    "scoreDifferential": 4,
                    "possession": "home"
                }
            }
        }


class WinProbabilityRequest(BaseModel):
    """Request model for Win Probability calculation"""
    homeTeam: str = Field(..., description="Home team abbreviation (e.g., 'KC', 'SF')")
    awayTeam: str = Field(..., description="Away team abbreviation (e.g., 'BUF', 'MIA')")
    down: int = Field(..., ge=1, le=4, description="Down (1-4)")
    distance: int = Field(..., ge=1, le=99, description="Yards to first down (1-99)")
    yardsToGoal: int = Field(..., ge=1, le=99, description="Yards to opponent's goal line (1-99)")
    homeScore: int = Field(..., ge=0, le=99, description="Home team score")
    awayScore: int = Field(..., ge=0, le=99, description="Away team score")
    timeRemaining: int = Field(..., ge=0, le=3600, description="Time remaining in seconds")
    homeTimeouts: int = Field(..., ge=0, le=3, description="Home team timeouts remaining")
    awayTimeouts: int = Field(..., ge=0, le=3, description="Away team timeouts remaining")
    possession: Optional[str] = Field("home", description="Which team has possession ('home' or 'away')")
    quarter: int = Field(..., ge=1, le=5, description="Current quarter (1-4, 5=OT)")

    class Config:
        json_schema_extra = {
            "example": {
                "homeTeam": "KC",
                "awayTeam": "SF",
                "down": 1,
                "distance": 10,
                "yardsToGoal": 75,
                "homeScore": 21,
                "awayScore": 17,
                "timeRemaining": 300,
                "homeTimeouts": 2,
                "awayTimeouts": 1,
                "possession": "home",
                "quarter": 4
            }
        }

    @validator('homeTeam', 'awayTeam')
    def validate_teams_different(cls, v, values):
        """Ensure home and away teams are different"""
        if 'homeTeam' in values and 'awayTeam' in values:
            if values.get('homeTeam') == v:
                raise ValueError('Home team and away team must be different')
        return v.upper()


class WinProbabilityResponse(BaseModel):
    """Response model for Win Probability calculation"""
    homeWinProbability: float = Field(..., description="Probability home team wins (0-1)")
    awayWinProbability: float = Field(..., description="Probability away team wins (0-1)")
    metadata: dict = Field(..., description="Additional context about the prediction")

    class Config:
        json_schema_extra = {
            "example": {
                "homeWinProbability": 0.78,
                "awayWinProbability": 0.22,
                "metadata": {
                    "homeTeam": "KC",
                    "awayTeam": "SF",
                    "scoreDifferential": 4,
                    "timeRemaining": 300,
                    "quarter": 4,
                    "possession": "home"
                }
            }
        }


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    epa_model_loaded: bool
    win_prob_model_loaded: bool
    epa_model_info: Optional[dict]
    win_prob_model_info: Optional[dict]
    ngs_stats: Optional[dict]
    scheduler: Optional[dict]
    timestamp: str


# Startup event - Load models
@app.on_event("startup")
async def load_models():
    """Load the trained EPA and Win Probability models on startup"""
    global epa_model, epa_metadata, win_prob_model, win_prob_metadata

    try:
        # Load EPA model
        logger.info(f"Loading EPA model from: {EPA_MODEL_PATH}")
        _verify_model_checksum(EPA_MODEL_PATH, "epa")
        epa_model = joblib.load(EPA_MODEL_PATH)
        logger.info("EPA model loaded successfully")

        # Load EPA metadata
        with open(EPA_METADATA_PATH, 'r') as f:
            epa_metadata = json.load(f)
        perf = epa_metadata.get('performance', {})
        mae_key = next((k for k in perf if 'mae' in k.lower()), None)
        r2_key  = next((k for k in perf if 'r2' in k.lower() or 'r²' in k.lower()), None)
        logger.info(
            f"EPA model — features: {epa_metadata.get('features', [])}, "
            + (f"MAE={perf[mae_key]:.4f}, " if mae_key else "")
            + (f"R²={perf[r2_key]:.4f}" if r2_key else "")
        )

        # Load Win Probability model
        logger.info(f"Loading Win Probability model from: {WIN_PROB_MODEL_PATH}")
        _verify_model_checksum(WIN_PROB_MODEL_PATH, "wp")
        win_prob_model = joblib.load(WIN_PROB_MODEL_PATH)

        with open(WIN_PROB_METADATA_PATH, 'r') as f:
            win_prob_metadata = json.load(f)
        logger.info(
            f"WP model — features: {win_prob_metadata.get('features', [])}, "
            f"Brier={win_prob_metadata['performance']['brier_score']:.4f}, "
            f"AUC={win_prob_metadata['performance']['auc_roc']:.4f}"
        )

        # Expose models via app.state so routers can access them via request.app.state
        app.state.ep_model = epa_model
        app.state.ep_metadata = epa_metadata
        app.state.wp_model = win_prob_model
        app.state.wp_metadata = win_prob_metadata

        # Initialize NGS database
        logger.info("Initializing NGS database...")
        init_db()
        logger.info("NGS database initialized")

        # Start daily data refresh scheduler
        _start_scheduler()
        logger.info("Daily refresh scheduler started")

    except FileNotFoundError as e:
        logger.error(f"Model file not found: {e}")
        raise
    except Exception as e:
        logger.error(f"Error during startup: {e}", exc_info=True)
        raise


@app.on_event("shutdown")
async def shutdown_event():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")


def _is_nfl_season(dt: datetime) -> bool:
    """Return True if dt falls within the NFL regular+postseason window.
    Regular season: early Sep → mid-Jan (weeks 1-18 + playoffs + Super Bowl)
    Off-season: mid-Feb → Aug — skip refreshes.
    """
    month = dt.month
    # Sep (9) through Jan (1) and up to Feb 15
    if month in (9, 10, 11, 12, 1):
        return True
    if month == 2 and dt.day <= 15:
        return True
    return False


def _daily_refresh():
    """Run every day during NFL season; skips off-season to avoid unnecessary load."""
    now = datetime.now()
    if not _is_nfl_season(now):
        logger.info(f"Off-season ({now.strftime('%b %d')}) — skipping daily refresh")
        return

    logger.info(f"Starting scheduled daily refresh ({now.strftime('%Y-%m-%d %H:%M')})")
    db = SessionLocal()
    try:
        importer = NGSDataImporter(db)
        # Use incremental (current season only) for daily updates
        results = importer.incremental_refresh()
        passed = [k for k, v in results.items() if isinstance(v, dict) and v.get('status') == 'success']
        failed = [k for k, v in results.items() if isinstance(v, dict) and v.get('status') != 'success']
        logger.info(f"Daily refresh complete — ok: {passed}, failed: {failed}")
    except Exception as e:
        logger.error(f"Daily refresh failed: {e}", exc_info=True)
    finally:
        db.close()


def _start_scheduler():
    """Register the daily refresh cron and start the scheduler."""
    # Run at 6:00 AM ET every day
    scheduler.add_job(
        _daily_refresh,
        trigger=CronTrigger(hour=6, minute=0),
        id="daily_nfl_refresh",
        name="Daily NFL data refresh",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow up to 1h late if server was down
    )
    scheduler.start()
    next_run = scheduler.get_job("daily_nfl_refresh").next_run_time
    logger.info(f"Next scheduled refresh: {next_run.strftime('%Y-%m-%d %H:%M %Z') if next_run else 'N/A'}")


# API Endpoints
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "message": "NFL EPA Calculator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint - verify API and both model statuses"""
    # Check NGS database status
    ngs_health = {
        "database_connected": False,
        "row_counts": {}
    }

    try:
        db = SessionLocal()
        importer = NGSDataImporter(db)
        stats = importer.get_database_stats()
        ngs_health["database_connected"] = True
        ngs_health["row_counts"] = {
            "passing": stats["passing"]["total_rows"],
            "receiving": stats["receiving"]["total_rows"],
            "rushing": stats["rushing"]["total_rows"]
        }
        ngs_health["last_refresh"] = stats["refresh_log"]["last_refresh"]
        db.close()
    except Exception as e:
        ngs_health["error"] = str(e)

    return {
        "status": "healthy" if (epa_model is not None and win_prob_model is not None) else "unhealthy",
        "epa_model_loaded": epa_model is not None,
        "win_prob_model_loaded": win_prob_model is not None,
        "epa_model_info": {
            "type": epa_metadata.get("model_type"),
            "features": epa_metadata.get("features"),
            "training_samples": epa_metadata.get("training_samples"),
            "performance": epa_metadata.get("performance")
        } if epa_metadata else None,
        "win_prob_model_info": {
            "type": win_prob_metadata.get("model_type"),
            "features": win_prob_metadata.get("features"),
            "training_samples": win_prob_metadata.get("training_samples"),
            "performance": win_prob_metadata.get("performance")
        } if win_prob_metadata else None,
        "ngs_stats": ngs_health,
        "scheduler": {
            "running": scheduler.running,
            "in_season": _is_nfl_season(datetime.now()),
            "next_refresh": scheduler.get_job("daily_nfl_refresh").next_run_time.isoformat()
                if scheduler.running and scheduler.get_job("daily_nfl_refresh") else None,
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/calculate", response_model=EPAResponse, tags=["EPA"])
@limiter.limit("60/minute")
async def calculate_epa(request: Request, body: EPARequest):
    """
    Calculate Expected Points Added (EPA) for a given game situation

    Takes game state inputs and returns the expected points value using
    the trained XGBoost model.
    """

    # Check if model is loaded
    if epa_model is None:
        raise HTTPException(status_code=503, detail="EPA model not loaded")

    try:
        # Determine field position context
        yards_to_goal = body.yardsToGoal
        if yards_to_goal <= 10:
            field_position = f"Opponent {yards_to_goal}-yard line (Goal to go)"
        elif yards_to_goal <= 20:
            field_position = f"Opponent {yards_to_goal}-yard line (Red zone)"
        elif yards_to_goal <= 50:
            field_position = f"Opponent {yards_to_goal}-yard line"
        else:
            own_yard = 100 - yards_to_goal
            field_position = f"Own {own_yard}-yard line"

        red_zone = 1 if yards_to_goal <= 20 else 0
        is_home_offense = 1 if body.possession == "home" else 0
        quarter = body.quarter or 2

        model_features = epa_metadata.get("features", []) if epa_metadata else []

        if "game_seconds_remaining" in model_features:
            # New LightGBM EP multinomial model
            is_overtime = 1 if quarter >= 5 else 0
            game_secs = body.timeRemaining
            # half_seconds_remaining: time left in current half
            if quarter <= 2:
                half_secs = max(0, game_secs - 1800)
            else:
                half_secs = max(0, game_secs)

            score_diff_posteam = (
                body.homeScore - body.awayScore if is_home_offense
                else body.awayScore - body.homeScore
            )

            features = np.array([[
                body.down,
                body.distance,
                yards_to_goal,
                red_zone,
                is_home_offense,
                score_diff_posteam,
                game_secs,
                half_secs,
                is_overtime,
            ]])

            # EP = proba @ score_values
            SCORE_VALUES = np.array([-6.96, -3.0, -2.0, 0.0, 2.0, 3.0, 6.96])
            proba = epa_model.predict_proba(features)[0]
            ep_value = float(proba @ SCORE_VALUES)
            label = "Expected Points (EP)"
        else:
            # Legacy XGBoost EP regression model
            # Model expects: ['down', 'ydstogo', 'yardline_100', 'red_zone', 'home_field_advantage']
            features = np.array([[
                body.down,
                body.distance,
                yards_to_goal,
                red_zone,
                is_home_offense,
            ]])
            ep_value = float(epa_model.predict(features)[0])
            label = "Expected Points (EP)"

        score_diff = body.homeScore - body.awayScore

        result = EPAResponse(
            epa=round(ep_value, 2),
            metadata={
                "homeTeam": body.homeTeam,
                "awayTeam": body.awayTeam,
                "down": body.down,
                "distance": body.distance,
                "fieldPosition": field_position,
                "redZone": bool(red_zone),
                "homeFieldAdvantage": bool(is_home_offense),
                "scoreDifferential": score_diff,
                "possession": body.possession,
                "timeRemaining": body.timeRemaining,
                "homeScore": body.homeScore,
                "awayScore": body.awayScore,
                "quarter": quarter,
                "label": label,
            }
        )

        return result

    except Exception:
        logger.exception("Error in /api/calculate")
        raise HTTPException(status_code=500, detail="An error occurred while calculating EPA. Please try again.")


@app.post("/api/win-probability", response_model=WinProbabilityResponse, tags=["Win Probability"])
@limiter.limit("60/minute")
async def calculate_win_probability(request: Request, body: WinProbabilityRequest):
    """
    Calculate Win Probability for a given game situation

    Takes game state inputs and returns the probability of the home team winning
    using the trained XGBoost classifier.
    """

    # Check if model is loaded
    if win_prob_model is None:
        raise HTTPException(status_code=503, detail="Win Probability model not loaded")

    try:
        # Calculate score differential from home team's perspective
        score_diff_home = body.homeScore - body.awayScore

        # Calculate field position from home team's perspective
        is_home_offense = 1 if body.possession == "home" else 0
        if is_home_offense:
            field_position_home = 100 - body.yardsToGoal
        else:
            field_position_home = body.yardsToGoal

        # Determine timeouts (offense and defense perspective)
        if is_home_offense:
            posteam_timeouts = body.homeTimeouts
            defteam_timeouts = body.awayTimeouts
        else:
            posteam_timeouts = body.awayTimeouts
            defteam_timeouts = body.homeTimeouts

        red_zone = 1 if body.yardsToGoal <= 20 else 0
        fourth_quarter = 1 if body.quarter == 4 else 0
        is_overtime = 1 if body.quarter >= 5 else 0

        wp_features = win_prob_metadata.get("features", []) if win_prob_metadata else []

        if "is_two_minute_warning" in wp_features:
            # Best LightGBM WP model (13 features)
            # New features: half_seconds_remaining, is_two_minute_warning
            game_secs = body.timeRemaining
            quarter = body.quarter
            half_secs = max(0, game_secs - 1800) if quarter <= 2 else max(0, game_secs)
            is_two_min = 1 if (game_secs <= 120 and quarter in (2, 4)) or quarter >= 5 else 0
            features = np.array([[
                score_diff_home,
                game_secs,
                half_secs,
                field_position_home,
                body.down,
                body.distance,
                posteam_timeouts,
                defteam_timeouts,
                red_zone,
                fourth_quarter,
                is_home_offense,
                is_overtime,
                is_two_min,
            ]])
        elif "is_overtime" in wp_features:
            # Previous LightGBM WP model (11 features)
            features = np.array([[
                score_diff_home,
                body.timeRemaining,
                field_position_home,
                body.down,
                body.distance,
                posteam_timeouts,
                defteam_timeouts,
                red_zone,
                fourth_quarter,
                is_home_offense,
                is_overtime,
            ]])
        else:
            # Legacy XGBoost WP model (10 features, no is_overtime)
            # Features: ['score_diff_home', 'game_seconds_remaining', 'field_position_home_perspective',
            #            'down', 'ydstogo', 'posteam_timeouts_remaining', 'defteam_timeouts_remaining',
            #            'red_zone', 'fourth_quarter', 'is_home_offense']
            features = np.array([[
                score_diff_home,
                body.timeRemaining,
                field_position_home,
                body.down,
                body.distance,
                posteam_timeouts,
                defteam_timeouts,
                red_zone,
                fourth_quarter,
                is_home_offense,
            ]])

        # Make prediction (supports both sklearn CalibratedClassifierCV and dict {base+isotonic})
        if isinstance(win_prob_model, dict):
            raw_p = win_prob_model['base_model'].predict_proba(features)[0, 1]
            win_prob = float(win_prob_model['isotonic'].predict([raw_p])[0])
        else:
            win_prob = float(win_prob_model.predict_proba(features)[0, 1])

        # Build response
        result = WinProbabilityResponse(
            homeWinProbability=round(win_prob, 3),
            awayWinProbability=round(1 - win_prob, 3),
            metadata={
                "homeTeam": body.homeTeam,
                "awayTeam": body.awayTeam,
                "scoreDifferential": score_diff_home,
                "timeRemaining": body.timeRemaining,
                "quarter": body.quarter,
                "down": body.down,
                "distance": body.distance,
                "possession": body.possession,
                "homeScore": body.homeScore,
                "awayScore": body.awayScore,
                "redZone": bool(red_zone),
                "fourthQuarter": bool(fourth_quarter),
                "isOvertime": bool(is_overtime),
            }
        )

        return result

    except Exception:
        logger.exception("Error in /api/win-probability")
        raise HTTPException(status_code=500, detail="An error occurred while calculating Win Probability. Please try again.")


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    return {
        "error": "Not Found",
        "message": "The requested endpoint does not exist",
        "available_endpoints": {
            "root": "/",
            "health": "/api/health",
            "calculate": "/api/calculate (POST)",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
