import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Position to stat type mapping
const POSITION_STAT_MAP = {
  QB: 'passing',
  RB: 'rushing',
  WR: 'receiving',
  TE: 'receiving',
  DL: 'defense',
  LB: 'defense',
  DB: 'defense',
}

// Format helpers
const fmt = {
  int: (v) => v != null ? v : '-',
  f1: (v) => v != null ? v.toFixed(1) : '-',
  f2: (v) => v != null ? v.toFixed(2) : '-',
  sign1: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '-',
  sign2: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : '-',
  signInt: (v) => v != null ? `${v >= 0 ? '+' : ''}${Math.round(v)}` : '-',
  pct1: (v) => v != null ? (v * 100).toFixed(1) : '-',
}

// Metric sections by position — each section is collapsible
const METRIC_SECTIONS = {
  QB: [
    {
      id: 'core', label: 'CORE', defaultOpen: true,
      metrics: [
        { key: 'games', label: 'G', format: fmt.int },
        { key: 'attempts', label: 'Att', format: fmt.int, isBox: true },
        { key: 'completions', label: 'Cmp', format: fmt.int, isBox: true },
        { key: 'completion_percentage', label: 'Cmp%', format: fmt.f1 },
        { key: 'pass_yards', label: 'Yds', format: fmt.int },
        { key: 'pass_touchdowns', label: 'TD', format: fmt.int },
        { key: 'interceptions', label: 'INT', format: fmt.int },
        { key: 'passer_rating', label: 'Rtg', format: fmt.f1 },
      ]
    },
    {
      id: 'epa', label: 'EPA & EFFICIENCY', defaultOpen: true,
      metrics: [
        { key: 'passing_epa', label: 'EPA', format: fmt.f1, isEPA: true },
        { key: 'epa_per_dropback', label: 'EPA/DB', format: fmt.sign2, isEPA: true },
        { key: 'completion_percentage_above_expectation', label: 'CPOE', format: fmt.sign1, isEPA: true },
        { key: 'dakota', label: 'DAKOTA', format: fmt.f2 },
        { key: 'pacr', label: 'PACR', format: fmt.f2 },
        { key: 'passing_first_downs', label: '1st', format: fmt.int },
      ]
    },
    {
      id: 'air', label: 'AIR YARDS', defaultOpen: false,
      metrics: [
        { key: 'avg_completed_air_yards', label: 'CAY', format: fmt.f1 },
        { key: 'avg_intended_air_yards', label: 'IAY', format: fmt.f1 },
        { key: 'avg_air_yards_to_sticks', label: 'AY/Stk', format: fmt.f1 },
      ]
    },
    {
      id: 'adv', label: 'ADVANCED', defaultOpen: false,
      metrics: [
        { key: 'avg_time_to_throw', label: 'TTT', format: fmt.f2 },
        { key: 'aggressiveness', label: 'Aggr%', format: fmt.f1 },
        { key: 'sacks', label: 'Sck', format: fmt.f1 },
        { key: 'fantasy_points', label: 'FPts', format: fmt.f1 },
      ]
    }
  ],
  RB: [
    {
      id: 'core', label: 'CORE', defaultOpen: true,
      metrics: [
        { key: 'games', label: 'G', format: fmt.int },
        { key: 'rush_attempts', label: 'Att', format: fmt.int, isBox: true },
        { key: 'rush_yards', label: 'Yds', format: fmt.int },
        { key: 'rush_touchdowns', label: 'TD', format: fmt.int },
        { key: 'avg_rush_yards', label: 'YPC', format: fmt.f1 },
      ]
    },
    {
      id: 'epa', label: 'EPA & EFFICIENCY', defaultOpen: true,
      metrics: [
        { key: 'rushing_epa', label: 'EPA', format: fmt.f1, isEPA: true },
        { key: 'epa_per_carry', label: 'EPA/C', format: fmt.sign2, isEPA: true },
        { key: 'efficiency', label: 'Eff', format: fmt.f2 },
        { key: 'rush_yards_over_expected', label: 'RYOE', format: fmt.signInt, isEPA: true },
        { key: 'rush_yards_over_expected_per_att', label: 'YOE/A', format: fmt.sign2, isEPA: true },
        { key: 'rushing_first_downs', label: '1st', format: fmt.int },
      ]
    },
    {
      id: 'adv', label: 'ADVANCED', defaultOpen: false,
      metrics: [
        { key: 'percent_attempts_gte_eight_defenders', label: 'Box%', format: fmt.f1 },
        { key: 'avg_time_to_los', label: 'TTLOS', format: fmt.f2 },
        { key: 'expected_rush_yards', label: 'xYds', format: fmt.f1 },
        { key: 'racr', label: 'RACR', format: fmt.f2 },
        { key: 'fantasy_points', label: 'FPts', format: fmt.f1 },
      ]
    }
  ],
  WR: [
    {
      id: 'core', label: 'CORE', defaultOpen: true,
      metrics: [
        { key: 'games', label: 'G', format: fmt.int },
        { key: 'targets', label: 'Tgt', format: fmt.int, isBox: true },
        { key: 'receptions', label: 'Rec', format: fmt.int, isBox: true },
        { key: 'yards', label: 'Yds', format: fmt.int },
        { key: 'rec_touchdowns', label: 'TD', format: fmt.int },
        { key: 'catch_percentage', label: 'Ct%', format: fmt.f1 },
      ]
    },
    {
      id: 'epa', label: 'EPA & EFFICIENCY', defaultOpen: true,
      metrics: [
        { key: 'receiving_epa', label: 'EPA', format: fmt.f1, isEPA: true },
        { key: 'epa_per_target', label: 'EPA/Tgt', format: fmt.sign2, isEPA: true },
        { key: 'racr', label: 'RACR', format: fmt.f2 },
        { key: 'receiving_first_downs', label: '1st', format: fmt.int },
      ]
    },
    {
      id: 'share', label: 'TARGET SHARE', defaultOpen: false,
      metrics: [
        { key: 'target_share', label: 'Tgt%', format: fmt.f1 },
        { key: 'air_yards_share', label: 'AY%', format: fmt.f1 },
        { key: 'wopr_x', label: 'WOPR', format: fmt.f2 },
        { key: 'avg_intended_air_yards', label: 'IAY', format: fmt.f1 },
        { key: 'percent_share_of_intended_air_yards', label: 'IAY%', format: fmt.f1 },
      ]
    },
    {
      id: 'sep', label: 'SEPARATION & YAC', defaultOpen: false,
      metrics: [
        { key: 'avg_cushion', label: 'Cush', format: fmt.f1 },
        { key: 'avg_separation', label: 'Sep', format: fmt.f1 },
        { key: 'avg_yac', label: 'YAC', format: fmt.f1 },
        { key: 'avg_yac_above_expectation', label: 'YAC+', format: fmt.sign1, isEPA: true },
        { key: 'fantasy_points', label: 'FPts', format: fmt.f1 },
      ]
    }
  ],
}
METRIC_SECTIONS.TE = METRIC_SECTIONS.WR

METRIC_SECTIONS.DL = [
  {
    id: 'core', label: 'CORE', defaultOpen: true,
    metrics: [
      { key: 'tackles_combined', label: 'Tkl', format: fmt.int },
      { key: 'tackles_solo', label: 'Solo', format: fmt.int },
      { key: 'tackles_assists', label: 'Ast', format: fmt.int },
      { key: 'tackles_for_loss', label: 'TFL', format: fmt.int },
      { key: 'sacks', label: 'Sck', format: fmt.f1, isBox: true },
      { key: 'qb_hits', label: 'QBH', format: fmt.int },
      { key: 'forced_fumbles', label: 'FF', format: fmt.int },
    ]
  },
  {
    id: 'impact', label: 'IMPACT', defaultOpen: true,
    metrics: [
      { key: 'interceptions', label: 'INT', format: fmt.int },
      { key: 'pass_breakups', label: 'PBU', format: fmt.int },
    ]
  },
]

METRIC_SECTIONS.LB = [
  {
    id: 'core', label: 'CORE', defaultOpen: true,
    metrics: [
      { key: 'tackles_combined', label: 'Tkl', format: fmt.int, isBox: true },
      { key: 'tackles_solo', label: 'Solo', format: fmt.int },
      { key: 'tackles_assists', label: 'Ast', format: fmt.int },
      { key: 'tackles_for_loss', label: 'TFL', format: fmt.int },
      { key: 'sacks', label: 'Sck', format: fmt.f1 },
      { key: 'qb_hits', label: 'QBH', format: fmt.int },
      { key: 'forced_fumbles', label: 'FF', format: fmt.int },
    ]
  },
  {
    id: 'coverage', label: 'COVERAGE', defaultOpen: true,
    metrics: [
      { key: 'interceptions', label: 'INT', format: fmt.int },
      { key: 'pass_breakups', label: 'PBU', format: fmt.int },
    ]
  },
]

METRIC_SECTIONS.DB = [
  {
    id: 'core', label: 'CORE', defaultOpen: true,
    metrics: [
      { key: 'tackles_combined', label: 'Tkl', format: fmt.int },
      { key: 'tackles_solo', label: 'Solo', format: fmt.int },
      { key: 'tackles_assists', label: 'Ast', format: fmt.int },
      { key: 'tackles_for_loss', label: 'TFL', format: fmt.int },
      { key: 'forced_fumbles', label: 'FF', format: fmt.int },
    ]
  },
  {
    id: 'coverage', label: 'COVERAGE', defaultOpen: true,
    metrics: [
      { key: 'interceptions', label: 'INT', format: fmt.int, isBox: true },
      { key: 'pass_breakups', label: 'PBU', format: fmt.int, isBox: true },
      { key: 'sacks', label: 'Sck', format: fmt.f1 },
      { key: 'qb_hits', label: 'QBH', format: fmt.int },
    ]
  },
]

// Legacy flat list for game log rendering
const PLAYER_METRICS = {
  QB: METRIC_SECTIONS.QB.flatMap(s => s.metrics),
  RB: METRIC_SECTIONS.RB.flatMap(s => s.metrics),
  WR: METRIC_SECTIONS.WR.flatMap(s => s.metrics),
  TE: METRIC_SECTIONS.TE.flatMap(s => s.metrics),
  DL: METRIC_SECTIONS.DL.flatMap(s => s.metrics),
  LB: METRIC_SECTIONS.LB.flatMap(s => s.metrics),
  DB: METRIC_SECTIONS.DB.flatMap(s => s.metrics),
}

// Stats glossary definitions
const GLOSSARY = [
  { section: 'Core Passing', items: [
    { abbr: 'G', name: 'Games Played', desc: 'Number of regular season games the player appeared in.' },
    { abbr: 'Att', name: 'Pass Attempts', desc: 'Total pass attempts thrown by the quarterback.' },
    { abbr: 'Cmp', name: 'Completions', desc: 'Total completed passes.' },
    { abbr: 'Cmp%', name: 'Completion Percentage', desc: 'Percentage of pass attempts completed (Cmp / Att × 100).' },
    { abbr: 'Yds', name: 'Passing Yards', desc: 'Total passing yards gained.' },
    { abbr: 'TD', name: 'Passing Touchdowns', desc: 'Total passing touchdowns thrown.' },
    { abbr: 'INT', name: 'Interceptions', desc: 'Total interceptions thrown.' },
    { abbr: 'Rtg', name: 'Passer Rating', desc: 'NFL passer rating (scale 0–158.3). Combines completion %, yards/attempt, TD%, and INT%.' },
  ]},
  { section: 'EPA & Efficiency (QB)', items: [
    { abbr: 'EPA', name: 'Expected Points Added', desc: 'Total expected points added on all pass plays. Positive = above average.' },
    { abbr: 'EPA/DB', name: 'EPA per Dropback', desc: 'EPA divided by pass attempts. Best single number for evaluating QB play quality.' },
    { abbr: 'CPOE', name: 'Completion % Over Expected', desc: 'Actual completion % minus expected completion % from NGS model. Positive = more accurate than expected.' },
    { abbr: 'DAKOTA', name: 'DAKOTA', desc: 'Adjusted EPA/play metric that accounts for strength of opposing defenses.' },
    { abbr: 'PACR', name: 'Passer Air Conversion Ratio', desc: 'Passing yards divided by passing air yards. Values >1.0 mean YAC is supplementing air yards.' },
    { abbr: '1st', name: 'Passing First Downs', desc: 'Total first downs gained through passing.' },
  ]},
  { section: 'Air Yards (QB)', items: [
    { abbr: 'CAY', name: 'Completed Air Yards', desc: 'Average air yards on completed passes.' },
    { abbr: 'IAY', name: 'Intended Air Yards', desc: 'Average air yards on all pass attempts.' },
    { abbr: 'AY/Stk', name: 'Air Yards to Sticks', desc: 'Average air yards relative to the first down marker.' },
  ]},
  { section: 'Advanced Passing', items: [
    { abbr: 'TTT', name: 'Time to Throw', desc: 'Average time (seconds) from snap to pass release.' },
    { abbr: 'Aggr%', name: 'Aggressiveness', desc: 'Percentage of passes thrown into tight coverage windows.' },
    { abbr: 'Sck', name: 'Sacks Taken', desc: 'Number of times the QB was sacked.' },
    { abbr: 'FPts', name: 'Fantasy Points', desc: 'Standard scoring fantasy football points for the season.' },
  ]},
  { section: 'Core Rushing', items: [
    { abbr: 'G', name: 'Games Played', desc: 'Number of regular season games the player appeared in.' },
    { abbr: 'Att', name: 'Rush Attempts', desc: 'Total rushing attempts (carries).' },
    { abbr: 'Yds', name: 'Rush Yards', desc: 'Total rushing yards gained.' },
    { abbr: 'TD', name: 'Rush Touchdowns', desc: 'Total rushing touchdowns scored.' },
    { abbr: 'YPC', name: 'Yards Per Carry', desc: 'Average rushing yards per attempt.' },
  ]},
  { section: 'EPA & Efficiency (RB)', items: [
    { abbr: 'EPA', name: 'Expected Points Added', desc: 'Total EPA on all rush plays.' },
    { abbr: 'EPA/C', name: 'EPA per Carry', desc: 'EPA divided by rush attempts. Best metric for evaluating RB impact.' },
    { abbr: 'Eff', name: 'NGS Efficiency', desc: 'Rushing yards gained divided by expected rushing yards. Values >1.0 = outperforming expectation.' },
    { abbr: 'RYOE', name: 'Rush Yards Over Expected', desc: 'Total rushing yards minus expected rushing yards.' },
    { abbr: 'YOE/A', name: 'Yards Over Expected per Attempt', desc: 'RYOE divided by rush attempts.' },
    { abbr: '1st', name: 'Rushing First Downs', desc: 'Total first downs gained through rushing.' },
  ]},
  { section: 'Advanced Rushing', items: [
    { abbr: 'Box%', name: 'Stacked Box Rate', desc: 'Percentage of rush attempts facing 8+ defenders in the box.' },
    { abbr: 'TTLOS', name: 'Time to Line of Scrimmage', desc: 'Average time from handoff to crossing the line of scrimmage.' },
    { abbr: 'xYds', name: 'Expected Rush Yards', desc: 'Total expected rushing yards based on the NGS model.' },
    { abbr: 'RACR', name: 'Receiver Air Conversion Ratio', desc: 'Receiving yards divided by air yards targeted.' },
    { abbr: 'FPts', name: 'Fantasy Points', desc: 'Standard scoring fantasy football points for the season.' },
  ]},
  { section: 'Core Receiving', items: [
    { abbr: 'G', name: 'Games Played', desc: 'Number of regular season games the player appeared in.' },
    { abbr: 'Tgt', name: 'Targets', desc: 'Total pass targets.' },
    { abbr: 'Rec', name: 'Receptions', desc: 'Total catches made.' },
    { abbr: 'Yds', name: 'Receiving Yards', desc: 'Total receiving yards gained.' },
    { abbr: 'TD', name: 'Receiving Touchdowns', desc: 'Total receiving touchdowns scored.' },
    { abbr: 'Ct%', name: 'Catch Percentage', desc: 'Percentage of targets caught (Rec / Tgt × 100).' },
  ]},
  { section: 'EPA & Efficiency (WR/TE)', items: [
    { abbr: 'EPA', name: 'Expected Points Added', desc: 'Total EPA on all targets.' },
    { abbr: 'EPA/Tgt', name: 'EPA per Target', desc: 'EPA divided by targets. Per-opportunity receiving efficiency.' },
    { abbr: 'RACR', name: 'Receiver Air Conversion Ratio', desc: 'Receiving yards divided by air yards targeted.' },
    { abbr: '1st', name: 'Receiving First Downs', desc: 'Total first downs gained through receptions.' },
  ]},
  { section: 'Target Share & Distribution', items: [
    { abbr: 'Tgt%', name: 'Target Share', desc: 'Proportion of team pass targets directed at this receiver.' },
    { abbr: 'AY%', name: 'Air Yards Share', desc: 'Proportion of team air yards directed at this receiver.' },
    { abbr: 'WOPR', name: 'Weighted Opportunity Rating', desc: 'Combines target share (1.5×) and air yards share (0.7×).' },
    { abbr: 'IAY', name: 'Intended Air Yards', desc: 'Average depth of target.' },
    { abbr: 'IAY%', name: 'Share of Intended Air Yards', desc: "Receiver's share of the team's total intended air yards." },
  ]},
  { section: 'Separation & YAC', items: [
    { abbr: 'Cush', name: 'Average Cushion', desc: 'Average yards between receiver and nearest defender at snap.' },
    { abbr: 'Sep', name: 'Average Separation', desc: 'Average yards of separation from nearest defender at pass arrival.' },
    { abbr: 'YAC', name: 'Yards After Catch', desc: 'Average yards gained after the reception.' },
    { abbr: 'YAC+', name: 'YAC Above Expectation', desc: 'Actual YAC minus expected YAC from NGS model.' },
    { abbr: 'FPts', name: 'Fantasy Points', desc: 'Standard scoring fantasy football points for the season.' },
  ]},
]

const ALL_SEASONS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]

const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
]

const NFL_DIVISIONS = {
  'AFC EAST': ['BUF', 'MIA', 'NE', 'NYJ'],
  'AFC NORTH': ['BAL', 'CIN', 'CLE', 'PIT'],
  'AFC SOUTH': ['HOU', 'IND', 'JAX', 'TEN'],
  'AFC WEST': ['DEN', 'KC', 'LAC', 'LV'],
  'NFC EAST': ['DAL', 'NYG', 'PHI', 'WAS'],
  'NFC NORTH': ['CHI', 'DET', 'GB', 'MIN'],
  'NFC SOUTH': ['ATL', 'CAR', 'NO', 'TB'],
  'NFC WEST': ['ARI', 'LAR', 'SF', 'SEA'],
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#0f0f13',
  surface: '#17171e',
  surfaceHover: '#1e1e28',
  border: '#252535',
  borderBright: '#35354a',
  gold: '#c9a447',
  goldDim: 'rgba(201,164,71,0.12)',
  goldBorder: 'rgba(201,164,71,0.4)',
  text: '#f0f0f0',
  muted: '#7a7a8a',
  dim: '#4a4a5a',
  positive: '#34d058',
  negative: '#f85149',
  font: "'All-ProSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontStats: "'All-ProStats', 'All-ProSans', sans-serif",
  fontDisplay: "'AllProDisplay', 'All-ProSans', sans-serif",
  fontCond: "'EndzoneSansCond', 'All-ProSans', sans-serif",
}

// Map specific defensive positions to their group (for METRIC_SECTIONS lookup)
const DEF_POS_GROUP = {
  DE: 'DL', DT: 'DL', NT: 'DL', LE: 'DL', RE: 'DL', RDE: 'DL', LDE: 'DL', DL: 'DL',
  LB: 'LB', MLB: 'LB', ILB: 'LB', OLB: 'LB', LOLB: 'LB', ROLB: 'LB', SLB: 'LB', WLB: 'LB',
  CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', DB: 'DB', SAF: 'DB', NCB: 'DB', RCB: 'DB', LCB: 'DB',
}

// Returns the canonical position group for metric/stat lookups
const getPosGroup = (pos) => DEF_POS_GROUP[pos] || pos

// Position category labels for the header
const POS_LABEL = {
  QB: { cat: 'Passing', title: 'Season Passing Stats', sub: 'Explore Passing Leaders' },
  RB: { cat: 'Rushing', title: 'Season Rushing Stats', sub: 'Explore Rushing Leaders' },
  WR: { cat: 'Receiving', title: 'Season Receiving Stats', sub: 'Explore Receiving Leaders' },
  TE: { cat: 'Receiving', title: 'Season Receiving Stats', sub: 'Explore Receiving Leaders' },
  DL: { cat: 'Defense', title: 'Season Defensive Line Stats', sub: 'Explore D-Line Leaders' },
  LB: { cat: 'Defense', title: 'Season Linebacker Stats', sub: 'Explore LB Leaders' },
  DB: { cat: 'Defense', title: 'Season Defensive Back Stats', sub: 'Explore DB Leaders' },
}

// ESPN team abbreviation mapping
const ESPN_ABBR = { WAS: 'wsh', JAC: 'jax', JAX: 'jax', LAR: 'lar', LAC: 'lac' }

// Team logo using ESPN CDN
const TeamLogo = ({ abbr, size = 28 }) => {
  const slug = (ESPN_ABBR[abbr] || abbr || '').toLowerCase()
  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`}
      alt={abbr}
      width={size}
      height={size}
      style={{ borderRadius: '50%', objectFit: 'contain', display: 'block', flexShrink: 0 }}
      onError={e => { e.target.style.opacity = '0' }}
    />
  )
}

// Player avatar: real headshot with initials fallback
const PlayerAvatar = ({ name, headshotUrl, size = 34 }) => {
  const [imgFailed, setImgFailed] = useState(false)
  const parts = (name || '').trim().split(/\s+/)
  const initials = parts.length >= 2
    ? (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
    : (parts[0] || '?').substring(0, 2)

  const containerStyle = {
    width: size, height: size, borderRadius: '50%',
    overflow: 'hidden', flexShrink: 0, display: 'block',
    border: `1.5px solid ${C.borderBright}`,
    backgroundColor: '#1a1a28',
  }

  if (headshotUrl && !imgFailed) {
    return (
      <div style={containerStyle}>
        <img
          src={headshotUrl}
          alt={name}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
          onError={() => setImgFailed(true)}
        />
      </div>
    )
  }

  return (
    <div style={{
      ...containerStyle,
      background: 'linear-gradient(135deg, #252535, #1a1a28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.32), fontWeight: '700',
      color: C.gold, letterSpacing: '-0.01em',
      fontFamily: C.font, textTransform: 'uppercase',
    }}>
      {initials.toUpperCase()}
    </div>
  )
}

// Styled select dropdown
const Select = ({ value, onChange, children, style = {} }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      backgroundColor: C.surface,
      color: C.text,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: '0.5rem 2rem 0.5rem 0.75rem',
      fontFamily: C.font,
      fontSize: '0.875rem',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%237a7a8a' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.6rem center',
      width: '100%',
      ...style,
    }}
  >
    {children}
  </select>
)

function NGSTerminal({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('PLAYERS')
  const [selectedPositions, setSelectedPositions] = useState(['QB'])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [search, setSearch] = useState('')
  const [selectedSeasons, setSelectedSeasons] = useState([2024])
  const [viewMode, setViewMode] = useState('yearly')
  const [yearDisplay, setYearDisplay] = useState('combined')
  const [expandedSections, setExpandedSections] = useState({})
  const [showGlossary, setShowGlossary] = useState(false)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState(null)
  const [sortDesc, setSortDesc] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const [teamStatsTeam, setTeamStatsTeam] = useState('KC')
  const [teamStatsWeek, setTeamStatsWeek] = useState(0)
  const [teamStats, setTeamStats] = useState(null)

  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerGameLogs, setPlayerGameLogs] = useState([])
  const [playerLogsLoading, setPlayerLogsLoading] = useState(false)

  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState(null)
  const [teamRosterSeason, setTeamRosterSeason] = useState(2024)
  const [teamRoster, setTeamRoster] = useState({ qbs: [], rbs: [], receivers: [] })
  const [rosterLoading, setRosterLoading] = useState(false)

  // Player headshot map: gsis_id -> url
  const [headshots, setHeadshots] = useState({})

  useEffect(() => {
    fetch(`${API_URL}/api/ngs/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.refresh_log?.last_refresh) setLastUpdated(data.refresh_log.last_refresh)
      })
      .catch(() => {})
    // Load player headshots (non-blocking)
    fetch(`${API_URL}/api/ngs/headshots`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setHeadshots(data || {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'PLAYERS') fetchPlayerData()
  }, [selectedPositions, selectedSeasons, selectedTeam, activeTab, viewMode])

  useEffect(() => {
    if (activeTab === 'TEAMS' && selectedTeamForRoster) {
      fetchTeamRoster(selectedTeamForRoster, teamRosterSeason)
    }
  }, [selectedTeamForRoster, teamRosterSeason, activeTab])

  const fetchPlayerData = async () => {
    setLoading(true)
    setData([])
    try {
      const fetchPromises = []
      for (const position of selectedPositions) {
        const statType = POSITION_STAT_MAP[position]
        if (!statType) continue
        for (const season of selectedSeasons) {
          let volumeParam, minThreshold
          if (statType === 'defense') { volumeParam = 'min_tackles'; minThreshold = 10 }
          else if (statType === 'receiving') { volumeParam = 'min_targets'; minThreshold = 50 }
          else if (statType === 'passing') { volumeParam = 'min_attempts'; minThreshold = 200 }
          else if (statType === 'rushing') { volumeParam = 'min_attempts'; minThreshold = 100 }

          const url = `${API_URL}/api/ngs/${statType}?season=${season}&week=0&${volumeParam}=${minThreshold}&limit=150${statType === 'defense' ? `&position=${position}` : ''}`
          fetchPromises.push(
            fetch(url)
              .then(res => res.ok ? res.json() : [])
              .then(data => ({
                position, season,
                data: data.filter(player => {
                  const teamMatch = !selectedTeam || player.team_abbr === selectedTeam
                  // For defense, backend already filters by position group; just check team
                  if (statType === 'defense') return teamMatch
                  return player.player_position === position && teamMatch
                }).map(player => ({
                  ...player,
                  // Normalize player_position to position group for defense display
                  _posGroup: statType === 'defense' ? position : player.player_position
                }))
              }))
              .catch(() => ({ position, season, data: [] }))
          )
        }
      }
      const results = await Promise.all(fetchPromises)
      setData(results.flatMap(r => r.data))
    } catch (err) {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const aggregateCareerStats = (playerData) => {
    const playerGroups = {}
    playerData.forEach(record => {
      const playerId = record.player_gsis_id || record.player_display_name
      if (!playerGroups[playerId]) {
        playerGroups[playerId] = {
          player_display_name: record.player_display_name,
          player_position: record.player_position,
          team_abbr: record.team_abbr,
          seasons: [], records: []
        }
      }
      playerGroups[playerId].seasons.push(record.season)
      playerGroups[playerId].records.push(record)
    })

    return Object.values(playerGroups).map(group => {
      const aggregated = { ...group.records[0] }
      aggregated.season = `${Math.min(...group.seasons)}-${Math.max(...group.seasons)}`
      aggregated.seasons_count = group.seasons.length

      const volumeStats = ['attempts', 'completions', 'pass_yards', 'pass_touchdowns', 'interceptions',
                           'rush_attempts', 'rush_yards', 'rush_touchdowns',
                           'targets', 'receptions', 'yards', 'rec_touchdowns',
                           'passing_first_downs', 'rushing_first_downs', 'receiving_first_downs',
                           'passing_epa', 'rushing_epa', 'receiving_epa',
                           'rush_yards_over_expected', 'expected_rush_yards',
                           'games', 'fantasy_points', 'fantasy_points_ppr']
      volumeStats.forEach(stat => {
        const values = group.records.filter(r => r[stat] != null)
        if (values.length > 0) aggregated[stat] = values.reduce((sum, r) => sum + (r[stat] || 0), 0)
      })

      const rateStats = ['completion_percentage', 'completion_percentage_above_expectation',
                         'avg_time_to_throw', 'aggressiveness', 'passer_rating',
                         'avg_rush_yards', 'efficiency', 'avg_separation', 'avg_yac_above_expectation',
                         'avg_cushion', 'avg_yac', 'avg_completed_air_yards', 'avg_intended_air_yards',
                         'avg_air_yards_to_sticks', 'avg_time_to_los',
                         'percent_attempts_gte_eight_defenders',
                         'dakota', 'pacr', 'racr', 'target_share', 'air_yards_share', 'wopr_x',
                         'catch_percentage', 'percent_share_of_intended_air_yards', 'sacks']
      rateStats.forEach(stat => {
        const values = group.records.filter(r => r[stat] != null).map(r => r[stat])
        if (values.length > 0) aggregated[stat] = values.reduce((sum, v) => sum + v, 0) / values.length
      })

      if (aggregated.passing_epa != null && aggregated.attempts)
        aggregated.epa_per_dropback = aggregated.passing_epa / aggregated.attempts
      if (aggregated.rushing_epa != null && aggregated.rush_attempts)
        aggregated.epa_per_carry = aggregated.rushing_epa / aggregated.rush_attempts
      if (aggregated.receiving_epa != null && aggregated.targets)
        aggregated.epa_per_target = aggregated.receiving_epa / aggregated.targets
      if (aggregated.rush_yards_over_expected != null && aggregated.rush_attempts)
        aggregated.rush_yards_over_expected_per_att = aggregated.rush_yards_over_expected / aggregated.rush_attempts

      return aggregated
    })
  }

  const fetchPlayerGameLogs = async (player) => {
    setPlayerLogsLoading(true)
    setPlayerGameLogs([])
    setSelectedPlayer(player)
    try {
      const statType = POSITION_STAT_MAP[player._posGroup || getPosGroup(player.player_position)]
      if (!statType) return
      // Defense only has season aggregates (week=0), not per-week data
      if (statType === 'defense') {
        const posGroup = player._posGroup || getPosGroup(player.player_position)
        const fetchPromises = []
        for (const season of [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]) {
          fetchPromises.push(
            fetch(`${API_URL}/api/ngs/defense?season=${season}&week=0&position=${posGroup}&limit=500`)
              .then(res => res.ok ? res.json() : [])
              .then(data => ({ season, week: 0, data: data.filter(p => p.player_gsis_id === player.player_gsis_id) }))
              .catch(() => ({ season, week: 0, data: [] }))
          )
        }
        const results = await Promise.all(fetchPromises)
        const gameLogs = results
          .filter(r => r.data.length > 0)
          .flatMap(r => r.data)
          .sort((a, b) => b.season - a.season)
        setPlayerGameLogs(gameLogs)
        setPlayerLogsLoading(false)
        return
      }
      const fetchPromises = []
      for (const season of [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]) {
        for (let week = 1; week <= 22; week++) {
          fetchPromises.push(
            fetch(`${API_URL}/api/ngs/${statType}?season=${season}&week=${week}&limit=500`)
              .then(res => res.ok ? res.json() : [])
              .then(data => ({ season, week, data: data.filter(p => p.player_gsis_id === player.player_gsis_id) }))
              .catch(() => ({ season, week, data: [] }))
          )
        }
      }
      const results = await Promise.all(fetchPromises)
      const gameLogs = results
        .filter(r => r.data.length > 0)
        .flatMap(r => r.data)
        .sort((a, b) => a.season !== b.season ? b.season - a.season : b.week - a.week)
      setPlayerGameLogs(gameLogs)
    } catch (err) {
      setPlayerGameLogs([])
    } finally {
      setPlayerLogsLoading(false)
    }
  }

  const fetchTeamRoster = async (team, season) => {
    setRosterLoading(true)
    setTeamRoster({ qbs: [], rbs: [], receivers: [] })
    try {
      const [passRes, rushRes, recRes] = await Promise.all([
        fetch(`${API_URL}/api/ngs/passing?season=${season}&week=0&team=${team}&limit=500`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/api/ngs/rushing?season=${season}&week=0&team=${team}&limit=500`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/api/ngs/receiving?season=${season}&week=0&team=${team}&limit=500`).then(r => r.ok ? r.json() : []).catch(() => []),
      ])
      setTeamRoster({
        qbs: Array.isArray(passRes) ? passRes : [],
        rbs: Array.isArray(rushRes) ? rushRes.filter(p => p.player_position === 'RB') : [],
        receivers: Array.isArray(recRes) ? recRes : [],
      })
    } catch (err) {
      // silent
    } finally {
      setRosterLoading(false)
    }
  }

  const filteredData = data.filter(player => {
    if (!search) return true
    const s = search.toLowerCase()
    return player.player_display_name?.toLowerCase().includes(s) || player.team_abbr?.toLowerCase().includes(s)
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortBy) return 0
    const aVal = a[sortBy] ?? -Infinity
    const bVal = b[sortBy] ?? -Infinity
    return sortDesc ? bVal - aVal : aVal - bVal
  })

  const handleSort = (key) => {
    if (sortBy === key) setSortDesc(!sortDesc)
    else { setSortBy(key); setSortDesc(true) }
  }

  const getDisplayData = () => {
    if (viewMode === 'career') return aggregateCareerStats(sortedData)
    if (yearDisplay === 'combined' && selectedSeasons.length > 1) return aggregateCareerStats(sortedData)
    if (yearDisplay === 'separate' && selectedSeasons.length > 1) {
      const playerGroups = {}
      sortedData.forEach(record => {
        const id = record.player_gsis_id || record.player_display_name
        if (!playerGroups[id]) playerGroups[id] = []
        playerGroups[id].push(record)
      })
      Object.values(playerGroups).forEach(rows => rows.sort((a, b) => b.season - a.season))
      const groupOrder = []
      const seen = new Set()
      sortedData.forEach(record => {
        const id = record.player_gsis_id || record.player_display_name
        if (!seen.has(id)) { seen.add(id); groupOrder.push(id) }
      })
      return groupOrder.flatMap(id => playerGroups[id])
    }
    return sortedData
  }
  const displayedData = getDisplayData()

  const primaryPosition = selectedPositions[0] || 'QB'
  const sections = (METRIC_SECTIONS[primaryPosition] || []).map(section => ({
    ...section,
    expanded: expandedSections[section.id] !== undefined ? expandedSections[section.id] : section.defaultOpen
  }))

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] !== undefined ? !prev[sectionId] : false
    }))
  }

  const posLabel = POS_LABEL[primaryPosition] || { cat: 'Stats', title: 'Season Stats', sub: 'Explore Leaders' }

  // ─── STYLES ────────────────────────────────────────────────────────────────
  const filterLabelStyle = {
    display: 'block',
    color: C.muted,
    fontSize: '0.65rem',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '0.4rem',
  }

  const thStyle = {
    padding: '0.5rem 0.6rem',
    textAlign: 'right',
    color: C.muted,
    fontFamily: C.fontCond,
    fontWeight: '600',
    whiteSpace: 'nowrap',
    fontSize: '0.7rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${C.border}`,
    cursor: 'pointer',
    userSelect: 'none',
  }

  const sectionThStyle = {
    padding: '0.35rem 0.6rem',
    textAlign: 'center',
    color: C.dim,
    fontFamily: C.fontCond,
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.6rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${C.border}`,
    borderLeft: `1px solid ${C.border}`,
    backgroundColor: C.surface,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.bg,
      color: C.text,
      fontFamily: C.font,
    }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ padding: '1.75rem 2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
              <span style={{ color: C.gold, fontWeight: '700', fontSize: '1.625rem', letterSpacing: '-0.01em' }}>
                {posLabel.cat}
              </span>
              <span style={{ color: C.text, fontWeight: '400', fontSize: '1.625rem', letterSpacing: '-0.01em' }}>
                {posLabel.title}
              </span>
            </div>
            <div style={{ fontSize: '1rem', color: C.text, fontWeight: '400', marginBottom: '0' }}>
              {posLabel.sub}
            </div>
            {lastUpdated && (() => {
              const d = new Date(lastUpdated)
              const days = Math.floor((new Date() - d) / 86400000)
              return (
                <div style={{ fontSize: '0.75rem', color: days > 14 ? '#f59e0b' : C.muted, marginTop: '0.25rem' }}>
                  Data updated: {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )
            })()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingTop: '0.25rem' }}>
            <button
              onClick={() => setShowGlossary(true)}
              style={{
                backgroundColor: C.surface,
                color: C.text,
                border: `1px solid ${C.borderBright}`,
                borderRadius: 8,
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontFamily: C.font,
                fontSize: '0.8rem',
                fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              ≡ Glossary
            </button>
            <button
              onClick={onNavigate}
              style={{
                backgroundColor: 'transparent',
                color: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '0.5rem 0.875rem',
                cursor: 'pointer',
                fontFamily: C.font,
                fontSize: '0.8rem',
              }}
            >
              ⌂ Home
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Tab Bar ────────────────────────────────────────────────── */}
      <div style={{
        padding: '0 2rem',
        borderBottom: `1px solid ${C.border}`,
        marginBottom: '0',
        marginTop: '1rem',
        display: 'flex', gap: '2rem',
      }}>
        {['PLAYERS', 'TEAMS'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              backgroundColor: 'transparent',
              color: activeTab === tab ? C.text : C.muted,
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? C.gold : 'transparent'}`,
              padding: '0.75rem 0.1rem',
              marginBottom: '-1px',
              cursor: 'pointer',
              fontFamily: C.font,
              fontSize: '0.875rem',
              fontWeight: activeTab === tab ? '600' : '400',
              letterSpacing: '0.02em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── PLAYERS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'PLAYERS' ? (
        <div style={{ padding: '1.5rem 2rem' }}>

          {/* Filter Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            {/* Season */}
            <div>
              <label style={filterLabelStyle}>Season</label>
              <Select
                value={selectedSeasons[0]}
                onChange={e => setSelectedSeasons([parseInt(e.target.value)])}
              >
                {ALL_SEASONS.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>

            {/* View Mode */}
            <div>
              <label style={filterLabelStyle}>View</label>
              <Select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <option value="yearly">Year-by-Year</option>
                <option value="career">Career Stats</option>
              </Select>
            </div>

            {/* Position */}
            <div>
              <label style={filterLabelStyle}>Position Group</label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => {
                      if (selectedPositions.includes(pos)) {
                        if (selectedPositions.length > 1) setSelectedPositions(selectedPositions.filter(p => p !== pos))
                      } else {
                        setSelectedPositions([...selectedPositions, pos])
                      }
                    }}
                    style={{
                      backgroundColor: selectedPositions.includes(pos) ? C.gold : 'transparent',
                      color: selectedPositions.includes(pos) ? '#0f0f13' : C.muted,
                      border: `1px solid ${selectedPositions.includes(pos) ? C.gold : C.border}`,
                      borderRadius: 4,
                      padding: '0.3rem 0.6rem',
                      cursor: 'pointer',
                      fontFamily: C.font,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Team */}
            <div>
              <label style={filterLabelStyle}>Filter by Team</label>
              <Select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                <option value="">All</option>
                {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>

            {/* Player Search */}
            <div>
              <label style={filterLabelStyle}>Player</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Name"
                  style={{
                    backgroundColor: C.surface,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    padding: '0.5rem 2rem 0.5rem 0.75rem',
                    fontFamily: C.font,
                    fontSize: '0.875rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <span style={{
                  position: 'absolute', right: '0.6rem', top: '50%',
                  transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none',
                }}>
                  🔍
                </span>
              </div>
            </div>

            {/* Multi-year selector (shown when career mode) */}
            {viewMode === 'career' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={filterLabelStyle}>Select Seasons</label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedSeasons(selectedSeasons.length === ALL_SEASONS.length ? [ALL_SEASONS[0]] : [...ALL_SEASONS])}
                    style={{
                      backgroundColor: selectedSeasons.length === ALL_SEASONS.length ? C.gold : 'transparent',
                      color: selectedSeasons.length === ALL_SEASONS.length ? '#0f0f13' : C.muted,
                      border: `1px solid ${selectedSeasons.length === ALL_SEASONS.length ? C.gold : C.border}`,
                      borderRadius: 4, padding: '0.25rem 0.5rem',
                      cursor: 'pointer', fontFamily: C.font, fontSize: '0.7rem', fontWeight: '600',
                    }}
                  >
                    ALL
                  </button>
                  {ALL_SEASONS.map(y => (
                    <button
                      key={y}
                      onClick={() => {
                        if (selectedSeasons.includes(y)) {
                          if (selectedSeasons.length > 1) setSelectedSeasons(selectedSeasons.filter(s => s !== y))
                        } else {
                          setSelectedSeasons([...selectedSeasons, y].sort((a, b) => b - a))
                        }
                      }}
                      style={{
                        backgroundColor: selectedSeasons.includes(y) ? C.goldDim : 'transparent',
                        color: selectedSeasons.includes(y) ? C.gold : C.muted,
                        border: `1px solid ${selectedSeasons.includes(y) ? C.goldBorder : C.border}`,
                        borderRadius: 4, padding: '0.25rem 0.5rem',
                        cursor: 'pointer', fontFamily: C.font, fontSize: '0.7rem',
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section view toggles + count */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div style={{ fontSize: '0.8rem', color: C.muted }}>
              {loading
                ? `Loading ${selectedPositions.length} position(s)…`
                : `${displayedData.length} ${viewMode === 'career' ? 'players' : 'records'}`}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Section expand buttons */}
              <div style={{
                display: 'flex',
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                overflow: 'hidden',
              }}>
                {sections.map((section, i) => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    style={{
                      backgroundColor: section.expanded ? C.goldDim : 'transparent',
                      color: section.expanded ? C.gold : C.muted,
                      border: 'none',
                      borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
                      padding: '0.4rem 0.75rem',
                      cursor: 'pointer',
                      fontFamily: C.font,
                      fontSize: '0.7rem',
                      fontWeight: section.expanded ? '600' : '400',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table */}
          {selectedPositions.every(pos => !POSITION_STAT_MAP[pos]) ? (
            <div style={{
              padding: '3rem', textAlign: 'center', color: C.muted,
              border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface,
            }}>
              Selected position data not available
            </div>
          ) : loading ? (
            <div style={{
              padding: '4rem', textAlign: 'center', color: C.muted,
              border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface,
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: C.gold }}>◌</div>
              Loading data…
            </div>
          ) : displayedData.length === 0 ? (
            <div style={{
              padding: '3rem', textAlign: 'center', color: C.muted,
              border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface,
            }}>
              No data found
            </div>
          ) : (
            <div style={{
              overflowX: 'auto',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              backgroundColor: C.surface,
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '0.8rem',
              }}>
                <thead>
                  {/* Section header row */}
                  <tr>
                    <th rowSpan={2} style={{
                      ...thStyle, textAlign: 'center', width: 36,
                      position: 'sticky', left: 0, backgroundColor: C.surface, zIndex: 11,
                      borderRight: `1px solid ${C.border}`,
                    }}>Rk</th>
                    <th rowSpan={2} style={{
                      ...thStyle, textAlign: 'left', minWidth: 180,
                      position: 'sticky', left: 36, backgroundColor: C.surface, zIndex: 11,
                      borderRight: `1px solid ${C.border}`,
                      cursor: 'pointer',
                    }} onClick={() => handleSort('player_display_name')}>
                      Player {sortBy === 'player_display_name' && (sortDesc ? '↓' : '↑')}
                    </th>
                    <th rowSpan={2} style={{ ...thStyle, textAlign: 'center', width: 50 }}>Team</th>
                    <th rowSpan={2} style={{ ...thStyle, textAlign: 'center', width: 40 }}>Pos</th>
                    <th rowSpan={2} style={{ ...thStyle, textAlign: 'center', width: 60 }}>
                      {(viewMode === 'career' || (yearDisplay === 'combined' && selectedSeasons.length > 1)) ? 'Seasons' : 'Season'}
                    </th>
                    {sections.map((section, i) => (
                      <th
                        key={section.id}
                        colSpan={section.expanded ? section.metrics.length : 1}
                        onClick={() => toggleSection(section.id)}
                        style={{
                          ...sectionThStyle,
                          color: section.expanded ? C.gold : C.dim,
                          borderBottom: section.expanded ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                          backgroundColor: section.expanded ? C.goldDim : C.surface,
                        }}
                      >
                        {section.expanded ? '−' : '+'} {section.label}
                      </th>
                    ))}
                  </tr>
                  {/* Metric column headers */}
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {sections.map(section => {
                      if (!section.expanded) {
                        return (
                          <th key={`${section.id}-c`} style={{
                            ...thStyle, color: C.dim, fontSize: '0.6rem',
                            borderLeft: `1px solid ${C.border}`,
                          }}>···</th>
                        )
                      }
                      return section.metrics.map((metric, mi) => (
                        <th
                          key={metric.key}
                          onClick={() => handleSort(metric.key)}
                          style={{
                            ...thStyle,
                            borderLeft: mi === 0 ? `1px solid ${C.border}` : 'none',
                            color: sortBy === metric.key ? C.gold : C.muted,
                          }}
                        >
                          {metric.label} {sortBy === metric.key && (sortDesc ? '↓' : '↑')}
                        </th>
                      ))
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayedData.map((player, index) => {
                    const isSeparate = yearDisplay === 'separate' && selectedSeasons.length > 1 && viewMode === 'yearly'
                    const playerId = player.player_gsis_id || player.player_display_name
                    const prevId = index > 0 ? (displayedData[index - 1].player_gsis_id || displayedData[index - 1].player_display_name) : null
                    const nextId = index < displayedData.length - 1 ? (displayedData[index + 1]?.player_gsis_id || displayedData[index + 1]?.player_display_name) : null
                    const isFirstOfGroup = isSeparate && playerId !== prevId
                    const isLastOfGroup = isSeparate && playerId !== nextId
                    const isEven = index % 2 === 0
                    const rowBg = isEven ? C.surface : '#131319'
                    const rankNum = isSeparate ? (isFirstOfGroup ? String(index + 1).padStart(2, '0') : '') : String(index + 1).padStart(2, '0')

                    return (
                      <tr
                        key={`${player.player_gsis_id}-${player.season}-${index}`}
                        onClick={() => fetchPlayerGameLogs(player)}
                        style={{
                          borderBottom: isLastOfGroup ? `2px solid ${C.goldBorder}` : `1px solid ${C.border}`,
                          borderTop: isFirstOfGroup && index > 0 ? `2px solid ${C.goldBorder}` : 'none',
                          backgroundColor: rowBg,
                          cursor: 'pointer',
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                      >
                        {/* Rank */}
                        <td style={{
                          padding: '0.7rem 0.6rem',
                          textAlign: 'center',
                          color: C.dim,
                          fontWeight: '600',
                          fontSize: '0.72rem',
                          position: 'sticky', left: 0,
                          backgroundColor: 'inherit',
                          borderRight: `1px solid ${C.border}`,
                          zIndex: 2,
                        }}>
                          {rankNum}
                        </td>

                        {/* Player name + avatar */}
                        <td style={{
                          padding: '0.5rem 0.75rem',
                          position: 'sticky', left: 36,
                          backgroundColor: 'inherit',
                          borderRight: `1px solid ${C.border}`,
                          zIndex: 2,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <PlayerAvatar name={player.player_display_name} headshotUrl={headshots[player.player_gsis_id]} size={34} />
                            <span style={{
                              color: isSeparate && !isFirstOfGroup ? C.muted : C.text,
                              fontWeight: isSeparate && !isFirstOfGroup ? '400' : '500',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                            }}>
                              {isSeparate && !isFirstOfGroup ? '↳ ' : ''}{player.player_display_name}
                            </span>
                          </div>
                        </td>

                        {/* Team logo */}
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <TeamLogo abbr={player.team_abbr} size={26} />
                          </div>
                        </td>

                        {/* Position */}
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: C.muted, fontSize: '0.72rem', fontWeight: '600' }}>
                          {player.player_position}
                        </td>

                        {/* Season */}
                        {(() => {
                          const isCombinedOrCareer = viewMode === 'career' || (yearDisplay === 'combined' && selectedSeasons.length > 1)
                          return (
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: C.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              {isCombinedOrCareer ? `${player.season}` : player.season}
                            </td>
                          )
                        })()}

                        {/* Stat cells */}
                        {sections.map(section => {
                          if (!section.expanded) {
                            return (
                              <td key={`${section.id}-c`} style={{
                                padding: '0.5rem',
                                textAlign: 'center',
                                color: C.dim,
                                borderLeft: `1px solid ${C.border}`,
                                fontSize: '0.65rem',
                              }}>·</td>
                            )
                          }
                          return section.metrics.map((metric, mi) => {
                            const value = player[metric.key]
                            let color = C.text
                            if (metric.isEPA && value != null) {
                              color = value > 0 ? C.positive : value < 0 ? C.negative : C.text
                            }
                            const isBox = metric.isBox && value != null

                            return (
                              <td
                                key={metric.key}
                                style={{
                                  padding: isBox ? '0.35rem 0.5rem' : '0.5rem 0.6rem',
                                  textAlign: 'right',
                                  borderLeft: mi === 0 ? `1px solid ${C.border}` : 'none',
                                }}
                              >
                                {isBox ? (
                                  <span style={{
                                    display: 'inline-block',
                                    backgroundColor: C.goldDim,
                                    border: `1px solid ${C.goldBorder}`,
                                    borderRadius: 3,
                                    padding: '0.2rem 0.45rem',
                                    color: C.text,
                                    fontFamily: C.fontStats,
                                    fontWeight: '700',
                                    fontSize: '0.78rem',
                                    minWidth: 32,
                                    textAlign: 'center',
                                  }}>
                                    {metric.format(value)}
                                  </span>
                                ) : (
                                  <span style={{ color, fontSize: '0.78rem', fontFamily: C.fontStats }}>
                                    {metric.format(value)}
                                  </span>
                                )}
                              </td>
                            )
                          })
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Player Game Logs Modal */}
          {selectedPlayer && (
            <div
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 1000,
                overflowY: 'auto', padding: '2rem',
              }}
              onClick={() => { setSelectedPlayer(null); setPlayerGameLogs([]) }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  maxWidth: '1600px', margin: '0 auto',
                  backgroundColor: C.bg,
                  border: `1px solid ${C.borderBright}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {/* Modal header */}
                <div style={{
                  padding: '1.25rem 1.75rem',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: C.surface,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <PlayerAvatar name={selectedPlayer.player_display_name} headshotUrl={headshots[selectedPlayer.player_gsis_id]} size={52} />
                    <div>
                      <h2 style={{ color: C.text, fontSize: '1.3rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem', fontFamily: C.fontDisplay, letterSpacing: '-0.01em' }}>
                        {selectedPlayer.player_display_name}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: C.muted, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: C.fontCond, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <TeamLogo abbr={selectedPlayer.team_abbr} size={16} />
                        <span style={{ color: C.text, fontWeight: '600' }}>{selectedPlayer.team_abbr}</span>
                        <span style={{ color: C.dim }}>·</span>
                        <span>{selectedPlayer.player_position}</span>
                        <span style={{ color: C.dim }}>·</span>
                        <span style={{ color: C.gold }}>{playerGameLogs.length} games</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedPlayer(null); setPlayerGameLogs([]) }}
                    style={{
                      backgroundColor: 'transparent', color: C.muted,
                      border: `1px solid ${C.border}`, borderRadius: 6,
                      padding: '0.5rem 1rem', cursor: 'pointer',
                      fontFamily: C.font, fontSize: '0.8rem',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderBright }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
                  >
                    ✕ Close
                  </button>
                </div>

                {playerLogsLoading ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: C.muted, fontFamily: C.font }}>
                    Loading game logs…
                  </div>
                ) : playerGameLogs.length === 0 ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: C.muted, fontFamily: C.font }}>
                    No game data found
                  </div>
                ) : (() => {
                  // Group logs by season for section headers
                  const seasons = [...new Set(playerGameLogs.map(g => g.season))].sort((a, b) => b - a)
                  const posKey = selectedPlayer._posGroup || getPosGroup(selectedPlayer.player_position)
                  const metrics = PLAYER_METRICS[posKey] || []
                  const glThStyle = {
                    ...thStyle,
                    backgroundColor: C.surface,
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.68rem',
                    letterSpacing: '0.07em',
                    borderBottom: `2px solid ${C.border}`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                  }
                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            {/* Fixed left columns */}
                            <th style={{ ...glThStyle, textAlign: 'center', width: 52, minWidth: 52, borderRight: `1px solid ${C.border}` }}>WK</th>
                            <th style={{ ...glThStyle, textAlign: 'left', minWidth: 160, borderRight: `1px solid ${C.border}` }}>OPP</th>
                            {/* Stat columns */}
                            {metrics.map((metric, mi) => (
                              <th key={metric.key} style={{
                                ...glThStyle,
                                borderLeft: mi === 0 ? `1px solid ${C.border}` : 'none',
                                color: C.muted,
                              }}>
                                {metric.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {seasons.map(season => (
                            <>
                              {/* Season divider row */}
                              <tr key={`season-${season}`}>
                                <td
                                  colSpan={2 + metrics.length}
                                  style={{
                                    padding: '0.4rem 0.75rem',
                                    backgroundColor: C.goldDim,
                                    borderTop: `1px solid ${C.goldBorder}`,
                                    borderBottom: `1px solid ${C.goldBorder}`,
                                    color: C.gold,
                                    fontFamily: C.fontCond,
                                    fontWeight: '700',
                                    fontSize: '0.68rem',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {season} Season
                                </td>
                              </tr>
                              {/* Game rows for this season */}
                              {playerGameLogs
                                .filter(g => g.season === season)
                                .map((game, gIdx) => {
                                  const rowBg = gIdx % 2 === 0 ? '#131319' : C.bg
                                  const weekLabel = game.week === 0
                                    ? 'TOT'
                                    : game.week > 18
                                      ? (['WC', 'DIV', 'CONF', 'SB'][game.week - 19] || `${game.week}`)
                                      : game.week
                                  return (
                                    <tr
                                      key={`${game.season}-${game.week}-${gIdx}`}
                                      style={{ backgroundColor: rowBg, borderBottom: `1px solid ${C.border}` }}
                                      onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                      onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                                    >
                                      {/* Week */}
                                      <td style={{
                                        padding: '0.65rem 0.75rem',
                                        textAlign: 'center',
                                        color: C.muted,
                                        fontFamily: C.fontStats,
                                        fontWeight: '600',
                                        fontSize: '0.8rem',
                                        borderRight: `1px solid ${C.border}`,
                                        whiteSpace: 'nowrap',
                                      }}>
                                        {weekLabel}
                                      </td>
                                      {/* Opponent */}
                                      <td style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRight: `1px solid ${C.border}`,
                                      }}>
                                        {game.opponent_team ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <TeamLogo abbr={game.opponent_team} size={22} />
                                            <span style={{ color: C.text, fontWeight: '600', fontFamily: C.font, fontSize: '0.82rem' }}>
                                              {game.opponent_team}
                                            </span>
                                          </div>
                                        ) : (
                                          <span style={{ color: C.dim, fontFamily: C.font, fontSize: '0.78rem' }}>—</span>
                                        )}
                                      </td>
                                      {/* Stats */}
                                      {metrics.map((metric, mi) => {
                                        const value = game[metric.key]
                                        const isBox = metric.isBox && value != null
                                        let color = C.text
                                        if (metric.isEPA && value != null) {
                                          color = value > 0 ? C.positive : value < 0 ? C.negative : C.text
                                        }
                                        return (
                                          <td key={metric.key} style={{
                                            padding: isBox ? '0.4rem 0.5rem' : '0.65rem 0.6rem',
                                            textAlign: 'right',
                                            borderLeft: mi === 0 ? `1px solid ${C.border}` : 'none',
                                          }}>
                                            {isBox ? (
                                              <span style={{
                                                display: 'inline-block',
                                                backgroundColor: C.goldDim,
                                                border: `1px solid ${C.goldBorder}`,
                                                borderRadius: 3,
                                                padding: '0.25rem 0.5rem',
                                                color: C.text,
                                                fontFamily: C.fontStats,
                                                fontWeight: '700',
                                                fontSize: '0.8rem',
                                                minWidth: 34,
                                                textAlign: 'center',
                                              }}>
                                                {metric.format(value)}
                                              </span>
                                            ) : (
                                              <span style={{ color, fontFamily: C.fontStats, fontSize: '0.8rem' }}>
                                                {metric.format(value)}
                                              </span>
                                            )}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  )
                                })}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (

        /* ── TEAMS TAB ──────────────────────────────────────────────────── */
        <div style={{ padding: '1.5rem 2rem' }}>
          {!selectedTeamForRoster ? (
            <div>
              <div style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Select a team to view roster
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {Object.entries(NFL_DIVISIONS).map(([division, teams]) => (
                  <div key={division} style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    backgroundColor: C.surface,
                    padding: '1rem',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      color: C.gold, fontSize: '0.7rem', fontWeight: '700',
                      marginBottom: '0.75rem', letterSpacing: '0.08em',
                      borderBottom: `1px solid ${C.border}`, paddingBottom: '0.5rem',
                    }}>
                      {division}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {teams.map(team => (
                        <button
                          key={team}
                          onClick={() => setSelectedTeamForRoster(team)}
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            color: C.text,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            padding: '0.6rem 0.4rem',
                            cursor: 'pointer',
                            fontFamily: C.font,
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = C.surfaceHover
                            e.currentTarget.style.borderColor = C.gold
                            e.currentTarget.style.color = C.gold
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.borderColor = C.border
                            e.currentTarget.style.color = C.text
                          }}
                        >
                          <TeamLogo abbr={team} size={30} />
                          {team}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Team header */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => setSelectedTeamForRoster(null)}
                  style={{
                    backgroundColor: 'transparent', color: C.muted,
                    border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: '0.4rem 0.75rem', cursor: 'pointer',
                    fontFamily: C.font, fontSize: '0.78rem',
                  }}
                >
                  ← All Teams
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TeamLogo abbr={selectedTeamForRoster} size={40} />
                  <div>
                    <span style={{ color: C.text, fontWeight: '700', fontSize: '1.25rem' }}>
                      {selectedTeamForRoster}
                    </span>
                    <span style={{ color: C.muted, fontSize: '0.875rem', marginLeft: '0.5rem' }}>Roster</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: C.muted, fontSize: '0.75rem' }}>Season:</span>
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map(year => (
                    <button
                      key={year}
                      onClick={() => setTeamRosterSeason(year)}
                      style={{
                        backgroundColor: teamRosterSeason === year ? C.gold : 'transparent',
                        color: teamRosterSeason === year ? '#0f0f13' : C.muted,
                        border: `1px solid ${teamRosterSeason === year ? C.gold : C.border}`,
                        borderRadius: 4,
                        padding: '0.2rem 0.5rem',
                        cursor: 'pointer', fontFamily: C.font,
                        fontSize: '0.72rem', fontWeight: '600',
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {rosterLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: C.muted, backgroundColor: C.surface, borderRadius: 8 }}>
                  Loading {selectedTeamForRoster} {teamRosterSeason} roster…
                </div>
              ) : teamRoster.qbs.length === 0 && teamRoster.rbs.length === 0 && teamRoster.receivers.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: C.muted, backgroundColor: C.surface, borderRadius: 8 }}>
                  No data found for {selectedTeamForRoster} {teamRosterSeason}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* QBs */}
                  {teamRoster.qbs.length > 0 && (
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface, overflow: 'hidden' }}>
                      <div style={{
                        padding: '0.75rem 1.25rem',
                        borderBottom: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                      }}>
                        <span style={{ color: C.gold, fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.05em' }}>QUARTERBACKS</span>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>{teamRoster.qbs.length} player{teamRoster.qbs.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '1.25rem' }}>Player</th>
                              {['Att', 'Cmp', 'Cmp%', 'Yds', 'TD', 'INT', 'Rtg', 'CPOE', 'TTT'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.qbs.map((p, i) => {
                              const rowBg = i % 2 === 0 ? C.surface : '#131319'
                              return (
                                <tr key={p.player_gsis_id || i}
                                  onClick={() => fetchPlayerGameLogs(p)}
                                  style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: rowBg, cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                                >
                                  <td style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <PlayerAvatar name={p.player_display_name} headshotUrl={headshots[p.player_gsis_id]} size={28} />
                                      <span style={{ color: C.text, fontWeight: '500' }}>{p.player_display_name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.attempts ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.completions ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.completion_percentage?.toFixed(1) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.pass_yards ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.positive }}>{p.pass_touchdowns ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.negative }}>{p.interceptions ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.passer_rating?.toFixed(1) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: (p.completion_percentage_above_expectation ?? 0) > 0 ? C.positive : (p.completion_percentage_above_expectation ?? 0) < 0 ? C.negative : C.text }}>
                                    {p.completion_percentage_above_expectation != null ? `${p.completion_percentage_above_expectation >= 0 ? '+' : ''}${p.completion_percentage_above_expectation.toFixed(1)}` : '-'}
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.avg_time_to_throw?.toFixed(2) ?? '-'}s</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* RBs */}
                  {teamRoster.rbs.length > 0 && (
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface, overflow: 'hidden' }}>
                      <div style={{ padding: '0.75rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: C.gold, fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.05em' }}>RUNNING BACKS</span>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>{teamRoster.rbs.length} player{teamRoster.rbs.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '1.25rem' }}>Player</th>
                              {['Att', 'Yds', 'YPC', 'TD', 'Eff', 'RYOE', 'Box%'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.rbs.map((p, i) => {
                              const rowBg = i % 2 === 0 ? C.surface : '#131319'
                              return (
                                <tr key={p.player_gsis_id || i}
                                  onClick={() => fetchPlayerGameLogs(p)}
                                  style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: rowBg, cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                                >
                                  <td style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <PlayerAvatar name={p.player_display_name} headshotUrl={headshots[p.player_gsis_id]} size={28} />
                                      <span style={{ color: C.text, fontWeight: '500' }}>{p.player_display_name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.rush_attempts ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.rush_yards ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.avg_rush_yards?.toFixed(1) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.positive }}>{p.rush_touchdowns ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: (p.efficiency ?? 0) > 0 ? C.positive : (p.efficiency ?? 0) < 0 ? C.negative : C.text }}>{p.efficiency?.toFixed(2) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: (p.rush_yards_over_expected ?? 0) > 0 ? C.positive : (p.rush_yards_over_expected ?? 0) < 0 ? C.negative : C.text }}>
                                    {p.rush_yards_over_expected != null ? `${p.rush_yards_over_expected >= 0 ? '+' : ''}${p.rush_yards_over_expected.toFixed(0)}` : '-'}
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.percent_attempts_gte_eight_defenders?.toFixed(1) ?? '-'}%</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* WRs */}
                  {teamRoster.receivers.filter(p => p.player_position === 'WR').length > 0 && (
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface, overflow: 'hidden' }}>
                      <div style={{ padding: '0.75rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: C.gold, fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.05em' }}>WIDE RECEIVERS</span>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>{teamRoster.receivers.filter(p => p.player_position === 'WR').length} players</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '1.25rem' }}>Player</th>
                              {['Tgt', 'Rec', 'Ct%', 'Yds', 'TD', 'Sep', 'YAC+', 'aDOT'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.receivers.filter(p => p.player_position === 'WR').map((p, i) => {
                              const rowBg = i % 2 === 0 ? C.surface : '#131319'
                              return (
                                <tr key={p.player_gsis_id || i}
                                  onClick={() => fetchPlayerGameLogs(p)}
                                  style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: rowBg, cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                                >
                                  <td style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <PlayerAvatar name={p.player_display_name} headshotUrl={headshots[p.player_gsis_id]} size={28} />
                                      <span style={{ color: C.text, fontWeight: '500' }}>{p.player_display_name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.targets ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.receptions ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.catch_percentage?.toFixed(1) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.yards ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.positive }}>{p.rec_touchdowns ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.avg_separation?.toFixed(2) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: (p.avg_yac_above_expectation ?? 0) > 0 ? C.positive : (p.avg_yac_above_expectation ?? 0) < 0 ? C.negative : C.text }}>
                                    {p.avg_yac_above_expectation != null ? `${p.avg_yac_above_expectation >= 0 ? '+' : ''}${p.avg_yac_above_expectation.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.avg_intended_air_yards?.toFixed(1) ?? '-'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TEs */}
                  {teamRoster.receivers.filter(p => p.player_position === 'TE').length > 0 && (
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, backgroundColor: C.surface, overflow: 'hidden' }}>
                      <div style={{ padding: '0.75rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: C.gold, fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.05em' }}>TIGHT ENDS</span>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>{teamRoster.receivers.filter(p => p.player_position === 'TE').length} players</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '1.25rem' }}>Player</th>
                              {['Tgt', 'Rec', 'Ct%', 'Yds', 'TD', 'Sep', 'YAC+', 'aDOT'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.receivers.filter(p => p.player_position === 'TE').map((p, i) => {
                              const rowBg = i % 2 === 0 ? C.surface : '#131319'
                              return (
                                <tr key={p.player_gsis_id || i}
                                  onClick={() => fetchPlayerGameLogs(p)}
                                  style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: rowBg, cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                                >
                                  <td style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <PlayerAvatar name={p.player_display_name} headshotUrl={headshots[p.player_gsis_id]} size={28} />
                                      <span style={{ color: C.text, fontWeight: '500' }}>{p.player_display_name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.targets ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.receptions ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.catch_percentage?.toFixed(1) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.yards ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.positive }}>{p.rec_touchdowns ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.avg_separation?.toFixed(2) ?? '-'}</td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: (p.avg_yac_above_expectation ?? 0) > 0 ? C.positive : (p.avg_yac_above_expectation ?? 0) < 0 ? C.negative : C.text }}>
                                    {p.avg_yac_above_expectation != null ? `${p.avg_yac_above_expectation >= 0 ? '+' : ''}${p.avg_yac_above_expectation.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ padding: '0.6rem', textAlign: 'right', color: C.text }}>{p.avg_intended_air_yards?.toFixed(1) ?? '-'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Game Log Modal (Teams tab) — same design as Players tab */}
          {selectedPlayer && (
            <div
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 1000, overflowY: 'auto', padding: '2rem' }}
              onClick={() => { setSelectedPlayer(null); setPlayerGameLogs([]) }}
            >
              <div onClick={e => e.stopPropagation()} style={{ maxWidth: '1600px', margin: '0 auto', backgroundColor: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.75rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <PlayerAvatar name={selectedPlayer.player_display_name} headshotUrl={headshots[selectedPlayer.player_gsis_id]} size={52} />
                    <div>
                      <h2 style={{ color: C.text, fontSize: '1.3rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem', fontFamily: C.fontDisplay, letterSpacing: '-0.01em' }}>{selectedPlayer.player_display_name}</h2>
                      <div style={{ fontSize: '0.78rem', color: C.muted, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: C.fontCond, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <TeamLogo abbr={selectedPlayer.team_abbr} size={16} />
                        <span style={{ color: C.text, fontWeight: '600' }}>{selectedPlayer.team_abbr}</span>
                        <span style={{ color: C.dim }}>·</span>
                        <span>{selectedPlayer.player_position}</span>
                        <span style={{ color: C.dim }}>·</span>
                        <span style={{ color: C.gold }}>{playerGameLogs.length} games</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedPlayer(null); setPlayerGameLogs([]) }} style={{ backgroundColor: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: C.font, fontSize: '0.8rem' }}>✕ Close</button>
                </div>
                {playerLogsLoading ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: C.muted, fontFamily: C.font }}>Loading game logs…</div>
                ) : playerGameLogs.length === 0 ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: C.muted, fontFamily: C.font }}>No game data found</div>
                ) : (() => {
                  const seasons = [...new Set(playerGameLogs.map(g => g.season))].sort((a, b) => b - a)
                  const posKey = selectedPlayer._posGroup || getPosGroup(selectedPlayer.player_position)
                  const metrics = PLAYER_METRICS[posKey] || []
                  const glThStyle = { ...thStyle, backgroundColor: C.surface, padding: '0.6rem 0.75rem', fontSize: '0.68rem', letterSpacing: '0.07em', borderBottom: `2px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }
                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th style={{ ...glThStyle, textAlign: 'center', width: 52, minWidth: 52, borderRight: `1px solid ${C.border}` }}>WK</th>
                            <th style={{ ...glThStyle, textAlign: 'left', minWidth: 160, borderRight: `1px solid ${C.border}` }}>OPP</th>
                            {metrics.map((metric, mi) => (
                              <th key={metric.key} style={{ ...glThStyle, borderLeft: mi === 0 ? `1px solid ${C.border}` : 'none', color: C.muted }}>{metric.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {seasons.map(season => (
                            <>
                              <tr key={`season-${season}`}>
                                <td colSpan={2 + metrics.length} style={{ padding: '0.4rem 0.75rem', backgroundColor: C.goldDim, borderTop: `1px solid ${C.goldBorder}`, borderBottom: `1px solid ${C.goldBorder}`, color: C.gold, fontFamily: C.fontCond, fontWeight: '700', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                  {season} Season
                                </td>
                              </tr>
                              {playerGameLogs.filter(g => g.season === season).map((game, gIdx) => {
                                const rowBg = gIdx % 2 === 0 ? '#131319' : C.bg
                                const weekLabel = game.week === 0 ? 'TOT' : game.week > 18 ? (['WC', 'DIV', 'CONF', 'SB'][game.week - 19] || `${game.week}`) : game.week
                                return (
                                  <tr key={`${game.season}-${game.week}-${gIdx}`} style={{ backgroundColor: rowBg, borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}>
                                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: C.muted, fontFamily: C.fontStats, fontWeight: '600', fontSize: '0.8rem', borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{weekLabel}</td>
                                    <td style={{ padding: '0.5rem 0.75rem', borderRight: `1px solid ${C.border}` }}>
                                      {game.opponent_team ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <TeamLogo abbr={game.opponent_team} size={22} />
                                          <span style={{ color: C.text, fontWeight: '600', fontFamily: C.font, fontSize: '0.82rem' }}>{game.opponent_team}</span>
                                        </div>
                                      ) : <span style={{ color: C.dim, fontFamily: C.font, fontSize: '0.78rem' }}>—</span>}
                                    </td>
                                    {metrics.map((metric, mi) => {
                                      const value = game[metric.key]
                                      const isBox = metric.isBox && value != null
                                      let color = C.text
                                      if (metric.isEPA && value != null) color = value > 0 ? C.positive : value < 0 ? C.negative : C.text
                                      return (
                                        <td key={metric.key} style={{ padding: isBox ? '0.4rem 0.5rem' : '0.65rem 0.6rem', textAlign: 'right', borderLeft: mi === 0 ? `1px solid ${C.border}` : 'none' }}>
                                          {isBox ? (
                                            <span style={{ display: 'inline-block', backgroundColor: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 3, padding: '0.25rem 0.5rem', color: C.text, fontFamily: C.fontStats, fontWeight: '700', fontSize: '0.8rem', minWidth: 34, textAlign: 'center' }}>{metric.format(value)}</span>
                                          ) : (
                                            <span style={{ color, fontFamily: C.fontStats, fontSize: '0.8rem' }}>{metric.format(value)}</span>
                                          )}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '1.25rem 2rem',
        borderTop: `1px solid ${C.border}`,
        color: C.dim,
        fontSize: '0.72rem',
        textAlign: 'center',
        letterSpacing: '0.03em',
      }}>
        NFL Next Gen Stats · RFID Tracking Data (10Hz) · 2016–Present
      </div>

      {/* ── Glossary Modal ───────────────────────────────────────────────── */}
      {showGlossary && (
        <div
          onClick={() => setShowGlossary(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            paddingTop: '3rem', overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              maxWidth: '720px', width: '90%',
              maxHeight: '85vh', overflowY: 'auto',
              padding: '2rem',
              marginBottom: '3rem',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '1.5rem', borderBottom: `1px solid ${C.border}`, paddingBottom: '1rem',
            }}>
              <h2 style={{ color: C.text, margin: 0, fontSize: '1.125rem', fontWeight: '700' }}>Stats Glossary</h2>
              <button
                onClick={() => setShowGlossary(false)}
                style={{
                  backgroundColor: 'transparent', color: C.muted,
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: '0.3rem 0.75rem', cursor: 'pointer',
                  fontFamily: C.font, fontSize: '0.8rem',
                }}
              >
                ✕ Close
              </button>
            </div>

            {GLOSSARY.map(group => (
              <div key={group.section} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  color: C.gold, fontSize: '0.7rem', fontWeight: '700',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: '0.75rem', borderBottom: `1px solid ${C.border}`,
                  paddingBottom: '0.25rem',
                }}>
                  {group.section}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {group.items.map(item => (
                    <div key={item.abbr + group.section} style={{
                      display: 'grid', gridTemplateColumns: '56px 1fr',
                      gap: '0.75rem', padding: '0.35rem 0',
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ color: C.gold, fontWeight: '700', fontSize: '0.78rem' }}>{item.abbr}</span>
                      <div>
                        <span style={{ color: C.text, fontSize: '0.78rem', fontWeight: '600' }}>{item.name} </span>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ color: C.dim, fontSize: '0.65rem', marginTop: '1rem', borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem' }}>
              NGS metrics sourced from NFL Next Gen Stats (RFID tracking). EPA and seasonal stats sourced from nflfastR play-by-play data via nfl_data_py.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NGSTerminal
