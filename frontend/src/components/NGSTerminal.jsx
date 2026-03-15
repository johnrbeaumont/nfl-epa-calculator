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

// Metric configurations by position
const PLAYER_METRICS = {
  QB: [
    { key: 'completion_percentage', label: 'Comp%', format: (v) => v?.toFixed(1) || '-' },
    { key: 'attempts', label: 'Pass Att', format: (v) => v || '-' },
    { key: 'pass_yards', label: 'Pass Yds', format: (v) => v || '-' },
    { key: 'pass_touchdowns', label: 'Pass TD', format: (v) => v || '-' },
    { key: 'interceptions', label: 'INT', format: (v) => v || '-' },
    { key: 'passer_rating', label: 'Rating', format: (v) => v?.toFixed(1) || '-' },
    { key: 'completion_percentage_above_expectation', label: 'CPOE', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '-', isEPA: true },
    { key: 'avg_time_to_throw', label: 'Time to Throw', format: (v) => v?.toFixed(2) || '-' },
    { key: 'aggressiveness', label: 'Aggressiveness', format: (v) => v?.toFixed(1) || '-' }
  ],
  RB: [
    { key: 'rush_attempts', label: 'Rush Att', format: (v) => v || '-' },
    { key: 'rush_yards', label: 'Rush Yds', format: (v) => v || '-' },
    { key: 'rush_touchdowns', label: 'Rush TD', format: (v) => v || '-' },
    { key: 'avg_rush_yards', label: 'YPC', format: (v) => v?.toFixed(1) || '-' },
    { key: 'efficiency', label: 'Efficiency', format: (v) => v?.toFixed(2) || '-' },
    { key: 'rush_yards_over_expected', label: 'RYOE', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}` : '-', isEPA: true },
    { key: 'rush_yards_over_expected_per_att', label: 'YOE/Att', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : '-', isEPA: true },
    { key: 'percent_attempts_gte_eight_defenders', label: 'Stacked Box%', format: (v) => v?.toFixed(1) || '-' }
  ],
  WR: [
    { key: 'targets', label: 'Targets', format: (v) => v || '-' },
    { key: 'receptions', label: 'Receptions', format: (v) => v || '-' },
    { key: 'yards', label: 'Rec Yds', format: (v) => v || '-' },
    { key: 'rec_touchdowns', label: 'Rec TD', format: (v) => v || '-' },
    { key: 'catch_percentage', label: 'Catch%', format: (v) => v?.toFixed(1) || '-' },
    { key: 'avg_cushion', label: 'Avg Cushion', format: (v) => v?.toFixed(1) || '-' },
    { key: 'avg_separation', label: 'Avg Sep', format: (v) => v?.toFixed(1) || '-' },
    { key: 'avg_yac_above_expectation', label: 'YAC+', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '-', isEPA: true }
  ],
  TE: [
    { key: 'targets', label: 'Targets', format: (v) => v || '-' },
    { key: 'receptions', label: 'Receptions', format: (v) => v || '-' },
    { key: 'yards', label: 'Rec Yds', format: (v) => v || '-' },
    { key: 'rec_touchdowns', label: 'Rec TD', format: (v) => v || '-' },
    { key: 'catch_percentage', label: 'Catch%', format: (v) => v?.toFixed(1) || '-' },
    { key: 'avg_cushion', label: 'Avg Cushion', format: (v) => v?.toFixed(1) || '-' },
    { key: 'avg_separation', label: 'Avg Sep', format: (v) => v?.toFixed(1) || '-' },
    { key: 'avg_yac_above_expectation', label: 'YAC+', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '-', isEPA: true }
  ]
}

// Unified metrics showing all position stats
const UNIFIED_METRICS = [
  // QB Passing
  { key: 'completion_percentage', label: 'Comp%', format: (v) => v?.toFixed(1) || '-', positions: ['QB'] },
  { key: 'attempts', label: 'Pass Att', format: (v) => v || '-', positions: ['QB'] },
  { key: 'pass_yards', label: 'Pass Yds', format: (v) => v || '-', positions: ['QB'] },
  { key: 'pass_touchdowns', label: 'Pass TD', format: (v) => v || '-', positions: ['QB'] },
  { key: 'interceptions', label: 'INT', format: (v) => v || '-', positions: ['QB'] },
  { key: 'passer_rating', label: 'Rating', format: (v) => v?.toFixed(1) || '-', positions: ['QB'] },
  { key: 'completion_percentage_above_expectation', label: 'CPOE', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '-', isEPA: true, positions: ['QB'] },
  { key: 'avg_time_to_throw', label: 'TTT', format: (v) => v?.toFixed(2) || '-', positions: ['QB'] },
  { key: 'aggressiveness', label: 'Aggr%', format: (v) => v?.toFixed(1) || '-', positions: ['QB'] },

  // RB Rushing
  { key: 'rush_attempts', label: 'Rush Att', format: (v) => v || '-', positions: ['RB'] },
  { key: 'rush_yards', label: 'Rush Yds', format: (v) => v || '-', positions: ['RB'] },
  { key: 'rush_touchdowns', label: 'Rush TD', format: (v) => v || '-', positions: ['RB'] },
  { key: 'avg_rush_yards', label: 'YPC', format: (v) => v?.toFixed(1) || '-', positions: ['RB'] },
  { key: 'efficiency', label: 'Efficiency', format: (v) => v?.toFixed(2) || '-', positions: ['RB'] },
  { key: 'rush_yards_over_expected', label: 'RYOE', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}` : '-', isEPA: true, positions: ['RB'] },
  { key: 'rush_yards_over_expected_per_att', label: 'YOE/Att', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : '-', isEPA: true, positions: ['RB'] },
  { key: 'percent_attempts_gte_eight_defenders', label: 'Box%', format: (v) => v?.toFixed(1) || '-', positions: ['RB'] },

  // WR/TE Receiving
  { key: 'targets', label: 'Targets', format: (v) => v || '-', positions: ['WR', 'TE'] },
  { key: 'receptions', label: 'Rec', format: (v) => v || '-', positions: ['WR', 'TE'] },
  { key: 'yards', label: 'Rec Yds', format: (v) => v || '-', positions: ['WR', 'TE'] },
  { key: 'rec_touchdowns', label: 'Rec TD', format: (v) => v || '-', positions: ['WR', 'TE'] },
  { key: 'catch_percentage', label: 'Catch%', format: (v) => v?.toFixed(1) || '-', positions: ['WR', 'TE'] },
  { key: 'avg_cushion', label: 'Cushion', format: (v) => v?.toFixed(1) || '-', positions: ['WR', 'TE'] },
  { key: 'avg_separation', label: 'Sep', format: (v) => v?.toFixed(1) || '-', positions: ['WR', 'TE'] },
  { key: 'avg_yac_above_expectation', label: 'YAC+', format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '-', isEPA: true, positions: ['WR', 'TE'] }
]

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
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState(null)
  const [sortDesc, setSortDesc] = useState(true)

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
                           'targets', 'receptions', 'yards', 'rec_touchdowns']

      volumeStats.forEach(stat => {
        if (aggregated[stat] !== undefined) {
          aggregated[stat] = group.records.reduce((sum, r) => sum + (r[stat] || 0), 0)
        }
      })

      // Average rate stats
      const rateStats = ['completion_percentage', 'completion_percentage_above_expectation',
                         'avg_time_to_throw', 'aggressiveness', 'passer_rating',
                         'avg_rush_yards', 'efficiency', 'avg_separation', 'avg_yac_above_expectation']

      rateStats.forEach(stat => {
        if (aggregated[stat] !== undefined) {
          const values = group.records.filter(r => r[stat] != null).map(r => r[stat])
          aggregated[stat] = values.length > 0
            ? values.reduce((sum, v) => sum + v, 0) / values.length
            : null
        }
      })

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
  const displayedData = viewMode === 'career' ? aggregateCareerStats(sortedData) : sortedData

  // Filter metrics to only show columns relevant to selected positions
  const relevantMetrics = UNIFIED_METRICS.filter(metric =>
    metric.positions.some(pos => selectedPositions.includes(pos))
  )

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
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map(year => (
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
                  <tr style={{ borderBottom: '1px solid #4a9eff' }}>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      color: '#4a9eff',
                      fontWeight: 'bold',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#1a1a1f',
                      zIndex: 10
                    }}>
                      #
                    </th>
                    <th
                      onClick={() => handleSort('player_display_name')}
                      style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        color: '#4a9eff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        position: 'sticky',
                        left: '3rem',
                        backgroundColor: '#1a1a1f',
                        zIndex: 10
                      }}
                    >
                      PLAYER {sortBy === 'player_display_name' && (sortDesc ? '▼' : '▲')}
                    </th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      color: '#4a9eff',
                      fontWeight: 'bold'
                    }}>
                      TEAM
                    </th>
                    {viewMode === 'yearly' && (
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        color: '#4a9eff',
                        fontWeight: 'bold'
                      }}>
                        SEASON
                      </th>
                    )}
                    {viewMode === 'career' && (
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        color: '#4a9eff',
                        fontWeight: 'bold'
                      }}>
                        YEARS
                      </th>
                    )}
                    {relevantMetrics.map(metric => (
                      <th
                        key={metric.key}
                        onClick={() => handleSort(metric.key)}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#4a9eff',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {metric.label} {sortBy === metric.key && (sortDesc ? '▼' : '▲')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedData.map((player, index) => (
                    <tr
                      key={`${player.player_gsis_id}-${player.season}-${index}`}
                      onClick={() => fetchPlayerGameLogs(player)}
                      style={{
                        borderBottom: '1px solid #222',
                        backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252530'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#1a1a1f' : '#141418'}
                    >
                      <td style={{
                        padding: '0.75rem',
                        color: '#888',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418'
                      }}>
                        {index + 1}
                      </td>
                      <td style={{
                        padding: '0.75rem',
                        color: '#e0e0e0',
                        fontWeight: 'bold',
                        position: 'sticky',
                        left: '3rem',
                        backgroundColor: index % 2 === 0 ? '#1a1a1f' : '#141418'
                      }}>
                        {player.player_display_name}
                      </td>
                      <td style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        color: '#4a9eff'
                      }}>
                        {player.team_abbr}
                      </td>
                      {viewMode === 'yearly' && (
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          color: '#e0e0e0'
                        }}>
                          {player.season}
                        </td>
                      )}
                      {viewMode === 'career' && (
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          color: '#888',
                          fontSize: '0.7rem'
                        }}>
                          ({player.seasons_count} seasons)
                        </td>
                      )}
                      {relevantMetrics.map(metric => {
                        const value = player[metric.key]
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
    </div>
  )
}

export default NGSTerminal
