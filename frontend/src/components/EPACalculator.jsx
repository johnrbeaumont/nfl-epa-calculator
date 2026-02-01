import { useState } from 'react'
import teams from '../data/teams.json'

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Scenario presets for quick selection
const PRESETS = [
  { name: 'Goal Line Stand', down: 1, distance: 1, yardsToGoal: 1, quarter: 4, minutes: 2, seconds: 0 },
  { name: 'Two Minute Drill', down: 1, distance: 10, yardsToGoal: 75, quarter: 4, minutes: 2, seconds: 0 },
  { name: 'Red Zone Scoring', down: 1, distance: 10, yardsToGoal: 15, quarter: 2, minutes: 5, seconds: 30 },
  { name: '4th & Short', down: 4, distance: 2, yardsToGoal: 50, quarter: 3, minutes: 8, seconds: 15 },
]

export default function EPACalculator() {
  const [formData, setFormData] = useState({
    homeTeam: 'KC',
    awayTeam: 'SF',
    down: 1,
    distance: 10,
    yardsToGoal: 75,
    homeScore: 0,
    awayScore: 0,
    quarter: 1,
    minutes: 15,
    seconds: 0,
    homeTimeouts: 3,
    awayTimeouts: 3,
    possession: 'home'
  })

  const [epaResult, setEpaResult] = useState(null)
  const [winProbResult, setWinProbResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  // Real-time validation
  const validateField = (name, value) => {
    const errors = { ...validationErrors }

    switch (name) {
      case 'distance':
        if (value > formData.yardsToGoal) {
          errors.distance = 'Distance cannot exceed yards to goal'
        } else {
          delete errors.distance
        }
        break
      case 'yardsToGoal':
        if (formData.distance > value) {
          errors.distance = 'Distance cannot exceed yards to goal'
        } else {
          delete errors.distance
        }
        break
      case 'homeTeam':
      case 'awayTeam':
        if (name === 'homeTeam' && value === formData.awayTeam) {
          errors.homeTeam = 'Teams must be different'
        } else if (name === 'awayTeam' && value === formData.homeTeam) {
          errors.awayTeam = 'Teams must be different'
        } else {
          delete errors.homeTeam
          delete errors.awayTeam
        }
        break
    }

    setValidationErrors(errors)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const newValue = name === 'possession' ? value : (Number(value) || value)

    setFormData(prev => ({ ...prev, [name]: newValue }))
    validateField(name, newValue)
  }

  const loadPreset = (preset) => {
    setFormData(prev => ({ ...prev, ...preset }))
    setValidationErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Final validation
    if (Object.keys(validationErrors).length > 0) {
      setError('Please fix validation errors before submitting')
      return
    }

    setLoading(true)
    setError(null)
    setEpaResult(null)
    setWinProbResult(null)

    try {
      const timeRemaining = (formData.minutes * 60) + formData.seconds

      const apiData = {
        homeTeam: formData.homeTeam,
        awayTeam: formData.awayTeam,
        down: formData.down,
        distance: formData.distance,
        yardsToGoal: formData.yardsToGoal,
        homeScore: formData.homeScore,
        awayScore: formData.awayScore,
        timeRemaining: timeRemaining,
        homeTimeouts: formData.homeTimeouts,
        awayTimeouts: formData.awayTimeouts,
        possession: formData.possession
      }

      const [epaResponse, winProbResponse] = await Promise.all([
        fetch(`${API_URL}/api/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        }),
        fetch(`${API_URL}/api/win-probability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...apiData, quarter: formData.quarter })
        })
      ])

      if (!epaResponse.ok || !winProbResponse.ok) {
        throw new Error('Failed to calculate predictions')
      }

      const epaData = await epaResponse.json()
      const winProbData = await winProbResponse.json()

      setEpaResult(epaData)
      setWinProbResult(winProbData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getTeamLogo = (abbr) => {
    const team = teams.find(t => t.abbr === abbr)
    return team?.logo || ''
  }

  const getEPAColor = (epa) => {
    if (epa >= 2) return 'text-green-600'
    if (epa >= 1) return 'text-green-500'
    if (epa >= 0) return 'text-blue-600'
    if (epa >= -1) return 'text-orange-500'
    return 'text-red-600'
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Scenario Presets */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Scenarios</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="btn-preset"
              type="button"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          {/* Team Selection */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Away Team */}
              <div>
                <label className="label">Away Team</label>
                <div className="flex items-center gap-3">
                  <img src={getTeamLogo(formData.awayTeam)} alt={formData.awayTeam} className="w-10 h-10 object-contain flex-shrink-0" />
                  <select
                    name="awayTeam"
                    value={formData.awayTeam}
                    onChange={handleChange}
                    className={`flex-1 input ${validationErrors.awayTeam ? 'input-error' : ''}`}
                  >
                    {teams.map(team => (
                      <option key={team.abbr} value={team.abbr}>{team.name}</option>
                    ))}
                  </select>
                </div>
                {validationErrors.awayTeam && (
                  <p className="error-message">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    {validationErrors.awayTeam}
                  </p>
                )}
              </div>

              {/* Home Team */}
              <div>
                <label className="label">Home Team</label>
                <div className="flex items-center gap-3">
                  <select
                    name="homeTeam"
                    value={formData.homeTeam}
                    onChange={handleChange}
                    className={`flex-1 input ${validationErrors.homeTeam ? 'input-error' : ''}`}
                  >
                    {teams.map(team => (
                      <option key={team.abbr} value={team.abbr}>{team.name}</option>
                    ))}
                  </select>
                  <img src={getTeamLogo(formData.homeTeam)} alt={formData.homeTeam} className="w-10 h-10 object-contain flex-shrink-0" />
                </div>
                {validationErrors.homeTeam && (
                  <p className="error-message">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    {validationErrors.homeTeam}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Score</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Away Score</label>
                <input
                  type="number"
                  name="awayScore"
                  value={formData.awayScore}
                  onChange={handleChange}
                  min="0"
                  max="99"
                  className="input text-center text-2xl font-bold"
                />
              </div>
              <div>
                <label className="label">Home Score</label>
                <input
                  type="number"
                  name="homeScore"
                  value={formData.homeScore}
                  onChange={handleChange}
                  min="0"
                  max="99"
                  className="input text-center text-2xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* Game Situation */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Situation</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Down</label>
                <select
                  name="down"
                  value={formData.down}
                  onChange={handleChange}
                  className="input"
                >
                  <option value={1}>1st</option>
                  <option value={2}>2nd</option>
                  <option value={3}>3rd</option>
                  <option value={4}>4th</option>
                </select>
              </div>

              <div>
                <label className="label">Distance</label>
                <input
                  type="number"
                  name="distance"
                  value={formData.distance}
                  onChange={handleChange}
                  min="1"
                  max="99"
                  className={`input ${validationErrors.distance ? 'input-error' : ''}`}
                />
                {validationErrors.distance && (
                  <p className="error-message">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    {validationErrors.distance}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Yards to Goal</label>
                <input
                  type="number"
                  name="yardsToGoal"
                  value={formData.yardsToGoal}
                  onChange={handleChange}
                  min="1"
                  max="99"
                  className="input"
                />
              </div>
            </div>

            {/* Possession */}
            <div className="mt-4">
              <label className="label">Possession</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'possession', value: 'away' }})}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.possession === 'away' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Away has ball
                </button>
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'possession', value: 'home' }})}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.possession === 'home' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Home has ball
                </button>
              </div>
            </div>
          </div>

          {/* Game Clock */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Game Clock</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Quarter</label>
                <select
                  name="quarter"
                  value={formData.quarter}
                  onChange={handleChange}
                  className="input"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>

              <div>
                <label className="label">Minutes</label>
                <input
                  type="number"
                  name="minutes"
                  value={formData.minutes}
                  onChange={handleChange}
                  min="0"
                  max="15"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Seconds</label>
                <input
                  type="number"
                  name="seconds"
                  value={formData.seconds}
                  onChange={handleChange}
                  min="0"
                  max="59"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Clock</label>
                <div className="px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-center">
                  {formData.minutes}:{formData.seconds.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Timeouts */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Away Timeouts</label>
                <select
                  name="awayTimeouts"
                  value={formData.awayTimeouts}
                  onChange={handleChange}
                  className="input"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>

              <div>
                <label className="label">Home Timeouts</label>
                <select
                  name="homeTimeouts"
                  value={formData.homeTimeouts}
                  onChange={handleChange}
                  className="input"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || Object.keys(validationErrors).length > 0}
            className="w-full btn btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:hover:shadow-md flex items-center justify-center gap-2"
          >
            {loading && <span className="spinner"></span>}
            {loading ? 'Calculating...' : 'Calculate Predictions'}
          </button>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* Results Display with smooth fade-in */}
      {(epaResult || winProbResult) && (
        <div className="mt-8 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Probability Card */}
            {winProbResult && (
              <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
                  Win Probability
                </h3>

                {/* Team percentages */}
                <div className="flex justify-between items-center mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {(winProbResult.awayWinProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-1">
                      {winProbResult.metadata.awayTeam}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {(winProbResult.homeWinProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-1">
                      {winProbResult.metadata.homeTeam}
                    </div>
                  </div>
                </div>

                {/* Horizontal bar - colorblind friendly blue to green */}
                <div className="relative mb-4">
                  <div className="h-6 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-teal-400 to-green-500 shadow-inner"></div>

                  {/* Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-md transition-all duration-500"
                    style={{ left: `${winProbResult.homeWinProbability * 100}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300"></div>
                  </div>

                  {/* Center marker */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white opacity-40"></div>
                </div>

                {/* Scale labels */}
                <div className="flex justify-between text-xs text-gray-500 mb-6">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>

                {/* Game summary */}
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-800 font-medium">
                    <span className="font-bold">{winProbResult.metadata.homeTeam}</span> {winProbResult.metadata.homeScore} - {winProbResult.metadata.awayScore} <span className="font-bold">{winProbResult.metadata.awayTeam}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Q{winProbResult.metadata.quarter} • {formData.minutes}:{formData.seconds.toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            )}

            {/* EPA Card */}
            {epaResult && (
              <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
                  Expected Points Added
                </h3>

                <div className="text-center py-8">
                  <div className={`text-6xl font-bold ${getEPAColor(epaResult.epa)} mb-3`}>
                    {epaResult.epa > 0 ? '+' : ''}{epaResult.epa}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {epaResult.metadata.fieldPosition}
                  </p>
                </div>

                {/* Compact metadata */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Down & Distance</span>
                    <span className="font-semibold text-gray-900">
                      {epaResult.metadata.down} & {epaResult.metadata.distance}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Red Zone</span>
                    <span className="font-semibold text-gray-900">
                      {epaResult.metadata.redZone ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-gray-600">No</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Possession</span>
                    <span className="font-semibold text-gray-900">
                      {epaResult.metadata.possession === 'home' ? epaResult.metadata.homeTeam : epaResult.metadata.awayTeam}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
