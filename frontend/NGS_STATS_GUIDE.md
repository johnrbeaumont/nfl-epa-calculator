# Next Gen Stats Explorer - User Guide

## 🎯 Overview

The Next Gen Stats Explorer is a sleek, interactive interface for exploring NFL player tracking data from 2016-present. Built with React and powered by your FastAPI backend.

## ✨ Features

### 📊 Three Stat Categories

**Passing (QB Metrics)**
- Completion Percentage Above Expectation (CPOE)
- Average Time to Throw
- Aggressiveness
- Passer Rating

**Receiving (WR/TE Metrics)**
- Average Separation
- Yards After Catch Above Expected (YAC+)
- Catch Percentage
- Total Yards

**Rushing (RB Metrics)**
- Yards Over Expected
- Efficiency
- Yards Over Expected per Attempt
- Yards Per Carry

### 🔍 Powerful Filters

- **Season**: Select any season from 2016-2024
- **Week**: Choose season totals or individual weeks (regular season + playoffs)
- **Minimum Threshold**: Filter by minimum attempts/targets to focus on regular contributors
- **Search**: Find specific players or filter by team

### 📋 Interactive Table

- **Click column headers** to sort by any metric
- **Color-coded values** - Green for positive "over expected" metrics, red for negative
- **Responsive design** - Works on desktop, tablet, and mobile
- **Rank display** - See where each player ranks in the current view

## 🎨 Design Features

### Color Coding
- 🟢 **Green** = Above expected (good performance)
- 🔴 **Red** = Below expected (poor performance)
- ⚫ **Gray** = Standard metrics

### Badges
- Team abbreviations shown as blue badges
- Player positions shown under names

### Hover Effects
- Table rows highlight on hover
- Column headers highlight when sortable

## 🚀 Usage Examples

### Example 1: Find Top QBs by CPOE in 2024
1. Select **Passing** tab
2. Set Season to **2024**
3. Set Week to **Season Total**
4. Set Min Attempts to **200** (filters out backups)
5. Click **CPOE** column header to sort

### Example 2: Compare WRs with High Separation
1. Select **Receiving** tab
2. Set Season to **2024**
3. Set Min Targets to **50**
4. Click **Avg Separation** header to sort
5. See which receivers create the most space

### Example 3: Find Efficient RBs
1. Select **Rushing** tab
2. Set Season to **2024**
3. Set Min Attempts to **100**
4. Click **Yards Over Expected** to sort
5. Identify which RBs create value beyond blocking

### Example 4: Search for Specific Player
1. Enter player name in search box (e.g., "Mahomes")
2. View their stats across all metrics
3. Change seasons to see year-over-year trends

### Example 5: Analyze Playoff Performance
1. Select any stat category
2. Choose Season **2024**
3. Select Week **Wild Card**, **Divisional**, **Championship**, or **Super Bowl**
4. See how players perform in high-pressure games

## 📱 Responsive Design

The interface automatically adapts to your screen size:
- **Desktop**: Full table with all columns
- **Tablet**: Scrollable table with touch-friendly interactions
- **Mobile**: Horizontal scroll for table, vertical stack for filters

## 🔄 Data Updates

- Click the **🔄 Refresh** button to reload current view
- Backend data refreshes automatically via GitHub Actions
- Manual refresh available through API

## 💡 Tips

1. **Start with season totals (Week 0)** - Best for overall rankings
2. **Use minimum thresholds** - Filters out players with small sample sizes
3. **Sort by "over expected" metrics** - These show true skill vs situation
4. **Compare across seasons** - Track player development over time
5. **Check different weeks** - Identify hot/cold streaks

## 🎯 Key Metrics Explained

### CPOE (Completion Percentage Above Expectation)
- How much better/worse a QB completes passes vs expected difficulty
- Positive = Better than expected
- Accounts for throw distance, coverage, etc.

### Average Separation
- Yards of space between receiver and nearest defender at catch point
- Higher = Better route running

### Yards Over Expected (Rushing)
- How many yards a RB gains beyond what blocking created
- Positive = Creating value on their own

### Efficiency (Rushing)
- Ratio of yards gained per expected yard
- >1.0 = Creating more than expected

## 🔗 Integration

The NGS Stats Explorer shares the same design system as the EPA Calculator:
- Consistent blue color scheme
- Matching button and card styles
- Same font system
- Unified navigation

## 📊 Data Source

All data comes from NFL Next Gen Stats via the `nfl_data_py` package, which provides:
- Player tracking at 10 samples per second
- 200+ data points per play
- Official NFL data, updated nightly during season

## 🐛 Troubleshooting

**No data showing?**
- Check that backend server is running on port 8000
- Verify `VITE_API_URL` environment variable is set
- Check browser console for API errors

**Table not sorting?**
- Click column header to activate sort
- Click again to reverse sort direction

**Search not working?**
- Search is case-insensitive
- Searches both player name and team abbreviation
- Clear search to see all players again

## 🚀 Future Enhancements (Potential)

- Charts and visualizations
- Player comparison tool
- Historical trend graphs
- Export to CSV
- Advanced filters (position, conference, division)
- Stat leaders dashboard
- Dark mode

---

Built with ❤️ using React, Tailwind CSS, and FastAPI
