"""Shared test fixtures for the NFL NGS backend."""
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from datetime import datetime

from app.database import Base, NGSPassing, NGSReceiving, NGSRushing, NGSDefense, SeasonalStats, NGSRefreshLog, get_db
from app.main import app


@pytest.fixture
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def client(db_engine):
    """FastAPI TestClient with overridden DB dependency using the SAME engine as db_session."""
    Session = sessionmaker(bind=db_engine)

    def _override_get_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def seed_passing(db_engine):
    """Insert sample passing data."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    rows = [
        NGSPassing(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-0036355', player_display_name='Patrick Mahomes',
            player_position='QB', team_abbr='KC',
            attempts=550, completions=370, completion_percentage=67.3,
            pass_yards=4100, pass_touchdowns=30, interceptions=10,
            passer_rating=102.5, avg_time_to_throw=2.8,
            completion_percentage_above_expectation=3.2,
            aggressiveness=18.5,
            avg_completed_air_yards=6.1, avg_intended_air_yards=8.2,
            avg_air_yards_to_sticks=0.5,
        ),
        NGSPassing(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-0039163', player_display_name='Joe Burrow',
            player_position='QB', team_abbr='CIN',
            attempts=500, completions=340, completion_percentage=68.0,
            pass_yards=3800, pass_touchdowns=28, interceptions=9,
            passer_rating=101.0, avg_time_to_throw=2.9,
            completion_percentage_above_expectation=2.8,
            aggressiveness=20.1,
            avg_completed_air_yards=5.8, avg_intended_air_yards=7.9,
            avg_air_yards_to_sticks=0.3,
        ),
    ]
    session.add_all(rows)
    session.commit()
    yield rows
    session.close()


@pytest.fixture
def seed_rushing(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    rows = [
        NGSRushing(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-0038120', player_display_name='Saquon Barkley',
            player_position='RB', team_abbr='PHI',
            rush_attempts=300, rush_yards=1600, rush_touchdowns=12,
            avg_rush_yards=5.3, efficiency=1.15,
            rush_yards_over_expected=250.0,
            rush_yards_over_expected_per_att=0.83,
            percent_attempts_gte_eight_defenders=22.0,
            avg_time_to_los=2.6,
        ),
    ]
    session.add_all(rows)
    session.commit()
    yield rows
    session.close()


@pytest.fixture
def seed_receiving(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    rows = [
        NGSReceiving(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-0039337', player_display_name="Ja'Marr Chase",
            player_position='WR', team_abbr='CIN',
            targets=160, receptions=120, yards=1700, rec_touchdowns=14,
            catch_percentage=75.0, avg_separation=2.8, avg_cushion=5.5,
            avg_intended_air_yards=10.2,
            avg_yac=5.1, avg_yac_above_expectation=1.3,
        ),
    ]
    session.add_all(rows)
    session.commit()
    yield rows
    session.close()


@pytest.fixture
def seed_defense(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    rows = [
        NGSDefense(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-0037077', player_display_name='Micah Parsons',
            player_position='LB', team_abbr='DAL',
            tackles=65, sacks=14.5, qb_hits=22, pressures=70, hurries=40,
            interceptions=0, pass_breakups=3,
        ),
    ]
    session.add_all(rows)
    session.commit()
    yield rows
    session.close()


@pytest.fixture
def seed_seasonal(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    rows = [
        SeasonalStats(
            player_id='00-0036355', season=2024, season_type='REG',
            player_name='P.Mahomes', player_display_name='Patrick Mahomes',
            position='QB', recent_team='KC', games=17,
            passing_epa=85.0, rushing_epa=5.0,
            completions=370, attempts=550, passing_yards=4100.0,
            passing_tds=30, interceptions=10,
            passing_first_downs=200, sacks=25.0,
            dakota=0.65, pacr=1.12,
            fantasy_points=320.0, fantasy_points_ppr=320.0,
        ),
        SeasonalStats(
            player_id='00-0038120', season=2024, season_type='REG',
            player_name='S.Barkley', player_display_name='Saquon Barkley',
            position='RB', recent_team='PHI', games=17,
            rushing_epa=42.0, receiving_epa=8.0,
            carries=300, rushing_yards=1600.0, rushing_tds=12,
            rushing_first_downs=75,
            fantasy_points=280.0, fantasy_points_ppr=310.0,
        ),
        SeasonalStats(
            player_id='00-0039337', season=2024, season_type='REG',
            player_name='J.Chase', player_display_name="Ja'Marr Chase",
            position='WR', recent_team='CIN', games=17,
            receiving_epa=60.0,
            targets=160, receptions=120, receiving_yards=1700.0, receiving_tds=14,
            receiving_first_downs=80,
            target_share=0.28, air_yards_share=0.35,
            wopr_x=0.55, racr=1.15,
            fantasy_points=310.0, fantasy_points_ppr=370.0,
        ),
    ]
    session.add_all(rows)
    session.commit()
    yield rows
    session.close()
