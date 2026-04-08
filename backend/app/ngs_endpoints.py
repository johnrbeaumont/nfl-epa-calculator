"""
FastAPI endpoints for NFL Next Gen Stats data
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

from sqlalchemy import and_, text
from .database import get_db, NGSPassing, NGSReceiving, NGSRushing, NGSDefense, SeasonalStats, Plays
from .ngs_scraper import NGSDataImporter

router = APIRouter(prefix="/api/ngs", tags=["Next Gen Stats"])

# In-memory headshot cache: gsis_id -> headshot_url
_headshot_cache: Optional[Dict[str, str]] = None


def _load_headshots() -> Dict[str, str]:
    global _headshot_cache
    if _headshot_cache is not None:
        return _headshot_cache
    try:
        import nfl_data_py as nfl
        import warnings
        warnings.filterwarnings('ignore')
        df = nfl.import_players()
        cache = {}
        for _, row in df[['gsis_id', 'headshot']].dropna(subset=['gsis_id', 'headshot']).iterrows():
            gsis = str(row['gsis_id']).strip()
            url = str(row['headshot']).strip()
            if gsis and url and url.startswith('http'):
                cache[gsis] = url
        _headshot_cache = cache
    except Exception:
        _headshot_cache = {}
    return _headshot_cache


# Response Models
class PassingStatsResponse(BaseModel):
    season: int
    season_type: str
    week: int
    player_gsis_id: Optional[str] = None
    player_display_name: Optional[str] = None
    player_position: Optional[str] = None
    team_abbr: Optional[str] = None
    opponent_team: Optional[str] = None

    # PBP-enriched per-game fields
    game_id: Optional[str] = None
    home_away: Optional[str] = None
    game_result: Optional[str] = None
    dropbacks: Optional[int] = None
    deep_pass_pct: Optional[float] = None
    qb_hit_pct: Optional[float] = None
    play_action_pct: Optional[float] = None
    blitz_pct: Optional[float] = None

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
    opponent_team: Optional[str] = None

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
    opponent_team: Optional[str] = None

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

    # Turnover metrics
    forced_fumbles: Optional[int] = None

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


DEFENSE_POS_GROUPS = {
    'DL': ['DE', 'DT', 'NT', 'RDE', 'LDE', 'LE', 'RE', 'DL'],
    'LB': ['LB', 'MLB', 'ILB', 'OLB', 'LOLB', 'ROLB', 'SLB', 'WLB'],
    'DB': ['CB', 'S', 'SS', 'FS', 'DB', 'SAF', 'NCB', 'RCB', 'LCB'],
}


@router.get("/defense", response_model=List[DefenseStatsResponse])
def get_defense_stats(
    season: int = Query(..., description="Season year", ge=2016),
    week: Optional[int] = Query(None, description="Week number", ge=0),
    player: Optional[str] = Query(None, description="Player name (partial match)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    position: Optional[str] = Query(None, description="Position group: DL, LB, or DB"),
    min_tackles: Optional[int] = Query(None, description="Minimum tackles", ge=0),
    limit: int = Query(100, description="Maximum results to return", ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get defensive player stats aggregated from play-by-play data.

    Examples:
    - `/api/ngs/defense?season=2024&week=0` - All defenders season aggregates
    - `/api/ngs/defense?season=2024&position=DL` - D-line leaders
    - `/api/ngs/defense?season=2024&position=DB&min_tackles=20` - DBs with 20+ tackles
    """
    query = db.query(NGSDefense).filter(NGSDefense.season == season)

    if week is not None:
        query = query.filter(NGSDefense.week == week)
    else:
        query = query.filter(NGSDefense.week == 0)  # default to season aggregates

    if player:
        query = query.filter(NGSDefense.player_display_name.ilike(f"%{player}%"))
    if team:
        query = query.filter(NGSDefense.team_abbr == team.upper())
    if position:
        pos_upper = position.upper()
        pos_list = DEFENSE_POS_GROUPS.get(pos_upper, [pos_upper])
        query = query.filter(NGSDefense.player_position.in_(pos_list))
    if min_tackles:
        query = query.filter(NGSDefense.tackles >= min_tackles)

    # Sort: DL by sacks, DB by interceptions+PBU, LB by tackles
    if position and position.upper() == 'DL':
        query = query.order_by(NGSDefense.sacks.desc().nullslast(), NGSDefense.tackles.desc().nullslast())
    elif position and position.upper() == 'DB':
        query = query.order_by(NGSDefense.interceptions.desc().nullslast(), NGSDefense.pass_breakups.desc().nullslast())
    else:
        query = query.order_by(NGSDefense.tackles.desc().nullslast())

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


@router.get("/game-summary/{game_id}")
def get_game_summary(
    game_id: str,
    db: Session = Depends(get_db),
):
    """
    Return a full game box score + WP chart data computed from play-by-play.
    Includes passing, rushing, receiving lines for each player in the game,
    plus play-by-play WP data for charting.
    """
    from sqlalchemy import func as sqlfunc
    import re

    plays = db.query(Plays).filter(Plays.game_id == game_id).order_by(
        Plays.qtr, Plays.quarter_seconds_remaining.desc()
    ).all()

    if not plays:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"No plays found for game_id={game_id}")

    # Meta
    first = plays[0]
    home_team = first.home_team
    away_team = first.away_team
    # Final score: max scores
    home_score = max((p.home_score or 0 for p in plays), default=0)
    away_score = max((p.away_score or 0 for p in plays), default=0)

    # WP chart: one point per play with computed time remaining and home_wp
    wp_data = []
    for p in plays:
        if p.game_seconds_remaining is None:
            continue
        home_wp_val = p.home_wp
        # If home_wp not stored, skip (will be populated after re-download)
        if home_wp_val is None:
            continue
        wp_data.append({
            "game_seconds_remaining": p.game_seconds_remaining,
            "qtr": p.qtr,
            "home_wp": round(float(home_wp_val) * 100, 1),
            "away_wp": round((1 - float(home_wp_val)) * 100, 1),
            "desc": (p.desc or '')[:80],
        })

    def compute_passer_rating(att, cmp, yds, tds, ints):
        if not att: return None
        a = min(max(((cmp / att) - 0.3) * 5, 0), 2.375)
        b = min(max(((yds / att) - 3) * 0.25, 0), 2.375)
        c = min(max((tds / att) * 20, 0), 2.375)
        d = min(max(2.375 - ((ints / att) * 25), 0), 2.375)
        return round(((a + b + c + d) / 6) * 100, 1)

    # Passing box score per team
    def passing_lines(team):
        passers = {}
        for p in plays:
            if p.posteam != team or not p.passer_player_name:
                continue
            name = p.passer_player_name
            if name not in passers:
                passers[name] = {'name': name, 'att': 0, 'cmp': 0, 'yds': 0, 'tds': 0, 'ints': 0, 'air': 0}
            r = passers[name]
            if p.pass_attempt == 1:
                r['att'] += 1
                if p.complete_pass == 1:
                    r['cmp'] += 1
                    r['yds'] += (p.yards_gained or 0)
                    if p.air_yards is not None:
                        r['air'] += p.air_yards
            if p.touchdown == 1 and p.pass_attempt == 1:
                r['tds'] += 1
            if p.interception == 1:
                r['ints'] += 1
        lines = []
        for r in passers.values():
            ypa = round(r['yds'] / r['att'], 1) if r['att'] else 0
            rating = compute_passer_rating(r['att'], r['cmp'], r['yds'], r['tds'], r['ints'])
            lines.append({
                'name': r['name'],
                'cp_att': f"{r['cmp']}/{r['att']}",
                'yds': r['yds'],
                'td_int': f"{r['tds']}-{r['ints']}",
                'cmp_pct': round(r['cmp'] / r['att'] * 100, 1) if r['att'] else 0,
                'rating': rating,
                'yds_att': ypa,
            })
        return sorted(lines, key=lambda x: x['yds'], reverse=True)

    def rushing_lines(team):
        rushers = {}
        for p in plays:
            if p.posteam != team or not p.rusher_player_name:
                continue
            name = p.rusher_player_name
            if name not in rushers:
                rushers[name] = {'name': name, 'pos': 'RB', 'att': 0, 'yds': 0, 'tds': 0, 'long': 0}
            r = rushers[name]
            if p.rush_attempt == 1:
                r['att'] += 1
                gained = p.yards_gained or 0
                r['yds'] += gained
                if gained > r['long']:
                    r['long'] = gained
            if p.touchdown == 1 and p.rush_attempt == 1:
                r['tds'] += 1
        lines = []
        for r in rushers.values():
            ypc = round(r['yds'] / r['att'], 1) if r['att'] else 0
            lines.append({
                'name': r['name'],
                'pos': r['pos'],
                'att': r['att'],
                'yds': r['yds'],
                'tds': r['tds'],
                'ypc': ypc,
                'long': r['long'],
            })
        return sorted(lines, key=lambda x: x['yds'], reverse=True)

    def receiving_lines(team):
        receivers = {}
        for p in plays:
            if p.posteam != team or not p.receiver_player_name:
                continue
            if p.pass_attempt != 1:
                continue
            name = p.receiver_player_name
            if name not in receivers:
                receivers[name] = {'name': name, 'pos': 'WR', 'tgt': 0, 'rec': 0, 'yds': 0, 'tds': 0, 'long': 0, 'yac': 0.0}
            r = receivers[name]
            r['tgt'] += 1
            if p.complete_pass == 1:
                r['rec'] += 1
                gained = p.yards_gained or 0
                r['yds'] += gained
                if gained > r['long']:
                    r['long'] = gained
                if p.yards_after_catch:
                    r['yac'] += p.yards_after_catch
            if p.touchdown == 1:
                r['tds'] += 1
        lines = []
        for r in receivers.values():
            ypr = round(r['yds'] / r['rec'], 1) if r['rec'] else 0
            avg_yac = round(r['yac'] / r['rec'], 1) if r['rec'] else 0
            lines.append({
                'name': r['name'],
                'pos': r['pos'],
                'tgt': r['tgt'],
                'rec': r['rec'],
                'yds': r['yds'],
                'tds': r['tds'],
                'yds_rec': ypr,
                'long': r['long'],
                'yac': avg_yac,
            })
        return sorted(lines, key=lambda x: x['yds'], reverse=True)

    # Last 5 plays
    last_plays = []
    for p in reversed(plays[-8:]):
        if not p.desc:
            continue
        last_plays.append({
            'team': p.posteam,
            'qtr': p.qtr,
            'down': p.down,
            'ydstogo': p.ydstogo,
            'desc': p.desc,
        })
    last_plays = last_plays[:5]

    return {
        'game_id': game_id,
        'home_team': home_team,
        'away_team': away_team,
        'home_score': home_score,
        'away_score': away_score,
        'total_plays': len(plays),
        'wp_chart': wp_data,
        'home': {
            'passing': passing_lines(home_team),
            'rushing': rushing_lines(home_team),
            'receiving': receiving_lines(home_team),
        },
        'away': {
            'passing': passing_lines(away_team),
            'rushing': rushing_lines(away_team),
            'receiving': receiving_lines(away_team),
        },
        'last_plays': last_plays,
    }


class PlayResponse(BaseModel):
    play_id: Optional[int] = None
    game_id: Optional[str] = None
    season: Optional[int] = None
    week: Optional[int] = None
    qtr: Optional[int] = None
    quarter_seconds_remaining: Optional[int] = None
    game_seconds_remaining: Optional[int] = None
    posteam: Optional[str] = None
    defteam: Optional[str] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    down: Optional[int] = None
    ydstogo: Optional[int] = None
    yardline_100: Optional[int] = None
    play_type: Optional[str] = None
    desc: Optional[str] = None
    yards_gained: Optional[int] = None
    touchdown: Optional[int] = None
    first_down: Optional[int] = None
    pass_attempt: Optional[int] = None
    complete_pass: Optional[int] = None
    incomplete_pass: Optional[int] = None
    air_yards: Optional[float] = None
    yards_after_catch: Optional[float] = None
    pass_length: Optional[str] = None
    pass_location: Optional[str] = None
    sack: Optional[int] = None
    qb_hit: Optional[int] = None
    qb_scramble: Optional[int] = None
    interception: Optional[int] = None
    rush_attempt: Optional[int] = None
    fumble: Optional[int] = None
    fumble_lost: Optional[int] = None
    penalty: Optional[int] = None
    penalty_yards: Optional[int] = None
    play_action: Optional[int] = None
    shotgun: Optional[int] = None
    no_huddle: Optional[int] = None
    passer_player_id: Optional[str] = None
    passer_player_name: Optional[str] = None
    receiver_player_id: Optional[str] = None
    receiver_player_name: Optional[str] = None
    rusher_player_id: Optional[str] = None
    rusher_player_name: Optional[str] = None
    epa: Optional[float] = None
    wpa: Optional[float] = None
    cpoe: Optional[float] = None
    number_of_pass_rushers: Optional[int] = None
    defenders_in_box: Optional[int] = None

    class Config:
        from_attributes = True


@router.get("/league-team-stats")
def get_league_team_stats(
    season: int = Query(..., description="Season year (e.g., 2024)", ge=2016),
    side: str = Query("offense", description="'offense' or 'defense'"),
    week: int = Query(0, description="Week (0 = season aggregate)", ge=0),
    db: Session = Depends(get_db),
):
    """
    Return aggregated stats for all 32 teams, ranked for leaderboard display.
    Merges NGS tracking data with PBP-derived EPA, yards, scoring, and situational stats.
    """
    from sqlalchemy import func

    NFL_TEAMS = [
        'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
        'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
        'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
        'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
    ]

    def r1(v): return round(float(v), 1) if v is not None else None
    def r2(v): return round(float(v), 2) if v is not None else None
    def r3(v): return round(float(v), 3) if v is not None else None
    def ri(v): return int(v) if v is not None else None

    def passer_rating(cmp, att, yds, tds, ints):
        if not att:
            return None
        a = max(0.0, min(2.375, (cmp / att - 0.3) / 0.2))
        b = max(0.0, min(2.375, (yds / att - 3.0) / 4.0))
        c = max(0.0, min(2.375, (tds / att) / 0.05))
        d = max(0.0, min(2.375, (0.095 - ints / att) / 0.04))
        return round((a + b + c + d) / 6.0 * 100.0, 1)

    week_filter = "AND week = :week" if week > 0 else ""

    # ── PBP offense aggregation ───────────────────────────────────────────────
    off_pbp_sql = text(f"""
        SELECT
            posteam                                                                AS team,
            COUNT(DISTINCT game_id)                                                AS gp,
            ROUND(AVG(CASE WHEN (pass_attempt=1 OR rush_attempt=1) AND epa IS NOT NULL THEN epa END), 3) AS epa_per_play,
            ROUND(AVG(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 AND epa IS NOT NULL THEN epa END), 3) AS epa_per_pass,
            ROUND(AVG(CASE WHEN rush_attempt=1 AND epa IS NOT NULL THEN epa END), 3)                       AS epa_per_rush,
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN 1 ELSE 0 END)                        AS pass_att,
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN COALESCE(complete_pass,0) ELSE 0 END) AS completions,
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN COALESCE(yards_gained,0) ELSE 0 END)  AS pass_yds,
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN COALESCE(touchdown,0) ELSE 0 END)     AS pass_tds,
            SUM(CASE WHEN pass_attempt=1 THEN COALESCE(interception,0) ELSE 0 END)                         AS ints,
            SUM(CASE WHEN COALESCE(sack,0)=1 THEN 1 ELSE 0 END)                                           AS sacks_taken,
            SUM(CASE WHEN rush_attempt=1 THEN 1 ELSE 0 END)                                               AS rush_att,
            SUM(CASE WHEN rush_attempt=1 THEN COALESCE(yards_gained,0) ELSE 0 END)                        AS rush_yds,
            SUM(CASE WHEN rush_attempt=1 THEN COALESCE(touchdown,0) ELSE 0 END)                           AS rush_tds,
            SUM(CASE WHEN rush_attempt=1 AND COALESCE(first_down,0)=1 THEN 1 ELSE 0 END)                  AS rush_first_dns,
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(first_down,0)=1 THEN 1 ELSE 0 END)                  AS pass_first_dns,
            SUM(CASE WHEN COALESCE(complete_pass,0)=1 AND air_yards IS NOT NULL THEN air_yards ELSE 0 END) AS cay_total,
            -- Blitz: FTN n_blitzers >= 1 = any blitz; fall back to nflfastR 5+ rushers
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 AND (
                    CASE WHEN ftn_blitzers IS NOT NULL THEN ftn_blitzers >= 1
                         ELSE COALESCE(number_of_pass_rushers,0) >= 5 END
                ) THEN 1 ELSE 0 END)                                                                       AS blitz_faced,
            SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 AND
                    (ftn_blitzers IS NOT NULL OR number_of_pass_rushers IS NOT NULL) THEN 1 ELSE 0 END)    AS pass_with_rushers,
            -- Play action: use FTN when available (nflfastR column is empty)
            SUM(CASE WHEN COALESCE(ftn_play_action, COALESCE(play_action,0))=1 THEN 1 ELSE 0 END)         AS play_action_plays,
            SUM(CASE WHEN COALESCE(ftn_is_rpo,0)=1 THEN 1 ELSE 0 END)                                    AS rpo_plays,
            SUM(CASE WHEN pass_attempt=1 THEN 1 ELSE 0 END)                                               AS total_dropbacks
        FROM plays
        WHERE season = :season AND season_type = 'REG' AND posteam IS NOT NULL
        {week_filter}
        GROUP BY posteam
    """)

    ppg_sql = text(f"""
        SELECT posteam AS team, ROUND(AVG(team_score), 1) AS ppg
        FROM (
            SELECT game_id, posteam,
                   MAX(CASE WHEN home_team=posteam THEN home_score ELSE away_score END) AS team_score
            FROM plays
            WHERE season = :season AND season_type = 'REG' AND posteam IS NOT NULL
            {week_filter}
            GROUP BY game_id, posteam
        )
        GROUP BY posteam
    """)

    params = {"season": season, "week": week} if week > 0 else {"season": season}
    off_pbp = {r.team: r for r in db.execute(off_pbp_sql, params).fetchall()}
    ppg_map = {r.team: float(r.ppg) for r in db.execute(ppg_sql, params).fetchall()}

    if side == "offense":
        # ── NGS Passing ───────────────────────────────────────────────────────
        # NGS tracking comes from week=0 (season agg); PFR data is per-week, aggregate from week>=1
        pass_ngs_q = db.query(
            NGSPassing.team_abbr,
            func.avg(NGSPassing.avg_time_to_throw).label('ttt'),
            func.avg(NGSPassing.completion_percentage_above_expectation).label('cpoe'),
            func.avg(NGSPassing.aggressiveness).label('aggr'),
            func.avg(NGSPassing.avg_intended_air_yards).label('iay'),
            func.avg(NGSPassing.avg_completed_air_yards).label('cay'),
        ).filter(NGSPassing.season == season, NGSPassing.week == week).group_by(NGSPassing.team_abbr).all()
        pass_map = {r.team_abbr: r for r in pass_ngs_q}

        # PFR data: for week=0, aggregate all weekly rows; for specific week, just that week
        pfr_pass_filter = (NGSPassing.week >= 1) if week == 0 else (NGSPassing.week == week)
        pass_pfr_q = db.query(
            NGSPassing.team_abbr,
            func.sum(NGSPassing.times_pressured).label('times_pressured'),
            func.sum(NGSPassing.times_hurried).label('times_hurried'),
            func.sum(NGSPassing.times_hit_pfr).label('times_hit'),
            func.sum(NGSPassing.times_blitzed).label('times_blitzed'),
            func.avg(NGSPassing.pressure_pct).label('pressure_pct'),
            func.sum(NGSPassing.passing_drops).label('passing_drops'),
            func.avg(NGSPassing.bad_throw_pct).label('bad_throw_pct'),
        ).filter(NGSPassing.season == season, pfr_pass_filter).group_by(NGSPassing.team_abbr).all()
        pfr_pass_map = {r.team_abbr: r for r in pass_pfr_q}

        # ── NGS Rushing ───────────────────────────────────────────────────────
        rush_ngs_q = db.query(
            NGSRushing.team_abbr,
            func.avg(NGSRushing.efficiency).label('eff'),
            func.sum(NGSRushing.rush_yards_over_expected).label('ryoe'),
            func.avg(NGSRushing.rush_yards_over_expected_per_att).label('ryoe_per_att'),
            func.avg(NGSRushing.percent_attempts_gte_eight_defenders).label('stacked_pct'),
            func.avg(NGSRushing.avg_time_to_los).label('ttlos'),
        ).filter(NGSRushing.season == season, NGSRushing.week == week).group_by(NGSRushing.team_abbr).all()
        rush_map = {r.team_abbr: r for r in rush_ngs_q}

        pfr_rush_filter = (NGSRushing.week >= 1) if week == 0 else (NGSRushing.week == week)
        rush_pfr_q = db.query(
            NGSRushing.team_abbr,
            func.sum(NGSRushing.rushing_broken_tackles).label('broken_tackles'),
            func.avg(NGSRushing.rushing_yards_before_contact).label('ybc'),
            func.avg(NGSRushing.rushing_yards_after_contact).label('yac'),
        ).filter(NGSRushing.season == season, pfr_rush_filter).group_by(NGSRushing.team_abbr).all()
        pfr_rush_map = {r.team_abbr: r for r in rush_pfr_q}

        # ── NGS Receiving ─────────────────────────────────────────────────────
        rec_rows = db.query(
            NGSReceiving.team_abbr,
            func.avg(NGSReceiving.avg_separation).label('avg_sep'),
            func.avg(NGSReceiving.avg_yac).label('avg_yac'),
            func.avg(NGSReceiving.avg_yac_above_expectation).label('yac_plus'),
            func.avg(NGSReceiving.avg_intended_air_yards).label('adot'),
        ).filter(NGSReceiving.season == season, NGSReceiving.week == week).group_by(NGSReceiving.team_abbr).all()
        rec_map = {r.team_abbr: r for r in rec_rows}

        results = []
        for team in NFL_TEAMS:
            pbp  = off_pbp.get(team)
            p    = pass_map.get(team)
            pp   = pfr_pass_map.get(team)
            r    = rush_map.get(team)
            pr   = pfr_rush_map.get(team)
            rec  = rec_map.get(team)
            if pbp is None and p is None and r is None:
                continue

            gp = int(pbp.gp) if pbp else None
            pass_att  = int(pbp.pass_att or 0) if pbp else 0
            rush_att  = int(pbp.rush_att or 0) if pbp else 0
            total_plays = pass_att + rush_att
            pass_pct  = round(pass_att / total_plays * 100, 1) if total_plays else None

            pass_yds  = int(pbp.pass_yds or 0) if pbp else 0
            rush_yds  = int(pbp.rush_yds or 0) if pbp else 0
            total_yds = pass_yds + rush_yds

            pass_tds  = int(pbp.pass_tds or 0) if pbp else 0
            rush_tds  = int(pbp.rush_tds or 0) if pbp else 0
            total_tds = pass_tds + rush_tds

            completions = int(pbp.completions or 0) if pbp else 0
            comp_pct    = round(completions / pass_att * 100, 1) if pass_att else None

            rating = passer_rating(
                completions, pass_att, pass_yds,
                int(pbp.pass_tds or 0) if pbp else 0,
                int(pbp.ints or 0) if pbp else 0,
            ) if pbp else None

            cay_total = float(pbp.cay_total or 0) if pbp else None
            cay_per_cmp = round(cay_total / completions, 1) if (cay_total and completions) else None

            blitz_faced = int(pbp.blitz_faced or 0) if pbp else 0
            pass_with_rushers = int(pbp.pass_with_rushers or 0) if pbp else 0
            blitz_pct = round(blitz_faced / pass_with_rushers * 100, 1) if pass_with_rushers else None

            play_action_plays = int(pbp.play_action_plays or 0) if pbp else 0
            dropbacks = int(pbp.total_dropbacks or 0) if pbp else 0
            play_action_pct = round(play_action_plays / dropbacks * 100, 1) if dropbacks else None

            sacks_taken = int(pbp.sacks_taken or 0) if pbp else 0
            rush_1st = int(pbp.rush_first_dns or 0) if pbp else None
            pass_1st = int(pbp.pass_first_dns or 0) if pbp else None
            rpo_plays = int(pbp.rpo_plays or 0) if pbp else 0
            rpo_pct = round(rpo_plays / dropbacks * 100, 1) if dropbacks else None

            # PFR pressure data (from pfr_pass_map, 2018+)
            times_pressured = ri(pp.times_pressured) if pp else None
            pressure_pct    = pp.pressure_pct if pp else None
            times_hurried   = ri(pp.times_hurried) if pp else None
            times_blitzed   = ri(pp.times_blitzed) if pp else None
            passing_drops   = ri(pp.passing_drops) if pp else None
            bad_throw_pct   = pp.bad_throw_pct if pp else None

            # PFR broken tackle data (from pfr_rush_map, 2018+)
            broken_tackles  = ri(pr.broken_tackles) if pr else None
            ybc             = r1(pr.ybc) if pr else None
            rush_yac        = r1(pr.yac) if pr else None

            results.append({
                "team": team,
                "season": season,
                "gp": gp,
                # Volume
                "total_plays": total_plays,
                "pass_plays": pass_att,
                "rush_plays": rush_att,
                "pass_pct": pass_pct,
                # Scoring
                "ppg": ppg_map.get(team),
                "ypg": round(total_yds / gp, 1) if (total_yds and gp) else None,
                "ypp": round(total_yds / total_plays, 1) if total_plays else None,
                "total_tds": total_tds,
                # EPA
                "epa_per_play": r3(pbp.epa_per_play) if pbp else None,
                "epa_per_pass": r3(pbp.epa_per_pass) if pbp else None,
                "epa_per_rush": r3(pbp.epa_per_rush) if pbp else None,
                # Passing
                "completions": completions,
                "pass_att": pass_att,
                "comp_pct": comp_pct,
                "pass_yards": pass_yds,
                "pass_ypg": round(pass_yds / gp, 1) if (pass_yds and gp) else None,
                "pass_ypp": round(pass_yds / pass_att, 1) if pass_att else None,
                "pass_tds": pass_tds,
                "interceptions": int(pbp.ints or 0) if pbp else None,
                "passer_rating": rating,
                "sacks_taken": sacks_taken,
                "pass_first_downs": pass_1st,
                "cay": r1(cay_total),
                "cay_per_cmp": cay_per_cmp,
                # PFR pressure data (2018+)
                "times_pressured": times_pressured,
                "pressure_pct": r1(pressure_pct * 100) if pressure_pct else None,
                "times_hurried": times_hurried,
                "times_blitzed": times_blitzed,
                "passing_drops": passing_drops,
                "bad_throw_pct": r1(bad_throw_pct * 100) if bad_throw_pct else None,
                # NGS Passing tracking
                "ttt": r2(p.ttt) if p else None,
                "cpoe": r1(p.cpoe) if p else None,
                "aggr": r1(p.aggr) if p else None,
                "iay": r1(p.iay) if p else None,
                # Rushing
                "rush_att": rush_att,
                "rush_yards": rush_yds,
                "rush_ypg": round(rush_yds / gp, 1) if (rush_yds and gp) else None,
                "rush_ypp": round(rush_yds / rush_att, 1) if rush_att else None,
                "rush_tds": rush_tds,
                "rush_first_downs": rush_1st,
                # PFR rushing data (2018+)
                "broken_tackles": broken_tackles,
                "yards_before_contact": ybc,
                "yards_after_contact": rush_yac,
                # NGS Rushing tracking
                "eff": r2(r.eff) if r else None,
                "ryoe": round(float(r.ryoe), 0) if (r and r.ryoe) else None,
                "ryoe_per_att": r2(r.ryoe_per_att) if r else None,
                "stacked_pct": r1(r.stacked_pct) if r else None,
                "ttlos": r2(r.ttlos) if r else None,
                # Situational (FTN 2022+)
                "blitz_pct": blitz_pct,
                "play_action_pct": play_action_pct,
                "rpo_pct": rpo_pct,
                # NGS Receiving tracking
                "avg_sep": r1(rec.avg_sep) if rec else None,
                "avg_yac": r1(rec.avg_yac) if rec else None,
                "yac_plus": r2(rec.yac_plus) if rec else None,
                "adot": r1(rec.adot) if rec else None,
            })

        results.sort(key=lambda x: x.get('epa_per_play') or -99, reverse=True)
        return results

    else:  # defense
        # ── PBP defense aggregation ───────────────────────────────────────────
        def_pbp_sql = text(f"""
            SELECT
                defteam                                                                    AS team,
                COUNT(DISTINCT game_id)                                                    AS gp,
                ROUND(AVG(CASE WHEN (pass_attempt=1 OR rush_attempt=1) AND epa IS NOT NULL THEN epa END), 3) AS epa_per_play_allowed,
                ROUND(AVG(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 AND epa IS NOT NULL THEN epa END), 3) AS epa_per_pass_allowed,
                ROUND(AVG(CASE WHEN rush_attempt=1 AND epa IS NOT NULL THEN epa END), 3)                       AS epa_per_rush_allowed,
                SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN COALESCE(yards_gained,0) ELSE 0 END) AS pass_yds_allowed,
                SUM(CASE WHEN rush_attempt=1 THEN COALESCE(yards_gained,0) ELSE 0 END)                        AS rush_yds_allowed,
                SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN 1 ELSE 0 END)                        AS pass_att_against,
                SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN COALESCE(complete_pass,0) ELSE 0 END) AS pass_cmp_against,
                SUM(CASE WHEN pass_attempt=1 AND COALESCE(sack,0)=0 THEN COALESCE(touchdown,0) ELSE 0 END)     AS pass_td_against,
                SUM(CASE WHEN pass_attempt=1 THEN COALESCE(interception,0) ELSE 0 END)                         AS ints_forced,
                SUM(CASE WHEN rush_attempt=1 THEN 1 ELSE 0 END)                                               AS rush_att_against,
                SUM(CASE WHEN rush_attempt=1 THEN COALESCE(touchdown,0) ELSE 0 END)                           AS rush_td_against,
                SUM(CASE WHEN rush_attempt=1 AND COALESCE(first_down,0)=1 THEN 1 ELSE 0 END)                  AS rush_first_dn_against,
                SUM(CASE WHEN COALESCE(number_of_pass_rushers,0)>=5 AND pass_attempt=1 THEN 1 ELSE 0 END)     AS blitz_plays,
                SUM(CASE WHEN pass_attempt=1 AND number_of_pass_rushers IS NOT NULL THEN 1 ELSE 0 END)        AS pass_with_rushers,
                SUM(CASE WHEN rush_attempt=1 AND COALESCE(defenders_in_box,0)>=8 THEN 1 ELSE 0 END)           AS stacked_plays,
                SUM(CASE WHEN rush_attempt=1 AND defenders_in_box IS NOT NULL THEN 1 ELSE 0 END)              AS rush_with_box
            FROM plays
            WHERE season = :season AND season_type = 'REG' AND defteam IS NOT NULL
            {week_filter}
            GROUP BY defteam
        """)

        ppg_allowed_sql = text(f"""
            SELECT defteam AS team, ROUND(AVG(opp_score), 1) AS ppg_allowed
            FROM (
                SELECT game_id, defteam,
                       MAX(CASE WHEN home_team!=defteam THEN home_score ELSE away_score END) AS opp_score
                FROM plays
                WHERE season = :season AND season_type = 'REG' AND defteam IS NOT NULL
                {week_filter}
                GROUP BY game_id, defteam
            )
            GROUP BY defteam
        """)

        def_pbp = {r.team: r for r in db.execute(def_pbp_sql, params).fetchall()}
        ppg_allowed_map = {r.team: float(r.ppg_allowed) for r in db.execute(ppg_allowed_sql, params).fetchall()}

        # ── NGS Defense (player-level, aggregated to team) ────────────────────
        def_rows = db.query(
            NGSDefense.team_abbr,
            func.sum(NGSDefense.sacks).label('sacks'),
            func.sum(NGSDefense.qb_hits).label('qb_hits'),
            func.sum(NGSDefense.pressures).label('pressures'),
            func.sum(NGSDefense.tackles_combined).label('tackles'),
            func.sum(NGSDefense.tackles_for_loss).label('tfl'),
            func.sum(NGSDefense.interceptions).label('ints'),
            func.sum(NGSDefense.pass_breakups).label('pbu'),
            func.sum(NGSDefense.forced_fumbles).label('ff'),
        ).filter(NGSDefense.season == season, NGSDefense.week == week).group_by(NGSDefense.team_abbr).all()
        def_map = {r.team_abbr: r for r in def_rows}

        results = []
        for team in NFL_TEAMS:
            d = def_map.get(team)
            pbp = def_pbp.get(team)
            if d is None and pbp is None:
                continue

            gp = int(pbp.gp) if pbp else None

            # PBP-derived
            pass_yds_allowed = int(pbp.pass_yds_allowed or 0) if pbp else None
            rush_yds_allowed = int(pbp.rush_yds_allowed or 0) if pbp else None
            total_yds_allowed = (pass_yds_allowed or 0) + (rush_yds_allowed or 0) if pbp else None

            pass_att_ag  = int(pbp.pass_att_against or 0) if pbp else 0
            pass_cmp_ag  = int(pbp.pass_cmp_against or 0) if pbp else 0
            pass_ypp_ag  = round(pass_yds_allowed / pass_att_ag, 1) if (pass_yds_allowed and pass_att_ag) else None
            comp_pct_ag  = round(pass_cmp_ag / pass_att_ag * 100, 1) if pass_att_ag else None
            rush_att_ag  = int(pbp.rush_att_against or 0) if pbp else 0
            rush_ypc_ag  = round(rush_yds_allowed / rush_att_ag, 1) if (rush_yds_allowed and rush_att_ag) else None

            pr_allowed = passer_rating(
                pass_cmp_ag, pass_att_ag, pass_yds_allowed or 0,
                int(pbp.pass_td_against or 0) if pbp else 0,
                int(pbp.ints_forced or 0) if pbp else 0,
            ) if pbp else None

            blitz_plays   = int(pbp.blitz_plays or 0) if pbp else 0
            pass_w_rush   = int(pbp.pass_with_rushers or 0) if pbp else 0
            blitz_rate    = round(blitz_plays / pass_w_rush * 100, 1) if pass_w_rush else None

            stacked_plays = int(pbp.stacked_plays or 0) if pbp else 0
            rush_w_box    = int(pbp.rush_with_box or 0) if pbp else 0
            stacked_rate  = round(stacked_plays / rush_w_box * 100, 1) if rush_w_box else None

            sacks = float(d.sacks or 0) if d else 0.0
            sack_rate = round(sacks / pass_att_ag * 100, 1) if pass_att_ag else None

            results.append({
                "team": team,
                "season": season,
                "gp": gp,
                # Scoring allowed
                "ppg_allowed": ppg_allowed_map.get(team),
                # Yards allowed
                "total_yds_allowed": total_yds_allowed,
                "pass_yds_allowed": pass_yds_allowed,
                "rush_yds_allowed": rush_yds_allowed,
                "pass_ypg_allowed": round(pass_yds_allowed / gp, 1) if (pass_yds_allowed and gp) else None,
                "rush_ypg_allowed": round(rush_yds_allowed / gp, 1) if (rush_yds_allowed and gp) else None,
                "total_ypg_allowed": round(total_yds_allowed / gp, 1) if (total_yds_allowed and gp) else None,
                # EPA allowed
                "epa_per_play_allowed": r3(pbp.epa_per_play_allowed) if pbp else None,
                "epa_per_pass_allowed": r3(pbp.epa_per_pass_allowed) if pbp else None,
                "epa_per_rush_allowed": r3(pbp.epa_per_rush_allowed) if pbp else None,
                # Pass defense
                "pass_att_against": pass_att_ag,
                "pass_cmp_against": pass_cmp_ag,
                "comp_pct_allowed": comp_pct_ag,
                "pass_ypp_allowed": pass_ypp_ag,
                "pass_td_against": ri(pbp.pass_td_against) if pbp else None,
                "ints_forced": ri(pbp.ints_forced) if pbp else None,
                "passer_rating_allowed": pr_allowed,
                "sacks": round(sacks, 1),
                "sack_rate": sack_rate,
                # Rush defense
                "rush_att_against": rush_att_ag,
                "rush_ypc_allowed": rush_ypc_ag,
                "rush_td_against": ri(pbp.rush_td_against) if pbp else None,
                "rush_first_dn_against": ri(pbp.rush_first_dn_against) if pbp else None,
                # NGS Defense (tracking)
                "qb_hits": ri(d.qb_hits) if d else None,
                "pressures": ri(d.pressures) if d else None,
                "tackles": ri(d.tackles) if d else None,
                "tfl": ri(d.tfl) if d else None,
                "pass_breakups": ri(d.pbu) if d else None,
                "forced_fumbles": ri(d.ff) if d else None,
                # Situational
                "blitz_rate": blitz_rate,
                "stacked_box_rate": stacked_rate,
            })

        results.sort(key=lambda x: x.get('epa_per_play_allowed') or 99, reverse=False)
        return results


@router.get("/plays", response_model=List[PlayResponse])
def get_plays(
    game_id: str = Query(..., description="nflfastR game_id e.g. 2024_01_KC_BAL"),
    player_id: Optional[str] = Query(None, description="Filter to a specific player's plays (gsis_id)"),
    db: Session = Depends(get_db),
):
    """
    Return play-by-play records for a game, optionally filtered to one player.
    Includes all pass/rush plays involving the player.
    """
    q = db.query(Plays).filter(Plays.game_id == game_id)

    if player_id:
        q = q.filter(
            (Plays.passer_player_id == player_id) |
            (Plays.rusher_player_id == player_id) |
            (Plays.receiver_player_id == player_id)
        )

    plays = q.order_by(Plays.quarter_seconds_remaining.desc()).all()
    return plays


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
    mode: str = Query("incremental", pattern="^(incremental|full|defense|plays)$", description="Refresh mode"),
    season: Optional[int] = Query(None, description="Specific season for incremental/defense refresh"),
    start_season: Optional[int] = Query(None, description="Start season for full/defense refresh", ge=2016),
    end_season: Optional[int] = Query(None, description="End season for full/defense refresh"),
    db: Session = Depends(get_db)
):
    """
    Manually trigger data refresh (admin endpoint)

    - `mode=incremental` - Update current season only (default)
    - `mode=full` - Update all years from 2016 to present
    - `mode=defense` - Update only defensive stats (PBP aggregation)

    Note: Full refresh can take several minutes
    """
    try:
        importer = NGSDataImporter(db)

        if mode == "full":
            s = start_season or 2016
            e = end_season or None
            results = importer.full_refresh(start_year=s, end_year=e)
        elif mode == "defense":
            from datetime import datetime as dt
            if season:
                years = [season]
            elif start_season:
                e = end_season or dt.now().year
                years = list(range(start_season, e + 1))
            else:
                years = [dt.now().year]
            result = importer.import_defense_from_pbp(years, mode='upsert')
            results = {'defense': result}
        elif mode == "plays":
            from datetime import datetime as dt
            if season:
                years = [season]
            elif start_season:
                e = end_season or dt.now().year
                years = list(range(start_season, e + 1))
            else:
                years = list(range(2016, dt.now().year + 1))
            result = importer.import_plays(years, mode='replace')
            results = {'plays': result}
        else:
            results = importer.incremental_refresh(season=season)

        return {"status": "success", "results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.get("/headshots", response_model=Dict[str, str])
def get_headshots():
    """Return a dict of player_gsis_id -> headshot_url for all known players."""
    return _load_headshots()
