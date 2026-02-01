"""
NFL EPA Calculator - FastAPI Backend

Serves trained XGBoost models for EPA and Win Probability predictions via REST API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import joblib
import numpy as np
import json
from pathlib import Path
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(
    title="NFL EPA & Win Probability API",
    description="Calculate Expected Points Added (EPA) and Win Probability for NFL game situations",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models and metadata
epa_model = None
epa_metadata = None
win_prob_model = None
win_prob_metadata = None

EPA_MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "epa_model_xgboost.joblib"
EPA_METADATA_PATH = Path(__file__).parent.parent.parent / "models" / "epa_model_metadata.json"
WIN_PROB_MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "win_probability_model_xgboost.joblib"
WIN_PROB_METADATA_PATH = Path(__file__).parent.parent.parent / "models" / "win_probability_model_metadata.json"


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
                "possession": "home"
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
    quarter: int = Field(..., ge=1, le=4, description="Current quarter (1-4)")

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
    timestamp: str


# Startup event - Load models
@app.on_event("startup")
async def load_models():
    """Load the trained EPA and Win Probability models on startup"""
    global epa_model, epa_metadata, win_prob_model, win_prob_metadata

    try:
        # Load EPA model
        print(f"Loading EPA model from: {EPA_MODEL_PATH}")
        epa_model = joblib.load(EPA_MODEL_PATH)
        print("✓ EPA model loaded successfully")

        # Load EPA metadata
        print(f"Loading EPA metadata from: {EPA_METADATA_PATH}")
        with open(EPA_METADATA_PATH, 'r') as f:
            epa_metadata = json.load(f)
        print("✓ EPA metadata loaded successfully")

        print(f"\nEPA Model Info:")
        print(f"  Features: {epa_metadata['features']}")
        print(f"  Training samples: {epa_metadata['training_samples']:,}")
        print(f"  Performance: MAE={epa_metadata['performance']['mae']:.4f}, R²={epa_metadata['performance']['r2']:.4f}")

        # Load Win Probability model
        print(f"\nLoading Win Probability model from: {WIN_PROB_MODEL_PATH}")
        win_prob_model = joblib.load(WIN_PROB_MODEL_PATH)
        print("✓ Win Probability model loaded successfully")

        # Load Win Probability metadata
        print(f"Loading Win Probability metadata from: {WIN_PROB_METADATA_PATH}")
        with open(WIN_PROB_METADATA_PATH, 'r') as f:
            win_prob_metadata = json.load(f)
        print("✓ Win Probability metadata loaded successfully")

        print(f"\nWin Probability Model Info:")
        print(f"  Features: {win_prob_metadata['features']}")
        print(f"  Training samples: {win_prob_metadata['training_samples']:,}")
        print(f"  Performance: Brier={win_prob_metadata['performance']['brier_score']:.4f}, AUC={win_prob_metadata['performance']['auc_roc']:.4f}")

    except Exception as e:
        print(f"✗ Error loading models: {e}")
        raise


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
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/calculate", response_model=EPAResponse, tags=["EPA"])
async def calculate_epa(request: EPARequest):
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
        yards_to_goal = request.yardsToGoal
        if yards_to_goal <= 10:
            field_position = f"Opponent {yards_to_goal}-yard line (Goal to go)"
        elif yards_to_goal <= 20:
            field_position = f"Opponent {yards_to_goal}-yard line (Red zone)"
        elif yards_to_goal <= 50:
            field_position = f"Opponent {yards_to_goal}-yard line"
        else:
            own_yard = 100 - yards_to_goal
            field_position = f"Own {own_yard}-yard line"

        # Create features for model
        # Model expects: ['down', 'ydstogo', 'yardline_100', 'red_zone', 'home_field_advantage']
        red_zone = 1 if yards_to_goal <= 20 else 0
        home_field_advantage = 1 if request.possession == "home" else 0

        features = np.array([[
            request.down,
            request.distance,
            yards_to_goal,
            red_zone,
            home_field_advantage
        ]])

        # Make prediction
        epa_prediction = float(epa_model.predict(features)[0])

        # Calculate score differential
        score_diff = request.homeScore - request.awayScore

        # Build response
        response = EPAResponse(
            epa=round(epa_prediction, 2),
            metadata={
                "homeTeam": request.homeTeam,
                "awayTeam": request.awayTeam,
                "down": request.down,
                "distance": request.distance,
                "fieldPosition": field_position,
                "redZone": bool(red_zone),
                "homeFieldAdvantage": bool(home_field_advantage),
                "scoreDifferential": score_diff,
                "possession": request.possession,
                "timeRemaining": request.timeRemaining,
                "homeScore": request.homeScore,
                "awayScore": request.awayScore
            }
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating EPA: {str(e)}")


@app.post("/api/win-probability", response_model=WinProbabilityResponse, tags=["Win Probability"])
async def calculate_win_probability(request: WinProbabilityRequest):
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
        score_diff_home = request.homeScore - request.awayScore

        # Calculate field position from home team's perspective
        is_home_offense = 1 if request.possession == "home" else 0
        if is_home_offense:
            field_position_home = 100 - request.yardsToGoal
        else:
            field_position_home = request.yardsToGoal

        # Determine timeouts (offense and defense perspective)
        if is_home_offense:
            posteam_timeouts = request.homeTimeouts
            defteam_timeouts = request.awayTimeouts
        else:
            posteam_timeouts = request.awayTimeouts
            defteam_timeouts = request.homeTimeouts

        # Create features for model
        # Model expects: ['score_diff_home', 'game_seconds_remaining', 'field_position_home_perspective',
        #                 'down', 'ydstogo', 'posteam_timeouts_remaining', 'defteam_timeouts_remaining',
        #                 'red_zone', 'fourth_quarter', 'is_home_offense']
        red_zone = 1 if request.yardsToGoal <= 20 else 0
        fourth_quarter = 1 if request.quarter == 4 else 0

        features = np.array([[
            score_diff_home,
            request.timeRemaining,
            field_position_home,
            request.down,
            request.distance,
            posteam_timeouts,
            defteam_timeouts,
            red_zone,
            fourth_quarter,
            is_home_offense
        ]])

        # Make prediction
        win_prob = float(win_prob_model.predict_proba(features)[0, 1])

        # Build response
        response = WinProbabilityResponse(
            homeWinProbability=round(win_prob, 3),
            awayWinProbability=round(1 - win_prob, 3),
            metadata={
                "homeTeam": request.homeTeam,
                "awayTeam": request.awayTeam,
                "scoreDifferential": score_diff_home,
                "timeRemaining": request.timeRemaining,
                "quarter": request.quarter,
                "down": request.down,
                "distance": request.distance,
                "possession": request.possession,
                "homeScore": request.homeScore,
                "awayScore": request.awayScore,
                "redZone": bool(red_zone),
                "fourthQuarter": bool(fourth_quarter)
            }
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating Win Probability: {str(e)}")


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
