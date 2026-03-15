"""Tests for database models and constraints."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.database import NGSPassing, NGSReceiving, NGSRushing, NGSDefense, SeasonalStats, NGSRefreshLog


class TestModelCreation:
    def test_create_passing(self, db_session):
        obj = NGSPassing(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        db_session.add(obj)
        db_session.commit()
        assert db_session.query(NGSPassing).count() == 1

    def test_create_receiving(self, db_session):
        obj = NGSReceiving(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        db_session.add(obj)
        db_session.commit()
        assert db_session.query(NGSReceiving).count() == 1

    def test_create_rushing(self, db_session):
        obj = NGSRushing(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        db_session.add(obj)
        db_session.commit()
        assert db_session.query(NGSRushing).count() == 1

    def test_create_defense(self, db_session):
        obj = NGSDefense(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        db_session.add(obj)
        db_session.commit()
        assert db_session.query(NGSDefense).count() == 1

    def test_create_seasonal(self, db_session):
        obj = SeasonalStats(player_id='00-TEST', season=2024, season_type='REG')
        db_session.add(obj)
        db_session.commit()
        assert db_session.query(SeasonalStats).count() == 1

    def test_create_refresh_log(self, db_session):
        obj = NGSRefreshLog(refresh_type='full', stat_type='passing', status='success')
        db_session.add(obj)
        db_session.commit()
        assert db_session.query(NGSRefreshLog).count() == 1


class TestUniqueConstraints:
    def test_passing_duplicate_raises(self, db_session):
        obj1 = NGSPassing(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        obj2 = NGSPassing(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        db_session.add(obj1)
        db_session.commit()
        db_session.add(obj2)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_seasonal_duplicate_raises(self, db_session):
        obj1 = SeasonalStats(player_id='00-TEST', season=2024, season_type='REG')
        obj2 = SeasonalStats(player_id='00-TEST', season=2024, season_type='REG')
        db_session.add(obj1)
        db_session.commit()
        db_session.add(obj2)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_different_weeks_allowed(self, db_session):
        obj1 = NGSPassing(season=2024, season_type='REG', week=1, player_gsis_id='00-TEST')
        obj2 = NGSPassing(season=2024, season_type='REG', week=2, player_gsis_id='00-TEST')
        db_session.add_all([obj1, obj2])
        db_session.commit()
        assert db_session.query(NGSPassing).count() == 2
