"""Tests for NGS API endpoints."""
import pytest


class TestPassingEndpoint:
    def test_returns_data(self, client, seed_passing):
        resp = client.get("/api/ngs/passing?season=2024&week=0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]['player_display_name'] == 'Patrick Mahomes'  # highest attempts

    def test_empty_returns_empty_list(self, client):
        resp = client.get("/api/ngs/passing?season=2020&week=0")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_player_filter(self, client, seed_passing):
        resp = client.get("/api/ngs/passing?season=2024&week=0&player=Mahomes")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert 'Mahomes' in data[0]['player_display_name']

    def test_team_filter(self, client, seed_passing):
        resp = client.get("/api/ngs/passing?season=2024&week=0&team=cin")
        assert resp.status_code == 200
        data = resp.json()
        assert all(d['team_abbr'] == 'CIN' for d in data)

    def test_min_attempts_filter(self, client, seed_passing):
        resp = client.get("/api/ngs/passing?season=2024&week=0&min_attempts=520")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    def test_epa_populated_with_seasonal(self, client, seed_passing, seed_seasonal):
        resp = client.get("/api/ngs/passing?season=2024&week=0&player=Mahomes")
        data = resp.json()
        assert len(data) == 1
        row = data[0]
        assert row['passing_epa'] == 85.0
        assert row['games'] == 17
        assert row['epa_per_dropback'] is not None
        assert abs(row['epa_per_dropback'] - 85.0 / 550) < 0.001

    def test_includes_player_gsis_id(self, client, seed_passing):
        resp = client.get("/api/ngs/passing?season=2024&week=0")
        data = resp.json()
        assert all('player_gsis_id' in d for d in data)


class TestRushingEndpoint:
    def test_returns_data(self, client, seed_rushing):
        resp = client.get("/api/ngs/rushing?season=2024&week=0")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_empty_returns_empty_list(self, client):
        resp = client.get("/api/ngs/rushing?season=2020")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_epa_populated_with_seasonal(self, client, seed_rushing, seed_seasonal):
        resp = client.get("/api/ngs/rushing?season=2024&week=0&player=Barkley")
        data = resp.json()
        row = data[0]
        assert row['rushing_epa'] == 42.0
        assert row['epa_per_carry'] is not None
        assert abs(row['epa_per_carry'] - 42.0 / 300) < 0.001


class TestReceivingEndpoint:
    def test_returns_data(self, client, seed_receiving):
        resp = client.get("/api/ngs/receiving?season=2024&week=0")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_empty_returns_empty_list(self, client):
        resp = client.get("/api/ngs/receiving?season=2020")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_epa_populated_with_seasonal(self, client, seed_receiving, seed_seasonal):
        resp = client.get("/api/ngs/receiving?season=2024&week=0&player=Chase")
        data = resp.json()
        row = data[0]
        assert row['receiving_epa'] == 60.0
        assert row['epa_per_target'] is not None
        assert abs(row['epa_per_target'] - 60.0 / 160) < 0.001
        assert row['target_share'] == 0.28


class TestDefenseEndpoint:
    def test_returns_data(self, client, seed_defense):
        resp = client.get("/api/ngs/defense?season=2024&week=0")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_empty_returns_empty_list(self, client):
        resp = client.get("/api/ngs/defense?season=2020")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_position_filter(self, client, seed_defense):
        resp = client.get("/api/ngs/defense?season=2024&week=0&position=lb")
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestMergeSeasonal:
    def test_zero_attempts_no_division_error(self, client, db_session):
        """Ensure epa_per_dropback is None when attempts=0."""
        from app.database import NGSPassing, SeasonalStats
        db_session.add(NGSPassing(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-TEST001', player_display_name='Zero Att QB',
            player_position='QB', team_abbr='KC',
            attempts=0, completions=0,
        ))
        db_session.add(SeasonalStats(
            player_id='00-TEST001', season=2024, season_type='REG',
            passing_epa=0.0, games=1,
        ))
        db_session.commit()
        resp = client.get("/api/ngs/passing?season=2024&week=0&player=Zero")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]['epa_per_dropback'] is None

    def test_null_epa_no_error(self, client, db_session):
        """Ensure null EPA + nonzero attempts doesn't crash."""
        from app.database import NGSPassing, SeasonalStats
        db_session.add(NGSPassing(
            season=2024, season_type='REG', week=0,
            player_gsis_id='00-TEST002', player_display_name='Null EPA QB',
            player_position='QB', team_abbr='KC',
            attempts=100, completions=60,
        ))
        db_session.add(SeasonalStats(
            player_id='00-TEST002', season=2024, season_type='REG',
            passing_epa=None, games=5,
        ))
        db_session.commit()
        resp = client.get("/api/ngs/passing?season=2024&week=0&player=Null")
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]['epa_per_dropback'] is None


class TestStatsEndpoint:
    def test_stats_returns_refresh_log(self, client):
        resp = client.get("/api/ngs/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert 'refresh_log' in data
        assert 'last_refresh' in data['refresh_log']
