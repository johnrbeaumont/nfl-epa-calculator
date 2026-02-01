"""
NFL EPA Calculator - FastAPI Backend

Serves the trained XGBoost EPA model via REST API.
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
    title="NFL EPA Calculator API",
    description="Calculate Expected Points Added (EPA) for NFL game situations",
    version="1.0.0",
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

# Global variables for model and metadata
model = None
metadata = None
MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "epa_model_xgboost.joblib"
METADATA_PATH = Path(__file__).parent.parent.parent / "models" / "epa_model_metadata.json"


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


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    model_loaded: bool
    model_info: Optional[dict]
    timestamp: str


# Startup event - Load model
@app.on_event("startup")
async def load_model():
    """Load the trained EPA model and metadata on startup"""
    global model, metadata

    try:
        # Load model
        print(f"Loading model from: {MODEL_PATH}")
        model = joblib.load(MODEL_PATH)
        print("✓ Model loaded successfully")

        # Load metadata
        print(f"Loading metadata from: {METADATA_PATH}")
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)
        print("✓ Metadata loaded successfully")

        print(f"\nModel Info:")
        print(f"  Features: {metadata['features']}")
        print(f"  Training samples: {metadata['training_samples']:,}")
        print(f"  Performance: MAE={metadata['performance']['mae']:.4f}, R²={metadata['performance']['r2']:.4f}")

    except Exception as e:
        print(f"✗ Error loading model: {e}")
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
    """Health check endpoint - verify API and model status"""
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "model_loaded": model is not None,
        "model_info": {
            "type": metadata.get("model_type"),
            "features": metadata.get("features"),
            "training_samples": metadata.get("training_samples"),
            "performance": metadata.get("performance")
        } if metadata else None,
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
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

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
        epa_prediction = float(model.predict(features)[0])

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
