"""
Download nflfastR play-by-play data for NFL seasons 2016-2024

Uses nfl_data_py package (Python wrapper for nflverse data)
Data source: https://github.com/nflverse/nflverse-data
"""

try:
    import nfl_data_py as nfl
    import pandas as pd
except ImportError:
    print("Error: nfl_data_py not installed")
    print("Please run: pip install nfl_data_py")
    exit(1)

from pathlib import Path

# Create data directory
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

# Seasons to download (2016-2024)
seasons = list(range(2016, 2025))

print("=" * 60)
print("Downloading nflfastR Play-by-Play Data")
print("=" * 60)
print(f"Seasons: {seasons[0]}-{seasons[-1]}")
print(f"Output: {data_dir.absolute()}")
print()
print("This may take a few minutes...")
print()

try:
    # Download play-by-play data for all seasons
    print("⬇️  Downloading data from nflverse...")
    pbp_data = nfl.import_pbp_data(seasons, downcast=True)

    print(f"✓ Downloaded {len(pbp_data):,} plays")
    print(f"  Seasons: {pbp_data['season'].unique().tolist()}")
    print(f"  Columns: {len(pbp_data.columns)}")
    print()

    # Save combined data
    combined_file = data_dir / "play_by_play_2016_2024.parquet"
    print(f"💾 Saving combined data to: {combined_file.name}")
    pbp_data.to_parquet(combined_file, index=False)

    size_mb = combined_file.stat().st_size / (1024 * 1024)
    print(f"✓ Saved successfully ({size_mb:.1f} MB)")
    print()

    # Also save individual season files for easier handling
    print("💾 Saving individual season files...")
    for season in seasons:
        season_data = pbp_data[pbp_data['season'] == season]
        season_file = data_dir / f"play_by_play_{season}.parquet"
        season_data.to_parquet(season_file, index=False)
        print(f"  ✓ {season}: {len(season_data):,} plays")

    print()
    print("=" * 60)
    print("Download Complete!")
    print("=" * 60)
    print()
    print(f"📂 Files saved to: {data_dir.absolute()}")
    print(f"📊 Total plays: {len(pbp_data):,}")
    print(f"📅 Seasons: {seasons[0]}-{seasons[-1]}")
    print()
    print("Next step: Set up Python environment (requirements.txt)")

except Exception as e:
    print(f"✗ Error downloading data: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check internet connection")
    print("2. Ensure nfl_data_py is installed: pip install nfl_data_py")
    print("3. Try again - GitHub releases can be slow sometimes")
