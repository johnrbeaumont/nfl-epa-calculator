"""
Database models and connection for NFL Next Gen Stats
"""
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    Index,
    UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/ngs_stats.db")

# Handle SQLite-specific connection args
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ORM Models
class NGSPassing(Base):
    """Next Gen Stats - Passing metrics for QBs"""
    __tablename__ = "ngs_passing"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Time context
    season = Column(Integer, nullable=False, index=True)
    season_type = Column(String(10), nullable=False)  # 'REG' or 'POST'
    week = Column(Integer, nullable=False, index=True)  # 0=season aggregate, 1-18=regular, 19+=playoffs

    # Player identification
    player_gsis_id = Column(String(20), nullable=False, index=True)
    player_display_name = Column(String(100))
    player_position = Column(String(10))
    player_first_name = Column(String(50))
    player_last_name = Column(String(50))
    player_jersey_number = Column(Integer)
    player_short_name = Column(String(50))
    team_abbr = Column(String(10), index=True)
    opponent_team = Column(String(10))

    # Timing & Decision Metrics
    avg_time_to_throw = Column(Float)
    aggressiveness = Column(Float)  # % of passes targeting tight coverage (= TW%)

    # Air Yards Metrics
    avg_completed_air_yards = Column(Float)
    avg_intended_air_yards = Column(Float)
    avg_air_yards_differential = Column(Float)
    max_completed_air_distance = Column(Float)
    max_air_distance = Column(Float)
    avg_air_distance = Column(Float)
    avg_air_yards_to_sticks = Column(Float)

    # Accuracy & Completion Metrics
    completion_percentage = Column(Float)
    expected_completion_percentage = Column(Float)
    completion_percentage_above_expectation = Column(Float)  # KEY METRIC
    completions = Column(Integer)
    attempts = Column(Integer)

    # Production Stats
    pass_yards = Column(Integer)
    pass_touchdowns = Column(Integer)
    interceptions = Column(Integer)
    passer_rating = Column(Float)

    # PBP-enriched per-game fields (populated by _enrich_passing_with_pbp)
    game_id = Column(String(30), index=True)     # nflfastR game_id e.g. "2024_01_KC_BAL"
    home_away = Column(String(5))                # 'home' or 'away'
    game_result = Column(String(20))             # 'W 37-20' or 'L 24-27'
    dropbacks = Column(Integer)                  # attempts + sacks + scrambles
    deep_pass_pct = Column(Float)                # % attempts with air_yards >= 20
    qb_hit_pct = Column(Float)                   # % dropbacks QB was hit (pressure proxy)
    play_action_pct = Column(Float)              # % dropbacks on play action
    blitz_pct = Column(Float)                    # % dropbacks facing 5+ pass rushers

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (
        UniqueConstraint('season', 'season_type', 'week', 'player_gsis_id', name='uix_passing_player_week'),
        Index('idx_passing_season_week', 'season', 'week'),
    )


class NGSReceiving(Base):
    """Next Gen Stats - Receiving metrics for WR/TE"""
    __tablename__ = "ngs_receiving"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Time context
    season = Column(Integer, nullable=False, index=True)
    season_type = Column(String(10), nullable=False)
    week = Column(Integer, nullable=False, index=True)

    # Player identification
    player_gsis_id = Column(String(20), nullable=False, index=True)
    player_display_name = Column(String(100))
    player_position = Column(String(10))
    player_first_name = Column(String(50))
    player_last_name = Column(String(50))
    player_jersey_number = Column(Integer)
    player_short_name = Column(String(50))
    team_abbr = Column(String(10), index=True)
    opponent_team = Column(String(10))

    # Separation Metrics
    avg_separation = Column(Float)  # KEY METRIC - yards from nearest defender
    avg_cushion = Column(Float)  # Pre-snap cushion

    # Target Distribution
    avg_intended_air_yards = Column(Float)
    percent_share_of_intended_air_yards = Column(Float)

    # Production Stats
    receptions = Column(Integer)
    targets = Column(Integer)
    catch_percentage = Column(Float)
    yards = Column(Integer)
    rec_touchdowns = Column(Integer)

    # Yards After Catch (YAC) Metrics
    avg_yac = Column(Float)
    avg_expected_yac = Column(Float)
    avg_yac_above_expectation = Column(Float)  # KEY METRIC

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (
        UniqueConstraint('season', 'season_type', 'week', 'player_gsis_id', name='uix_receiving_player_week'),
        Index('idx_receiving_season_week', 'season', 'week'),
    )


class NGSRushing(Base):
    """Next Gen Stats - Rushing metrics for RB"""
    __tablename__ = "ngs_rushing"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Time context
    season = Column(Integer, nullable=False, index=True)
    season_type = Column(String(10), nullable=False)
    week = Column(Integer, nullable=False, index=True)

    # Player identification
    player_gsis_id = Column(String(20), nullable=False, index=True)
    player_display_name = Column(String(100))
    player_position = Column(String(10))
    player_first_name = Column(String(50))
    player_last_name = Column(String(50))
    player_jersey_number = Column(Integer)
    player_short_name = Column(String(50))
    team_abbr = Column(String(10), index=True)
    opponent_team = Column(String(10))

    # Efficiency Metrics
    efficiency = Column(Float)  # KEY METRIC - yards gained per expected yard
    percent_attempts_gte_eight_defenders = Column(Float)  # % facing stacked boxes
    avg_time_to_los = Column(Float)  # Time to line of scrimmage

    # Production Stats
    rush_attempts = Column(Integer)
    rush_yards = Column(Integer)
    avg_rush_yards = Column(Float)
    rush_touchdowns = Column(Integer)

    # Expected vs Actual Metrics
    expected_rush_yards = Column(Float)
    rush_yards_over_expected = Column(Float)  # KEY METRIC
    rush_yards_over_expected_per_att = Column(Float)
    rush_pct_over_expected = Column(Float)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (
        UniqueConstraint('season', 'season_type', 'week', 'player_gsis_id', name='uix_rushing_player_week'),
        Index('idx_rushing_season_week', 'season', 'week'),
    )


class NGSDefense(Base):
    """Next Gen Stats - Defensive metrics for DL/LB/DB"""
    __tablename__ = "ngs_defense"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Time context
    season = Column(Integer, nullable=False, index=True)
    season_type = Column(String(10), nullable=False)
    week = Column(Integer, nullable=False, index=True)

    # Player identification
    player_gsis_id = Column(String(20), nullable=False, index=True)
    player_display_name = Column(String(100))
    player_position = Column(String(10))
    player_first_name = Column(String(50))
    player_last_name = Column(String(50))
    player_jersey_number = Column(Integer)
    player_short_name = Column(String(50))
    team_abbr = Column(String(10), index=True)

    # Tackle Metrics
    tackles = Column(Integer)
    tackles_solo = Column(Integer)
    tackles_combined = Column(Integer)
    tackles_assists = Column(Integer)
    tackles_for_loss = Column(Integer)
    tackles_for_loss_yards = Column(Float)

    # Pass Rush Metrics
    sacks = Column(Float)
    sack_yards = Column(Float)
    qb_hits = Column(Integer)
    pressures = Column(Integer)
    hurries = Column(Integer)

    # Coverage Metrics
    interceptions = Column(Integer)
    pass_breakups = Column(Integer)
    targets = Column(Integer)
    completions_allowed = Column(Integer)
    completion_pct_allowed = Column(Float)
    yards_allowed = Column(Integer)
    avg_yards_allowed = Column(Float)
    touchdowns_allowed = Column(Integer)

    # Advanced Metrics
    avg_time_to_pressure = Column(Float)
    passer_rating_allowed = Column(Float)

    # Turnover Metrics
    forced_fumbles = Column(Integer)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (
        UniqueConstraint('season', 'season_type', 'week', 'player_gsis_id', name='uix_defense_player_week'),
        Index('idx_defense_season_week', 'season', 'week'),
    )


class SeasonalStats(Base):
    """Seasonal aggregated stats from nflfastR play-by-play data (via nfl_data_py)"""
    __tablename__ = "seasonal_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identifiers
    player_id = Column(String(20), nullable=False, index=True)  # gsis_id format
    season = Column(Integer, nullable=False, index=True)
    season_type = Column(String(10))
    player_name = Column(String(100))
    player_display_name = Column(String(100))
    position = Column(String(10))
    position_group = Column(String(10))
    recent_team = Column(String(10), index=True)
    games = Column(Integer)

    # EPA
    passing_epa = Column(Float)
    rushing_epa = Column(Float)
    receiving_epa = Column(Float)

    # Passing volume
    completions = Column(Integer)
    attempts = Column(Integer)
    passing_yards = Column(Float)
    passing_tds = Column(Integer)
    interceptions = Column(Integer)
    passing_air_yards = Column(Float)
    passing_yards_after_catch = Column(Float)
    passing_first_downs = Column(Integer)
    passing_2pt_conversions = Column(Integer)

    # Rushing volume
    carries = Column(Integer)
    rushing_yards = Column(Float)
    rushing_tds = Column(Integer)
    rushing_first_downs = Column(Integer)
    rushing_fumbles = Column(Integer)
    rushing_fumbles_lost = Column(Integer)
    rushing_2pt_conversions = Column(Integer)

    # Receiving volume
    targets = Column(Integer)
    receptions = Column(Integer)
    receiving_yards = Column(Float)
    receiving_tds = Column(Integer)
    receiving_air_yards = Column(Float)
    receiving_yards_after_catch = Column(Float)
    receiving_first_downs = Column(Integer)
    receiving_fumbles = Column(Integer)
    receiving_fumbles_lost = Column(Integer)
    receiving_2pt_conversions = Column(Integer)

    # Sacks
    sacks = Column(Float)
    sack_yards = Column(Float)
    sack_fumbles = Column(Integer)
    sack_fumbles_lost = Column(Integer)

    # Advanced metrics
    target_share = Column(Float)
    air_yards_share = Column(Float)
    wopr_x = Column(Float)
    wopr_y = Column(Float)
    racr = Column(Float)
    pacr = Column(Float)
    dakota = Column(Float)

    # Fantasy
    fantasy_points = Column(Float)
    fantasy_points_ppr = Column(Float)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('season', 'season_type', 'player_id', name='uix_seasonal_player'),
        Index('idx_seasonal_season', 'season'),
        Index('idx_seasonal_player', 'player_id'),
    )


class Plays(Base):
    """Full play-by-play data from nflfastR via nfl_data_py (2016-present)"""
    __tablename__ = "plays"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Game context
    game_id = Column(String(30), nullable=False, index=True)
    season = Column(Integer, nullable=False, index=True)
    week = Column(Integer, nullable=False)
    season_type = Column(String(10))
    home_team = Column(String(10))
    away_team = Column(String(10))

    # Play context
    play_id = Column(Integer)
    play_type = Column(String(20))      # pass, run, punt, kickoff, field_goal, etc.
    down = Column(Integer)
    ydstogo = Column(Integer)
    yardline_100 = Column(Integer)      # yards from opponent end zone
    quarter_seconds_remaining = Column(Integer)
    game_seconds_remaining = Column(Integer)
    qtr = Column(Integer)               # 1-4, 5=OT

    # Score state
    posteam = Column(String(10), index=True)   # team with possession
    defteam = Column(String(10))
    home_score = Column(Integer)
    away_score = Column(Integer)
    score_differential = Column(Integer)

    # Play outcome
    desc = Column(Text)                 # full play description
    yards_gained = Column(Integer)
    touchdown = Column(Integer)
    first_down = Column(Integer)

    # Pass details
    pass_attempt = Column(Integer)
    complete_pass = Column(Integer)
    incomplete_pass = Column(Integer)
    air_yards = Column(Float)
    yards_after_catch = Column(Float)
    pass_length = Column(String(10))    # 'short' / 'deep' (deep = air_yards >= 15)
    pass_location = Column(String(10))  # 'left' / 'middle' / 'right'
    no_huddle = Column(Integer)
    shotgun = Column(Integer)
    play_action = Column(Integer)

    # QB events
    sack = Column(Integer)
    qb_hit = Column(Integer)
    qb_scramble = Column(Integer)
    interception = Column(Integer)

    # Rush details
    rush_attempt = Column(Integer)

    # Special teams / penalties
    fumble = Column(Integer)
    fumble_lost = Column(Integer)
    penalty = Column(Integer)
    penalty_yards = Column(Integer)

    # Players
    passer_player_id = Column(String(20), index=True)
    passer_player_name = Column(String(100))
    receiver_player_id = Column(String(20), index=True)
    receiver_player_name = Column(String(100))
    rusher_player_id = Column(String(20), index=True)
    rusher_player_name = Column(String(100))

    # Advanced metrics
    epa = Column(Float)
    wpa = Column(Float)
    cpoe = Column(Float)

    # Defensive formation
    number_of_pass_rushers = Column(Integer)
    defenders_in_box = Column(Integer)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_plays_game_passer', 'game_id', 'passer_player_id'),
        Index('idx_plays_game_rusher', 'game_id', 'rusher_player_id'),
        Index('idx_plays_season_week', 'season', 'week'),
    )


class NGSRefreshLog(Base):
    """Audit log for data refresh operations"""
    __tablename__ = "ngs_refresh_log"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Refresh details
    refresh_type = Column(String(20), nullable=False)  # 'full' or 'incremental'
    stat_type = Column(String(20), nullable=False)  # 'passing', 'receiving', 'rushing', 'defense'
    seasons_updated = Column(String(100))  # JSON array or comma-separated

    # Results
    rows_inserted = Column(Integer)
    rows_updated = Column(Integer)

    # Timing
    started_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Status
    status = Column(String(20))  # 'success', 'failed', 'partial'
    error_message = Column(Text)

    __table_args__ = (
        Index('idx_refresh_log_completed', 'completed_at'),
    )


# Database initialization
def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependency for FastAPI routes
    Yields database session and ensures cleanup
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
