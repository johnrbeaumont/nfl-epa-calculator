# NGS Insights Analysis - Jupyter Notebook Guide

## 📓 Notebook: `04_ngs_insights_analysis.ipynb`

A comprehensive analysis exploring 5 fascinating questions about NFL player performance using Next Gen Stats tracking data.

---

## 🎯 The 5 Analyses

### 1. **QB Play Style: Aggressiveness vs Accuracy** 🎯
**Question**: Do quarterbacks who throw into tight windows complete more passes than expected?

**What it shows**:
- Scatter plot of Aggressiveness (% of tight window throws) vs CPOE
- Point size scaled by pass attempts
- Color-coded: Green = above expected, Red = below expected
- Identifies if aggressive QBs are more or less accurate

**Key Insight**: Elite QBs can succeed with different play styles - skill matters more than aggressiveness!

---

### 2. **WR Separation: Does Space Create YAC?** 🏈
**Question**: Do receivers who create more separation also gain more yards after catch than expected?

**What it shows**:
- Scatter plot of Average Separation vs YAC Above Expected
- Separate colors for WRs (blue) and TEs (orange)
- Point size scaled by targets
- Tests correlation between route running and after-catch ability

**Key Insight**: More separation helps, but elite receivers excel with OR without space!

---

### 3. **RB Efficiency Over Time** 💪
**Question**: Which running backs have consistently beaten blocking expectations across multiple seasons?

**What it shows**:
- Line chart tracking Yards Over Expected for top 10 RBs (2020-2024)
- Each RB gets a different color
- Shows season-to-season consistency
- Identifies truly elite talent vs one-year wonders

**Key Insight**: Elite RBs consistently beat expectations by 100-300+ yards per season. This skill is repeatable!

---

### 4. **QB Processing Speed: Fast Release vs Accuracy** ⚡
**Question**: Do quarterbacks with faster releases complete more passes above expectation?

**What it shows**:
- Box plot comparing CPOE across release speed categories
- Categories: Very Fast (<2.5s), Fast (2.5-2.7s), Average (2.7-2.9s), Slow (>2.9s)
- Individual QB points overlaid on boxes
- Tests if quick decision-making correlates with accuracy

**Key Insight**: Both fast and slow processors can succeed - decision quality beats decision speed!

---

### 5. **Power Running: Success Against Loaded Boxes** 🔥
**Question**: Which running backs excel when facing 8+ defenders in the box?

**What it shows**:
- Scatter plot of % Stacked Box Attempts vs Yards Over Expected
- Point size scaled by total attempts
- Color-coded by efficiency: Dark Green > Green > Orange > Red
- Identifies true "power backs" who thrive against loaded defenses

**Key Insight**: Elite RBs create value even when defenses stack the box. True talent shines through!

---

## 🚀 How to Run the Notebook

### Prerequisites
```bash
cd /Users/03jbm/Documents/NFLapp/nfl-epa-calculator
source venv/bin/activate
pip install jupyter matplotlib seaborn
```

### Launch Jupyter
```bash
cd notebooks
jupyter notebook 04_ngs_insights_analysis.ipynb
```

### Run All Cells
- Click **Cell → Run All** in the menu
- Or press **Shift + Enter** to run cells one by one

---

## 📊 Sample Outputs

### Expected Visualizations

**Analysis 1: QB Scatter Plot**
```
         Aggressiveness (%)
    5   10   15   20   25   30
10  ┌─────────────────────────┐
 5  │     Jalen Hurts    ●    │  +6.3% CPOE
 0  │─────────●─────●────●────│  League Average
-5  │   ●         ●           │  Below Expected
    └─────────────────────────┘
```

**Analysis 2: WR/TE Comparison**
```
    Avg Separation (yards)
         2.0   2.5   3.0   3.5
 +3  ┌─────────────────────┐
 +2  │    Ja'Marr Chase ● │  Elite separator + YAC
 +1  │  ●    ●    ●       │
  0  │─────────────────●──│
 -1  │ ●         ●        │
     └─────────────────────┘
```

**Analysis 3: RB Trends (Line Chart)**
```
Yards Over Expected
  600│           ╱╲  Saquon Barkley
  400│         ╱    ╲
  200│───────╱────────╲─── Derrick Henry
    0│╱╲╱╲╱╲         ╲╱
 -200│
     └─────────────────────────
      2020  2021  2022  2023  2024
```

**Analysis 4: Release Speed Box Plot**
```
CPOE (%)
  +8│      ┌─┐
  +4│   ┌──┼─┼──┐
   0│───┼──┼─┼──┼───
  -4│   └──┼─┼──┘
     └─────────────
      Fast  Avg  Slow
```

**Analysis 5: Power Running**
```
    % Stacked Box Attempts
         20%   30%   40%   50%
600│                 ●  Derrick Henry
400│           ●         Power backs
200│─────●──────●────────────
  0│  ●            ●
    └──────────────────────────
```

---

## 💡 Key Statistical Concepts Used

### Completion Percentage Above Expectation (CPOE)
- Measures QB accuracy adjusted for throw difficulty
- Positive = Better than expected based on situation
- Accounts for: throw distance, coverage, pressure

### Yards Over Expected (YOE)
- How many yards a RB gains beyond what blocking created
- Based on: defenders in box, field position, down/distance
- Positive = Creating value on their own

### Average Separation
- Yards of space between receiver and nearest defender at catch point
- Measured 10 times per second via RFID tracking
- Higher = Better route running

### Efficiency (Rushing)
- Ratio of yards gained per expected yard
- > 1.0 = Better than blocking
- < 1.0 = Worse than blocking

### Aggressiveness (QB)
- % of passes thrown into tight coverage (defender within 1 yard)
- Higher = More risk-taking
- Doesn't necessarily mean better or worse

---

## 🔬 Statistical Methods

### Correlation Analysis
Each analysis calculates Pearson correlation coefficient:
- **> 0.3**: Strong positive correlation
- **0.1 to 0.3**: Moderate positive correlation
- **-0.1 to 0.1**: Little to no correlation
- **< -0.3**: Strong negative correlation

### Filtering Criteria
- **QBs**: 200+ attempts (filters out backups)
- **WRs/TEs**: 50+ targets (regular contributors)
- **RBs**: 100+ attempts (sufficient sample size)

### Visualization Techniques
- **Scatter plots**: Show relationships between two variables
- **Box plots**: Compare distributions across categories
- **Line charts**: Track trends over time
- **Color coding**: Encode additional dimensions (efficiency, performance)
- **Size scaling**: Represent volume (attempts, targets)

---

## 📈 Extending the Analysis

### Additional Questions You Could Explore

1. **Home/Road Splits**: Do metrics change based on venue?
2. **Weather Impact**: How does temperature/precipitation affect performance?
3. **Defensive Strength**: Performance against top-10 vs bottom-10 defenses
4. **Clutch Performance**: 4th quarter stats vs full game stats
5. **Playoff Performance**: Regular season vs postseason metrics
6. **Age Curves**: How do metrics change as players age?
7. **Rookie Comparison**: First-year players vs established veterans
8. **Team Schemes**: How offensive system impacts individual metrics
9. **Injury Effects**: Pre/post injury metric changes
10. **Contract Year Performance**: Do players perform better in contract years?

### How to Add New Analyses

```python
# Template for new analysis
# 1. Filter your data
filtered_data = passing[
    (passing['season'] == 2024) &
    (passing['week'] == 0) &
    (passing['attempts'] >= MIN_THRESHOLD)
]

# 2. Create visualization
plt.figure(figsize=(12, 8))
plt.scatter(filtered_data['metric_x'], filtered_data['metric_y'])
plt.xlabel('Your X Metric')
plt.ylabel('Your Y Metric')
plt.title('Your Analysis Title')
plt.show()

# 3. Calculate statistics
correlation = filtered_data['metric_x'].corr(filtered_data['metric_y'])
print(f"Correlation: {correlation:.3f}")

# 4. Provide insights
print("Key Insight: [Your interpretation]")
```

---

## 🐛 Troubleshooting

### Database Not Found
```
FileNotFoundError: Database not found at ../backend/data/ngs_stats.db
```
**Solution**: Make sure you've run the data backfill first:
```bash
cd backend
python scripts/refresh_ngs_data.py --mode full
```

### Module Not Found (matplotlib, seaborn)
```
ModuleNotFoundError: No module named 'matplotlib'
```
**Solution**: Install visualization libraries:
```bash
pip install matplotlib seaborn
```

### Empty Plots
If plots show but have no data:
- Check that filters aren't too restrictive
- Verify database has data: `sqlite3 backend/data/ngs_stats.db "SELECT COUNT(*) FROM ngs_passing"`
- Lower minimum thresholds (attempts, targets)

### Slow Performance
If notebook is slow:
- Reduce year range (e.g., only analyze 2023-2024)
- Increase minimum thresholds to reduce data volume
- Close other applications

---

## 📚 Dependencies

```python
pandas>=1.5.0         # Data manipulation
numpy>=1.24.0         # Numerical computing
matplotlib>=3.7.0     # Plotting
seaborn>=0.12.0       # Statistical visualizations
sqlite3               # Database (built-in)
jupyter>=1.0.0        # Notebook interface
```

---

## 🎓 Learning Resources

### Understanding NGS Metrics
- [NFL Next Gen Stats Glossary](https://nextgenstats.nfl.com/glossary)
- [How NGS Works (NFL Operations)](https://operations.nfl.com/gameday/technology/nfl-next-gen-stats/)

### Data Science Skills
- [Pandas Tutorial](https://pandas.pydata.org/docs/user_guide/10min.html)
- [Matplotlib Gallery](https://matplotlib.org/stable/gallery/)
- [Seaborn Tutorial](https://seaborn.pydata.org/tutorial.html)

### Statistical Concepts
- [Correlation vs Causation](https://en.wikipedia.org/wiki/Correlation_does_not_imply_causation)
- [Box Plot Interpretation](https://en.wikipedia.org/wiki/Box_plot)
- [Scatter Plot Best Practices](https://chartio.com/learn/charts/what-is-a-scatter-plot/)

---

## 🏆 Key Takeaways

1. **CPOE is King**: Best metric for QB accuracy adjusted for difficulty
2. **Consistency Matters**: Multi-year trends reveal true talent
3. **Context is Everything**: Raw stats lie, NGS adjusts for situation
4. **Elite is Repeatable**: Top performers show up year after year
5. **Different Paths to Success**: Multiple play styles can succeed at elite level

---

## 📝 Citation

If using these analyses in presentations or reports:

```
NFL Next Gen Stats Analysis (2016-2024)
Data Source: NFL Next Gen Stats via nfl_data_py
Analysis: [Your Name]
Date: February 2026
```

---

**Enjoy exploring the data! 🏈📊**
