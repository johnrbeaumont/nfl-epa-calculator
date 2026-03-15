import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STAT_TYPES = {
  passing: {
    label: 'Passing',
    icon: '🎯',
    metrics: [
      { key: 'completion_percentage_above_expectation', label: 'CPOE', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
      { key: 'avg_time_to_throw', label: 'Time to Throw', format: (v) => `${v.toFixed(2)}s` },
      { key: 'aggressiveness', label: 'Aggressiveness', format: (v) => `${v.toFixed(1)}%` },
      { key: 'passer_rating', label: 'Passer Rating', format: (v) => v.toFixed(1) }
    ],
    volumeKey: 'attempts',
    volumeLabel: 'Attempts'
  },
  receiving: {
    label: 'Receiving',
    icon: '🏈',
    metrics: [
      { key: 'avg_separation', label: 'Avg Separation', format: (v) => `${v.toFixed(1)} yd` },
      { key: 'avg_yac_above_expectation', label: 'YAC+', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}` },
      { key: 'catch_percentage', label: 'Catch %', format: (v) => `${v.toFixed(1)}%` },
      { key: 'yards', label: 'Yards', format: (v) => v.toLocaleString() }
    ],
    volumeKey: 'targets',
    volumeLabel: 'Targets'
  },
  rushing: {
    label: 'Rushing',
    icon: '💨',
    metrics: [
      { key: 'rush_yards_over_expected', label: 'Yards Over Expected', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}` },
      { key: 'efficiency', label: 'Efficiency', format: (v) => `${v.toFixed(2)}x` },
      { key: 'rush_yards_over_expected_per_att', label: 'YOE/Att', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}` },
      { key: 'avg_rush_yards', label: 'YPC', format: (v) => v.toFixed(1) }
    ],
    volumeKey: 'rush_attempts',
    volumeLabel: 'Attempts'
  }
}

const SEASONS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]

function NGSStatsExplorer() {
  const [statType, setStatType] = useState('passing')
  const [season, setSeason] = useState(2024)
  const [week, setWeek] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [minThreshold, setMinThreshold] = useState(200)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState(null)
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    fetchData()
  }, [statType, season, week, minThreshold])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const config = STAT_TYPES[statType]
      const volumeParam = statType === 'receiving' ? 'min_targets' : 'min_attempts'
      const url = `${API_URL}/api/ngs/${statType}?season=${season}&week=${week}&${volumeParam}=${minThreshold}&limit=100`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch data')

      const result = await response.json()
      setData(result)

      // Auto-sort by first key metric on load
      if (!sortBy && result.length > 0) {
        setSortBy(config.metrics[0].key)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(player => {
    if (!searchTerm) return true
    return player.player_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           player.team_abbr?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortBy) return 0
    const aVal = a[sortBy] ?? -Infinity
    const bVal = b[sortBy] ?? -Infinity
    return sortDesc ? bVal - aVal : aVal - bVal
  })

  const config = STAT_TYPES[statType]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Next Gen Stats Explorer
        </h2>
        <p className="text-gray-600">
          Advanced player tracking metrics from NFL Next Gen Stats (2016-present)
        </p>
      </div>

      {/* Stat Type Tabs */}
      <div className="card">
        <div className="flex gap-2 overflow-x-auto">
          {Object.entries(STAT_TYPES).map(([key, type]) => (
            <button
              key={key}
              onClick={() => {
                setStatType(key)
                setSortBy(null)
              }}
              className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                statType === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Season */}
          <div>
            <label className="label">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="input"
            >
              {SEASONS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Week */}
          <div>
            <label className="label">Week</label>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="input"
            >
              <option value={0}>Season Total</option>
              {[...Array(18)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
              <option value={19}>Wild Card</option>
              <option value={20}>Divisional</option>
              <option value={21}>Championship</option>
              <option value={22}>Super Bowl</option>
            </select>
          </div>

          {/* Min Threshold */}
          <div>
            <label className="label">Min {config.volumeLabel}</label>
            <input
              type="number"
              value={minThreshold}
              onChange={(e) => setMinThreshold(Number(e.target.value))}
              className="input"
              min="0"
              step="10"
            />
          </div>

          {/* Search */}
          <div>
            <label className="label">Search Player/Team</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g., Mahomes, KC"
              className="input"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {sortedData.length} of {data.length} players
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary text-sm px-4 py-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner"></span>
                Loading...
              </span>
            ) : (
              '🔄 Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="error-message">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Stats Table */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {config.label} stats...</p>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">No players found matching your criteria</p>
          <p className="text-sm text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Player</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Team</th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      if (sortBy === config.volumeKey) {
                        setSortDesc(!sortDesc)
                      } else {
                        setSortBy(config.volumeKey)
                        setSortDesc(true)
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {config.volumeLabel}
                      {sortBy === config.volumeKey && (
                        <span>{sortDesc ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  {config.metrics.map(metric => (
                    <th
                      key={metric.key}
                      className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (sortBy === metric.key) {
                          setSortDesc(!sortDesc)
                        } else {
                          setSortBy(metric.key)
                          setSortDesc(true)
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {metric.label}
                        {sortBy === metric.key && (
                          <span>{sortDesc ? '↓' : '↑'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedData.map((player, index) => (
                  <tr
                    key={`${player.player_gsis_id}-${player.week}`}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {player.player_display_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {player.player_position}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info">
                        {player.team_abbr}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {player[config.volumeKey]?.toLocaleString() ?? '-'}
                    </td>
                    {config.metrics.map(metric => {
                      const value = player[metric.key]
                      const isPositive = value > 0
                      const isNegative = value < 0
                      return (
                        <td
                          key={metric.key}
                          className={`px-4 py-3 text-right font-medium ${
                            metric.key.includes('above_expectation') ||
                            metric.key.includes('over_expected') ||
                            metric.key === 'completion_percentage_above_expectation'
                              ? isPositive
                                ? 'text-green-700'
                                : isNegative
                                ? 'text-red-700'
                                : 'text-gray-900'
                              : 'text-gray-900'
                          }`}
                        >
                          {value != null ? metric.format(value) : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-2">📊 About Next Gen Stats</p>
          <p className="text-blue-800">
            Next Gen Stats uses RFID tags in player shoulder pads to track location, speed, and acceleration at 10 times per second.
            This data powers advanced metrics like completion probability over expected (CPOE), separation, and yards over expected.
          </p>
        </div>
      </div>
    </div>
  )
}

export default NGSStatsExplorer
