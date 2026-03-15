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
                    logger.warning(f"No seasonal data available for {year}: {e}")
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

        for stat_type in self.STAT_TYPES:
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

        for stat_type in self.STAT_TYPES:
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
