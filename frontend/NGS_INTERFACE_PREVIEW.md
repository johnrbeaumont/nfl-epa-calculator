# 📸 NGS Stats Explorer - Interface Preview

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NFL Analytics Hub                                 │
│              Advanced game analytics & player tracking                   │
│                   powered by machine learning                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────┐  ┌────────────────────────────────┐    │
│  │   🎯 EPA Calculator        │  │   📊 Next Gen Stats   ←ACTIVE │    │
│  └────────────────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     Next Gen Stats Explorer                              │
│        Advanced player tracking metrics from NFL Next Gen Stats         │
│                          (2016-present)                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────┐┌──────────────────┐┌──────────────────┐          │
│ │  🎯 Passing      ││  🏈 Receiving    ││  💨 Rushing      │          │
│ │    ←ACTIVE       ││                  ││                  │          │
│ └──────────────────┘└──────────────────┘└──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Season         Week             Min Attempts    Search                 │
│  ┌───────┐    ┌──────────┐      ┌─────────┐     ┌────────────────┐    │
│  │ 2024 ▼│    │Season ▼  │      │  200    │     │ Mahomes, KC... │    │
│  └───────┘    └──────────┘      └─────────┘     └────────────────┘    │
│                                                                          │
│  Showing 25 of 42 players                            🔄 Refresh         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Rank  Player           Team   Attempts  CPOE ↓    Time    Aggr    Rating│
│ ──────────────────────────────────────────────────────────────────────  │
│  #1   Jalen Hurts      PHI      361     +6.3%    3.13s   16.3%   103.7 │
│  #2   Jared Goff       DET      539     +5.1%    2.65s   11.5%   109.2 │
│  #3   Joe Burrow       CIN      652     +4.5%    2.71s   15.8%   108.5 │
│  #4   Geno Smith       SEA      578     +3.9%    2.83s   12.5%    93.2 │
│  #5   Kirk Cousins     ATL      453     +3.4%    2.77s   13.2%    97.8 │
│  ...                                                                     │
│  #20  Patrick Mahomes  KC       581     -1.2%    2.81s   10.3%    93.5 │
│  ...                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
  ↑ Row highlights blue on hover                ↑ Green/red for +/- metrics

┌─────────────────────────────────────────────────────────────────────────┐
│  📊 About Next Gen Stats                                                │
│                                                                          │
│  Next Gen Stats uses RFID tags in player shoulder pads to track         │
│  location, speed, and acceleration at 10 times per second. This data    │
│  powers advanced metrics like completion probability over expected       │
│  (CPOE), separation, and yards over expected.                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Primary Colors
- **Blue-600**: Active tabs, primary buttons (#2563EB)
- **Gray-900**: Headers, primary text (#111827)
- **Gray-600**: Secondary text (#4B5563)
- **Green-700**: Positive metrics (#15803D)
- **Red-700**: Negative metrics (#B91C1C)

### Background Colors
- **Gray-50**: Page background (#F9FAFB)
- **White**: Cards, table (#FFFFFF)
- **Blue-50**: Hover states, info boxes (#EFF6FF)
- **Gray-100**: Inactive buttons (#F3F4F6)

### Badges
- **Blue-100**: Team badges background (#DBEAFE)
- **Blue-800**: Team badges text (#1E40AF)

## 📐 Layout Specifications

### Responsive Breakpoints
- **Mobile**: < 768px (Single column, stacked filters)
- **Tablet**: 768px - 1024px (2-column filters)
- **Desktop**: > 1024px (4-column filters, full table)

### Spacing
- Card padding: 24px
- Section spacing: 24px
- Input/button padding: 12px 16px
- Table cell padding: 12px 16px

### Typography
- **H2 (Section Title)**: 30px, Bold, Gray-900
- **Body**: 14px, Regular, Gray-700
- **Table Header**: 14px, Semibold, Gray-700
- **Table Cell**: 14px, Medium, Gray-900
- **Badge**: 12px, Medium

### Shadows
- Cards: `shadow-md` (subtle elevation)
- Buttons: `shadow-md` → `shadow-lg` on hover
- Active tabs: `shadow-md`

## 🎭 Interactive States

### Buttons
- **Default**: Gray background
- **Hover**: Darker gray, slight scale
- **Active**: Blue-600, white text, shadow
- **Loading**: Spinner animation

### Table
- **Row Hover**: Blue-50 background
- **Column Header Hover**: Gray-100 background
- **Sort Active**: Arrow indicator (↓/↑)

### Inputs
- **Default**: Gray-300 border
- **Focus**: Blue-500 ring, blue border
- **Filled**: Gray-900 text

## 🔤 Example Data Display

### Passing Metrics
```
Patrick Mahomes (KC)
QB | 581 Attempts

CPOE:        -1.2%  (red - below expected)
Time:        2.81s
Aggr:        10.3%
Rating:      93.5
```

### Receiving Metrics
```
Ja'Marr Chase (CIN)
WR | 175 Targets

Separation:  3.0 yd
YAC+:        +2.3   (green - above expected)
Catch %:     72.6%
Yards:       1,708
```

### Rushing Metrics
```
Saquon Barkley (PHI)
RB | 345 Attempts

YOE:         +546   (green - way above expected!)
Efficiency:  3.10x
YOE/Att:     +1.61  (green)
YPC:         5.6
```

## 🖱️ User Interactions

### Tab Switching
Click **Passing**, **Receiving**, or **Rushing** → Instant switch, data reloads

### Season/Week Selection
Dropdown menus → Select → Auto-refresh data

### Sorting
Click column header → Sort descending → Click again → Sort ascending

### Searching
Type in search box → Live filter (no button press needed)

### Threshold Adjustment
Change number → Auto-refresh on blur or Enter key

### Refresh Button
Click → Show spinner → Reload current view

## 📊 Data States

### Loading
```
┌─────────────────────────────────────┐
│           ⏳ Spinner                │
│   Loading Passing stats...          │
└─────────────────────────────────────┘
```

### No Results
```
┌─────────────────────────────────────┐
│   No players found matching your    │
│         criteria                    │
│                                     │
│   Try adjusting your filters        │
└─────────────────────────────────────┘
```

### Error
```
┌─────────────────────────────────────┐
│  ⚠️ Failed to fetch data            │
│  Try refreshing or check connection │
└─────────────────────────────────────┘
```

## 📱 Mobile View

```
┌──────────────────────┐
│  NFL Analytics Hub   │
└──────────────────────┘

┌──────────────────────┐
│ EPA Cal │ NGS Stats  │
└──────────────────────┘

┌──────────────────────┐
│ Passing              │
│ Receiving            │
│ Rushing              │
└──────────────────────┘

┌──────────────────────┐
│ Season  [2024 ▼]    │
│ Week    [0 ▼]       │
│ Min     [200]        │
│ Search  [...]        │
└──────────────────────┘

┌──────────────────────┐
│ [Scrollable Table]   │
│ ←──────────────────→ │
└──────────────────────┘
```

## ✨ Animation Details

- **Tab switch**: Smooth color transition (200ms)
- **Button hover**: Subtle scale + shadow (200ms)
- **Table row hover**: Fade in background (150ms)
- **Loading spinner**: Continuous rotation
- **Sort arrow**: Fade in/out (150ms)

## 🎯 Design Goals Achieved

✅ **Clean & Modern**: Minimal design, focus on data
✅ **Consistent**: Matches existing EPA Calculator style
✅ **Accessible**: High contrast, focus indicators
✅ **Responsive**: Works on all devices
✅ **Fast**: Instant feedback, smooth transitions
✅ **Intuitive**: Clear labels, helpful tooltips
✅ **Professional**: Suitable for analysts and fans alike

---

This interface transforms 26,000+ records of NFL tracking data into an intuitive, beautiful exploration tool. 🏈📊
