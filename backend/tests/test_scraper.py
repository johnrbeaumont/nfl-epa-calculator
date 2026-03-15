"""Tests for NGS data importer / scraper."""
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from datetime import datetime

from app.ngs_scraper import NGSDataImporter, DataSourceError, _retry_fetch
from app.database import NGSPassing, NGSRefreshLog, SeasonalStats


class TestRetryFetch:
    def test_succeeds_first_try(self):
        fn = MagicMock(return_value="ok")
        assert _retry_fetch(fn, retries=3) == "ok"
        assert fn.call_count == 1

    def test_retries_on_failure(self):
        fn = MagicMock(side_effect=[Exception("fail"), Exception("fail"), "ok"])
        result = _retry_fetch(fn, retries=3)
        assert result == "ok"
        assert fn.call_count == 3

    def test_raises_after_exhausting_retries(self):
        fn = MagicMock(side_effect=Exception("permanent"))
        with pytest.raises(DataSourceError, match="permanent"):
            _retry_fetch(fn, retries=2)
        assert fn.call_count == 2


class TestInputValidation:
    def test_empty_years_raises(self, db_session):
        importer = NGSDataImporter(db_session)
        with pytest.raises(ValueError, match="must not be empty"):
            importer.import_data('passing', [])

    def test_invalid_stat_type_raises(self, db_session):
        importer = NGSDataImporter(db_session)
        with pytest.raises(ValueError, match="Invalid stat_type"):
            importer.import_data('invalid_type', [2024])

    def test_year_out_of_range_raises(self, db_session):
        importer = NGSDataImporter(db_session)
        with pytest.raises(ValueError, match="out of valid range"):
            importer.import_data('passing', [2010])


class TestImportData:
    @patch('app.ngs_scraper._retry_fetch')
    def test_import_replace_mode(self, mock_fetch, db_session):
        mock_df = pd.DataFrame([{
            'season': 2024, 'season_type': 'REG', 'week': 0,
            'player_gsis_id': '00-TEST', 'player_display_name': 'Test QB',
            'player_position': 'QB', 'team_abbr': 'KC',
            'attempts': 100, 'completions': 60,
        }])
        mock_fetch.return_value = mock_df

        importer = NGSDataImporter(db_session)
        result = importer.import_data('passing', [2024], mode='replace')

        assert result['status'] == 'success'
        assert result['rows_inserted'] == 1
        assert db_session.query(NGSPassing).count() == 1

    @patch('app.ngs_scraper._retry_fetch')
    def test_import_upsert_inserts_new(self, mock_fetch, db_session):
        mock_df = pd.DataFrame([{
            'season': 2024, 'season_type': 'REG', 'week': 0,
            'player_gsis_id': '00-TEST', 'player_display_name': 'Test QB',
            'player_position': 'QB', 'team_abbr': 'KC',
            'attempts': 100, 'completions': 60,
        }])
        mock_fetch.return_value = mock_df

        importer = NGSDataImporter(db_session)
        result = importer.import_data('passing', [2024], mode='upsert')

        assert result['rows_inserted'] == 1
        assert result['rows_updated'] == 0

    @patch('app.ngs_scraper._retry_fetch')
    def test_import_upsert_updates_existing(self, mock_fetch, db_session):
        # Pre-insert a record
        db_session.add(NGSPassing(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-TEST', player_display_name='Test QB',
            player_position='QB', team_abbr='KC',
            attempts=50, completions=30,
        ))
        db_session.commit()

        mock_df = pd.DataFrame([{
            'season': 2024, 'season_type': 'REG', 'week': 0,
            'player_gsis_id': '00-TEST', 'player_display_name': 'Test QB',
            'player_position': 'QB', 'team_abbr': 'KC',
            'attempts': 100, 'completions': 60,
        }])
        mock_fetch.return_value = mock_df

        importer = NGSDataImporter(db_session)
        result = importer.import_data('passing', [2024], mode='upsert')

        assert result['rows_inserted'] == 0
        assert result['rows_updated'] == 1
        updated = db_session.query(NGSPassing).first()
        assert updated.attempts == 100

    @patch('app.ngs_scraper._retry_fetch')
    def test_import_logs_failure(self, mock_fetch, db_session):
        mock_fetch.side_effect = DataSourceError("network error")

        importer = NGSDataImporter(db_session)
        with pytest.raises(DataSourceError):
            importer.import_data('passing', [2024])

        log = db_session.query(NGSRefreshLog).first()
        assert log.status == 'failed'
        assert 'network error' in log.error_message


class TestImportSeasonalStats:
    @patch('app.ngs_scraper._retry_fetch')
    def test_partial_year_failure(self, mock_fetch, db_session):
        """Some years return data, others 404 — should still succeed."""
        good_df = pd.DataFrame([{
            'player_id': '00-TEST', 'season': 2024, 'season_type': 'REG',
            'player_name': 'Test', 'games': 17, 'passing_epa': 50.0,
        }])

        def side_effect(func, *args, **kwargs):
            year = args[0][0] if args else kwargs.get('years', [None])[0]
            if year == 2025:
                raise DataSourceError("404")
            return good_df

        mock_fetch.side_effect = side_effect

        importer = NGSDataImporter(db_session)
        result = importer.import_seasonal_stats([2024, 2025])
        assert result['status'] == 'success'
        assert result['rows_inserted'] >= 1

    def test_empty_years_raises(self, db_session):
        importer = NGSDataImporter(db_session)
        with pytest.raises(ValueError, match="must not be empty"):
            importer.import_seasonal_stats([])


class TestRefreshHistory:
    def test_returns_empty_list(self, db_session):
        importer = NGSDataImporter(db_session)
        history = importer.get_refresh_history()
        assert history == []

    def test_returns_logs(self, db_session):
        db_session.add(NGSRefreshLog(
            refresh_type='incremental', stat_type='passing',
            seasons_updated='[2024]', status='success',
            started_at=datetime.utcnow(), completed_at=datetime.utcnow(),
            rows_inserted=100, rows_updated=0,
        ))
        db_session.commit()

        importer = NGSDataImporter(db_session)
        history = importer.get_refresh_history()
        assert len(history) == 1
        assert history[0]['status'] == 'success'
