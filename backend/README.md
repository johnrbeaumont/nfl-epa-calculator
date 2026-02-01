# NFL EPA Calculator - Backend API

FastAPI backend that serves the trained XGBoost EPA model via REST API.

## Features

- **POST /api/calculate** - Calculate EPA for game situations
- **GET /api/health** - Health check and model status
- **GET /docs** - Interactive API documentation (Swagger UI)
- **GET /redoc** - Alternative API documentation (ReDoc)

## Quick Start

### 1. Install Dependencies

```bash
# From project root
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Start the Server

```bash
# From project root
cd backend
uvicorn app.main:app --reload
```

Server will start at: **http://localhost:8000**

### 3. Test the API

Open in browser:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

Or run the test script:
```bash
python test_api.py
```

## API Endpoints

### Calculate EPA

**POST /api/calculate**

Calculate Expected Points Added for a game situation.

**Request Body:**
```json
{
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
```

**Response:**
```json
{
  "epa": 1.23,
  "metadata": {
    "homeTeam": "KC",
    "awayTeam": "SF",
    "down": 3,
    "distance": 5,
    "fieldPosition": "Opponent 28-yard line",
    "redZone": false,
    "homeFieldAdvantage": true,
    "scoreDifferential": 4,
    "possession": "home"
  }
}
```

### Health Check

**GET /api/health**

Check API and model status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_info": {
    "type": "XGBoost Regressor",
    "features": ["down", "ydstogo", "yardline_100", "red_zone", "home_field_advantage"],
    "training_samples": 285657,
    "performance": {
      "mae": 0.23,
      "r2": 0.96,
      "calibration_error": 0.006
    }
  },
  "timestamp": "2025-02-01T10:00:00"
}
```

## Testing with curl

```bash
# Health check
curl http://localhost:8000/api/health

# Calculate EPA
curl -X POST http://localhost:8000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## Input Validation

The API validates all inputs:

- **down**: 1-4
- **distance**: 1-99 yards
- **yardsToGoal**: 1-99 yards
- **homeScore, awayScore**: 0-99 points
- **timeRemaining**: 0-3600 seconds
- **homeTimeouts, awayTimeouts**: 0-3
- **homeTeam ≠ awayTeam**: Must be different

Invalid inputs return 422 Unprocessable Entity with error details.

## Model Information

- **Algorithm**: XGBoost Regressor
- **Features**: down, distance, field position, red zone, home field advantage
- **Training Data**: 285,657 competitive plays (2016-2024)
- **Performance**: MAE 0.23, R² 0.96, Calibration Error 0.006

## Development

### Run with auto-reload
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run tests
```bash
python test_api.py
```

### View logs
The server logs all requests and model loading information to stdout.

## Deployment

See main project README for deployment instructions (Railway, Render, etc.).

## CORS

CORS is enabled for all origins (`*`) in development. For production, update the `allow_origins` in `main.py` to specific domains.

## Next Steps

- Phase 4: Build React frontend to consume this API
- Phase 5: Deploy to production

---

**Status**: Phase 3 - Backend Development ✓
