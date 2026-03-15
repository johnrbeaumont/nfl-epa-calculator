#!/usr/bin/env python3
"""
Standalone script to refresh NGS data
Can be run manually or via cron/GitHub Actions

Usage:
    python refresh_ngs_data.py --mode full --start-year 2016
    python refresh_ngs_data.py --mode incremental
"""
import sys
import os
from pathlib import Path

# Add parent directory to path so we can import from app/
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, init_db
from app.ngs_scraper import NGSDataImporter
import logging
from datetime import datetime
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description='Refresh NFL Next Gen Stats data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full refresh (all years from 2016 to present)
  python refresh_ngs_data.py --mode full

  # Full refresh with custom year range
  python refresh_ngs_data.py --mode full --start-year 2020 --end-year 2024

  # Incremental refresh (current season only)
  python refresh_ngs_data.py --mode incremental

  # Incremental refresh for specific season
  python refresh_ngs_data.py --mode incremental --season 2023
        """
    )

    parser.add_argument(
        '--mode',
        choices=['full', 'incremental'],
        default='incremental',
        help='Refresh mode: full (all years) or incremental (current season)'
    )
    parser.add_argument(
        '--start-year',
        type=int,
        default=2016,
        help='Start year for full refresh (default: 2016 - NGS era start)'
    )
    parser.add_argument(
        '--end-year',
        type=int,
        help='End year for full refresh (default: current year)'
    )
    parser.add_argument(
        '--season',
        type=int,
        help='Specific season for incremental refresh (default: current year)'
    )

    args = parser.parse_args()

    # Print header
    logger.info("=" * 80)
    logger.info(f"NFL NEXT GEN STATS DATA REFRESH - {args.mode.upper()} MODE")
    logger.info("=" * 80)
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("")

    # Ensure data directory exists
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(exist_ok=True)
    logger.info(f"Data directory: {data_dir}")

    # Initialize database
    logger.info("Initializing database...")
    init_db()
    logger.info("✓ Database tables ready")
    logger.info("")

    # Create session
    db = SessionLocal()

    try:
        importer = NGSDataImporter(db)

        # Show database stats before refresh
        logger.info("Current database state:")
        pre_stats = importer.get_database_stats()
        for stat_type, stats in pre_stats.items():
            if stat_type == 'refresh_log':
                logger.info(f"  {stat_type}: {stats['total_refreshes']} refreshes")
            else:
                logger.info(f"  {stat_type}: {stats['total_rows']} rows (latest: {stats['latest_season']} week {stats['latest_week']})")
        logger.info("")

        # Perform refresh
        if args.mode == 'full':
            end_year = args.end_year if args.end_year else datetime.now().year
            logger.info(f"Starting full refresh: {args.start_year} to {end_year}")
            logger.info(f"This will update {end_year - args.start_year + 1} seasons across 3 stat types")
            logger.info("")

            results = importer.full_refresh(args.start_year, end_year)

        else:  # incremental
            season = args.season if args.season else datetime.now().year
            logger.info(f"Starting incremental refresh for season {season}")
            logger.info("")

            results = importer.incremental_refresh(season)

        # Print results
        logger.info("")
        logger.info("=" * 80)
        logger.info("REFRESH COMPLETE")
        logger.info("=" * 80)

        success_count = 0
        failed_count = 0

        for stat_type, result in results.items():
            if result.get('status') == 'success':
                success_count += 1
                logger.info(
                    f"✓ {stat_type.upper()}: {result['rows_inserted']} inserted, "
                    f"{result['rows_updated']} updated ({result['total_rows']} total)"
                )
            else:
                failed_count += 1
                logger.error(f"✗ {stat_type.upper()}: FAILED - {result.get('error', 'Unknown error')}")

        logger.info("")
        logger.info(f"Summary: {success_count} succeeded, {failed_count} failed")

        # Show database stats after refresh
        logger.info("")
        logger.info("Updated database state:")
        post_stats = importer.get_database_stats()
        for stat_type, stats in post_stats.items():
            if stat_type == 'refresh_log':
                logger.info(f"  {stat_type}: {stats['total_refreshes']} refreshes")
            else:
                logger.info(f"  {stat_type}: {stats['total_rows']} rows (latest: {stats['latest_season']} week {stats['latest_week']})")

        # Show recent refresh history
        logger.info("")
        logger.info("Recent refresh history:")
        history = importer.get_refresh_history(limit=5)
        for entry in history:
            status_icon = "✓" if entry['status'] == 'success' else "✗"
            logger.info(
                f"  {status_icon} {entry['stat_type']:10s} | {entry['refresh_type']:12s} | "
                f"{entry['started_at'][:19]} | ins:{entry['rows_inserted']:4d} upd:{entry['rows_updated']:4d}"
            )

        logger.info("")
        logger.info("=" * 80)

        return 0 if failed_count == 0 else 1

    except Exception as e:
        logger.error("")
        logger.error("=" * 80)
        logger.error("FATAL ERROR")
        logger.error("=" * 80)
        logger.error(f"Error: {e}")
        logger.error("", exc_info=True)
        return 1

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
