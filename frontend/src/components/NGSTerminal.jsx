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

// Game-log specific columns — match pro.nfl.com layout exactly
const GAME_LOG_METRICS = {
  QB: [
    { key: 'completions',   label: 'CMP',      format: fmt.int,  isBox: true },
    { key: 'attempts',      label: 'ATT',      format: fmt.int,  isBox: true },
    { key: 'completion_percentage', label: 'CMP%',  format: fmt.f1 },
    { key: 'completion_percentage_above_expectation', label: 'CPOE', format: fmt.sign1, isEPA: false },
    { key: 'dropbacks',     label: 'DB',       format: fmt.int,  isBox: true },
    { key: 'passing_epa',   label: 'EPA',      format: fmt.f1,   isEPA: true },
    { key: 'epa_per_dropback', label: 'EPA/DB', format: fmt.sign2, isEPA: true },
    { key: 'avg_intended_air_yards', label: 'AY/ATT', format: fmt.f1 },
    { key: 'deep_pass_pct', label: 'DEEP%',    format: fmt.f1 },
    { key: 'avg_time_to_throw', label: 'TTT',  format: fmt.f2 },
    { key: 'qb_hit_pct',    label: 'QBP%',     format: fmt.f1 },
    { key: 'blitz_pct',     label: 'BLITZ%',   format: fmt.f1 },
    { key: 'play_action_pct', label: 'PA%',    format: fmt.f1 },
    { key: 'aggressiveness', label: 'TW%',     format: fmt.f1 },
  ],
  RB: [
    { key: 'rush_attempts', label: 'ATT',      format: fmt.int,  isBox: true },
    { key: 'rush_yards',    label: 'YDS',      format: fmt.int },
    { key: 'avg_rush_yards',label: 'YPC',      format: fmt.f1 },
    { key: 'rush_touchdowns', label: 'TD',     format: fmt.int },
    { key: 'rushing_epa',   label: 'EPA',      format: fmt.f1,   isEPA: true },
    { key: 'epa_per_carry', label: 'EPA/C',    format: fmt.sign2, isEPA: true },
    { key: 'rush_yards_over_expected', label: 'RYOE', format: fmt.sign1 },
    { key: 'rush_yards_over_expected_per_att', label: 'YOE/A', format: fmt.sign2 },
    { key: 'efficiency',    label: 'EFF',      format: fmt.f2 },
    { key: 'avg_time_to_los', label: 'TTLOS',  format: fmt.f2 },
  ],
  WR: [
    { key: 'targets',       label: 'TGT',      format: fmt.int,  isBox: true },
    { key: 'receptions',    label: 'REC',      format: fmt.int,  isBox: true },
    { key: 'catch_percentage', label: 'CT%',   format: fmt.f1 },
    { key: 'yards',         label: 'YDS',      format: fmt.int },
    { key: 'rec_touchdowns', label: 'TD',      format: fmt.int },
    { key: 'receiving_epa', label: 'EPA',      format: fmt.f1,   isEPA: true },
    { key: 'epa_per_target', label: 'EPA/TGT', format: fmt.sign2, isEPA: true },
    { key: 'avg_separation', label: 'SEP',     format: fmt.f1 },
    { key: 'avg_yac',       label: 'YAC',      format: fmt.f1 },
    { key: 'avg_yac_above_expectation', label: 'YAC+', format: fmt.sign2 },
    { key: 'avg_intended_air_yards', label: 'aDOT', format: fmt.f1 },
  ],
  TE: [
    { key: 'targets',       label: 'TGT',      format: fmt.int,  isBox: true },
    { key: 'receptions',    label: 'REC',      format: fmt.int,  isBox: true },
    { key: 'catch_percentage', label: 'CT%',   format: fmt.f1 },
    { key: 'yards',         label: 'YDS',      format: fmt.int },
    { key: 'rec_touchdowns', label: 'TD',      format: fmt.int },
    { key: 'receiving_epa', label: 'EPA',      format: fmt.f1,   isEPA: true },
    { key: 'epa_per_target', label: 'EPA/TGT', format: fmt.sign2, isEPA: true },
    { key: 'avg_separation', label: 'SEP',     format: fmt.f1 },
    { key: 'avg_yac',       label: 'YAC',      format: fmt.f1 },
    { key: 'avg_intended_air_yards', label: 'aDOT', format: fmt.f1 },
  ],
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

  // Play-by-play drill-down
  const [selectedGame, setSelectedGame] = useState(null)   // { game_id, label, player }
  const [gamePlays, setGamePlays] = useState([])
  const [gamePlaysLoading, setGamePlaysLoading] = useState(false)

  // League-wide team stats
  const [teamsView, setTeamsView] = useState('league')         // 'league' | 'roster'
  const [leagueSide, setLeagueSide] = useState('offense')      // 'offense' | 'defense'
  const [leagueSubTab, setLeagueSubTab] = useState('summary')  // 'summary' | 'passing' | 'rushing'
  const [leagueSeason, setLeagueSeason] = useState(2024)
  const [leagueStats, setLeagueStats] = useState([])
  const [leagueLoading, setLeagueLoading] = useState(false)
  const [leagueSort, setLeagueSort] = useState({ key: null, desc: true })

  // Game summary modal (replaces PBP modal on game click)
  const [gameSummary, setGameSummary] = useState(null)
  const [gameSummaryLoading, setGameSummaryLoading] = useState(false)
  const [gameSummaryTeam, setGameSummaryTeam] = useState('home') // 'home'|'away' for mobile toggle
  const [gameSummaryTab, setGameSummaryTab] = useState({ home: 'offense', away: 'offense' })

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
    if (activeTab === 'TEAMS') {
      if (teamsView === 'league') fetchLeagueStats()
      else if (selectedTeamForRoster) fetchTeamRoster(selectedTeamForRoster, teamRosterSeason)
    }
  }, [selectedTeamForRoster, teamRosterSeason, activeTab, teamsView, leagueSide, leagueSeason])

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

  const fetchGamePlays = async (game_id, player, gameLabel) => {
    if (!game_id) return
    setGamePlaysLoading(true)
    setGamePlays([])
    setSelectedGame({ game_id, label: gameLabel, player })
    try {
      const playerId = player.player_gsis_id
      const url = `${API_URL}/api/ngs/plays?game_id=${encodeURIComponent(game_id)}${playerId ? `&player_id=${playerId}` : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const plays = await res.json()
        // Sort by game time (descending quarter_seconds_remaining within each quarter)
        plays.sort((a, b) => {
          if (a.qtr !== b.qtr) return (a.qtr || 0) - (b.qtr || 0)
          return (b.quarter_seconds_remaining || 0) - (a.quarter_seconds_remaining || 0)
        })
        setGamePlays(plays)
      }
    } catch (err) {
      setGamePlays([])
    } finally {
      setGamePlaysLoading(false)
    }
  }

  const fetchLeagueStats = async () => {
    setLeagueLoading(true)
    setLeagueStats([])
    try {
      const res = await fetch(`${API_URL}/api/ngs/league-team-stats?season=${leagueSeason}&side=${leagueSide}&week=0`)
      if (res.ok) setLeagueStats(await res.json())
    } catch { /* silent */ } finally {
      setLeagueLoading(false)
    }
  }

  const fetchGameSummary = async (game_id) => {
    if (!game_id) return
    setGameSummaryLoading(true)
    setGameSummary(null)
    try {
      const res = await fetch(`${API_URL}/api/ngs/game-summary/${encodeURIComponent(game_id)}`)
      if (res.ok) {
        const data = await res.json()
        setGameSummary(data)
        setGameSummaryTab({ home: 'offense', away: 'offense' })
      }
    } catch (err) {
      setGameSummary(null)
    } finally {
      setGameSummaryLoading(false)
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
                  const metrics = (GAME_LOG_METRICS[posKey] || PLAYER_METRICS[posKey] || [])
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
                            <th style={{ ...glThStyle, textAlign: 'left', minWidth: 160 }}>OPP</th>
                            <th style={{ ...glThStyle, textAlign: 'left', minWidth: 110, borderRight: `1px solid ${C.border}` }}>RESULT</th>
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
                                  colSpan={3 + metrics.length}
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
                                  const resultParts = game.game_result ? game.game_result.split(' ') : []
                                  const wl = resultParts[0]
                                  const resultColor = wl === 'W' ? C.positive : wl === 'L' ? C.negative : C.muted
                                  const homeAway = game.home_away === 'home' ? 'vs' : game.home_away === 'away' ? '@' : ''
                                  const hasPlays = !!game.game_id
                                  return (
                                    <tr
                                      key={`${game.season}-${game.week}-${gIdx}`}
                                      style={{ backgroundColor: rowBg, borderBottom: `1px solid ${C.border}`, cursor: hasPlays ? 'pointer' : 'default' }}
                                      onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                      onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                                      onClick={() => hasPlays && fetchGameSummary(game.game_id)}
                                      title={hasPlays ? 'Click for play-by-play' : ''}
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
                                      <td style={{ padding: '0.5rem 0.75rem' }}>
                                        {game.opponent_team ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                            {homeAway && <span style={{ color: C.muted, fontSize: '0.7rem', fontFamily: C.fontCond, fontWeight: '600', minWidth: 14 }}>{homeAway}</span>}
                                            <TeamLogo abbr={game.opponent_team} size={22} />
                                            <span style={{ color: C.text, fontWeight: '600', fontFamily: C.font, fontSize: '0.82rem' }}>
                                              {game.opponent_team}
                                            </span>
                                          </div>
                                        ) : (
                                          <span style={{ color: C.dim, fontFamily: C.font, fontSize: '0.78rem' }}>—</span>
                                        )}
                                      </td>
                                      {/* Result */}
                                      <td style={{ padding: '0.5rem 0.75rem', borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                                        {game.game_result ? (
                                          <span style={{ fontFamily: C.fontStats, fontSize: '0.82rem' }}>
                                            <span style={{ color: resultColor, fontWeight: '700' }}>{wl}</span>
                                            <span style={{ color: C.text }}>{' '}{resultParts.slice(1).join(' ')}</span>
                                          </span>
                                        ) : <span style={{ color: C.dim }}>—</span>}
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

          {/* ── View toggle: LEAGUE STATS | TEAM ROSTER ── */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[{ id: 'league', label: 'LEAGUE STATS' }, { id: 'roster', label: 'TEAM ROSTER' }].map(v => (
              <button
                key={v.id}
                onClick={() => setTeamsView(v.id)}
                style={{
                  backgroundColor: teamsView === v.id ? C.gold : 'transparent',
                  color: teamsView === v.id ? '#0f0f13' : C.muted,
                  border: `1px solid ${teamsView === v.id ? C.gold : C.border}`,
                  borderRadius: 6,
                  padding: '0.45rem 1.1rem',
                  cursor: 'pointer',
                  fontFamily: C.font,
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  transition: 'all 0.15s',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              LEAGUE STATS VIEW
          ══════════════════════════════════════════════════════════════ */}
          {teamsView === 'league' && (() => {
            // ── Column definitions ──────────────────────────────────────
            const fmtEpa = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(3) : '-'
            const fmtSgn = (v, d=1) => v != null ? (v >= 0 ? '+' : '') + v.toFixed(d) : '-'

            const offSummaryCols = [
              { key: 'gp',          label: 'GP',       isBox: true, fmt: v => v ?? '-' },
              { key: 'ppg',         label: 'PPG',      isBox: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'ypg',         label: 'YPG',      fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'ypp',         label: 'YPP',      fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'total_tds',   label: 'TD',       isBox: true, fmt: v => v ?? '-' },
              { key: 'epa_per_play',label: 'EPA/Play', isEPA: true, sortDefault: true, fmt: fmtEpa },
              { key: 'epa_per_pass',label: 'EPA/Pass', isEPA: true, fmt: fmtEpa },
              { key: 'epa_per_rush',label: 'EPA/Rush', isEPA: true, fmt: fmtEpa },
              { key: 'pass_ypg',    label: 'Pass YPG', fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'pass_ypp',    label: 'Pass YPP', fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'rush_ypg',    label: 'Rush YPG', fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'rush_ypp',    label: 'Rush YPP', fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'pass_pct',    label: 'Pass%',    fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'ttt',         label: 'TTT',      fmt: v => v != null ? v.toFixed(2) + 's' : '-' },
              { key: 'blitz_pct',   label: 'Blitz Fc%',fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'cpoe',        label: 'CPOE',     isEPA: true, fmt: v => fmtSgn(v) + (v != null ? '%' : '') },
            ]
            const offPassingCols = [
              { key: 'pass_att',        label: 'Att',      isBox: true, fmt: v => v ?? '-' },
              { key: 'completions',     label: 'Cmp',      isBox: true, fmt: v => v ?? '-' },
              { key: 'comp_pct',        label: 'Cmp%',     fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'pass_yards',      label: 'Yds',      isBox: true, fmt: v => v ?? '-' },
              { key: 'pass_ypg',        label: 'YPG',      sortDefault: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'pass_ypp',        label: 'Yds/Att',  fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'pass_tds',        label: 'TD',       isBox: true, fmt: v => v ?? '-' },
              { key: 'interceptions',   label: 'INT',      fmt: v => v ?? '-' },
              { key: 'passer_rating',   label: 'Rate',     isBox: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'sacks_taken',     label: 'Sack',     fmt: v => v ?? '-' },
              { key: 'epa_per_pass',    label: 'EPA/Pass', isEPA: true, fmt: fmtEpa },
              { key: 'times_pressured', label: 'Press',    fmt: v => v ?? '-' },
              { key: 'pressure_pct',    label: 'Press%',   fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'times_hurried',   label: 'Hurry',    fmt: v => v ?? '-' },
              { key: 'times_blitzed',   label: 'Blitzed',  fmt: v => v ?? '-' },
              { key: 'passing_drops',   label: 'Drops',    fmt: v => v ?? '-' },
              { key: 'bad_throw_pct',   label: 'BadThrow%',fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'ttt',             label: 'TTT',      fmt: v => v != null ? v.toFixed(2) + 's' : '-' },
              { key: 'cpoe',            label: 'CPOE',     isEPA: true, fmt: v => fmtSgn(v) + (v != null ? '%' : '') },
              { key: 'aggr',            label: 'Aggr%',    fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'iay',             label: 'IAY',      fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'cay_per_cmp',     label: 'CAY/Cmp',  fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'avg_yac',         label: 'YAC/Rec',  fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'adot',            label: 'ADOT',     fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'avg_sep',         label: 'Sep',      fmt: v => v != null ? v.toFixed(1) : '-' },
            ]
            const offRushingCols = [
              { key: 'rush_att',          label: 'Att',      isBox: true, fmt: v => v ?? '-' },
              { key: 'rush_yards',        label: 'Yds',      isBox: true, fmt: v => v ?? '-' },
              { key: 'rush_ypg',          label: 'YPG',      sortDefault: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'rush_ypp',          label: 'YPC',      fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'rush_tds',          label: 'TD',       isBox: true, fmt: v => v ?? '-' },
              { key: 'rush_first_downs',  label: '1st Dn',   fmt: v => v ?? '-' },
              { key: 'broken_tackles',    label: 'BrkTkl',   isBox: true, fmt: v => v ?? '-' },
              { key: 'yards_before_contact', label: 'YBC',   fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'yards_after_contact',  label: 'YAC',   fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'epa_per_rush',      label: 'EPA/Rush', isEPA: true, fmt: fmtEpa },
              { key: 'eff',               label: 'Eff',      isEPA: true, fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'ryoe',              label: 'RYOE',     isEPA: true, fmt: v => fmtSgn(v != null ? Math.round(v) : null, 0) },
              { key: 'ryoe_per_att',      label: 'RYOE/A',   isEPA: true, fmt: v => fmtSgn(v, 2) },
              { key: 'play_action_pct',   label: 'PA%',      fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'rpo_pct',           label: 'RPO%',     fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'stacked_pct',       label: 'Box%',     fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'ttlos',             label: 'TTLOS',    fmt: v => v != null ? v.toFixed(2) + 's' : '-' },
            ]
            const defSummaryCols = [
              { key: 'gp',                  label: 'GP',         isBox: true, fmt: v => v ?? '-' },
              { key: 'ppg_allowed',         label: 'PPG Alw',   isBox: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'total_ypg_allowed',   label: 'YPG Alw',   fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'pass_ypg_allowed',    label: 'Pass YPG',  fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'rush_ypg_allowed',    label: 'Rush YPG',  fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'epa_per_play_allowed',label: 'EPA/Play',  isEPA: true, sortDefault: true, fmt: fmtEpa },
              { key: 'sacks',               label: 'Sacks',     isBox: true, fmt: v => v != null ? v : '-' },
              { key: 'sack_rate',           label: 'Sack%',     fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'tfl',                 label: 'TFL',       fmt: v => v ?? '-' },
              { key: 'ints_forced',         label: 'INT',       isBox: true, fmt: v => v ?? '-' },
              { key: 'pass_breakups',       label: 'PBU',       fmt: v => v ?? '-' },
              { key: 'forced_fumbles',      label: 'FF',        fmt: v => v ?? '-' },
              { key: 'blitz_rate',          label: 'Blitz%',    fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'stacked_box_rate',    label: 'Stack%',    fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
            ]
            const defPassingCols = [
              { key: 'pass_att_against',    label: 'Att',       isBox: true, fmt: v => v ?? '-' },
              { key: 'pass_cmp_against',    label: 'Cmp',       isBox: true, fmt: v => v ?? '-' },
              { key: 'comp_pct_allowed',    label: 'Cmp%',      fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'pass_yds_allowed',    label: 'Yds',       isBox: true, fmt: v => v ?? '-' },
              { key: 'pass_ypg_allowed',    label: 'YPG',       sortDefault: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'pass_ypp_allowed',    label: 'Yds/Att',   fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'pass_td_against',     label: 'TD',        fmt: v => v ?? '-' },
              { key: 'ints_forced',         label: 'INT',       isBox: true, fmt: v => v ?? '-' },
              { key: 'passer_rating_allowed',label: 'QB Rate',  isBox: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'epa_per_pass_allowed',label: 'EPA/Pass',  isEPA: true, fmt: fmtEpa },
              { key: 'sacks',               label: 'Sacks',     fmt: v => v != null ? v : '-' },
              { key: 'sack_rate',           label: 'Sack%',     fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
              { key: 'qb_hits',             label: 'QB Hits',   fmt: v => v ?? '-' },
              { key: 'blitz_rate',          label: 'Blitz%',    fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
            ]
            const defRushingCols = [
              { key: 'rush_att_against',    label: 'Att',       isBox: true, fmt: v => v ?? '-' },
              { key: 'rush_yds_allowed',    label: 'Yds',       isBox: true, fmt: v => v ?? '-' },
              { key: 'rush_ypg_allowed',    label: 'YPG',       sortDefault: true, fmt: v => v != null ? v.toFixed(1) : '-' },
              { key: 'rush_ypc_allowed',    label: 'YPC',       fmt: v => v != null ? v.toFixed(2) : '-' },
              { key: 'rush_td_against',     label: 'TD',        fmt: v => v ?? '-' },
              { key: 'rush_first_dn_against',label: '1st Dn',  fmt: v => v ?? '-' },
              { key: 'epa_per_rush_allowed',label: 'EPA/Rush',  isEPA: true, fmt: fmtEpa },
              { key: 'tfl',                 label: 'TFL',       fmt: v => v ?? '-' },
              { key: 'forced_fumbles',      label: 'FF',        fmt: v => v ?? '-' },
              { key: 'stacked_box_rate',    label: 'Stack%',    fmt: v => v != null ? v.toFixed(1) + '%' : '-' },
            ]

            // Pick active columns
            let activeCols
            if (leagueSide === 'offense') {
              if (leagueSubTab === 'summary') activeCols = offSummaryCols
              else if (leagueSubTab === 'passing') activeCols = offPassingCols
              else activeCols = offRushingCols
            } else {
              if (leagueSubTab === 'passing') activeCols = defPassingCols
              else if (leagueSubTab === 'rushing') activeCols = defRushingCols
              else activeCols = defSummaryCols
            }

            // Sort logic
            const sortedStats = [...leagueStats].sort((a, b) => {
              if (!leagueSort.key) {
                // default: find sortDefault col
                const defCol = activeCols.find(c => c.sortDefault)
                if (defCol) {
                  const av = a[defCol.key] ?? -Infinity
                  const bv = b[defCol.key] ?? -Infinity
                  return bv - av
                }
                return 0
              }
              const av = a[leagueSort.key] ?? -Infinity
              const bv = b[leagueSort.key] ?? -Infinity
              return leagueSort.desc ? bv - av : av - bv
            })

            const handleColSort = (key) => {
              if (key === '_rush_pct') return  // computed, skip
              setLeagueSort(prev => prev.key === key ? { key, desc: !prev.desc } : { key, desc: true })
            }

            const leagueTh = (col) => {
              const isActive = leagueSort.key === col.key || (!leagueSort.key && col.sortDefault)
              return (
                <th
                  key={col.key}
                  onClick={() => handleColSort(col.key)}
                  style={{
                    ...thStyle,
                    cursor: col.key === '_rush_pct' ? 'default' : 'pointer',
                    color: isActive ? C.gold : C.muted,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    padding: '0.6rem 0.55rem',
                  }}
                >
                  {col.label}
                  {col.key !== '_rush_pct' && (
                    <span style={{ marginLeft: '0.25rem', opacity: isActive ? 1 : 0.3, fontSize: '0.65rem' }}>
                      {isActive ? (leagueSort.key ? (leagueSort.desc ? '▼' : '▲') : '▼') : '⇅'}
                    </span>
                  )}
                </th>
              )
            }

            return (
              <div>
                {/* Controls row */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Season selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: C.muted, fontSize: '0.75rem', ...filterLabelStyle }}>Season</span>
                    <select
                      value={leagueSeason}
                      onChange={e => setLeagueSeason(Number(e.target.value))}
                      style={{
                        backgroundColor: C.surface,
                        color: C.text,
                        border: `1px solid ${C.border}`,
                        borderRadius: 5,
                        padding: '0.3rem 0.6rem',
                        fontFamily: C.font,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      {ALL_SEASONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  {/* OFFENSE / DEFENSE toggle */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[{ id: 'offense', label: 'OFFENSE' }, { id: 'defense', label: 'DEFENSE' }].map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setLeagueSide(s.id); setLeagueSubTab('summary'); setLeagueSort({ key: null, desc: true }) }}
                        style={{
                          backgroundColor: leagueSide === s.id ? C.gold : 'transparent',
                          color: leagueSide === s.id ? '#0f0f13' : C.muted,
                          border: `1px solid ${leagueSide === s.id ? C.gold : C.border}`,
                          borderRadius: 5,
                          padding: '0.35rem 0.85rem',
                          cursor: 'pointer',
                          fontFamily: C.font,
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {(leagueSide === 'offense'
                      ? [{ id: 'summary', label: 'Summary' }, { id: 'passing', label: 'Passing' }, { id: 'rushing', label: 'Rushing' }]
                      : [{ id: 'summary', label: 'Summary' }, { id: 'passing', label: 'Pass Defense' }, { id: 'rushing', label: 'Run Defense' }]
                    ).map(st => (
                      <button
                        key={st.id}
                        onClick={() => { setLeagueSubTab(st.id); setLeagueSort({ key: null, desc: true }) }}
                        style={{
                          backgroundColor: leagueSubTab === st.id ? C.surfaceHover : 'transparent',
                          color: leagueSubTab === st.id ? C.text : C.muted,
                          border: `1px solid ${leagueSubTab === st.id ? C.borderBright : C.border}`,
                          borderRadius: 5,
                          padding: '0.3rem 0.7rem',
                          cursor: 'pointer',
                          fontFamily: C.font,
                          fontSize: '0.73rem',
                          fontWeight: leagueSubTab === st.id ? '600' : '400',
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                {leagueLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: C.muted, backgroundColor: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    Loading {leagueSeason} league stats…
                  </div>
                ) : leagueStats.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: C.muted, backgroundColor: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    No data available
                  </div>
                ) : (
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', backgroundColor: C.surface }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                            <th style={{ ...thStyle, padding: '0.6rem 0.5rem', width: 36, minWidth: 36, textAlign: 'center' }}>Rk</th>
                            <th style={{ ...thStyle, textAlign: 'left', padding: '0.6rem 0.75rem', minWidth: 120, position: 'sticky', left: 0, backgroundColor: C.surface, zIndex: 2 }}>Team</th>
                            {activeCols.map(col => leagueTh(col))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStats.map((row, i) => {
                            const rowBg = i % 2 === 0 ? C.surface : '#131319'
                            return (
                              <tr
                                key={row.team || i}
                                style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: rowBg }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                              >
                                {/* Rank */}
                                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', color: C.dim, fontFamily: C.fontStats, fontSize: '0.72rem' }}>
                                  {String(i + 1).padStart(2, '0')}
                                </td>
                                {/* Team */}
                                <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: rowBg, zIndex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                    <TeamLogo abbr={row.team} size={24} />
                                    <span style={{ color: C.text, fontWeight: '600', fontFamily: C.fontCond, fontSize: '0.82rem', letterSpacing: '0.02em' }}>{row.team}</span>
                                  </div>
                                </td>
                                {/* Stat columns */}
                                {activeCols.map(col => {
                                  const rawVal = col.computed ? null : row[col.key]
                                  const display = col.computed ? col.fmt(null, row) : col.fmt(rawVal)
                                  const isBox = col.isBox && rawVal != null
                                  let color = C.text
                                  if (col.isEPA && rawVal != null) {
                                    color = rawVal > 0 ? C.positive : rawVal < 0 ? C.negative : C.text
                                  }
                                  return (
                                    <td key={col.key} style={{ padding: isBox ? '0.35rem 0.45rem' : '0.55rem 0.55rem', textAlign: 'right' }}>
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
                                          minWidth: 30,
                                          textAlign: 'center',
                                        }}>
                                          {display}
                                        </span>
                                      ) : (
                                        <span style={{ color, fontFamily: C.fontStats, fontSize: '0.78rem' }}>{display}</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ══════════════════════════════════════════════════════════════
              TEAM ROSTER VIEW
          ══════════════════════════════════════════════════════════════ */}
          {teamsView === 'roster' && (
            <div>
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
                  const metrics = (GAME_LOG_METRICS[posKey] || PLAYER_METRICS[posKey] || [])
                  const glThStyle = { ...thStyle, backgroundColor: C.surface, padding: '0.6rem 0.75rem', fontSize: '0.68rem', letterSpacing: '0.07em', borderBottom: `2px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }
                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th style={{ ...glThStyle, textAlign: 'center', width: 52, minWidth: 52, borderRight: `1px solid ${C.border}` }}>WK</th>
                            <th style={{ ...glThStyle, textAlign: 'left', minWidth: 160 }}>OPP</th>
                            <th style={{ ...glThStyle, textAlign: 'left', minWidth: 110, borderRight: `1px solid ${C.border}` }}>RESULT</th>
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
                                const resultParts = game.game_result ? game.game_result.split(' ') : []
                                const wl = resultParts[0]
                                const resultColor = wl === 'W' ? C.positive : wl === 'L' ? C.negative : C.muted
                                const homeAway = game.home_away === 'home' ? 'vs' : game.home_away === 'away' ? '@' : ''
                                const hasPlays = !!game.game_id
                                return (
                                  <tr key={`${game.season}-${game.week}-${gIdx}`} style={{ backgroundColor: rowBg, borderBottom: `1px solid ${C.border}`, cursor: hasPlays ? 'pointer' : 'default' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg} onClick={() => hasPlays && fetchGameSummary(game.game_id)}>
                                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: C.muted, fontFamily: C.fontStats, fontWeight: '600', fontSize: '0.8rem', borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{weekLabel}</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>
                                      {game.opponent_team ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                          {homeAway && <span style={{ color: C.muted, fontSize: '0.7rem', fontFamily: C.fontCond, fontWeight: '600', minWidth: 14 }}>{homeAway}</span>}
                                          <TeamLogo abbr={game.opponent_team} size={22} />
                                          <span style={{ color: C.text, fontWeight: '600', fontFamily: C.font, fontSize: '0.82rem' }}>{game.opponent_team}</span>
                                        </div>
                                      ) : <span style={{ color: C.dim, fontFamily: C.font, fontSize: '0.78rem' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '0.5rem 0.75rem', borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                                      {game.game_result ? (
                                        <span style={{ fontFamily: C.fontStats, fontSize: '0.82rem' }}>
                                          <span style={{ color: resultColor, fontWeight: '700' }}>{wl}</span>
                                          <span style={{ color: C.text }}>{' '}{resultParts.slice(1).join(' ')}</span>
                                        </span>
                                      ) : <span style={{ color: C.dim }}>—</span>}
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

      {/* ── Game Summary Modal ─────────────────────────────────────────── */}
      {/* ── Game Summary Modal ─────────────────────────────────────────── */}
      {(gameSummaryLoading || gameSummary) && (() => {
        const gs = gameSummary
        const closeModal = () => { setGameSummary(null); setGameSummaryLoading(false) }

        // SVG Win Probability Chart
        const WPChart = ({ wpData, homeTeam, awayTeam }) => {
          if (!wpData || wpData.length === 0) return (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '0.75rem' }}>
              WP chart available after re-download
            </div>
          )
          const W = 500, H = 160
          const padL = 32, padR = 8, padT = 12, padB = 28
          const innerW = W - padL - padR
          const innerH = H - padT - padB
          // Sort by game_seconds_remaining desc (start of game = 3600)
          const sorted = [...wpData].sort((a, b) => b.game_seconds_remaining - a.game_seconds_remaining)
          const maxSec = 3600
          const toX = (sec) => padL + (1 - sec / maxSec) * innerW
          const toY = (pct) => padT + (1 - pct / 100) * innerH
          // Build path
          const pts = sorted.map(d => `${toX(d.game_seconds_remaining)},${toY(d.home_wp)}`)
          const path = `M ${pts.join(' L ')}`
          // Quarter markers at 2700, 1800, 900 seconds remaining
          const qtrs = [2700, 1800, 900]
          // Home % at end
          const lastPt = sorted[sorted.length - 1]
          const homeWin = lastPt?.home_wp > 50

          return (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Background */}
              <rect x={padL} y={padT} width={innerW} height={innerH} fill="#0f0f13" />
              {/* 50% line */}
              <line x1={padL} y1={padT + innerH/2} x2={padL + innerW} y2={padT + innerH/2} stroke={C.borderBright} strokeWidth="1" strokeDasharray="4,3" />
              {/* Quarter markers */}
              {qtrs.map(sec => (
                <line key={sec} x1={toX(sec)} y1={padT} x2={toX(sec)} y2={padT + innerH} stroke={C.border} strokeWidth="1" />
              ))}
              {/* Home team area fill above 50% */}
              <clipPath id="clipAbove">
                <rect x={padL} y={padT} width={innerW} height={innerH/2} />
              </clipPath>
              <clipPath id="clipBelow">
                <rect x={padL} y={padT + innerH/2} width={innerW} height={innerH/2} />
              </clipPath>
              <path d={`${path} L ${padL + innerW},${padT + innerH} L ${padL},${padT + innerH} Z`}
                fill={`rgba(52,208,88,0.15)`} clipPath="url(#clipAbove)" />
              <path d={`${path} L ${padL + innerW},${padT} L ${padL},${padT} Z`}
                fill={`rgba(248,81,73,0.12)`} clipPath="url(#clipBelow)" />
              {/* WP line */}
              <path d={path} fill="none" stroke={C.gold} strokeWidth="2" strokeLinejoin="round" />
              {/* Y axis labels */}
              {[100,75,50,25,0].map(pct => (
                <text key={pct} x={padL - 4} y={toY(pct) + 4} textAnchor="end"
                  fill={C.muted} fontSize="9" fontFamily="monospace">{pct}</text>
              ))}
              {/* X axis labels */}
              {['Q1','Q2','Q3','Q4'].map((lbl, i) => (
                <text key={lbl} x={padL + innerW * (i + 0.5) / 4} y={H - 6} textAnchor="middle"
                  fill={C.muted} fontSize="9" fontFamily="monospace">{lbl}</text>
              ))}
              {/* Team labels */}
              <text x={padL + 4} y={padT + 14} fill={C.positive} fontSize="9" fontFamily="monospace" fontWeight="bold">{homeTeam}</text>
              <text x={padL + 4} y={padT + innerH - 5} fill={C.negative} fontSize="9" fontFamily="monospace" fontWeight="bold">{awayTeam}</text>
            </svg>
          )
        }

        const BoxTable = ({ title, rows, columns }) => {
          if (!rows || rows.length === 0) return null
          const headerStyle = { padding: '0.4rem 0.6rem', color: C.muted, fontFamily: C.fontCond, fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'right', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }
          return (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ color: C.gold, fontFamily: C.fontCond, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.5rem 0.75rem 0.25rem', borderTop: `1px solid ${C.border}` }}>{title}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr>
                    <th style={{ ...headerStyle, textAlign: 'left', minWidth: 110 }}>Player</th>
                    {columns.map(c => <th key={c.key} style={headerStyle}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? C.surface : '#131319', borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '0.45rem 0.6rem', color: C.text, fontFamily: C.font, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{row.name}</td>
                      {columns.map(c => (
                        <td key={c.key} style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontFamily: C.fontStats, fontSize: '0.75rem', color: c.epa ? ((row[c.key] > 0 ? C.positive : row[c.key] < 0 ? C.negative : C.text)) : C.text }}>
                          {row[c.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        const TeamPanel = ({ side }) => {
          const data = gs?.[side]
          const team = gs?.[side === 'home' ? 'home_team' : 'away_team']
          const tab = gameSummaryTab[side]
          const tabBtnStyle = (active) => ({
            backgroundColor: active ? C.gold : 'transparent',
            color: active ? '#0f0f13' : C.muted,
            border: `1px solid ${active ? C.gold : C.border}`,
            borderRadius: 4, padding: '0.3rem 0.75rem',
            cursor: 'pointer', fontFamily: C.fontCond, fontSize: '0.65rem', fontWeight: '700',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          })
          const passCols = [
            { key: 'cp_att', label: 'CP/ATT' }, { key: 'yds', label: 'YDS' },
            { key: 'td_int', label: 'TD-INT' }, { key: 'cmp_pct', label: 'CMP%' },
            { key: 'rating', label: 'RATING' }, { key: 'yds_att', label: 'YDS/ATT' },
          ]
          const rushCols = [
            { key: 'att', label: 'ATT' }, { key: 'yds', label: 'YDS' },
            { key: 'ypc', label: 'YPC' }, { key: 'tds', label: 'TD' }, { key: 'long', label: 'LONG' },
          ]
          const recCols = [
            { key: 'tgt', label: 'TGT' }, { key: 'rec', label: 'REC' }, { key: 'yds', label: 'YDS' },
            { key: 'tds', label: 'TD' }, { key: 'yds_rec', label: 'YDS/REC' },
            { key: 'long', label: 'LG REC' }, { key: 'yac', label: 'YAC' },
          ]
          return (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.75rem 0.5rem', borderBottom: `1px solid ${C.border}` }}>
                <TeamLogo abbr={team} size={32} />
                <span style={{ fontFamily: C.fontDisplay, fontWeight: '800', fontSize: '1.1rem', color: C.text }}>{team}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderBottom: `1px solid ${C.border}` }}>
                <button style={tabBtnStyle(tab === 'offense')} onClick={() => setGameSummaryTab(t => ({ ...t, [side]: 'offense' }))}>Offense</button>
                <button style={tabBtnStyle(tab === 'defense')} onClick={() => setGameSummaryTab(t => ({ ...t, [side]: 'defense' }))}>Defense</button>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 420 }}>
                {tab === 'offense' && data && (
                  <>
                    <BoxTable title="Passing" rows={data.passing} columns={passCols} />
                    <BoxTable title="Rushing" rows={data.rushing} columns={rushCols} />
                    <BoxTable title="Receiving" rows={data.receiving} columns={recCols} />
                  </>
                )}
                {tab === 'defense' && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: C.muted, fontSize: '0.75rem' }}>
                    Defense stats coming soon
                  </div>
                )}
              </div>
            </div>
          )
        }

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.94)', zIndex: 2000, overflowY: 'auto', padding: '1rem' }}
            onClick={closeModal}
          >
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: '1300px', margin: '0 auto', backgroundColor: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Header bar */}
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface }}>
                <div style={{ fontFamily: C.fontCond, color: C.muted, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Game Summary · {gs?.game_id || '…'}
                </div>
                <button onClick={closeModal} style={{ backgroundColor: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.4rem 0.875rem', cursor: 'pointer', fontFamily: C.font, fontSize: '0.78rem' }}>✕ Close</button>
              </div>

              {gameSummaryLoading && !gs ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>Loading game data…</div>
              ) : gs && (
                <>
                  {/* Score bar */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', padding: '1rem 1.5rem', borderBottom: `1px solid ${C.border}`, backgroundColor: '#0d0d14' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <TeamLogo abbr={gs.away_team} size={40} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: C.fontDisplay, fontSize: '1.5rem', fontWeight: '800', color: gs.away_score > gs.home_score ? C.text : C.muted }}>{gs.away_team}</div>
                        <div style={{ fontFamily: C.fontStats, fontSize: '2.25rem', fontWeight: '900', color: C.text, lineHeight: 1 }}>{gs.away_score}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: C.fontCond, color: C.muted, fontSize: '0.85rem', letterSpacing: '0.05em' }}>FINAL</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: C.fontDisplay, fontSize: '1.5rem', fontWeight: '800', color: gs.home_score > gs.away_score ? C.text : C.muted }}>{gs.home_team}</div>
                        <div style={{ fontFamily: C.fontStats, fontSize: '2.25rem', fontWeight: '900', color: C.text, lineHeight: 1 }}>{gs.home_score}</div>
                      </div>
                      <TeamLogo abbr={gs.home_team} size={40} />
                    </div>
                  </div>

                  {/* Main 3-column layout */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* Away team */}
                    <div style={{ borderRight: `1px solid ${C.border}`, flex: 1, minWidth: 0 }}>
                      <TeamPanel side="away" />
                    </div>

                    {/* Center: WP chart + last plays */}
                    <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${C.border}` }}>
                      {/* WP Chart */}
                      <div style={{ padding: '0.75rem', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TeamLogo abbr={gs.away_team} size={18} />
                            <span style={{ fontFamily: C.fontStats, fontSize: '0.8rem', color: gs.away_score > gs.home_score ? C.text : C.muted, fontWeight: '700' }}>
                              {gs.wp_chart.length > 0 ? `${gs.wp_chart[gs.wp_chart.length - 1]?.away_wp ?? 100}%` : (gs.away_score > gs.home_score ? '100%' : '0%')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: C.fontStats, fontSize: '0.8rem', color: gs.home_score > gs.away_score ? C.text : C.muted, fontWeight: '700' }}>
                              {gs.wp_chart.length > 0 ? `${gs.wp_chart[gs.wp_chart.length - 1]?.home_wp ?? 100}%` : (gs.home_score > gs.away_score ? '100%' : '0%')}
                            </span>
                            <TeamLogo abbr={gs.home_team} size={18} />
                          </div>
                        </div>
                        <WPChart wpData={gs.wp_chart} homeTeam={gs.home_team} awayTeam={gs.away_team} />
                        <div style={{ textAlign: 'center', fontFamily: C.fontCond, fontSize: '0.6rem', color: C.dim, marginTop: '0.25rem', letterSpacing: '0.05em' }}>WIN PROBABILITY</div>
                      </div>

                      {/* Last 5 plays */}
                      <div style={{ padding: '0.5rem 0' }}>
                        <div style={{ fontFamily: C.fontCond, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.gold, padding: '0.4rem 0.75rem' }}>Last {gs.last_plays.length} Plays</div>
                        {gs.last_plays.map((play, i) => (
                          <div key={i} style={{ padding: '0.5rem 0.75rem', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <TeamLogo abbr={play.team} size={16} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem', alignItems: 'center' }}>
                                <span style={{ fontFamily: C.fontCond, fontSize: '0.6rem', color: C.muted, whiteSpace: 'nowrap' }}>
                                  Q{play.qtr}{play.down ? ` · ${play.down}${['st','nd','rd','th'][Math.min((play.down||1)-1,3)]} & ${play.ydstogo}` : ''}
                                </span>
                              </div>
                              <div style={{ fontFamily: C.font, fontSize: '0.72rem', color: C.text, lineHeight: 1.4 }}>{play.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Home team */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TeamPanel side="home" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Glossary Slide-Over Panel ────────────────────────────────────── */}
      {/* Backdrop */}
      {showGlossary && (
        <div
          onClick={() => setShowGlossary(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
            transition: 'opacity 0.25s',
          }}
        />
      )}
      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 420, maxWidth: '90vw',
          backgroundColor: C.bg,
          borderLeft: `1px solid ${C.borderBright}`,
          zIndex: 1200,
          transform: showGlossary ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column',
          boxShadow: showGlossary ? '-8px 0 32px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Panel header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: C.surface, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: C.fontDisplay, fontWeight: '700', fontSize: '1rem', color: C.text }}>Stats Glossary</div>
            <div style={{ fontFamily: C.fontCond, fontSize: '0.6rem', color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.2rem' }}>Stat Definitions & Methodology</div>
          </div>
          <button
            onClick={() => setShowGlossary(false)}
            style={{
              backgroundColor: 'transparent', color: C.muted,
              border: `1px solid ${C.border}`, borderRadius: 6,
              padding: '0.4rem 0.875rem', cursor: 'pointer',
              fontFamily: C.font, fontSize: '0.78rem',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderBright }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
          {GLOSSARY.map(group => (
            <div key={group.section} style={{ marginBottom: '1.5rem' }}>
              <div style={{
                color: C.gold, fontFamily: C.fontCond, fontSize: '0.65rem', fontWeight: '700',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: '0.6rem',
                paddingBottom: '0.35rem',
                borderBottom: `1px solid ${C.goldBorder}`,
              }}>
                {group.section}
              </div>
              {group.items.map(item => (
                <div key={item.abbr + group.section} style={{
                  display: 'grid', gridTemplateColumns: '52px 1fr',
                  gap: '0.75rem', padding: '0.4rem 0',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ color: C.gold, fontWeight: '700', fontFamily: C.fontStats, fontSize: '0.78rem', paddingTop: '0.05rem' }}>{item.abbr}</span>
                  <div>
                    <span style={{ color: C.text, fontFamily: C.font, fontSize: '0.78rem', fontWeight: '600' }}>{item.name}</span>
                    <div style={{ color: C.muted, fontFamily: C.font, fontSize: '0.71rem', marginTop: '0.15rem', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{ color: C.dim, fontFamily: C.font, fontSize: '0.65rem', marginTop: '0.75rem', borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem', lineHeight: 1.6 }}>
            NGS metrics sourced from NFL Next Gen Stats (RFID tracking, 10Hz). EPA and seasonal stats from nflfastR PBP data via nfl_data_py.
          </div>
        </div>
      </div>
    </div>
  )
}

export default NGSTerminal
