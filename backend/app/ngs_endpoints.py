"""
FastAPI endpoints for NFL Next Gen Stats data
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from sqlalchemy import and_
from .database import get_db, NGSPassing, NGSReceiving, NGSRushing, NGSDefense, SeasonalStats
from .ngs_scraper import NGSDataImporter

router = APIRouter(prefix="/api/ngs", tags=["Next Gen Stats"])


# Response Models
class PassingStatsResponse(BaseModel):
    season: int
    season_type: str
    week: int
    player_gsis_id: Optional[str] = None
    player_display_name: Optional[str] = None
    player_position: Optional[str] = None
    team_abbr: Optional[str] = None

    # Key metrics
    avg_time_to_throw: Optional[float] = None
    completion_percentage_above_expectation: Optional[float] = None
    aggressiveness: Optional[float] = None

    # Air yards
    avg_completed_air_yards: Optional[float] = None
    avg_intended_air_yards: Optional[float] = None

    # Production
    attempts: Optional[int] = None
    completions: Optional[int] = None
    completion_percentage: Optional[float] = None
    pass_yards: Optional[int] = None
    pass_touchdowns: Optional[int] = None
    interceptions: Optional[int] = None
    passer_rating: Optional[float] = None

    # Air yards (extended)
    avg_air_yards_to_sticks: Optional[float] = None

    # Seasonal / EPA fields (from SeasonalStats JOIN)
    passing_epa: Optional[float] = None
    epa_per_dropback: Optional[float] = None
    dakota: Optional[float] = None
    pacr: Optional[float] = None
    sacks: Optional[float] = None
    passing_first_downs: Optional[int] = None
    games: Optional[int] = None
    fantasy_points: Optional[float] = None
    fantasy_points_ppr: Optional[float] = None

    class Config:
        from_attributes = True


class ReceivingStatsResponse(BaseModel):
    season: int
    season_type: str
    week: int
    player_gsis_id: Optional[str] = None
    player_display_name: Optional[str] = None
    player_position: Optional[str] = None
    team_abbr: Optional[str] = None

    # Key metrics
    avg_separation: Optional[float] = None
    avg_cushion: Optional[float] = None
    avg_yac_above_expectation: Optional[float] = None

    # Target distribution
    avg_intended_air_yards: Optional[float] = None
    percent_share_of_intended_air_yards: Optional[float] = None

    # Production
    targets: Optional[int] = None
    receptions: Optional[int] = None
    catch_percentage: Optional[float] = None
    yards: Optional[int] = None
    rec_touchdowns: Optional[int] = None
    avg_yac: Optional[float] = None

    # Seasonal / EPA fields (from SeasonalStats JOIN)
    receiving_epa: Optional[float] = None
    epa_per_target: Optional[float] = None
    target_share: Optional[float] = None
    air_yards_share: Optional[float] = None
    wopr_x: Optional[float] = None
    racr: Optional[float] = None
    receiving_first_downs: Optional[int] = None
    games: Optional[int] = None
    fantasy_points: Optional[float] = None
    fantasy_points_ppr: Optional[float] = None

    class Config:
        from_attributes = True


class RushingStatsResponse(BaseModel):
    season: int
    season_type: str
    week: int
    player_gsis_id: Optional[str] = None
    player_display_name: Optional[str] = None
    player_position: Optional[str] = None
    team_abbr: Optional[str] = None

    # Key metrics
    efficiency: Optional[float] = None
    rush_yards_over_expected: Optional[float] = None
    rush_yards_over_expected_per_att: Optional[float] = None

    # Difficulty
    percent_attempts_gte_eight_defenders: Optional[float] = None
    avg_time_to_los: Optional[float] = None

    # Production
    rush_attempts: Optional[int] = None
    rush_yards: Optional[int] = None
    avg_rush_yards: Optional[float] = None
    rush_touchdowns: Optional[int] = None
    expected_rush_yards: Optional[float] = None

    # Seasonal / EPA fields (from SeasonalStats JOIN)
    rushing_epa: Optional[float] = None
    epa_per_carry: Optional[float] = None
    rushing_first_downs: Optional[int] = None
    racr: Optional[float] = None
    games: Optional[int] = None
    fantasy_points: Optional[float] = None
    fantasy_points_ppr: Optional[float] = None

    class Config:
        from_attributes = True


class DefenseStatsResponse(BaseModel):
    season: int
    season_type: str
    week: int
    player_gsis_id: Optional[str] = None
    player_display_name: Optional[str] = None
    player_position: Optional[str] = None
    team_abbr: Optional[str] = None

    # Tackle metrics
    tackles: Optional[int] = None
    tackles_solo: Optional[int] = None
    tackles_combined: Optional[int] = None
    tackles_assists: Optional[int] = None
    tackles_for_loss: Optional[int] = None
    tackles_for_loss_yards: Optional[float] = None

    # Pass rush metrics
    sacks: Optional[float] = None
    sack_yards: Optional[float] = None
    qb_hits: Optional[int] = None
    pressures: Optional[int] = None
    hurries: Optional[int] = None

    # Coverage metrics
    interceptions: Optional[int] = None
    pass_breakups: Optional[int] = None
    targets: Optional[int] = None
    completions_allowed: Optional[int] = None
    completion_pct_allowed: Optional[float] = None
    yards_allowed: Optional[int] = None
    avg_yards_allowed: Optional[float] = None
    touchdowns_allowed: Optional[int] = None

    # Advanced metrics
    avg_time_to_pressure: Optional[float] = None
    passer_rating_allowed: Optional[float] = None

    class Config:
        from_attributes = True


class DatabaseStatsResponse(BaseModel):
    passing: dict
    receiving: dict
    rushing: dict
    refresh_log: dict


class RefreshResponse(BaseModel):
    status: str
    results: dict


def _safe_divide(numerator, denominator):
    """Safely divide, returning None if denominator is zero or None."""
    if numerator is None or not denominator:
        return None
    return numerator / denominator


def _merge_seasonal(ngs_obj, seasonal_obj, stat_type):
    """Merge NGS ORM object with SeasonalStats into a dict, computing derived EPA fields."""
    result = {c.name: getattr(ngs_obj, c.name) for c in ngs_obj.__table__.columns if c.name not in ('id', 'created_at', 'updated_at')}

    if seasonal_obj:
        if stat_type == 'passing':
            result['passing_epa'] = seasonal_obj.passing_epa
            result['dakota'] = seasonal_obj.dakota
            result['pacr'] = seasonal_obj.pacr
            result['sacks'] = seasonal_obj.sacks
            result['passing_first_downs'] = seasonal_obj.passing_first_downs
            result['games'] = seasonal_obj.games
            result['fantasy_points'] = seasonal_obj.fantasy_points
            result['fantasy_points_ppr'] = seasonal_obj.fantasy_points_ppr
            result['epa_per_dropback'] = _safe_divide(seasonal_obj.passing_epa, result.get('attempts'))
        elif stat_type == 'rushing':
            result['rushing_epa'] = seasonal_obj.rushing_epa
            result['rushing_first_downs'] = seasonal_obj.rushing_first_downs
            result['racr'] = seasonal_obj.racr
            result['games'] = seasonal_obj.games
            result['fantasy_points'] = seasonal_obj.fantasy_points
            result['fantasy_points_ppr'] = seasonal_obj.fantasy_points_ppr
            result['epa_per_carry'] = _safe_divide(seasonal_obj.rushing_epa, result.get('rush_attempts'))
        elif stat_type == 'receiving':
            result['receiving_epa'] = seasonal_obj.receiving_epa
            result['target_share'] = seasonal_obj.target_share
            result['air_yards_share'] = seasonal_obj.air_yards_share
            result['wopr_x'] = seasonal_obj.wopr_x
            result['racr'] = seasonal_obj.racr
            result['receiving_first_downs'] = seasonal_obj.receiving_first_downs
            result['games'] = seasonal_obj.games
            result['fantasy_points'] = seasonal_obj.fantasy_points
            result['fantasy_points_ppr'] = seasonal_obj.fantasy_points_ppr
            result['epa_per_target'] = _safe_divide(seasonal_obj.receiving_epa, result.get('targets'))

    return result


# Endpoints
@router.get("/passing", response_model=List[PassingStatsResponse])
def get_passing_stats(
    season: int = Query(..., description="Season year (e.g., 2024)", ge=2016),
    week: Optional[int] = Query(None, description="Week number (0=season aggregate, 1-18=regular, 19+=playoffs)", ge=0),
    player: Optional[str] = Query(None, description="Player name (partial match)"),
    team: Optional[str] = Query(None, description="Team abbreviation (e.g., KC, SF)"),
    min_attempts: Optional[int] = Query(None, description="Minimum pass attempts", ge=0),
    limit: int = Query(100, description="Maximum results to return", ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get NGS passing stats with filters

    Examples:
    - `/api/ngs/passing?season=2024&week=0` - Season aggregates for 2024
    - `/api/ngs/passing?season=2024&week=18` - Week 18 stats
    - `/api/ngs/passing?season=2024&week=0&player=Mahomes` - Patrick Mahomes 2024 season
    - `/api/ngs/passing?season=2024&team=KC` - All KC QBs in 2024
    """
    use_seasonal = (week is None or week == 0)

    if use_seasonal:
        query = db.query(NGSPassing, SeasonalStats).outerjoin(
            SeasonalStats,
            and_(
                NGSPassing.player_gsis_id == SeasonalStats.player_id,
                NGSPassing.season == SeasonalStats.season,
                SeasonalStats.season_type == 'REG'
            )
        )
    else:
        query = db.query(NGSPassing)

    query = query.filter(NGSPassing.season == season)

    if week is not None:
        query = query.filter(NGSPassing.week == week)
    if player:
        query = query.filter(NGSPassing.player_display_name.ilike(f"%{player}%"))
    if team:
        query = query.filter(NGSPassing.team_abbr == team.upper())
    if min_attempts:
        query = query.filter(NGSPassing.attempts >= min_attempts)

    query = query.order_by(NGSPassing.attempts.desc())
    rows = query.limit(limit).all()

    if not rows:
        return []

    if use_seasonal:
        return [_merge_seasonal(ngs, sea, 'passing') for ngs, sea in rows]
    return rows


@router.get("/receiving", response_model=List[ReceivingStatsResponse])
def get_receiving_stats(
    season: int = Query(..., description="Season year", ge=2016),
    week: Optional[int] = Query(None, description="Week number", ge=0),
    player: Optional[str] = Query(None, description="Player name (partial match)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    min_targets: Optional[int] = Query(None, description="Minimum targets", ge=0),
    limit: int = Query(100, description="Maximum results to return", ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get NGS receiving stats with filters

    Examples:
    - `/api/ngs/receiving?season=2024&week=0` - Season aggregates
    - `/api/ngs/receiving?season=2024&player=Chase` - Ja'Marr Chase stats
    - `/api/ngs/receiving?season=2024&team=CIN&min_targets=50` - CIN receivers with 50+ targets
    """
    use_seasonal = (week is None or week == 0)

    if use_seasonal:
        query = db.query(NGSReceiving, SeasonalStats).outerjoin(
            SeasonalStats,
            and_(
                NGSReceiving.player_gsis_id == SeasonalStats.player_id,
                NGSReceiving.season == SeasonalStats.season,
                SeasonalStats.season_type == 'REG'
            )
        )
    else:
        query = db.query(NGSReceiving)

    query = query.filter(NGSReceiving.season == season)

    if week is not None:
        query = query.filter(NGSReceiving.week == week)
    if player:
        query = query.filter(NGSReceiving.player_display_name.ilike(f"%{player}%"))
    if team:
        query = query.filter(NGSReceiving.team_abbr == team.upper())
    if min_targets:
        query = query.filter(NGSReceiving.targets >= min_targets)

    query = query.order_by(NGSReceiving.targets.desc())
    rows = query.limit(limit).all()

    if not rows:
        return []

    if use_seasonal:
        return [_merge_seasonal(ngs, sea, 'receiving') for ngs, sea in rows]
    return rows


@router.get("/rushing", response_model=List[RushingStatsResponse])
def get_rushing_stats(
    season: int = Query(..., description="Season year", ge=2016),
    week: Optional[int] = Query(None, description="Week number", ge=0),
    player: Optional[str] = Query(None, description="Player name (partial match)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    min_attempts: Optional[int] = Query(None, description="Minimum rush attempts", ge=0),
    limit: int = Query(100, description="Maximum results to return", ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get NGS rushing stats with filters

    Examples:
    - `/api/ngs/rushing?season=2024&week=0` - Season aggregates
    - `/api/ngs/rushing?season=2024&player=Barkley` - Saquon Barkley stats
    - `/api/ngs/rushing?season=2024&min_attempts=200` - RBs with 200+ carries
    """
    use_seasonal = (week is None or week == 0)

    if use_seasonal:
        query = db.query(NGSRushing, SeasonalStats).outerjoin(
            SeasonalStats,
            and_(
                NGSRushing.player_gsis_id == SeasonalStats.player_id,
                NGSRushing.season == SeasonalStats.season,
                SeasonalStats.season_type == 'REG'
            )
        )
    else:
        query = db.query(NGSRushing)

    query = query.filter(NGSRushing.season == season)

    if week is not None:
        query = query.filter(NGSRushing.week == week)
    if player:
        query = query.filter(NGSRushing.player_display_name.ilike(f"%{player}%"))
    if team:
        query = query.filter(NGSRushing.team_abbr == team.upper())
    if min_attempts:
        query = query.filter(NGSRushing.rush_attempts >= min_attempts)

    query = query.order_by(NGSRushing.rush_attempts.desc())
    rows = query.limit(limit).all()

    if not rows:
        return []

    if use_seasonal:
        return [_merge_seasonal(ngs, sea, 'rushing') for ngs, sea in rows]
    return rows


@router.get("/defense", response_model=List[DefenseStatsResponse])
def get_defense_stats(
    season: int = Query(..., description="Season year", ge=2016),
    week: Optional[int] = Query(None, description="Week number", ge=0),
    player: Optional[str] = Query(None, description="Player name (partial match)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    position: Optional[str] = Query(None, description="Position (DL, LB, DB)"),
    min_tackles: Optional[int] = Query(None, description="Minimum tackles", ge=0),
    limit: int = Query(100, description="Maximum results to return", ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get NGS defensive stats with filters

    Examples:
    - `/api/ngs/defense?season=2024&week=0` - Season aggregates
    - `/api/ngs/defense?season=2024&player=Parsons` - Micah Parsons stats
    - `/api/ngs/defense?season=2024&position=DL&min_tackles=30` - DL with 30+ tackles
    """
    query = db.query(NGSDefense).filter(NGSDefense.season == season)

    if week is not None:
        query = query.filter(NGSDefense.week == week)
    if player:
        query = query.filter(NGSDefense.player_display_name.ilike(f"%{player}%"))
    if team:
        query = query.filter(NGSDefense.team_abbr == team.upper())
    if position:
        query = query.filter(NGSDefense.player_position == position.upper())
    if min_tackles:
        query = query.filter(NGSDefense.tackles >= min_tackles)

    query = query.order_by(NGSDefense.tackles.desc())

    results = query.limit(limit).all()

    if not results:
        return []

    return results


@router.get("/leaders/{stat_type}")
def get_stat_leaders(
    stat_type: str,
    season: int = Query(..., description="Season year", ge=2016),
    metric: str = Query(..., description="Metric to rank by (e.g., completion_percentage_above_expectation, avg_separation, efficiency)"),
    min_threshold: Optional[int] = Query(None, description="Minimum attempts/targets (filters out low-volume players)"),
    limit: int = Query(10, description="Number of leaders to return", ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get top performers for a specific metric

    Examples:
    - `/api/ngs/leaders/passing?season=2024&metric=completion_percentage_above_expectation&min_threshold=200&limit=10`
    - `/api/ngs/leaders/receiving?season=2024&metric=avg_separation&min_threshold=50`
    - `/api/ngs/leaders/rushing?season=2024&metric=rush_yards_over_expected&min_threshold=100`
    """
    # Map stat type to model and volume column
    model_map = {
        'passing': (NGSPassing, 'attempts'),
        'receiving': (NGSReceiving, 'targets'),
        'rushing': (NGSRushing, 'rush_attempts'),
        'defense': (NGSDefense, 'tackles')
    }

    if stat_type not in model_map:
        raise HTTPException(status_code=400, detail=f"Invalid stat_type. Must be one of: {', '.join(model_map.keys())}")

    model, volume_col = model_map[stat_type]

    # Check if metric exists on model
    if not hasattr(model, metric):
        raise HTTPException(status_code=400, detail=f"Invalid metric '{metric}' for {stat_type}")

    # Build query
    query = db.query(model).filter(
        model.season == season,
        model.week == 0  # Season aggregates only
    )

    # Apply minimum threshold if provided
    if min_threshold:
        query = query.filter(getattr(model, volume_col) >= min_threshold)

    # Order by metric (descending)
    query = query.order_by(getattr(model, metric).desc())

    results = query.limit(limit).all()

    if not results:
        return []

    return results


@router.get("/stats", response_model=DatabaseStatsResponse)
def get_database_stats(db: Session = Depends(get_db)):
    """
    Get current database statistics (row counts, last update times, refresh history)

    Useful for monitoring data freshness and completeness
    """
    importer = NGSDataImporter(db)
    stats = importer.get_database_stats()
    return stats


@router.get("/team-stats")
def get_team_stats(
    season: int = Query(..., description="Season year (e.g., 2024)", ge=2016),
    week: int = Query(..., description="Week number (0=season aggregate, 1-18=regular, 19+=playoffs)", ge=0),
    team: str = Query(..., description="Team abbreviation (e.g., KC, SF)"),
    db: Session = Depends(get_db)
):
    """
    Get aggregated team stats for a specific week

    Returns combined passing, receiving, and rushing stats for the team
    """
    from sqlalchemy import func

    team_upper = team.upper()

    # Passing stats aggregation
    passing_stats = db.query(
        func.sum(NGSPassing.attempts).label('pass_attempts'),
        func.sum(NGSPassing.completions).label('completions'),
        func.sum(NGSPassing.pass_yards).label('pass_yards'),
        func.sum(NGSPassing.pass_touchdowns).label('pass_tds'),
        func.sum(NGSPassing.interceptions).label('interceptions'),
        func.avg(NGSPassing.completion_percentage_above_expectation).label('avg_cpoe'),
        func.avg(NGSPassing.avg_time_to_throw).label('avg_time_to_throw'),
        func.avg(NGSPassing.aggressiveness).label('avg_aggressiveness'),
        func.avg(NGSPassing.passer_rating).label('avg_passer_rating')
    ).filter(
        NGSPassing.season == season,
        NGSPassing.week == week,
        NGSPassing.team_abbr == team_upper
    ).first()

    # Receiving stats aggregation
    receiving_stats = db.query(
        func.sum(NGSReceiving.targets).label('targets'),
        func.sum(NGSReceiving.receptions).label('receptions'),
        func.sum(NGSReceiving.yards).label('rec_yards'),
        func.sum(NGSReceiving.rec_touchdowns).label('rec_tds'),
        func.avg(NGSReceiving.avg_separation).label('avg_separation'),
        func.avg(NGSReceiving.avg_yac_above_expectation).label('avg_yac_plus'),
        func.avg(NGSReceiving.catch_percentage).label('avg_catch_pct')
    ).filter(
        NGSReceiving.season == season,
        NGSReceiving.week == week,
        NGSReceiving.team_abbr == team_upper
    ).first()

    # Rushing stats aggregation
    rushing_stats = db.query(
        func.sum(NGSRushing.rush_attempts).label('rush_attempts'),
        func.sum(NGSRushing.rush_yards).label('rush_yards'),
        func.sum(NGSRushing.rush_touchdowns).label('rush_tds'),
        func.avg(NGSRushing.avg_rush_yards).label('avg_ypc'),
        func.avg(NGSRushing.efficiency).label('avg_efficiency'),
        func.sum(NGSRushing.rush_yards_over_expected).label('total_ryoe'),
        func.avg(NGSRushing.percent_attempts_gte_eight_defenders).label('avg_stacked_box_pct')
    ).filter(
        NGSRushing.season == season,
        NGSRushing.week == week,
        NGSRushing.team_abbr == team_upper
    ).first()

    # Calculate derived stats
    completion_pct = None
    if passing_stats.pass_attempts and passing_stats.completions:
        completion_pct = (passing_stats.completions / passing_stats.pass_attempts) * 100

    catch_pct = None
    if receiving_stats.targets and receiving_stats.receptions:
        catch_pct = (receiving_stats.receptions / receiving_stats.targets) * 100

    total_yards = (passing_stats.pass_yards or 0) + (rushing_stats.rush_yards or 0)
    total_tds = (passing_stats.pass_tds or 0) + (rushing_stats.rush_tds or 0) + (receiving_stats.rec_tds or 0)

    return {
        "team": team_upper,
        "season": season,
        "week": week,
        "passing": {
            "attempts": passing_stats.pass_attempts or 0,
            "completions": passing_stats.completions or 0,
            "completion_pct": round(completion_pct, 1) if completion_pct else None,
            "yards": passing_stats.pass_yards or 0,
            "touchdowns": passing_stats.pass_tds or 0,
            "interceptions": passing_stats.interceptions or 0,
            "avg_cpoe": round(passing_stats.avg_cpoe, 2) if passing_stats.avg_cpoe else None,
            "avg_time_to_throw": round(passing_stats.avg_time_to_throw, 2) if passing_stats.avg_time_to_throw else None,
            "avg_aggressiveness": round(passing_stats.avg_aggressiveness, 1) if passing_stats.avg_aggressiveness else None,
            "avg_passer_rating": round(passing_stats.avg_passer_rating, 1) if passing_stats.avg_passer_rating else None
        },
        "receiving": {
            "targets": receiving_stats.targets or 0,
            "receptions": receiving_stats.receptions or 0,
            "catch_pct": round(catch_pct, 1) if catch_pct else None,
            "yards": receiving_stats.rec_yards or 0,
            "touchdowns": receiving_stats.rec_tds or 0,
            "avg_separation": round(receiving_stats.avg_separation, 2) if receiving_stats.avg_separation else None,
            "avg_yac_plus": round(receiving_stats.avg_yac_plus, 2) if receiving_stats.avg_yac_plus else None
        },
        "rushing": {
            "attempts": rushing_stats.rush_attempts or 0,
            "yards": rushing_stats.rush_yards or 0,
            "touchdowns": rushing_stats.rush_tds or 0,
            "avg_ypc": round(rushing_stats.avg_ypc, 2) if rushing_stats.avg_ypc else None,
            "avg_efficiency": round(rushing_stats.avg_efficiency, 2) if rushing_stats.avg_efficiency else None,
            "total_ryoe": round(rushing_stats.total_ryoe, 0) if rushing_stats.total_ryoe else None,
            "avg_stacked_box_pct": round(rushing_stats.avg_stacked_box_pct, 1) if rushing_stats.avg_stacked_box_pct else None
        },
        "total": {
            "yards": total_yards,
            "touchdowns": total_tds
        }
    }


@router.get("/refresh-history")
def get_refresh_history(
    limit: int = Query(10, description="Number of recent refreshes to return", ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get recent refresh history with status and row counts

    Useful for debugging and monitoring the data pipeline
    """
    importer = NGSDataImporter(db)
    history = importer.get_refresh_history(limit=limit)
    return {"history": history}


@router.post("/refresh", response_model=RefreshResponse)
def trigger_refresh(
    mode: str = Query("incremental", pattern="^(incremental|full)$", description="Refresh mode"),
    season: Optional[int] = Query(None, description="Specific season for incremental refresh"),
    db: Session = Depends(get_db)
):
    """
    Manually trigger data refresh (admin endpoint)

    - `mode=incremental` - Update current season only (default)
    - `mode=full` - Update all years from 2016 to present

    Note: Full refresh can take 1-2 minutes
    """
    try:
        importer = NGSDataImporter(db)

        if mode == "full":
            results = importer.full_refresh()
        else:
            results = importer.incremental_refresh(season=season)

        return {"status": "success", "results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")
