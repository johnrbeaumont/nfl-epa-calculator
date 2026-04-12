"""
Live NFL Game Data Endpoints

Fetches real-time game data from ESPN's public API and runs EP/WP inference.
"""

import logging
import httpx
import numpy as np
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/live", tags=["Live Games"])

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={}"

SCORE_VALUES = np.array([-6.96, -3.0, -2.0, 0.0, 2.0, 3.0, 6.96])


def _parse_clock_to_secs(clock_str: str) -> int:
    """Convert 'MM:SS' clock string to integer seconds."""
    try:
        parts = str(clock_str).split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 900


def _game_seconds_remaining(period: int, clock_secs: int) -> int:
    """Compute total game seconds remaining from period number + period clock."""
    if period >= 5:  # OT
        return clock_secs
    periods_left = max(0, 4 - period)
    return periods_left * 900 + clock_secs


def _half_secs_remaining(period: int, game_secs: int) -> int:
    if period <= 2:
        return max(0, game_secs - 1800)
    return max(0, game_secs)


def _extract_play_features(play: dict, home_team_ids: set) -> dict | None:
    """
    Extract model feature dict from an ESPN play object.
    Returns None for non-scrimmage plays (kickoffs, punts with no down, etc.)
    """
    start = play.get("start", {})

    down = start.get("down")
    if not down or not (1 <= int(down) <= 4):
        return None

    down = int(down)
    distance = max(1, min(99, int(start.get("distance", 10) or 10)))

    # Prefer yardsToEndzone (= nflfastR yardline_100); fall back to computed value
    yards_to_endzone = start.get("yardsToEndzone")
    if yards_to_endzone is None:
        # Fallback: yardLine in ESPN is absolute field position (e.g. "35" for own 35)
        # Without explicit side info, use yardLine directly as a rough approximation
        yards_to_endzone = int(start.get("yardLine", 50) or 50)

    yards_to_goal = max(1, min(99, int(yards_to_endzone or 50)))

    # ESPN uses start.team.id for possession (not start.possession.id)
    possession_id = str((start.get("team") or {}).get("id", "") or "")
    is_home_offense = 1 if possession_id in home_team_ids else 0

    period_num = int(play.get("period", {}).get("number", 1) or 1)
    clock_str = play.get("clock", {}).get("displayValue", "15:00")
    clock_secs = _parse_clock_to_secs(clock_str)

    is_overtime = 1 if period_num >= 5 else 0
    game_secs = _game_seconds_remaining(period_num, clock_secs)
    half_secs = _half_secs_remaining(period_num, game_secs)

    home_score = int(play.get("homeScore", 0) or 0)
    away_score = int(play.get("awayScore", 0) or 0)

    red_zone = 1 if yards_to_goal <= 20 else 0
    fourth_quarter = 1 if period_num >= 4 else 0
    score_diff_posteam = (home_score - away_score) if is_home_offense else (away_score - home_score)
    score_diff_home = home_score - away_score
    field_position_home = (100 - yards_to_goal) if is_home_offense else yards_to_goal
    is_two_min = 1 if (game_secs <= 120 and period_num in (2, 4)) or is_overtime else 0

    return {
        # EP features
        "down": down,
        "ydstogo": distance,
        "yardline_100": yards_to_goal,
        "red_zone": red_zone,
        "is_home_offense": is_home_offense,
        "score_diff_posteam": score_diff_posteam,
        "game_seconds_remaining": game_secs,
        "half_seconds_remaining": half_secs,
        "is_overtime": is_overtime,
        # WP extra features
        "score_diff_home": score_diff_home,
        "field_position_home": field_position_home,
        "fourth_quarter": fourth_quarter,
        "posteam_timeouts_remaining": 3,
        "defteam_timeouts_remaining": 3,
        "is_two_minute_warning": is_two_min,
        # Pass-through for response (prefixed _ to avoid feature name collisions)
        "_period": period_num,
        "_clock": clock_str,
        "_home_score": home_score,
        "_away_score": away_score,
        "_is_home_offense": is_home_offense,
        "_play_text": str(play.get("text", "") or ""),
        "_play_id": str(play.get("id", "") or ""),
        "_sequence": int(play.get("sequenceNumber", 0) or 0),
        "_scoring_play": bool(play.get("scoringPlay", False)),
    }


@router.get("/scoreboard")
async def live_scoreboard():
    """
    Proxy ESPN's NFL scoreboard. Returns all games (live, upcoming, final).
    Returns an empty list during the off-season.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(ESPN_SCOREBOARD)
            r.raise_for_status()
        data = r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"ESPN API returned {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach ESPN: {e}")

    games = []
    for event in data.get("events", []):
        try:
            comp = event["competitions"][0]
            status = comp["status"]
            status_type = status.get("type", {})
            state_name = status_type.get("name", "")

            competitors = {}
            for c in comp.get("competitors", []):
                competitors[c.get("homeAway", "unknown")] = c

            home = competitors.get("home", {})
            away = competitors.get("away", {})
            home_team = home.get("team", {})
            away_team = away.get("team", {})

            is_live = state_name in (
                "STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_END_PERIOD",
                "STATUS_END_OF_HALF",
            )
            is_final = "FINAL" in state_name

            situation = comp.get("situation") or {}

            games.append({
                "id": event["id"],
                "name": event.get("shortName", ""),
                "home_team": {
                    "id": str(home.get("id", "")),
                    "team_id": str(home_team.get("id", "")),
                    "abbrev": home_team.get("abbreviation", "HOME"),
                    "name": home_team.get("displayName", ""),
                    "color": home_team.get("color", "1a3a5c"),
                    "alt_color": home_team.get("alternateColor", "c9a447"),
                    "score": int(home.get("score", 0) or 0),
                },
                "away_team": {
                    "id": str(away.get("id", "")),
                    "team_id": str(away_team.get("id", "")),
                    "abbrev": away_team.get("abbreviation", "AWAY"),
                    "name": away_team.get("displayName", ""),
                    "color": away_team.get("color", "7a0019"),
                    "alt_color": away_team.get("alternateColor", "ffcc00"),
                    "score": int(away.get("score", 0) or 0),
                },
                "status": {
                    "period": status.get("period", 0),
                    "clock": status.get("displayClock", ""),
                    "detail": status_type.get("shortDetail", status_type.get("detail", "")),
                    "state": state_name,
                    "is_live": is_live,
                    "is_final": is_final,
                    "is_pregame": not is_live and not is_final,
                },
                "situation": {
                    "down": situation.get("down"),
                    "distance": situation.get("distance"),
                    "yards_to_endzone": situation.get("yardsToEndzone"),
                    "is_red_zone": situation.get("isRedZone", False),
                    "possession_team_id": str((situation.get("possession") or {}).get("id", "")),
                    "home_timeouts": situation.get("homeTimeouts"),
                    "away_timeouts": situation.get("awayTimeouts"),
                    "down_distance_text": situation.get("shortDownDistanceText", ""),
                } if situation else None,
            })
        except (KeyError, IndexError, TypeError) as e:
            logger.warning(f"Skipping malformed event {event.get('id')}: {e}")

    return {"games": games, "count": len(games)}


@router.get("/game/{game_id}")
async def live_game_detail(game_id: str, request: Request):
    """
    Fetch full play-by-play for a game, compute EP and WP for each scrimmage play,
    and return structured data for chart rendering.
    """
    ep_model = getattr(request.app.state, "ep_model", None)
    ep_metadata = getattr(request.app.state, "ep_metadata", None)
    wp_model = getattr(request.app.state, "wp_model", None)
    wp_metadata = getattr(request.app.state, "wp_metadata", None)

    if ep_model is None or wp_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    ep_feature_names: list = ep_metadata.get("features", []) if ep_metadata else []
    wp_feature_names: list = wp_metadata.get("features", []) if wp_metadata else []

    if not ep_feature_names or not wp_feature_names:
        raise HTTPException(status_code=503, detail="Model metadata missing")

    # Fetch ESPN game summary
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(ESPN_SUMMARY.format(game_id))
            r.raise_for_status()
        data = r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"ESPN API returned {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach ESPN: {e}")

    # Parse header for team info and game status
    header = data.get("header", {})
    comp = (header.get("competitions") or [{}])[0]
    competitors = {}
    for c in comp.get("competitors", []):
        competitors[c.get("homeAway", "unknown")] = c

    home_comp = competitors.get("home", {})
    away_comp = competitors.get("away", {})
    home_team_data = home_comp.get("team", {})
    away_team_data = away_comp.get("team", {})

    # Collect all IDs that identify the home team (for possession detection).
    # ESPN play start.team.id maps to competitors[].team.id (NOT competitors[].id)
    home_team_ids = {
        str(home_team_data.get("id", "")),
        str(home_comp.get("id", "")),  # also include competitor id as fallback
    } - {""}

    game_status = comp.get("status", {})
    status_type = game_status.get("type", {})
    state_name = status_type.get("name", "")

    home_abbrev = home_team_data.get("abbreviation", "HOME")
    away_abbrev = away_team_data.get("abbreviation", "AWAY")
    home_color = home_team_data.get("color", "1a3a5c")
    away_color = away_team_data.get("color", "7a0019")

    home_score = int(home_comp.get("score", 0) or 0)
    away_score = int(away_comp.get("score", 0) or 0)

    game_info = {
        "home_team": {
            "abbrev": home_abbrev,
            "name": home_team_data.get("displayName", ""),
            "color": home_color,
            "score": home_score,
        },
        "away_team": {
            "abbrev": away_abbrev,
            "name": away_team_data.get("displayName", ""),
            "color": away_color,
            "score": away_score,
        },
        "status": {
            "period": game_status.get("period", 0),
            "clock": game_status.get("displayClock", ""),
            "detail": status_type.get("shortDetail", status_type.get("detail", "")),
            "is_live": state_name in (
                "STATUS_IN_PROGRESS", "STATUS_HALFTIME",
                "STATUS_END_PERIOD", "STATUS_END_OF_HALF",
            ),
            "is_final": "FINAL" in state_name,
        },
    }

    # Collect all plays from drives (previous completed + current)
    raw_plays: list[dict] = []
    drives_data = data.get("drives", {})

    if isinstance(drives_data, dict):
        previous = drives_data.get("previous") or []
        current = drives_data.get("current")
        all_drives = list(previous)
        if current and isinstance(current, dict):
            all_drives.append(current)
    else:
        all_drives = []

    for drive in all_drives:
        for play in drive.get("plays", []):
            raw_plays.append(play)

    # Sort chronologically by sequence number
    raw_plays.sort(key=lambda p: int(p.get("sequenceNumber", 0) or 0))

    # Extract features; skip non-scrimmage plays
    featured_plays = [
        feat for play in raw_plays
        if (feat := _extract_play_features(play, home_team_ids)) is not None
    ]

    if not featured_plays:
        return {**game_info, "plays": []}

    # Build feature matrices in correct column order
    X_ep = np.array([[f[n] for n in ep_feature_names] for f in featured_plays], dtype=float)
    X_wp = np.array([[f[n] for n in wp_feature_names] for f in featured_plays], dtype=float)

    # Batch EP inference: proba shape (N, 7) → EP = proba @ score_values
    ep_proba = ep_model.predict_proba(X_ep)
    ep_values = (ep_proba @ SCORE_VALUES).tolist()

    # Batch WP inference
    if isinstance(wp_model, dict):
        raw_wp = wp_model["base_model"].predict_proba(X_wp)[:, 1]
        wp_values = wp_model["isotonic"].predict(raw_wp).clip(0.0, 1.0).tolist()
    else:
        wp_values = wp_model.predict_proba(X_wp)[:, 1].clip(0.0, 1.0).tolist()

    # Build response plays list
    plays_out = []
    prev_ep: float | None = None
    prev_wp: float | None = None

    for i, feat in enumerate(featured_plays):
        ep = round(ep_values[i], 3)
        wp = round(wp_values[i], 3)
        ep_delta = round(ep - prev_ep, 3) if prev_ep is not None else None
        wp_delta = round(wp - prev_wp, 3) if prev_wp is not None else None

        plays_out.append({
            "play_id": feat["_play_id"],
            "sequence": feat["_sequence"],
            "period": feat["_period"],
            "clock": feat["_clock"],
            "play_text": feat["_play_text"],
            "down": feat["down"],
            "ydstogo": feat["ydstogo"],
            "yardline_100": feat["yardline_100"],
            "home_score": feat["_home_score"],
            "away_score": feat["_away_score"],
            "is_home_offense": bool(feat["_is_home_offense"]),
            "scoring_play": feat["_scoring_play"],
            "ep": ep,
            "wp": wp,
            "ep_delta": ep_delta,
            "wp_delta": wp_delta,
        })

        prev_ep = ep
        prev_wp = wp

    return {**game_info, "plays": plays_out}
