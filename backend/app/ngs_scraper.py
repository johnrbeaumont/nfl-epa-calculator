"""
NGS Data Importer - Fetches Next Gen Stats from nfl_data_py and loads into database
"""
import nfl_data_py as nfl
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Literal
import logging
import time

from .database import NGSPassing, NGSReceiving, NGSRushing, NGSDefense, NGSRefreshLog, SeasonalStats

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


class DataSourceError(Exception):
    """Raised when the external data source (nfl_data_py) fails after retries."""
    pass


def _retry_fetch(func, *args, retries=MAX_RETRIES, **kwargs):
    """Call func with retry + exponential backoff. Wraps failures in DataSourceError."""
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            last_exc = e
            if attempt < retries:
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(f"Attempt {attempt}/{retries} failed: {e}. Retrying in {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"All {retries} attempts failed: {e}")
    raise DataSourceError(f"Failed after {retries} attempts: {last_exc}") from last_exc


class NGSDataImporter:
    """Handles importing NGS data from nfl_data_py to database"""

    STAT_TYPES = ['passing', 'receiving', 'rushing', 'defense']
    MODEL_MAP = {
        'passing': NGSPassing,
        'receiving': NGSReceiving,
        'rushing': NGSRushing,
        'defense': NGSDefense
    }

    def __init__(self, db: Session):
        self.db = db

    def _validate_import_params(self, stat_type: str, years: List[int]):
        """Validate common import parameters."""
        if not years:
            raise ValueError("years list must not be empty")
        if stat_type not in self.STAT_TYPES:
            raise ValueError(f"Invalid stat_type '{stat_type}'. Must be one of: {self.STAT_TYPES}")
        current_year = datetime.now().year
        for y in years:
            if y < 2016 or y > current_year + 1:
                raise ValueError(f"Year {y} out of valid range (2016-{current_year + 1})")

    def import_data(
        self,
        stat_type: Literal['passing', 'receiving', 'rushing', 'defense'],
        years: List[int],
        mode: Literal['replace', 'upsert'] = 'upsert'
    ) -> Dict:
        """
        Import NGS data for specified stat type and years.

        Args:
            stat_type: Type of stats to import
            years: List of years to import (e.g., [2023, 2024])
            mode: 'replace' = delete existing data first, 'upsert' = update existing

        Returns:
            Dictionary with import statistics
        """
        self._validate_import_params(stat_type, years)

        log_entry = NGSRefreshLog(
            refresh_type='incremental' if len(years) == 1 else 'full',
            stat_type=stat_type,
            seasons_updated=str(years),
            started_at=datetime.utcnow()
        )

        try:
            logger.info(f"Fetching {stat_type} data for years {years}")
            df = _retry_fetch(nfl.import_ngs_data, stat_type, years)

            if df.empty:
                raise ValueError(f"No data returned for {stat_type} {years}")

            logger.info(f"Fetched {len(df)} rows for {stat_type}")

            records = df.to_dict('records')
            model = self.MODEL_MAP[stat_type]

            if mode == 'replace':
                deleted = self.db.query(model).filter(model.season.in_(years)).delete(synchronize_session=False)
                logger.info(f"Deleted {deleted} existing rows")
                rows_inserted = len(records)
                rows_updated = 0
                self.db.bulk_insert_mappings(model, records)
            else:
                rows_inserted = 0
                rows_updated = 0
                for record in records:
                    existing = self.db.query(model).filter(
                        model.season == record['season'],
                        model.season_type == record['season_type'],
                        model.week == record['week'],
                        model.player_gsis_id == record['player_gsis_id']
                    ).first()

                    if existing:
                        for key, value in record.items():
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                        existing.updated_at = datetime.utcnow()
                        rows_updated += 1
                    else:
                        self.db.add(model(**record))
                        rows_inserted += 1

            self.db.commit()

            log_entry.rows_inserted = rows_inserted
            log_entry.rows_updated = rows_updated
            log_entry.completed_at = datetime.utcnow()
            log_entry.status = 'success'
            self.db.add(log_entry)
            self.db.commit()

            logger.info(f"Successfully imported {stat_type}: {rows_inserted} new, {rows_updated} updated")

            return {
                'status': 'success',
                'stat_type': stat_type,
                'years': years,
                'rows_inserted': rows_inserted,
                'rows_updated': rows_updated,
                'total_rows': rows_inserted + rows_updated
            }

        except Exception as e:
            self.db.rollback()
            log_entry.completed_at = datetime.utcnow()
            log_entry.status = 'failed'
            log_entry.error_message = str(e)
            self.db.add(log_entry)
            self.db.commit()

            logger.error(f"Failed to import {stat_type} data: {e}")
            raise

    def import_defense_from_pbp(self, years: List[int], mode: Literal['replace', 'upsert'] = 'upsert') -> Dict:
        """Import defensive player stats aggregated from play-by-play data."""
        if not years:
            raise ValueError("years list must not be empty")

        log_entry = NGSRefreshLog(
            refresh_type='incremental' if len(years) == 1 else 'full',
            stat_type='defense',
            seasons_updated=str(years),
            started_at=datetime.utcnow()
        )

        try:
            # Load player info for display names and position groups
            logger.info("Loading player info for defense import...")
            players_df = nfl.import_players()
            players_df = players_df[['gsis_id', 'display_name', 'position', 'position_group']].dropna(subset=['gsis_id'])
            players_map = players_df.set_index('gsis_id').to_dict('index')

            total_inserted = 0
            total_updated = 0

            for year in years:
                logger.info(f"Loading PBP data for {year}...")
                pbp = nfl.import_pbp_data([year], columns=[
                    'season', 'season_type', 'week', 'defteam',
                    'sack', 'sack_player_id', 'sack_player_name',
                    'half_sack_1_player_id', 'half_sack_2_player_id',
                    'interception', 'interception_player_id',
                    'qb_hit_1_player_id', 'qb_hit_2_player_id',
                    'solo_tackle_1_player_id', 'solo_tackle_1_team',
                    'solo_tackle_2_player_id', 'solo_tackle_2_team',
                    'assist_tackle_1_player_id', 'assist_tackle_1_team',
                    'assist_tackle_2_player_id', 'assist_tackle_2_team',
                    'assist_tackle_3_player_id', 'assist_tackle_3_team',
                    'assist_tackle_4_player_id', 'assist_tackle_4_team',
                    'tackle_for_loss_1_player_id',
                    'tackle_for_loss_2_player_id',
                    'pass_defense_1_player_id',
                    'pass_defense_2_player_id',
                    'forced_fumble_player_1_player_id',
                    'forced_fumble_player_2_player_id',
                ])

                reg = pbp[pbp['season_type'] == 'REG'].copy()
                if reg.empty:
                    logger.warning(f"No REG plays found for {year}")
                    continue

                # Load seasonal rosters for team lookup
                try:
                    rosters = nfl.import_seasonal_rosters([year])
                    roster_map = rosters.set_index('player_id')[['team', 'position']].to_dict('index')
                except Exception as e:
                    logger.warning(f"Could not load rosters for {year}: {e}")
                    roster_map = {}

                # Helper: collect (player_id, team) pairs from play columns
                def collect_stat(id_cols, team_src='defteam', weight=1.0):
                    parts = []
                    for id_col in id_cols:
                        if id_col not in reg.columns:
                            continue
                        if isinstance(team_src, str) and team_src in reg.columns:
                            team_col = team_src
                        else:
                            team_col = None
                        sub = reg[[id_col, team_col]].copy() if team_col else reg[[id_col, 'defteam']].copy()
                        sub.columns = ['player_id', 'team']
                        sub = sub.dropna(subset=['player_id'])
                        sub['val'] = weight
                        parts.append(sub)
                    if not parts:
                        return pd.DataFrame(columns=['player_id', 'team', 'val'])
                    return pd.concat(parts, ignore_index=True)

                def collect_tackle(id_col, team_col):
                    if id_col not in reg.columns:
                        return pd.DataFrame(columns=['player_id', 'team', 'val'])
                    sub = reg[[id_col, team_col]].copy() if team_col in reg.columns else reg[[id_col, 'defteam']].copy()
                    sub.columns = ['player_id', 'team']
                    sub = sub.dropna(subset=['player_id'])
                    sub['val'] = 1.0
                    return sub

                # Aggregate per player
                sacks_df = pd.concat([
                    collect_stat(['sack_player_id'], 'defteam', 1.0),
                    collect_stat(['half_sack_1_player_id', 'half_sack_2_player_id'], 'defteam', 0.5),
                ], ignore_index=True)

                solo_df = pd.concat([
                    collect_tackle('solo_tackle_1_player_id', 'solo_tackle_1_team'),
                    collect_tackle('solo_tackle_2_player_id', 'solo_tackle_2_team'),
                ], ignore_index=True)

                assist_df = pd.concat([
                    collect_tackle('assist_tackle_1_player_id', 'assist_tackle_1_team'),
                    collect_tackle('assist_tackle_2_player_id', 'assist_tackle_2_team'),
                    collect_tackle('assist_tackle_3_player_id', 'assist_tackle_3_team'),
                    collect_tackle('assist_tackle_4_player_id', 'assist_tackle_4_team'),
                ], ignore_index=True)

                tfl_df = collect_stat(['tackle_for_loss_1_player_id', 'tackle_for_loss_2_player_id'], 'defteam')
                int_df = collect_stat(['interception_player_id'], 'defteam')
                qbh_df = collect_stat(['qb_hit_1_player_id', 'qb_hit_2_player_id'], 'defteam')
                pbu_df = collect_stat(['pass_defense_1_player_id', 'pass_defense_2_player_id'], 'defteam')
                ff_df = collect_stat(['forced_fumble_player_1_player_id', 'forced_fumble_player_2_player_id'], 'defteam')

                def agg(df, col_name):
                    if df.empty:
                        return pd.DataFrame(columns=['player_id', col_name])
                    result = df.groupby('player_id').agg(**{col_name: ('val', 'sum')}).reset_index()
                    return result

                sacks_agg = agg(sacks_df, 'sacks')
                solo_agg = agg(solo_df, 'tackles_solo')
                assist_agg = agg(assist_df, 'tackles_assists')
                tfl_agg = agg(tfl_df, 'tackles_for_loss')
                int_agg = agg(int_df, 'interceptions')
                qbh_agg = agg(qbh_df, 'qb_hits')
                pbu_agg = agg(pbu_df, 'pass_breakups')
                ff_agg = agg(ff_df, 'forced_fumbles')

                # Merge all stats by player_id only (avoids duplicates from team changes)
                from functools import reduce
                dfs = [sacks_agg, solo_agg, assist_agg, tfl_agg, int_agg, qbh_agg, pbu_agg, ff_agg]
                dfs = [d for d in dfs if not d.empty]

                if not dfs:
                    logger.warning(f"No defensive stats computed for {year}")
                    continue

                merged = reduce(lambda l, r: pd.merge(l, r, on='player_id', how='outer'), dfs)
                merged = merged.fillna(0)

                # Get team from roster (most reliable source for current season)
                merged['team'] = merged['player_id'].map(lambda pid: roster_map.get(pid, {}).get('team'))

                # Compute derived stats
                merged['tackles_combined'] = merged.get('tackles_solo', 0) + merged.get('tackles_assists', 0)
                merged['tackles'] = merged['tackles_combined']

                # Attach player info
                merged['player_display_name'] = merged['player_id'].map(lambda pid: players_map.get(pid, {}).get('display_name'))
                merged['player_position'] = merged['player_id'].map(lambda pid: roster_map.get(pid, {}).get('position') or players_map.get(pid, {}).get('position'))
                merged['position_group'] = merged['player_id'].map(lambda pid: players_map.get(pid, {}).get('position_group'))

                # Filter to defensive players only
                def_pos_groups = {'DL', 'LB', 'DB'}
                def_positions = {'DE', 'DT', 'NT', 'LB', 'MLB', 'ILB', 'OLB', 'CB', 'S', 'SS', 'FS', 'DB', 'SAF'}
                merged = merged[
                    merged['position_group'].isin(def_pos_groups) |
                    merged['player_position'].isin(def_positions)
                ]

                if merged.empty:
                    logger.warning(f"No defensive players found after filtering for {year}")
                    continue

                # Build records for NGSDefense
                records = []
                for _, row in merged.iterrows():
                    records.append({
                        'season': year,
                        'season_type': 'REG',
                        'week': 0,
                        'player_gsis_id': row['player_id'],
                        'player_display_name': row.get('player_display_name'),
                        'player_position': row.get('player_position'),
                        'team_abbr': row.get('team'),
                        'tackles': int(row.get('tackles', 0) or 0),
                        'tackles_solo': int(row.get('tackles_solo', 0) or 0),
                        'tackles_combined': int(row.get('tackles_combined', 0) or 0),
                        'tackles_assists': int(row.get('tackles_assists', 0) or 0),
                        'tackles_for_loss': int(row.get('tackles_for_loss', 0) or 0),
                        'sacks': float(row.get('sacks', 0) or 0),
                        'qb_hits': int(row.get('qb_hits', 0) or 0),
                        'interceptions': int(row.get('interceptions', 0) or 0),
                        'pass_breakups': int(row.get('pass_breakups', 0) or 0),
                        'forced_fumbles': int(row.get('forced_fumbles', 0) or 0),
                    })

                if mode == 'replace':
                    self.db.query(NGSDefense).filter(
                        NGSDefense.season == year,
                        NGSDefense.week == 0
                    ).delete(synchronize_session=False)
                    self.db.bulk_insert_mappings(NGSDefense, records)
                    total_inserted += len(records)
                else:
                    for record in records:
                        existing = self.db.query(NGSDefense).filter(
                            NGSDefense.season == record['season'],
                            NGSDefense.season_type == record['season_type'],
                            NGSDefense.week == record['week'],
                            NGSDefense.player_gsis_id == record['player_gsis_id']
                        ).first()
                        if existing:
                            for key, value in record.items():
                                if hasattr(existing, key):
                                    setattr(existing, key, value)
                            existing.updated_at = datetime.utcnow()
                            total_updated += 1
                        else:
                            self.db.add(NGSDefense(**record))
                            total_inserted += 1

                self.db.commit()
                logger.info(f"Defense {year}: {len(records)} players processed")

            log_entry.rows_inserted = total_inserted
            log_entry.rows_updated = total_updated
            log_entry.completed_at = datetime.utcnow()
            log_entry.status = 'success'
            self.db.add(log_entry)
            self.db.commit()

            return {
                'status': 'success',
                'stat_type': 'defense',
                'years': years,
                'rows_inserted': total_inserted,
                'rows_updated': total_updated,
                'total_rows': total_inserted + total_updated
            }

        except Exception as e:
            self.db.rollback()
            log_entry.completed_at = datetime.utcnow()
            log_entry.status = 'failed'
            log_entry.error_message = str(e)
            self.db.add(log_entry)
            self.db.commit()
            logger.error(f"Failed to import defense data from PBP: {e}")
            raise

    def _seasonal_from_pbp(self, year: int) -> pd.DataFrame:
        """Build seasonal stats from PBP data when import_seasonal_data() is unavailable."""
        logger.info(f"Building seasonal stats from PBP for {year}")
        pbp = nfl.import_pbp_data([year], columns=[
            'season', 'season_type', 'game_id', 'week',
            'passer_player_id', 'passer_player_name',
            'rusher_player_id', 'rusher_player_name',
            'receiver_player_id', 'receiver_player_name',
            'epa', 'pass', 'rush', 'complete_pass',
            'yards_gained', 'touchdown', 'interception',
            'pass_attempt', 'rush_attempt',
        ])
        reg = pbp[pbp['season_type'] == 'REG'].copy()

        # Compute per-player aggregates
        all_players = {}

        def ensure(pid):
            if pid not in all_players:
                all_players[pid] = {
                    'player_id': pid, 'season': year, 'season_type': 'REG',
                    'passing_epa': 0.0, 'rushing_epa': 0.0, 'receiving_epa': 0.0,
                    'attempts': 0, 'completions': 0, 'passing_yards': 0.0,
                    'passing_tds': 0, 'interceptions': 0,
                    'carries': 0, 'rushing_yards': 0.0, 'rushing_tds': 0,
                    'targets': 0, 'receptions': 0, 'receiving_yards': 0.0, 'receiving_tds': 0,
                    'games_set': set(),
                }

        # Passing plays
        pass_plays = reg[(reg['pass'] == 1) & reg['passer_player_id'].notna()]
        for _, row in pass_plays.iterrows():
            pid = row['passer_player_id']
            ensure(pid)
            p = all_players[pid]
            p['passing_epa'] += row['epa'] if pd.notna(row['epa']) else 0
            if row.get('pass_attempt') == 1:
                p['attempts'] += 1
                if row.get('complete_pass') == 1:
                    p['completions'] += 1
                    p['passing_yards'] += row['yards_gained'] if pd.notna(row['yards_gained']) else 0
                if row.get('touchdown') == 1:
                    p['passing_tds'] += 1
                if row.get('interception') == 1:
                    p['interceptions'] += 1
            p['games_set'].add(row['game_id'])

        # Rushing plays
        rush_plays = reg[(reg['rush'] == 1) & reg['rusher_player_id'].notna()]
        for _, row in rush_plays.iterrows():
            pid = row['rusher_player_id']
            ensure(pid)
            p = all_players[pid]
            p['rushing_epa'] += row['epa'] if pd.notna(row['epa']) else 0
            if row.get('rush_attempt') == 1:
                p['carries'] += 1
                p['rushing_yards'] += row['yards_gained'] if pd.notna(row['yards_gained']) else 0
            if row.get('touchdown') == 1:
                p['rushing_tds'] += 1
            p['games_set'].add(row['game_id'])

        # Receiving plays (targets = pass attempt to that player, receptions = complete)
        rec_plays = reg[(reg['pass'] == 1) & reg['receiver_player_id'].notna()]
        for _, row in rec_plays.iterrows():
            pid = row['receiver_player_id']
            ensure(pid)
            p = all_players[pid]
            p['targets'] += 1
            if row.get('complete_pass') == 1:
                p['receiving_epa'] += row['epa'] if pd.notna(row['epa']) else 0
                p['receptions'] += 1
                p['receiving_yards'] += row['yards_gained'] if pd.notna(row['yards_gained']) else 0
                if row.get('touchdown') == 1:
                    p['receiving_tds'] += 1
            p['games_set'].add(row['game_id'])

        if not all_players:
            return None

        records = []
        for p in all_players.values():
            p['games'] = len(p.pop('games_set'))
            records.append(p)

        return pd.DataFrame(records)

    def import_seasonal_stats(self, years: List[int], mode: Literal['replace', 'upsert'] = 'upsert') -> Dict:
        """Import seasonal aggregated stats from nfl_data_py (EPA, fantasy, advanced metrics)."""
        if not years:
            raise ValueError("years list must not be empty")

        log_entry = NGSRefreshLog(
            refresh_type='incremental' if len(years) == 1 else 'full',
            stat_type='seasonal',
            seasons_updated=str(years),
            started_at=datetime.utcnow()
        )

        try:
            logger.info(f"Fetching seasonal data for years {years}")
            dfs = []
            for year in years:
                try:
                    year_df = _retry_fetch(nfl.import_seasonal_data, [year])
                    dfs.append(year_df)
                    logger.info(f"Fetched seasonal data for {year}: {len(year_df)} rows")
                except (DataSourceError, Exception) as e:
                    logger.warning(f"No seasonal data available for {year} (trying PBP fallback): {e}")
                    try:
                        year_df = self._seasonal_from_pbp(year)
                        if year_df is not None and not year_df.empty:
                            dfs.append(year_df)
                            logger.info(f"Built seasonal data from PBP for {year}: {len(year_df)} rows")
                    except Exception as e2:
                        logger.warning(f"PBP fallback also failed for {year}: {e2}")
            if not dfs:
                raise DataSourceError(f"No seasonal data available for any of {years}")
            df = pd.concat(dfs, ignore_index=True)

            if df.empty:
                raise ValueError(f"No seasonal data returned for {years}")

            logger.info(f"Fetched {len(df)} rows of seasonal data")

            column_map = {
                'player_id': 'player_id',
                'season': 'season',
                'season_type': 'season_type',
                'player_name': 'player_name',
                'player_display_name': 'player_display_name',
                'position': 'position',
                'position_group': 'position_group',
                'recent_team': 'recent_team',
                'games': 'games',
                'passing_epa': 'passing_epa',
                'rushing_epa': 'rushing_epa',
                'receiving_epa': 'receiving_epa',
                'completions': 'completions',
                'attempts': 'attempts',
                'passing_yards': 'passing_yards',
                'passing_tds': 'passing_tds',
                'interceptions': 'interceptions',
                'passing_air_yards': 'passing_air_yards',
                'passing_yards_after_catch': 'passing_yards_after_catch',
                'passing_first_downs': 'passing_first_downs',
                'passing_2pt_conversions': 'passing_2pt_conversions',
                'carries': 'carries',
                'rushing_yards': 'rushing_yards',
                'rushing_tds': 'rushing_tds',
                'rushing_first_downs': 'rushing_first_downs',
                'rushing_fumbles': 'rushing_fumbles',
                'rushing_fumbles_lost': 'rushing_fumbles_lost',
                'rushing_2pt_conversions': 'rushing_2pt_conversions',
                'targets': 'targets',
                'receptions': 'receptions',
                'receiving_yards': 'receiving_yards',
                'receiving_tds': 'receiving_tds',
                'receiving_air_yards': 'receiving_air_yards',
                'receiving_yards_after_catch': 'receiving_yards_after_catch',
                'receiving_first_downs': 'receiving_first_downs',
                'receiving_fumbles': 'receiving_fumbles',
                'receiving_fumbles_lost': 'receiving_fumbles_lost',
                'receiving_2pt_conversions': 'receiving_2pt_conversions',
                'sacks': 'sacks',
                'sack_yards': 'sack_yards',
                'sack_fumbles': 'sack_fumbles',
                'sack_fumbles_lost': 'sack_fumbles_lost',
                'target_share': 'target_share',
                'air_yards_share': 'air_yards_share',
                'wopr_x': 'wopr_x',
                'wopr_y': 'wopr_y',
                'racr': 'racr',
                'pacr': 'pacr',
                'dakota': 'dakota',
                'fantasy_points': 'fantasy_points',
                'fantasy_points_ppr': 'fantasy_points_ppr',
            }

            available_cols = {k: v for k, v in column_map.items() if k in df.columns}
            df_mapped = df[list(available_cols.keys())].rename(columns=available_cols)
            df_mapped = df_mapped.where(pd.notnull(df_mapped), None)
            records = df_mapped.to_dict('records')

            if mode == 'replace':
                deleted = self.db.query(SeasonalStats).filter(
                    SeasonalStats.season.in_(years)
                ).delete(synchronize_session=False)
                logger.info(f"Deleted {deleted} existing seasonal rows")
                self.db.bulk_insert_mappings(SeasonalStats, records)
                rows_inserted = len(records)
                rows_updated = 0
            else:
                rows_inserted = 0
                rows_updated = 0
                for record in records:
                    existing = self.db.query(SeasonalStats).filter(
                        SeasonalStats.season == record.get('season'),
                        SeasonalStats.season_type == record.get('season_type'),
                        SeasonalStats.player_id == record.get('player_id')
                    ).first()

                    if existing:
                        for key, value in record.items():
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                        existing.updated_at = datetime.utcnow()
                        rows_updated += 1
                    else:
                        self.db.add(SeasonalStats(**record))
                        rows_inserted += 1

            self.db.commit()

            log_entry.rows_inserted = rows_inserted
            log_entry.rows_updated = rows_updated
            log_entry.completed_at = datetime.utcnow()
            log_entry.status = 'success'
            self.db.add(log_entry)
            self.db.commit()

            logger.info(f"Successfully imported seasonal stats: {rows_inserted} new, {rows_updated} updated")
            return {
                'status': 'success',
                'stat_type': 'seasonal',
                'years': years,
                'rows_inserted': rows_inserted,
                'rows_updated': rows_updated,
                'total_rows': rows_inserted + rows_updated
            }

        except Exception as e:
            self.db.rollback()
            log_entry.completed_at = datetime.utcnow()
            log_entry.status = 'failed'
            log_entry.error_message = str(e)
            self.db.add(log_entry)
            self.db.commit()
            logger.error(f"Failed to import seasonal data: {e}")
            raise

    def full_refresh(self, start_year: int = 2016, end_year: int = None) -> Dict:
        """
        Perform full refresh of all NGS data.

        Args:
            start_year: First year to import (default 2016 - NGS start)
            end_year: Last year to import (default current year)
        """
        if end_year is None:
            end_year = datetime.now().year

        years = list(range(start_year, end_year + 1))
        results = {}

        logger.info(f"Starting full refresh for years {start_year}-{end_year}")

        for stat_type in ['passing', 'receiving', 'rushing']:
            try:
                result = self.import_data(stat_type, years, mode='upsert')
                results[stat_type] = result
            except Exception as e:
                results[stat_type] = {'status': 'failed', 'error': str(e)}

        try:
            result = self.import_seasonal_stats(years, mode='upsert')
            results['seasonal'] = result
        except Exception as e:
            results['seasonal'] = {'status': 'failed', 'error': str(e)}

        try:
            result = self.import_defense_from_pbp(years, mode='upsert')
            results['defense'] = result
        except Exception as e:
            results['defense'] = {'status': 'failed', 'error': str(e)}

        return results

    def incremental_refresh(self, season: int = None) -> Dict:
        """
        Refresh only current season data.

        Args:
            season: Season to refresh (default current year)
        """
        if season is None:
            season = datetime.now().year

        logger.info(f"Starting incremental refresh for season {season}")

        results = {}

        for stat_type in ['passing', 'receiving', 'rushing']:
            try:
                result = self.import_data(stat_type, [season], mode='upsert')
                results[stat_type] = result
            except Exception as e:
                results[stat_type] = {'status': 'failed', 'error': str(e)}

        try:
            result = self.import_seasonal_stats([season], mode='upsert')
            results['seasonal'] = result
        except Exception as e:
            results['seasonal'] = {'status': 'failed', 'error': str(e)}

        try:
            result = self.import_defense_from_pbp([season], mode='upsert')
            results['defense'] = result
        except Exception as e:
            results['defense'] = {'status': 'failed', 'error': str(e)}

        return results

    def get_refresh_history(self, limit: int = 10) -> List[Dict]:
        """Get recent refresh history."""
        logs = self.db.query(NGSRefreshLog).order_by(
            NGSRefreshLog.started_at.desc()
        ).limit(limit).all()

        return [
            {
                'id': log.id,
                'refresh_type': log.refresh_type,
                'stat_type': log.stat_type,
                'seasons_updated': log.seasons_updated,
                'rows_inserted': log.rows_inserted,
                'rows_updated': log.rows_updated,
                'started_at': log.started_at.isoformat() if log.started_at else None,
                'completed_at': log.completed_at.isoformat() if log.completed_at else None,
                'status': log.status,
                'error_message': log.error_message
            }
            for log in logs
        ]

    def get_database_stats(self) -> Dict:
        """Get current database statistics."""
        stats = {}

        for stat_type, model in self.MODEL_MAP.items():
            count = self.db.query(model).count()

            latest = self.db.query(model).order_by(
                model.season.desc(),
                model.week.desc()
            ).first()

            stats[stat_type] = {
                'total_rows': count,
                'latest_season': latest.season if latest else None,
                'latest_week': latest.week if latest else None,
                'last_updated': latest.updated_at.isoformat() if latest and latest.updated_at else None
            }

        total_refreshes = self.db.query(NGSRefreshLog).count()
        last_refresh = self.db.query(NGSRefreshLog).order_by(
            NGSRefreshLog.completed_at.desc()
        ).first()

        stats['refresh_log'] = {
            'total_refreshes': total_refreshes,
            'last_refresh': last_refresh.completed_at.isoformat() if last_refresh and last_refresh.completed_at else None,
            'last_status': last_refresh.status if last_refresh else None
        }

        return stats
