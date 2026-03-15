#!/usr/bin/env python3
"""
Execute NGS Insights Analysis
Runs all 5 analyses and saves visualizations
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import sqlite3
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Set plotting style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette('husl')
pd.set_option('display.max_columns', None)
pd.set_option('display.precision', 2)

# Output directory
OUTPUT_DIR = Path('../backend/data/ngs_visualizations')
OUTPUT_DIR.mkdir(exist_ok=True)

print("="*80)
print("NFL NEXT GEN STATS - 5 FASCINATING INSIGHTS")
print("="*80)
print()

# Load data
print("📊 Loading data from database...")
db_path = Path('../backend/data/ngs_stats.db')
conn = sqlite3.connect(db_path)

passing = pd.read_sql_query("SELECT * FROM ngs_passing", conn)
receiving = pd.read_sql_query("SELECT * FROM ngs_receiving", conn)
rushing = pd.read_sql_query("SELECT * FROM ngs_rushing", conn)

print(f"✓ Data loaded successfully")
print(f"  Passing: {len(passing):,} records")
print(f"  Receiving: {len(receiving):,} records")
print(f"  Rushing: {len(rushing):,} records")
print()

# ============================================================================
# ANALYSIS 1: QB AGGRESSIVENESS VS ACCURACY
# ============================================================================
print("="*80)
print("ANALYSIS 1: QB Play Style - Aggressiveness vs Accuracy")
print("="*80)

qb_2024 = passing[
    (passing['season'] == 2024) &
    (passing['week'] == 0) &
    (passing['attempts'] >= 200)
].copy()

print(f"\n📈 Analyzing {len(qb_2024)} QBs with 200+ attempts in 2024")

plt.figure(figsize=(12, 8))
colors = qb_2024['completion_percentage_above_expectation'].apply(
    lambda x: 'green' if x > 0 else 'red'
)

plt.scatter(
    qb_2024['aggressiveness'],
    qb_2024['completion_percentage_above_expectation'],
    s=qb_2024['attempts'] / 2,
    c=colors,
    alpha=0.6,
    edgecolors='black',
    linewidth=1
)

plt.axhline(y=0, color='gray', linestyle='--', linewidth=1, alpha=0.5)
plt.axvline(x=qb_2024['aggressiveness'].median(), color='gray', linestyle='--', linewidth=1, alpha=0.5)

top_cpoe = qb_2024.nlargest(3, 'completion_percentage_above_expectation')
for _, qb in top_cpoe.iterrows():
    plt.annotate(
        qb['player_display_name'],
        (qb['aggressiveness'], qb['completion_percentage_above_expectation']),
        xytext=(5, 5),
        textcoords='offset points',
        fontsize=9,
        fontweight='bold'
    )

plt.xlabel('Aggressiveness (% passes into tight coverage)', fontsize=12, fontweight='bold')
plt.ylabel('Completion % Above Expectation (CPOE)', fontsize=12, fontweight='bold')
plt.title('QB Play Style: Aggressive vs Conservative (2024 Season)\\n' +
          'Size = Pass Attempts | Color = Above (Green) or Below (Red) Expected',
          fontsize=14, fontweight='bold', pad=20)

plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '01_qb_aggressiveness_vs_cpoe.png', dpi=150, bbox_inches='tight')
print(f"✓ Saved visualization: 01_qb_aggressiveness_vs_cpoe.png")

correlation = qb_2024['aggressiveness'].corr(qb_2024['completion_percentage_above_expectation'])
print(f"\n📊 Correlation: {correlation:.3f}")
print(f"\n🎯 Top 3 QBs by CPOE (2024):")
print(top_cpoe[['player_display_name', 'team_abbr', 'attempts', 'aggressiveness', 'completion_percentage_above_expectation']].to_string(index=False))

if abs(correlation) < 0.1:
    print("\n💡 Key Insight: Aggressiveness has little correlation with CPOE.")
    print("   QB skill matters more than play style!")
print()

# ============================================================================
# ANALYSIS 2: WR SEPARATION VS YAC
# ============================================================================
print("="*80)
print("ANALYSIS 2: WR Separation - Does Space Create YAC?")
print("="*80)

wr_2024 = receiving[
    (receiving['season'] == 2024) &
    (receiving['week'] == 0) &
    (receiving['targets'] >= 50)
].copy()

print(f"\n📈 Analyzing {len(wr_2024)} WRs/TEs with 50+ targets in 2024")

plt.figure(figsize=(12, 8))
position_colors = {'WR': '#1f77b4', 'TE': '#ff7f0e'}

for pos in ['WR', 'TE']:
    subset = wr_2024[wr_2024['player_position'] == pos]
    if len(subset) > 0:
        plt.scatter(
            subset['avg_separation'],
            subset['avg_yac_above_expectation'],
            s=subset['targets'] * 2,
            c=position_colors[pos],
            alpha=0.6,
            edgecolors='black',
            linewidth=1,
            label=pos
        )

plt.axhline(y=0, color='gray', linestyle='--', linewidth=1, alpha=0.5)
plt.axvline(x=wr_2024['avg_separation'].median(), color='gray', linestyle='--', linewidth=1, alpha=0.5)

elite = wr_2024[
    (wr_2024['avg_separation'] > 2.8) &
    (wr_2024['avg_yac_above_expectation'] > 1.0)
]
for _, wr in elite.iterrows():
    plt.annotate(
        wr['player_display_name'],
        (wr['avg_separation'], wr['avg_yac_above_expectation']),
        xytext=(5, 5),
        textcoords='offset points',
        fontsize=9,
        fontweight='bold'
    )

plt.xlabel('Average Separation at Catch (yards)', fontsize=12, fontweight='bold')
plt.ylabel('Yards After Catch Above Expected', fontsize=12, fontweight='bold')
plt.title('WR/TE Separation vs YAC Ability (2024 Season)\\n' +
          'Size = Targets | WRs in Blue, TEs in Orange',
          fontsize=14, fontweight='bold', pad=20)

plt.legend(loc='upper left', fontsize=11)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '02_wr_separation_vs_yac.png', dpi=150, bbox_inches='tight')
print(f"✓ Saved visualization: 02_wr_separation_vs_yac.png")

correlation = wr_2024['avg_separation'].corr(wr_2024['avg_yac_above_expectation'])
print(f"\n📊 Correlation: {correlation:.3f}")

top_sep = wr_2024.nlargest(5, 'avg_separation')[['player_display_name', 'team_abbr', 'targets', 'avg_separation', 'avg_yac_above_expectation']]
print(f"\n🏈 Top 5 Separators (2024):")
print(top_sep.to_string(index=False))
print()

# ============================================================================
# ANALYSIS 3: RB EFFICIENCY TRENDS
# ============================================================================
print("="*80)
print("ANALYSIS 3: RB Efficiency Over Time")
print("="*80)

rb_seasons = rushing[
    (rushing['week'] == 0) &
    (rushing['rush_attempts'] >= 100) &
    (rushing['season'].between(2020, 2024))
].copy()

rb_counts = rb_seasons.groupby('player_display_name').size()
consistent_rbs = rb_counts[rb_counts >= 3].index

rb_trends = rb_seasons[rb_seasons['player_display_name'].isin(consistent_rbs)].copy()

avg_yoe = rb_trends.groupby('player_display_name')['rush_yards_over_expected'].mean()
top_10_rbs = avg_yoe.nlargest(10).index

print(f"\n📈 Analyzing {len(top_10_rbs)} RBs with 3+ seasons of 100+ attempts (2020-2024)")

plt.figure(figsize=(14, 8))

for rb in top_10_rbs:
    rb_data = rb_trends[rb_trends['player_display_name'] == rb].sort_values('season')
    plt.plot(
        rb_data['season'],
        rb_data['rush_yards_over_expected'],
        marker='o',
        linewidth=2,
        markersize=8,
        label=rb,
        alpha=0.8
    )

plt.axhline(y=0, color='red', linestyle='--', linewidth=2, alpha=0.5, label='Expected Value')

plt.xlabel('Season', fontsize=12, fontweight='bold')
plt.ylabel('Yards Over Expected', fontsize=12, fontweight='bold')
plt.title('RB Efficiency Trends (2020-2024)\\n' +
          'Top 10 RBs by Average Yards Over Expected (min 100 attempts/season)',
          fontsize=14, fontweight='bold', pad=20)

plt.legend(loc='upper left', bbox_to_anchor=(1.02, 1), fontsize=10)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '03_rb_efficiency_trends.png', dpi=150, bbox_inches='tight')
print(f"✓ Saved visualization: 03_rb_efficiency_trends.png")

consistency = rb_trends[rb_trends['player_display_name'].isin(top_10_rbs)].groupby('player_display_name').agg({
    'rush_yards_over_expected': ['mean', 'min', 'max'],
    'season': 'count'
}).round(0)
consistency.columns = ['Avg YOE', 'Min YOE', 'Max YOE', 'Seasons']

print(f"\n💪 Most Consistent Elite RBs (2020-2024):")
print(consistency.sort_values('Avg YOE', ascending=False).to_string())
print()

# ============================================================================
# ANALYSIS 4: QB RELEASE SPEED VS ACCURACY
# ============================================================================
print("="*80)
print("ANALYSIS 4: QB Processing Speed - Fast Release vs Accuracy")
print("="*80)

qb_2024['release_speed'] = pd.cut(
    qb_2024['avg_time_to_throw'],
    bins=[0, 2.5, 2.7, 2.9, 5],
    labels=['Very Fast (<2.5s)', 'Fast (2.5-2.7s)', 'Average (2.7-2.9s)', 'Slow (>2.9s)']
)

print(f"\n📈 Categorizing {len(qb_2024)} QBs by release speed")

plt.figure(figsize=(12, 8))

sns.boxplot(
    data=qb_2024,
    x='release_speed',
    y='completion_percentage_above_expectation',
    palette='RdYlGn',
    width=0.6
)

sns.stripplot(
    data=qb_2024,
    x='release_speed',
    y='completion_percentage_above_expectation',
    color='black',
    alpha=0.4,
    size=6
)

plt.axhline(y=0, color='red', linestyle='--', linewidth=2, alpha=0.5)

plt.xlabel('Release Speed Category', fontsize=12, fontweight='bold')
plt.ylabel('Completion % Above Expectation (CPOE)', fontsize=12, fontweight='bold')
plt.title('QB Processing Speed vs Accuracy (2024 Season)\\n' +
          'Do Quick Releases Lead to Better Completion Rates?',
          fontsize=14, fontweight='bold', pad=20)

plt.grid(True, axis='y', alpha=0.3)
plt.xticks(rotation=15)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '04_qb_release_speed_vs_cpoe.png', dpi=150, bbox_inches='tight')
print(f"✓ Saved visualization: 04_qb_release_speed_vs_cpoe.png")

speed_stats = qb_2024.groupby('release_speed')['completion_percentage_above_expectation'].agg(['count', 'mean', 'std'])
speed_stats.columns = ['QBs', 'Avg CPOE', 'Std Dev']
print(f"\n⚡ Release Speed vs CPOE Breakdown:")
print(speed_stats.round(2).to_string())
print()

# ============================================================================
# ANALYSIS 5: POWER RUNNING
# ============================================================================
print("="*80)
print("ANALYSIS 5: Power Running - Success Against Loaded Boxes")
print("="*80)

rb_2024 = rushing[
    (rushing['season'] == 2024) &
    (rushing['week'] == 0) &
    (rushing['rush_attempts'] >= 100)
].copy()

print(f"\n📈 Analyzing {len(rb_2024)} RBs with 100+ attempts in 2024")

plt.figure(figsize=(12, 8))

colors = rb_2024['efficiency'].apply(
    lambda x: 'darkgreen' if x > 3.5 else 'green' if x > 3.0 else 'orange' if x > 2.5 else 'red'
)

plt.scatter(
    rb_2024['percent_attempts_gte_eight_defenders'],
    rb_2024['rush_yards_over_expected'],
    s=rb_2024['rush_attempts'] * 2,
    c=colors,
    alpha=0.6,
    edgecolors='black',
    linewidth=1
)

plt.axhline(y=0, color='gray', linestyle='--', linewidth=1, alpha=0.5, label='Expected Value')
plt.axvline(x=rb_2024['percent_attempts_gte_eight_defenders'].median(),
            color='gray', linestyle='--', linewidth=1, alpha=0.5, label='Median Box %')

power_backs = rb_2024[
    (rb_2024['percent_attempts_gte_eight_defenders'] > 25) &
    (rb_2024['rush_yards_over_expected'] > 200)
]
for _, rb in power_backs.iterrows():
    plt.annotate(
        rb['player_display_name'],
        (rb['percent_attempts_gte_eight_defenders'], rb['rush_yards_over_expected']),
        xytext=(5, 5),
        textcoords='offset points',
        fontsize=9,
        fontweight='bold'
    )

efficient = rb_2024.nlargest(2, 'rush_yards_over_expected')
for _, rb in efficient.iterrows():
    if rb['player_display_name'] not in power_backs['player_display_name'].values:
        plt.annotate(
            rb['player_display_name'],
            (rb['percent_attempts_gte_eight_defenders'], rb['rush_yards_over_expected']),
            xytext=(5, -15),
            textcoords='offset points',
            fontsize=9,
            fontweight='bold',
            color='blue'
        )

plt.xlabel('% of Attempts vs 8+ Defenders (Stacked Box)', fontsize=12, fontweight='bold')
plt.ylabel('Yards Over Expected', fontsize=12, fontweight='bold')
plt.title('Power Running: Success Against Loaded Boxes (2024 Season)\\n' +
          'Size = Attempts | Color = Efficiency (Dark Green > Green > Orange > Red)',
          fontsize=14, fontweight='bold', pad=20)

plt.legend(loc='upper right', fontsize=10)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '05_power_running_stacked_boxes.png', dpi=150, bbox_inches='tight')
print(f"✓ Saved visualization: 05_power_running_stacked_boxes.png")

power_ranking = rb_2024[
    rb_2024['percent_attempts_gte_eight_defenders'] > rb_2024['percent_attempts_gte_eight_defenders'].quantile(0.6)
].nlargest(10, 'rush_yards_over_expected')[[ 'player_display_name', 'team_abbr', 'percent_attempts_gte_eight_defenders',
    'rush_yards_over_expected', 'efficiency'
]]
power_ranking.columns = ['Player', 'Team', 'Stacked Box %', 'YOE', 'Efficiency']

print(f"\n💪 Top Power Backs (High Stacked Box % + High YOE):")
print(power_ranking.round(1).to_string(index=False))

correlation = rb_2024['percent_attempts_gte_eight_defenders'].corr(rb_2024['rush_yards_over_expected'])
print(f"\n📊 Correlation between Stacked Box % and YOE: {correlation:.3f}")
print()

# ============================================================================
# SUMMARY
# ============================================================================
print("="*80)
print("ANALYSIS COMPLETE!")
print("="*80)
print(f"\n✓ All visualizations saved to: {OUTPUT_DIR}")
print(f"\nGenerated files:")
print(f"  1. 01_qb_aggressiveness_vs_cpoe.png")
print(f"  2. 02_wr_separation_vs_yac.png")
print(f"  3. 03_rb_efficiency_trends.png")
print(f"  4. 04_qb_release_speed_vs_cpoe.png")
print(f"  5. 05_power_running_stacked_boxes.png")
print()

conn.close()
print("✓ Database connection closed")
print()
print("🎉 Analysis complete! Check the visualizations to see the insights.")
