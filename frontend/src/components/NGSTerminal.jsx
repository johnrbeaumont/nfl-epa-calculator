import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Position to stat type mapping
const POSITION_STAT_MAP = {
  QB: 'passing',
  RB: 'rushing',
  WR: 'receiving',
  TE: 'receiving',
  DL: null,  // NGS does not track defensive players
  LB: null,  // NGS does not track defensive players
  DB: null   // NGS does not track defensive players
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
        { key: 'attempts', label: 'Att', format: fmt.int },
        { key: 'completions', label: 'Cmp', format: fmt.int },
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
        { key: 'rush_attempts', label: 'Att', format: fmt.int },
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
        { key: 'targets', label: 'Tgt', format: fmt.int },
        { key: 'receptions', label: 'Rec', format: fmt.int },
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

// Legacy flat list for game log rendering (kept for player detail view)
const PLAYER_METRICS = {
  QB: METRIC_SECTIONS.QB.flatMap(s => s.metrics),
  RB: METRIC_SECTIONS.RB.flatMap(s => s.metrics),
  WR: METRIC_SECTIONS.WR.flatMap(s => s.metrics),
  TE: METRIC_SECTIONS.TE.flatMap(s => s.metrics),
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
    { abbr: 'EPA', name: 'Expected Points Added', desc: 'Total expected points added on all pass plays. Measures how much a QB\'s passes improved their team\'s scoring expectation compared to average. Positive = above average.' },
    { abbr: 'EPA/DB', name: 'EPA per Dropback', desc: 'EPA divided by pass attempts. Measures per-play efficiency — the best single number for evaluating QB play quality.' },
    { abbr: 'CPOE', name: 'Completion % Over Expected', desc: 'Actual completion % minus expected completion % (from NGS model accounting for air yards, coverage, etc). Positive = more accurate than expected.' },
    { abbr: 'DAKOTA', name: 'DAKOTA', desc: 'Adjusted EPA/play metric from nflfastR that accounts for strength of opposing defenses faced. Higher = better performance against tougher competition.' },
    { abbr: 'PACR', name: 'Passer Air Conversion Ratio', desc: 'Passing yards divided by passing air yards. Measures how efficiently a QB converts air yards into actual yards. Values >1.0 mean YAC is supplementing air yards.' },
    { abbr: '1st', name: 'Passing First Downs', desc: 'Total first downs gained through passing.' },
  ]},
  { section: 'Air Yards (QB)', items: [
    { abbr: 'CAY', name: 'Completed Air Yards', desc: 'Average air yards on completed passes. How far downfield completions travel before being caught.' },
    { abbr: 'IAY', name: 'Intended Air Yards', desc: 'Average air yards on all pass attempts. Measures how far downfield a QB targets on average.' },
    { abbr: 'AY/Stk', name: 'Air Yards to Sticks', desc: 'Average air yards relative to the first down marker. Negative = throwing short of sticks; positive = throwing past them.' },
  ]},
  { section: 'Advanced Passing', items: [
    { abbr: 'TTT', name: 'Time to Throw', desc: 'Average time (seconds) from snap to pass release. Lower = quicker processing or shorter routes.' },
    { abbr: 'Aggr%', name: 'Aggressiveness', desc: 'Percentage of passes thrown into tight coverage windows (defender within 1 yard of receiver at pass arrival).' },
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
    { abbr: 'EPA', name: 'Expected Points Added', desc: 'Total EPA on all rush plays. Measures how much a RB\'s carries improved their team\'s scoring expectation vs average.' },
    { abbr: 'EPA/C', name: 'EPA per Carry', desc: 'EPA divided by rush attempts. Per-play rushing efficiency — the best single metric for evaluating RB impact.' },
    { abbr: 'Eff', name: 'NGS Efficiency', desc: 'Rushing yards gained divided by expected rushing yards (from NGS model). Values >1.0 = outperforming expectation.' },
    { abbr: 'RYOE', name: 'Rush Yards Over Expected', desc: 'Total rushing yards minus expected rushing yards. Positive = gained more yards than the blocking and play design would predict.' },
    { abbr: 'YOE/A', name: 'Yards Over Expected per Attempt', desc: 'RYOE divided by rush attempts. Per-carry measure of how much a RB outperforms expected yardage.' },
    { abbr: '1st', name: 'Rushing First Downs', desc: 'Total first downs gained through rushing.' },
  ]},
  { section: 'Advanced Rushing', items: [
    { abbr: 'Box%', name: 'Stacked Box Rate', desc: 'Percentage of rush attempts facing 8+ defenders in the box. Higher = facing more loaded fronts.' },
    { abbr: 'TTLOS', name: 'Time to Line of Scrimmage', desc: 'Average time (seconds) from handoff to crossing the line of scrimmage. Measures patience and burst.' },
    { abbr: 'xYds', name: 'Expected Rush Yards', desc: 'Total expected rushing yards based on the NGS model (accounts for blocking, defenders, etc).' },
    { abbr: 'RACR', name: 'Receiver Air Conversion Ratio', desc: 'Receiving yards divided by air yards targeted. Measures YAC contribution for pass-catching RBs.' },
    { abbr: 'FPts', name: 'Fantasy Points', desc: 'Standard scoring fantasy football points for the season.' },
  ]},
  { section: 'Core Receiving', items: [
    { abbr: 'G', name: 'Games Played', desc: 'Number of regular season games the player appeared in.' },
    { abbr: 'Tgt', name: 'Targets', desc: 'Total pass targets (times the ball was thrown to this receiver).' },
    { abbr: 'Rec', name: 'Receptions', desc: 'Total catches made.' },
    { abbr: 'Yds', name: 'Receiving Yards', desc: 'Total receiving yards gained.' },
    { abbr: 'TD', name: 'Receiving Touchdowns', desc: 'Total receiving touchdowns scored.' },
    { abbr: 'Ct%', name: 'Catch Percentage', desc: 'Percentage of targets caught (Rec / Tgt × 100).' },
  ]},
  { section: 'EPA & Efficiency (WR/TE)', items: [
    { abbr: 'EPA', name: 'Expected Points Added', desc: 'Total EPA on all targets. Measures how much receiving plays improved the team\'s scoring expectation.' },
    { abbr: 'EPA/Tgt', name: 'EPA per Target', desc: 'EPA divided by targets. Per-opportunity receiving efficiency — accounts for incompletions and drops.' },
    { abbr: 'RACR', name: 'Receiver Air Conversion Ratio', desc: 'Receiving yards divided by air yards targeted. Values >1.0 = strong YAC ability; <1.0 = drops or short-of-target catches.' },
    { abbr: '1st', name: 'Receiving First Downs', desc: 'Total first downs gained through receptions.' },
  ]},
  { section: 'Target Share & Distribution', items: [
    { abbr: 'Tgt%', name: 'Target Share', desc: 'Proportion of team pass targets directed at this receiver. Higher = more involved in the passing game.' },
    { abbr: 'AY%', name: 'Air Yards Share', desc: 'Proportion of team air yards directed at this receiver. Indicates downfield usage and role in the offense.' },
    { abbr: 'WOPR', name: 'Weighted Opportunity Rating', desc: 'Combines target share (1.5× weight) and air yards share (0.7× weight). A single number capturing receiving opportunity volume.' },
    { abbr: 'IAY', name: 'Intended Air Yards', desc: 'Average depth of target (air yards per target). Measures how far downfield the receiver is being targeted.' },
    { abbr: 'IAY%', name: 'Share of Intended Air Yards', desc: 'Receiver\'s share of the team\'s total intended air yards.' },
  ]},
  { section: 'Separation & YAC', items: [
    { abbr: 'Cush', name: 'Average Cushion', desc: 'Average yards between the receiver and nearest defender at the time of snap. Indicates how much respect a receiver commands pre-play.' },
    { abbr: 'Sep', name: 'Average Separation', desc: 'Average yards of separation from the nearest defender at the time the pass arrives. The key NGS route-running metric.' },
    { abbr: 'YAC', name: 'Yards After Catch', desc: 'Average yards gained after the reception. Measures a receiver\'s ability to create yards with the ball.' },
    { abbr: 'YAC+', name: 'YAC Above Expectation', desc: 'Actual YAC minus expected YAC (from NGS model). Positive = creating more yards after catch than expected given the catch location.' },
    { abbr: 'FPts', name: 'Fantasy Points', desc: 'Standard scoring fantasy football points for the season.' },
  ]},
]

const ALL_SEASONS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]

// NFL Teams
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

function NGSTerminal({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('PLAYERS')
  const [selectedPositions, setSelectedPositions] = useState(['QB'])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [search, setSearch] = useState('')
  const [selectedSeasons, setSelectedSeasons] = useState([2025])
  const [viewMode, setViewMode] = useState('yearly')
  const [yearDisplay, setYearDisplay] = useState('combined') // 'combined' or 'separate'
  const [expandedSections, setExpandedSections] = useState({})
  const [showGlossary, setShowGlossary] = useState(false)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState(null)
  const [sortDesc, setSortDesc] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Team-specific state
  const [teamStatsTeam, setTeamStatsTeam] = useState('KC')
  const [teamStatsWeek, setTeamStatsWeek] = useState(0)
  const [teamStats, setTeamStats] = useState(null)

  // Player detail view state
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerGameLogs, setPlayerGameLogs] = useState([])
  const [playerLogsLoading, setPlayerLogsLoading] = useState(false)

  // Team roster state
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState(null)
  const [teamRosterSeason, setTeamRosterSeason] = useState(2025)
  const [teamRoster, setTeamRoster] = useState({ qbs: [], rbs: [], receivers: [] })
  const [rosterLoading, setRosterLoading] = useState(false)

  // Fetch last refresh timestamp on mount
  useEffect(() => {
    fetch(`${API_URL}/api/ngs/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.refresh_log?.last_refresh) {
          setLastUpdated(data.refresh_log.last_refresh)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'PLAYERS') {
      fetchPlayerData()
    }
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
      // Create array of fetch promises for all position+season combinations
      const fetchPromises = []

      for (const position of selectedPositions) {
        const statType = POSITION_STAT_MAP[position]
        if (!statType) continue

        for (const season of selectedSeasons) {
          let volumeParam, minThreshold

          if (statType === 'defense') {
            volumeParam = 'min_tackles'
            minThreshold = 20
          } else if (statType === 'receiving') {
            volumeParam = 'min_targets'
            minThreshold = position === 'TE' ? 50 : 50
          } else if (statType === 'passing') {
            volumeParam = 'min_attempts'
            minThreshold = 200
          } else if (statType === 'rushing') {
            volumeParam = 'min_attempts'
            minThreshold = 100
          }

          const url = `${API_URL}/api/ngs/${statType}?season=${season}&week=0&${volumeParam}=${minThreshold}&limit=100${statType === 'defense' ? `&position=${position}` : ''}`

          fetchPromises.push(
            fetch(url)
              .then(res => res.ok ? res.json() : [])
              .then(data => ({
                position,
                season,
                data: data.filter(player => {
                  const positionMatch = player.player_position === position
                  const teamMatch = !selectedTeam || player.team_abbr === selectedTeam
                  return positionMatch && teamMatch
                })
              }))
              .catch(err => {
                console.error(`Error fetching ${position} ${season}:`, err)
                return { position, season, data: [] }
              })
          )
        }
      }

      // Execute all fetches in parallel
      const results = await Promise.all(fetchPromises)

      // Combine all results into single array
      const combinedData = results.flatMap(result => result.data)

      setData(combinedData)
    } catch (err) {
      console.error('Error fetching player data:', err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const aggregateCareerStats = (playerData) => {
    // Group by player_gsis_id
    const playerGroups = {}

    playerData.forEach(record => {
      const playerId = record.player_gsis_id || record.player_display_name
      if (!playerGroups[playerId]) {
        playerGroups[playerId] = {
          player_display_name: record.player_display_name,
          player_position: record.player_position,
          team_abbr: record.team_abbr,
          seasons: [],
          records: []
        }
      }
      playerGroups[playerId].seasons.push(record.season)
      playerGroups[playerId].records.push(record)
    })

    // Aggregate stats for each player
    return Object.values(playerGroups).map(group => {
      const aggregated = { ...group.records[0] }  // Start with first record
      aggregated.season = `${Math.min(...group.seasons)}-${Math.max(...group.seasons)}`
      aggregated.seasons_count = group.seasons.length

      // Sum volume stats
      const volumeStats = ['attempts', 'completions', 'pass_yards', 'pass_touchdowns', 'interceptions',
                           'rush_attempts', 'rush_yards', 'rush_touchdowns',
                           'targets', 'receptions', 'yards', 'rec_touchdowns',
                           'passing_first_downs', 'rushing_first_downs', 'receiving_first_downs',
                           'passing_epa', 'rushing_epa', 'receiving_epa',
                           'rush_yards_over_expected', 'expected_rush_yards',
                           'games', 'fantasy_points', 'fantasy_points_ppr']

      volumeStats.forEach(stat => {
        const values = group.records.filter(r => r[stat] != null)
        if (values.length > 0) {
          aggregated[stat] = values.reduce((sum, r) => sum + (r[stat] || 0), 0)
        }
      })

      // Average rate stats
      const rateStats = ['completion_percentage', 'completion_percentage_above_expectation',
                         'avg_time_to_throw', 'aggressiveness', 'passer_rating',
                         'avg_rush_yards', 'efficiency', 'avg_separation', 'avg_yac_above_expectation',
                         'avg_cushion', 'avg_yac', 'avg_completed_air_yards', 'avg_intended_air_yards',
                         'avg_air_yards_to_sticks', 'avg_time_to_los',
                         'percent_attempts_gte_eight_defenders',
                         'dakota', 'pacr', 'racr', 'target_share', 'air_yards_share', 'wopr_x',
                         'catch_percentage', 'percent_share_of_intended_air_yards',
                         'sacks']

      rateStats.forEach(stat => {
        const values = group.records.filter(r => r[stat] != null).map(r => r[stat])
        if (values.length > 0) {
          aggregated[stat] = values.reduce((sum, v) => sum + v, 0) / values.length
        }
      })

      // Recompute per-play EPA rates from aggregated totals
      if (aggregated.passing_epa != null && aggregated.attempts) {
        aggregated.epa_per_dropback = aggregated.passing_epa / aggregated.attempts
      }
      if (aggregated.rushing_epa != null && aggregated.rush_attempts) {
        aggregated.epa_per_carry = aggregated.rushing_epa / aggregated.rush_attempts
      }
      if (aggregated.receiving_epa != null && aggregated.targets) {
        aggregated.epa_per_target = aggregated.receiving_epa / aggregated.targets
      }
      if (aggregated.rush_yards_over_expected != null && aggregated.rush_attempts) {
        aggregated.rush_yards_over_expected_per_att = aggregated.rush_yards_over_expected / aggregated.rush_attempts
      }

      return aggregated
    })
  }

  const fetchPlayerGameLogs = async (player) => {
    setPlayerLogsLoading(true)
    setPlayerGameLogs([])
    setSelectedPlayer(player)

    try {
      const statType = POSITION_STAT_MAP[player.player_position]
      if (!statType) return

      // Fetch all available seasons for this player (2016-2024)
      const allSeasons = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]
      const fetchPromises = []

      for (const season of allSeasons) {
        // Fetch all weeks (1-18) plus playoffs
        for (let week = 1; week <= 22; week++) {
          const positionParam = statType === 'defense' ? `&position=${player.player_position}` : ''
          const url = `${API_URL}/api/ngs/${statType}?season=${season}&week=${week}&limit=500${positionParam}`

          fetchPromises.push(
            fetch(url)
              .then(res => res.ok ? res.json() : [])
              .then(data => ({
                season,
                week,
                data: data.filter(p => p.player_gsis_id === player.player_gsis_id)
              }))
              .catch(err => {
                console.error(`Error fetching week ${week} ${season}:`, err)
                return { season, week, data: [] }
              })
          )
        }
      }

      // Execute all fetches in parallel
      const results = await Promise.all(fetchPromises)

      // Combine and filter out empty results
      const gameLogs = results
        .filter(result => result.data.length > 0)
        .flatMap(result => result.data)
        .sort((a, b) => {
          // Sort by season desc, then week desc
          if (a.season !== b.season) return b.season - a.season
          return b.week - a.week
        })

      setPlayerGameLogs(gameLogs)
    } catch (err) {
      console.error('Error fetching player game logs:', err)
      setPlayerGameLogs([])
    } finally {
      setPlayerLogsLoading(false)
    }
  }

  const fetchTeamStats = async () => {
    setLoading(true)
    setTeamStats(null)
    try {
      const url = `${API_URL}/api/ngs/team-stats?season=${selectedSeasons[0]}&week=${teamStatsWeek}&team=${teamStatsTeam}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch team stats')

      const result = await response.json()
      setTeamStats(result)
    } catch (err) {
      console.error('Error fetching team stats:', err)
      setTeamStats(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamRoster = async (team, season) => {
    setRosterLoading(true)
    setTeamRoster({ qbs: [], rbs: [], receivers: [] })
    try {
      const [passRes, rushRes, recRes] = await Promise.all([
        fetch(`${API_URL}/api/ngs/passing?season=${season}&week=0&team=${team}&limit=500`)
          .then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/api/ngs/rushing?season=${season}&week=0&team=${team}&limit=500`)
          .then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/api/ngs/receiving?season=${season}&week=0&team=${team}&limit=500`)
          .then(r => r.ok ? r.json() : []).catch(() => []),
      ])
      setTeamRoster({
        qbs: Array.isArray(passRes) ? passRes : [],
        rbs: Array.isArray(rushRes) ? rushRes.filter(p => p.player_position === 'RB') : [],
        receivers: Array.isArray(recRes) ? recRes : [],
      })
    } catch (err) {
      console.error('Error fetching team roster:', err)
    } finally {
      setRosterLoading(false)
    }
  }

  // Filter data by search term
  const filteredData = data.filter(player => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return player.player_display_name?.toLowerCase().includes(searchLower) ||
           player.team_abbr?.toLowerCase().includes(searchLower)
  })

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortBy) return 0
    const aVal = a[sortBy] ?? -Infinity
    const bVal = b[sortBy] ?? -Infinity
    return sortDesc ? bVal - aVal : aVal - bVal
  })

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(key)
      setSortDesc(true)
    }
  }

  // Determine display data and relevant metrics
  const getDisplayData = () => {
    if (viewMode === 'career') return aggregateCareerStats(sortedData)
    // Multi-year combined: aggregate into single row per player
    if (yearDisplay === 'combined' && selectedSeasons.length > 1) {
      return aggregateCareerStats(sortedData)
    }
    // Multi-year separate: group by player, show each season row consecutively
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
        if (!seen.has(id)) {
          seen.add(id)
          groupOrder.push(id)
        }
      })
      return groupOrder.flatMap(id => playerGroups[id])
    }
    return sortedData
  }
  const displayedData = getDisplayData()

  // Build sections for the selected position
  const primaryPosition = selectedPositions[0] || 'QB'
  const sections = (METRIC_SECTIONS[primaryPosition] || []).map(section => ({
    ...section,
    expanded: expandedSections[section.id] !== undefined
      ? expandedSections[section.id]
      : section.defaultOpen
  }))

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] !== undefined ? !prev[sectionId] : false
    }))
  }

  // Flat list of all visible metrics (from expanded sections)
  const relevantMetrics = sections.flatMap(s => s.expanded ? s.metrics : [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#e0e0e0',
      fontFamily: "'Courier New', monospace",
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        borderBottom: '1px solid #333',
        paddingBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#4a9eff',
              marginBottom: '0.25rem'
            }}>
              NFL NEXT GEN STATS TERMINAL
            </h1>
            <div style={{ fontSize: '0.875rem', color: '#888' }}>
              <span style={{ color: '#0f0' }}>● LIVE</span> | SEASONS: {selectedSeasons.join(', ')}
              {lastUpdated && (() => {
                const d = new Date(lastUpdated)
                const now = new Date()
                const daysSince = Math.floor((now - d) / (1000 * 60 * 60 * 24))
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
                return (
                  <span style={{ color: daysSince > 14 ? '#f80' : '#888' }}>
                    {' '}| DATA: {dateStr}
                  </span>
                )
              })()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowGlossary(true)}
              style={{
                backgroundColor: 'transparent',
                color: '#4a9eff',
                border: '1px solid #4a9eff',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.75rem'
              }}
              title="Stats Glossary"
            >
              ? GLOSSARY
            </button>
            <button
              onClick={onNavigate}
              style={{
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #333',
                padding: '0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.75rem'
              }}
              title="Back to EPA Calculator"
            >
              ⌂ HOME
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['PLAYERS', 'TEAMS'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? '#4a9eff' : 'transparent',
                color: activeTab === tab ? '#0a0a0f' : '#4a9eff',
                border: '1px solid #4a9eff',
                padding: '0.5rem 1.5rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.875rem'
              }}
            >
              [ {tab} ]
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'PLAYERS' ? (
        <>
          {/* Position Filter */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#1a1a1f',
            border: '1px solid #333'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Multi-Year Selection */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  SELECT YEARS:
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  fontSize: '0.75rem'
                }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      color: selectedSeasons.length === ALL_SEASONS.length ? '#4a9eff' : '#888',
                      gridColumn: 'span 3',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeasons.length === ALL_SEASONS.length}
                      onChange={(e) => {
                        setSelectedSeasons(e.target.checked ? [...ALL_SEASONS] : [ALL_SEASONS[0]])
                      }}
                      style={{ accentColor: '#4a9eff', cursor: 'pointer' }}
                    />
                    ALL
                  </label>
                  {ALL_SEASONS.map(year => (
                    <label key={year} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      color: selectedSeasons.includes(year) ? '#4a9eff' : '#888'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedSeasons.includes(year)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSeasons([...selectedSeasons, year].sort((a,b) => b-a))
                          } else {
                            if (selectedSeasons.length > 1) {
                              setSelectedSeasons(selectedSeasons.filter(y => y !== year))
                            }
                          }
                        }}
                        style={{
                          accentColor: '#4a9eff',
                          cursor: 'pointer'
                        }}
                      />
                      {year}
                    </label>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  VIEW MODE:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setViewMode('yearly')}
                    style={{
                      backgroundColor: viewMode === 'yearly' ? '#4a9eff' : 'transparent',
                      color: viewMode === 'yearly' ? '#0a0a0f' : '#4a9eff',
                      border: '1px solid #4a9eff',
                      padding: '0.25rem 0.75rem',
                      cursor: 'pointer',
                      fontFamily: "'Courier New', monospace",
                      fontSize: '0.75rem'
                    }}
                  >
                    YEAR-BY-YEAR
                  </button>
                  <button
                    onClick={() => setViewMode('career')}
                    style={{
                      backgroundColor: viewMode === 'career' ? '#4a9eff' : 'transparent',
                      color: viewMode === 'career' ? '#0a0a0f' : '#4a9eff',
                      border: '1px solid #4a9eff',
                      padding: '0.25rem 0.75rem',
                      cursor: 'pointer',
                      fontFamily: "'Courier New', monospace",
                      fontSize: '0.75rem'
                    }}
                  >
                    CAREER STATS
                  </button>
                </div>
                {selectedSeasons.length > 1 && viewMode === 'yearly' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => setYearDisplay('combined')}
                      style={{
                        backgroundColor: yearDisplay === 'combined' ? '#4a9eff' : 'transparent',
                        color: yearDisplay === 'combined' ? '#0a0a0f' : '#4a9eff',
                        border: '1px solid #4a9eff',
                        padding: '0.2rem 0.5rem',
                        cursor: 'pointer',
                        fontFamily: "'Courier New', monospace",
                        fontSize: '0.65rem'
                      }}
                    >
                      COMBINED
                    </button>
                    <button
                      onClick={() => setYearDisplay('separate')}
                      style={{
                        backgroundColor: yearDisplay === 'separate' ? '#4a9eff' : 'transparent',
                        color: yearDisplay === 'separate' ? '#0a0a0f' : '#4a9eff',
                        border: '1px solid #4a9eff',
                        padding: '0.2rem 0.5rem',
                        cursor: 'pointer',
                        fontFamily: "'Courier New', monospace",
                        fontSize: '0.65rem'
                      }}
                    >
                      SEPARATE
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  POSITIONS: (SELECT MULTIPLE)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => {
                        if (selectedPositions.includes(pos)) {
                          if (selectedPositions.length > 1) {
                            setSelectedPositions(selectedPositions.filter(p => p !== pos))
                          }
                        } else {
                          setSelectedPositions([...selectedPositions, pos])
                        }
                      }}
                      disabled={!POSITION_STAT_MAP[pos]}
                      style={{
                        backgroundColor: selectedPositions.includes(pos) ? '#4a9eff' : 'transparent',
                        color: selectedPositions.includes(pos) ? '#0a0a0f' : POSITION_STAT_MAP[pos] ? '#4a9eff' : '#555',
                        border: `1px solid ${POSITION_STAT_MAP[pos] ? '#4a9eff' : '#555'}`,
                        padding: '0.25rem 0.75rem',
                        cursor: POSITION_STAT_MAP[pos] ? 'pointer' : 'not-allowed',
                        fontFamily: "'Courier New', monospace",
                        fontSize: '0.75rem'
                      }}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  TEAM:
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.25rem 0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="">ALL TEAMS</option>
                  {NFL_TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  SEARCH:
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Player name..."
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.25rem 0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.75rem'
                  }}
                />
              </div>
            </div>

            <div style={{ color: '#888', fontSize: '0.75rem' }}>
              {loading ? `LOADING ${selectedPositions.length} POSITION(S) × ${selectedSeasons.length} SEASON(S)...` : `SHOWING ${displayedData.length} ${viewMode === 'career' ? 'PLAYERS' : 'RECORDS'}`}
            </div>
          </div>

          {/* Data Table */}
          {selectedPositions.every(pos => !POSITION_STAT_MAP[pos]) ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#888',
              border: '1px solid #333',
              backgroundColor: '#1a1a1f'
            }}>
              [ SELECTED POSITION DATA NOT AVAILABLE YET ]
            </div>
          ) : loading ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#4a9eff',
              border: '1px solid #333',
              backgroundColor: '#1a1a1f'
            }}>
              [ LOADING DATA... ]
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#888' }}>
                Fetching {selectedPositions.length} position(s) × {selectedSeasons.length} season(s)
              </div>
            </div>
          ) : displayedData.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#888',
              border: '1px solid #333',
              backgroundColor: '#1a1a1f'
            }}>
              [ NO DATA FOUND ]
            </div>
          ) : (
            <div style={{
              overflowX: 'auto',
              border: '1px solid #333',
              backgroundColor: '#1a1a1f'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.75rem'
              }}>
                <thead>
                  {/* Section header row */}
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th rowSpan={2} style={{
                      padding: '0.5rem',
                      textAlign: 'left',
                      color: '#4a9eff',
                      fontWeight: 'bold',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#1a1a1f',
                      zIndex: 11,
                      verticalAlign: 'bottom'
                    }}>
                      #
                    </th>
                    <th rowSpan={2}
                      onClick={() => handleSort('player_display_name')}
                      style={{
                        padding: '0.5rem',
                        textAlign: 'left',
                        color: '#4a9eff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        position: 'sticky',
                        left: '3rem',
                        backgroundColor: '#1a1a1f',
                        zIndex: 11,
                        verticalAlign: 'bottom'
                      }}
                    >
                      PLAYER {sortBy === 'player_display_name' && (sortDesc ? '▼' : '▲')}
                    </th>
                    <th rowSpan={2} style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      color: '#4a9eff',
                      fontWeight: 'bold',
                      verticalAlign: 'bottom'
                    }}>
                      TEAM
                    </th>
                    <th rowSpan={2} style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      color: '#4a9eff',
                      fontWeight: 'bold',
                      verticalAlign: 'bottom'
                    }}>
                      {(() => {
                        const isMultiYearCombined = viewMode === 'yearly' && yearDisplay === 'combined' && selectedSeasons.length > 1
                        return (viewMode === 'career' || isMultiYearCombined) ? 'YEARS' : 'SEASON'
                      })()}
                    </th>
                    {sections.map(section => (
                      <th
                        key={section.id}
                        colSpan={section.expanded ? section.metrics.length : 1}
                        onClick={() => toggleSection(section.id)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          textAlign: 'center',
                          color: section.expanded ? '#4a9eff' : '#666',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          letterSpacing: '0.05em',
                          borderBottom: section.expanded ? '2px solid #4a9eff' : '1px solid #333',
                          borderLeft: '1px solid #333',
                          backgroundColor: section.expanded ? '#1a1a2a' : '#151518',
                          whiteSpace: 'nowrap',
                          userSelect: 'none'
                        }}
                      >
                        {section.expanded ? '−' : '+'} {section.label}
                      </th>
                    ))}
                  </tr>
                  {/* Metric column header row */}
                  <tr style={{ borderBottom: '1px solid #4a9eff' }}>
                    {sections.map(section => {
                      if (!section.expanded) {
                        return (
                          <th key={`${section.id}-collapsed`} style={{
                            padding: '0.4rem',
                            textAlign: 'center',
                            color: '#555',
                            fontSize: '0.6rem',
                            borderLeft: '1px solid #333'
                          }}>
                            ...
                          </th>
                        )
                      }
                      return section.metrics.map((metric, mi) => (
                        <th
                          key={metric.key}
                          onClick={() => handleSort(metric.key)}
                          style={{
                            padding: '0.4rem 0.5rem',
                            textAlign: 'right',
                            color: '#4a9eff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontSize: '0.7rem',
                            borderLeft: mi === 0 ? '1px solid #333' : 'none'
                          }}
                        >
                          {metric.label} {sortBy === metric.key && (sortDesc ? '▼' : '▲')}
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
                    const bgColor = index % 2 === 0 ? '#1a1a1f' : '#141418'

                    return (
                    <tr
                      key={`${player.player_gsis_id}-${player.season}-${index}`}
                      onClick={() => fetchPlayerGameLogs(player)}
                      style={{
                        borderBottom: isLastOfGroup ? '2px solid #4a9eff44' : '1px solid #222',
                        borderTop: isFirstOfGroup && index > 0 ? '2px solid #4a9eff44' : 'none',
                        backgroundColor: bgColor,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252530'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bgColor}
                    >
                      <td style={{
                        padding: '0.75rem',
                        color: '#888',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: bgColor
                      }}>
                        {isSeparate ? (isFirstOfGroup ? index + 1 : '') : index + 1}
                      </td>
                      <td style={{
                        padding: '0.75rem',
                        color: isSeparate && !isFirstOfGroup ? '#666' : '#e0e0e0',
                        fontWeight: 'bold',
                        position: 'sticky',
                        left: '3rem',
                        backgroundColor: bgColor
                      }}>
                        {isSeparate && !isFirstOfGroup ? '↳ ' + player.player_display_name : player.player_display_name}
                      </td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        color: '#4a9eff'
                      }}>
                        {player.team_abbr}
                      </td>
                      {(() => {
                        const isMultiYearCombined = viewMode === 'yearly' && yearDisplay === 'combined' && selectedSeasons.length > 1
                        const isCombinedOrCareer = viewMode === 'career' || isMultiYearCombined
                        if (isCombinedOrCareer) {
                          return (
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: '#888', fontSize: '0.7rem' }}>
                              {player.season} ({player.seasons_count} seasons)
                            </td>
                          )
                        }
                        return (
                          <td style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>
                            {player.season}
                          </td>
                        )
                      })()}
                      {sections.map(section => {
                        if (!section.expanded) {
                          return (
                            <td key={`${section.id}-c`} style={{
                              padding: '0.5rem',
                              textAlign: 'center',
                              color: '#444',
                              borderLeft: '1px solid #282828'
                            }}>
                              ·
                            </td>
                          )
                        }
                        return section.metrics.map((metric, mi) => {
                          const value = player[metric.key]
                          let color = '#e0e0e0'
                          if (metric.isEPA && value != null) {
                            color = value > 0 ? '#0f0' : value < 0 ? '#f00' : '#e0e0e0'
                          }
                          return (
                            <td
                              key={metric.key}
                              style={{
                                padding: '0.5rem 0.5rem',
                                textAlign: 'right',
                                color,
                                borderLeft: mi === 0 ? '1px solid #282828' : 'none'
                              }}
                            >
                              {metric.format(value)}
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
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              zIndex: 1000,
              overflowY: 'auto',
              padding: '2rem'
            }}>
              <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                backgroundColor: '#0a0a0f',
                border: '2px solid #4a9eff',
                borderRadius: '4px'
              }}>
                {/* Header */}
                <div style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid #4a9eff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h2 style={{
                      color: '#4a9eff',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem'
                    }}>
                      {selectedPlayer.player_display_name} - CAREER GAME LOG
                    </h2>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {selectedPlayer.team_abbr} | {selectedPlayer.player_position} | {playerGameLogs.length} Games
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPlayer(null)
                      setPlayerGameLogs([])
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#f00',
                      border: '1px solid #f00',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontFamily: "'Courier New', monospace",
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕ CLOSE
                  </button>
                </div>

                {/* Game Logs Table */}
                {playerLogsLoading ? (
                  <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#4a9eff'
                  }}>
                    [ LOADING GAME LOGS... ]
                  </div>
                ) : playerGameLogs.length === 0 ? (
                  <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#888'
                  }}>
                    [ NO GAME DATA FOUND ]
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    overflowX: 'auto'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.75rem'
                    }}>
                      <thead style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#1a1a1f',
                        zIndex: 10
                      }}>
                        <tr style={{ borderBottom: '1px solid #4a9eff' }}>
                          <th style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            color: '#4a9eff',
                            fontWeight: 'bold',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: '#1a1a1f',
                            zIndex: 11
                          }}>
                            SEASON
                          </th>
                          <th style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            color: '#4a9eff',
                            fontWeight: 'bold',
                            position: 'sticky',
                            left: '5rem',
                            backgroundColor: '#1a1a1f',
                            zIndex: 11
                          }}>
                            WEEK
                          </th>
                          <th style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            color: '#4a9eff',
                            fontWeight: 'bold'
                          }}>
                            TEAM
                          </th>
                          {PLAYER_METRICS[selectedPlayer.player_position]?.map(metric => (
                            <th
                              key={metric.key}
                              style={{
                                padding: '0.75rem',
                                textAlign: 'right',
                                color: '#4a9eff',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {metric.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {playerGameLogs.map((game, index) => (
                          <tr
                            key={`${game.season}-${game.week}-${index}`}
                            style={{
                              borderBottom: '1px solid #222',
                              backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418'
                            }}
                          >
                            <td style={{
                              padding: '0.75rem',
                              color: '#e0e0e0',
                              fontWeight: 'bold',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418'
                            }}>
                              {game.season}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              color: '#e0e0e0',
                              position: 'sticky',
                              left: '5rem',
                              backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418'
                            }}>
                              {game.week > 18 ?
                                ['WC', 'DIV', 'CONF', 'SB'][game.week - 19] || `WK ${game.week}` :
                                `WK ${game.week}`}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              textAlign: 'center',
                              color: '#4a9eff'
                            }}>
                              {game.team_abbr}
                            </td>
                            {PLAYER_METRICS[selectedPlayer.player_position]?.map(metric => {
                              const value = game[metric.key]
                              let color = '#e0e0e0'

                              if (metric.isEPA && value != null) {
                                color = value > 0 ? '#0f0' : value < 0 ? '#f00' : '#e0e0e0'
                              }

                              return (
                                <td
                                  key={metric.key}
                                  style={{
                                    padding: '0.75rem',
                                    textAlign: 'right',
                                    color
                                  }}
                                >
                                  {metric.format(value)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {!selectedTeamForRoster ? (
            /* ── ALL TEAMS GRID ── */
            <div>
              <div style={{ marginBottom: '1rem', color: '#888', fontSize: '0.875rem' }}>
                SELECT A TEAM TO VIEW ROSTER
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {Object.entries(NFL_DIVISIONS).map(([division, teams]) => (
                  <div key={division} style={{ border: '1px solid #333', backgroundColor: '#1a1a1f', padding: '1rem' }}>
                    <div style={{
                      color: '#4a9eff', fontSize: '0.75rem', fontWeight: 'bold',
                      marginBottom: '0.75rem', borderBottom: '1px solid #333',
                      paddingBottom: '0.5rem', letterSpacing: '0.05em'
                    }}>
                      {division}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {teams.map(team => (
                        <button
                          key={team}
                          onClick={() => setSelectedTeamForRoster(team)}
                          style={{
                            flex: 1, backgroundColor: 'transparent', color: '#e0e0e0',
                            border: '1px solid #444', padding: '0.75rem 0.5rem',
                            cursor: 'pointer', fontFamily: "'Courier New', monospace",
                            fontSize: '0.875rem', fontWeight: 'bold', letterSpacing: '0.05em'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#252530'
                            e.currentTarget.style.borderColor = '#4a9eff'
                            e.currentTarget.style.color = '#4a9eff'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.borderColor = '#444'
                            e.currentTarget.style.color = '#e0e0e0'
                          }}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── TEAM ROSTER VIEW ── */
            <div>
              {/* Header */}
              <div style={{
                marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#1a1a1f',
                border: '1px solid #333', display: 'flex', alignItems: 'center',
                gap: '1.5rem', flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setSelectedTeamForRoster(null)}
                  style={{
                    backgroundColor: 'transparent', color: '#888', border: '1px solid #555',
                    padding: '0.4rem 0.75rem', cursor: 'pointer',
                    fontFamily: "'Courier New', monospace", fontSize: '0.75rem'
                  }}
                >
                  ← ALL TEAMS
                </button>
                <div>
                  <span style={{ color: '#4a9eff', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    {selectedTeamForRoster}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.875rem', marginLeft: '0.75rem' }}>ROSTER</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center' }}>
                  <span style={{ color: '#888', fontSize: '0.75rem' }}>SEASON:</span>
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map(year => (
                    <button
                      key={year}
                      onClick={() => setTeamRosterSeason(year)}
                      style={{
                        backgroundColor: teamRosterSeason === year ? '#4a9eff' : 'transparent',
                        color: teamRosterSeason === year ? '#0a0a0f' : '#4a9eff',
                        border: '1px solid #4a9eff', padding: '0.25rem 0.5rem',
                        cursor: 'pointer', fontFamily: "'Courier New', monospace",
                        fontSize: '0.75rem', fontWeight: 'bold'
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster content */}
              {rosterLoading ? (
                <div style={{
                  padding: '3rem', textAlign: 'center', color: '#4a9eff',
                  border: '1px solid #333', backgroundColor: '#1a1a1f'
                }}>
                  [ LOADING {selectedTeamForRoster} {teamRosterSeason} ROSTER... ]
                </div>
              ) : teamRoster.qbs.length === 0 && teamRoster.rbs.length === 0 && teamRoster.receivers.length === 0 ? (
                <div style={{
                  padding: '2rem', textAlign: 'center', color: '#888',
                  border: '1px solid #333', backgroundColor: '#1a1a1f'
                }}>
                  [ NO DATA FOUND FOR {selectedTeamForRoster} {teamRosterSeason} ]
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* QBs */}
                  {teamRoster.qbs.length > 0 && (
                    <div style={{ border: '1px solid #333', backgroundColor: '#1a1a1f' }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #4a9eff', color: '#4a9eff', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        [ QUARTERBACKS ] <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.75rem' }}>{teamRoster.qbs.length} player{teamRoster.qbs.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>PLAYER</th>
                              {['ATT', 'CMP', 'COMP%', 'YDS', 'TD', 'INT', 'RAT', 'CPOE', 'TTT'].map(h => (
                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.qbs.map((p, i) => (
                              <tr
                                key={p.player_gsis_id || i}
                                onClick={() => fetchPlayerGameLogs(p)}
                                style={{ borderBottom: '1px solid #222', backgroundColor: i % 2 === 0 ? '#1a1a1f' : '#141418', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#252530'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1a1a1f' : '#141418'}
                              >
                                <td style={{ padding: '0.5rem 0.75rem', color: '#e0e0e0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{p.player_display_name}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.attempts ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.completions ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.completion_percentage?.toFixed(1) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.pass_yards ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#0f0' }}>{p.pass_touchdowns ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#f00' }}>{p.interceptions ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.passer_rating?.toFixed(1) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: p.completion_percentage_above_expectation > 0 ? '#0f0' : p.completion_percentage_above_expectation < 0 ? '#f00' : '#e0e0e0' }}>
                                  {p.completion_percentage_above_expectation != null ? `${p.completion_percentage_above_expectation >= 0 ? '+' : ''}${p.completion_percentage_above_expectation.toFixed(1)}` : '-'}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.avg_time_to_throw?.toFixed(2) ?? '-'}s</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* RBs */}
                  {teamRoster.rbs.length > 0 && (
                    <div style={{ border: '1px solid #333', backgroundColor: '#1a1a1f' }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #4a9eff', color: '#4a9eff', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        [ RUNNING BACKS ] <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.75rem' }}>{teamRoster.rbs.length} player{teamRoster.rbs.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>PLAYER</th>
                              {['ATT', 'YDS', 'YPC', 'TD', 'EFF', 'RYOE', 'STACKED%'].map(h => (
                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.rbs.map((p, i) => (
                              <tr
                                key={p.player_gsis_id || i}
                                onClick={() => fetchPlayerGameLogs(p)}
                                style={{ borderBottom: '1px solid #222', backgroundColor: i % 2 === 0 ? '#1a1a1f' : '#141418', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#252530'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1a1a1f' : '#141418'}
                              >
                                <td style={{ padding: '0.5rem 0.75rem', color: '#e0e0e0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{p.player_display_name}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.rush_attempts ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.rush_yards ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.avg_rush_yards?.toFixed(1) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#0f0' }}>{p.rush_touchdowns ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: p.efficiency > 0 ? '#0f0' : p.efficiency < 0 ? '#f00' : '#e0e0e0' }}>{p.efficiency?.toFixed(2) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: p.rush_yards_over_expected > 0 ? '#0f0' : p.rush_yards_over_expected < 0 ? '#f00' : '#e0e0e0' }}>
                                  {p.rush_yards_over_expected != null ? `${p.rush_yards_over_expected >= 0 ? '+' : ''}${p.rush_yards_over_expected.toFixed(0)}` : '-'}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.percent_attempts_gte_eight_defenders?.toFixed(1) ?? '-'}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* WRs */}
                  {teamRoster.receivers.filter(p => p.player_position === 'WR').length > 0 && (
                    <div style={{ border: '1px solid #333', backgroundColor: '#1a1a1f' }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #4a9eff', color: '#4a9eff', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        [ WIDE RECEIVERS ] <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.75rem' }}>{teamRoster.receivers.filter(p => p.player_position === 'WR').length} player{teamRoster.receivers.filter(p => p.player_position === 'WR').length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>PLAYER</th>
                              {['TGT', 'REC', 'CATCH%', 'YDS', 'TD', 'SEP', 'YAC+', 'aDOT'].map(h => (
                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.receivers.filter(p => p.player_position === 'WR').map((p, i) => (
                              <tr
                                key={p.player_gsis_id || i}
                                onClick={() => fetchPlayerGameLogs(p)}
                                style={{ borderBottom: '1px solid #222', backgroundColor: i % 2 === 0 ? '#1a1a1f' : '#141418', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#252530'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1a1a1f' : '#141418'}
                              >
                                <td style={{ padding: '0.5rem 0.75rem', color: '#e0e0e0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{p.player_display_name}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.targets ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.receptions ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.catch_percentage?.toFixed(1) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.yards ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#0f0' }}>{p.rec_touchdowns ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.avg_separation?.toFixed(2) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: p.avg_yac_above_expectation > 0 ? '#0f0' : p.avg_yac_above_expectation < 0 ? '#f00' : '#e0e0e0' }}>
                                  {p.avg_yac_above_expectation != null ? `${p.avg_yac_above_expectation >= 0 ? '+' : ''}${p.avg_yac_above_expectation.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.avg_intended_air_yards?.toFixed(1) ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TEs */}
                  {teamRoster.receivers.filter(p => p.player_position === 'TE').length > 0 && (
                    <div style={{ border: '1px solid #333', backgroundColor: '#1a1a1f' }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #4a9eff', color: '#4a9eff', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        [ TIGHT ENDS ] <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.75rem' }}>{teamRoster.receivers.filter(p => p.player_position === 'TE').length} player{teamRoster.receivers.filter(p => p.player_position === 'TE').length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>PLAYER</th>
                              {['TGT', 'REC', 'CATCH%', 'YDS', 'TD', 'SEP', 'YAC+', 'aDOT'].map(h => (
                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamRoster.receivers.filter(p => p.player_position === 'TE').map((p, i) => (
                              <tr
                                key={p.player_gsis_id || i}
                                onClick={() => fetchPlayerGameLogs(p)}
                                style={{ borderBottom: '1px solid #222', backgroundColor: i % 2 === 0 ? '#1a1a1f' : '#141418', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#252530'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1a1a1f' : '#141418'}
                              >
                                <td style={{ padding: '0.5rem 0.75rem', color: '#e0e0e0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{p.player_display_name}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.targets ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.receptions ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.catch_percentage?.toFixed(1) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.yards ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#0f0' }}>{p.rec_touchdowns ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.avg_separation?.toFixed(2) ?? '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: p.avg_yac_above_expectation > 0 ? '#0f0' : p.avg_yac_above_expectation < 0 ? '#f00' : '#e0e0e0' }}>
                                  {p.avg_yac_above_expectation != null ? `${p.avg_yac_above_expectation >= 0 ? '+' : ''}${p.avg_yac_above_expectation.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#e0e0e0' }}>{p.avg_intended_air_yards?.toFixed(1) ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* Player Game Logs Modal */}
          {selectedPlayer && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 1000,
              overflowY: 'auto', padding: '2rem'
            }}>
              <div style={{ maxWidth: '1400px', margin: '0 auto', backgroundColor: '#0a0a0f', border: '2px solid #4a9eff', borderRadius: '4px' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #4a9eff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ color: '#4a9eff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {selectedPlayer.player_display_name} - CAREER GAME LOG
                    </h2>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {selectedPlayer.team_abbr} | {selectedPlayer.player_position} | {playerGameLogs.length} Games
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedPlayer(null); setPlayerGameLogs([]) }}
                    style={{ backgroundColor: 'transparent', color: '#f00', border: '1px solid #f00', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: "'Courier New', monospace", fontSize: '0.875rem', fontWeight: 'bold' }}
                  >
                    ✕ CLOSE
                  </button>
                </div>
                {playerLogsLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#4a9eff' }}>[ LOADING GAME LOGS... ]</div>
                ) : playerGameLogs.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>[ NO GAME DATA FOUND ]</div>
                ) : (
                  <div style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1f', zIndex: 10 }}>
                        <tr style={{ borderBottom: '1px solid #4a9eff' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a9eff', fontWeight: 'bold', position: 'sticky', left: 0, backgroundColor: '#1a1a1f', zIndex: 11 }}>SEASON</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a9eff', fontWeight: 'bold', position: 'sticky', left: '5rem', backgroundColor: '#1a1a1f', zIndex: 11 }}>WEEK</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', color: '#4a9eff', fontWeight: 'bold' }}>TEAM</th>
                          {PLAYER_METRICS[selectedPlayer.player_position]?.map(metric => (
                            <th key={metric.key} style={{ padding: '0.75rem', textAlign: 'right', color: '#4a9eff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{metric.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {playerGameLogs.map((game, index) => (
                          <tr key={`${game.season}-${game.week}-${index}`} style={{ borderBottom: '1px solid #222', backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418' }}>
                            <td style={{ padding: '0.75rem', color: '#e0e0e0', fontWeight: 'bold', position: 'sticky', left: 0, backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418' }}>{game.season}</td>
                            <td style={{ padding: '0.75rem', color: '#e0e0e0', position: 'sticky', left: '5rem', backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418' }}>
                              {game.week > 18 ? ['WC', 'DIV', 'CONF', 'SB'][game.week - 19] || `WK ${game.week}` : `WK ${game.week}`}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: '#4a9eff' }}>{game.team_abbr}</td>
                            {PLAYER_METRICS[selectedPlayer.player_position]?.map(metric => {
                              const value = game[metric.key]
                              const color = metric.isEPA && value != null ? (value > 0 ? '#0f0' : value < 0 ? '#f00' : '#e0e0e0') : '#e0e0e0'
                              return <td key={metric.key} style={{ padding: '0.75rem', textAlign: 'right', color }}>{metric.format(value)}</td>
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '1px solid #333',
        color: '#888',
        fontSize: '0.75rem',
        textAlign: 'center'
      }}>
        NFL NEXT GEN STATS | RFID TRACKING DATA (10Hz) | 2016-PRESENT
      </div>

      {/* Glossary Modal */}
      {showGlossary && (
        <div
          onClick={() => setShowGlossary(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '3rem',
            overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0a0a0f',
              border: '1px solid #4a9eff',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '2rem',
              fontFamily: "'Courier New', monospace",
              marginBottom: '3rem'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '1px solid #4a9eff',
              paddingBottom: '1rem'
            }}>
              <h2 style={{ color: '#4a9eff', margin: 0, fontSize: '1.25rem' }}>
                STATS GLOSSARY
              </h2>
              <button
                onClick={() => setShowGlossary(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  padding: '0.25rem 0.75rem',
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.875rem'
                }}
              >
                X CLOSE
              </button>
            </div>

            {GLOSSARY.map(group => (
              <div key={group.section} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  color: '#4a9eff',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  marginBottom: '0.75rem',
                  borderBottom: '1px solid #333',
                  paddingBottom: '0.25rem'
                }}>
                  {group.section.toUpperCase()}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {group.items.map(item => (
                    <div key={item.abbr + group.section} style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr',
                      gap: '0.75rem',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid #1a1a1f'
                    }}>
                      <span style={{
                        color: '#4a9eff',
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}>
                        {item.abbr}
                      </span>
                      <div>
                        <span style={{ color: '#e0e0e0', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {item.name}
                        </span>
                        <span style={{ color: '#888', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ color: '#555', fontSize: '0.65rem', marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '0.75rem' }}>
              NGS metrics sourced from NFL Next Gen Stats (RFID tracking). EPA and seasonal stats sourced from nflfastR play-by-play data via nfl_data_py.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NGSTerminal
