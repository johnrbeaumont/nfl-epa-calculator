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

export default function EPACalculator({ onNavigate }) {
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
    if (epa >= 2) return '#0f0'
    if (epa >= 1) return '#0f0'
    if (epa >= 0) return '#4a9eff'
    if (epa >= -1) return '#f80'
    return '#f00'
  }

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
        paddingBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: '#4a9eff',
            marginBottom: '0.25rem'
          }}>
            NFL EPA & WIN PROBABILITY CALCULATOR
          </h1>
          <div style={{ fontSize: '0.875rem', color: '#888' }}>
            <span style={{ color: '#0f0' }}>● LIVE</span> | XGBOOST ML MODELS
          </div>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            style={{
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #333',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.75rem'
            }}
          >
            ⌂ HOME
          </button>
        )}
      </div>

      {/* Scenario Presets */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '0.875rem',
          color: '#888',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          [ QUICK SCENARIOS ]
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem'
        }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              type="button"
              style={{
                backgroundColor: 'transparent',
                color: '#4a9eff',
                border: '1px solid #4a9eff',
                padding: '0.75rem',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.75rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4a9eff'
                e.currentTarget.style.color = '#0a0a0f'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#4a9eff'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        backgroundColor: '#1a1a1f',
        border: '1px solid #333',
        padding: '2rem'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Team Selection */}
          <div>
            <h2 style={{
              fontSize: '0.875rem',
              color: '#888',
              marginBottom: '1rem',
              textTransform: 'uppercase'
            }}>
              [ TEAMS ]
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {/* Away Team */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  AWAY TEAM:
                </label>
                <select
                  name="awayTeam"
                  value={formData.awayTeam}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: validationErrors.awayTeam ? '1px solid #f00' : '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                >
                  {teams.map(team => (
                    <option key={team.abbr} value={team.abbr}>{team.abbr} - {team.name}</option>
                  ))}
                </select>
                {validationErrors.awayTeam && (
                  <p style={{ color: '#f00', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ! {validationErrors.awayTeam}
                  </p>
                )}
              </div>

              {/* Home Team */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  HOME TEAM:
                </label>
                <select
                  name="homeTeam"
                  value={formData.homeTeam}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: validationErrors.homeTeam ? '1px solid #f00' : '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                >
                  {teams.map(team => (
                    <option key={team.abbr} value={team.abbr}>{team.abbr} - {team.name}</option>
                  ))}
                </select>
                {validationErrors.homeTeam && (
                  <p style={{ color: '#f00', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ! {validationErrors.homeTeam}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div>
            <h2 style={{
              fontSize: '0.875rem',
              color: '#888',
              marginBottom: '1rem',
              textTransform: 'uppercase'
            }}>
              [ SCORE ]
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  AWAY SCORE:
                </label>
                <input
                  type="number"
                  name="awayScore"
                  value={formData.awayScore}
                  onChange={handleChange}
                  min="0"
                  max="99"
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '2rem',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  HOME SCORE:
                </label>
                <input
                  type="number"
                  name="homeScore"
                  value={formData.homeScore}
                  onChange={handleChange}
                  min="0"
                  max="99"
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '2rem',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Game Situation */}
          <div>
            <h2 style={{
              fontSize: '0.875rem',
              color: '#888',
              marginBottom: '1rem',
              textTransform: 'uppercase'
            }}>
              [ SITUATION ]
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  DOWN:
                </label>
                <select
                  name="down"
                  value={formData.down}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                >
                  <option value={1}>1ST</option>
                  <option value={2}>2ND</option>
                  <option value={3}>3RD</option>
                  <option value={4}>4TH</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  DISTANCE:
                </label>
                <input
                  type="number"
                  name="distance"
                  value={formData.distance}
                  onChange={handleChange}
                  min="1"
                  max="99"
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: validationErrors.distance ? '1px solid #f00' : '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                />
                {validationErrors.distance && (
                  <p style={{ color: '#f00', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    ! {validationErrors.distance}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  YARDS TO GOAL:
                </label>
                <input
                  type="number"
                  name="yardsToGoal"
                  value={formData.yardsToGoal}
                  onChange={handleChange}
                  min="1"
                  max="99"
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            {/* Possession */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#888',
                fontSize: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                POSSESSION:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'possession', value: 'away' }})}
                  style={{
                    flex: 1,
                    backgroundColor: formData.possession === 'away' ? '#4a9eff' : 'transparent',
                    color: formData.possession === 'away' ? '#0a0a0f' : '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}
                >
                  AWAY HAS BALL
                </button>
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'possession', value: 'home' }})}
                  style={{
                    flex: 1,
                    backgroundColor: formData.possession === 'home' ? '#4a9eff' : 'transparent',
                    color: formData.possession === 'home' ? '#0a0a0f' : '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}
                >
                  HOME HAS BALL
                </button>
              </div>
            </div>
          </div>

          {/* Game Clock */}
          <div>
            <h2 style={{
              fontSize: '0.875rem',
              color: '#888',
              marginBottom: '1rem',
              textTransform: 'uppercase'
            }}>
              [ GAME CLOCK ]
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  QUARTER:
                </label>
                <select
                  name="quarter"
                  value={formData.quarter}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  MINUTES:
                </label>
                <input
                  type="number"
                  name="minutes"
                  value={formData.minutes}
                  onChange={handleChange}
                  min="0"
                  max="15"
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  SECONDS:
                </label>
                <input
                  type="number"
                  name="seconds"
                  value={formData.seconds}
                  onChange={handleChange}
                  min="0"
                  max="59"
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  CLOCK:
                </label>
                <div style={{
                  backgroundColor: '#0a0a0f',
                  color: '#0f0',
                  border: '1px solid #333',
                  padding: '0.5rem',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  {formData.minutes}:{formData.seconds.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Timeouts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  AWAY TIMEOUTS:
                </label>
                <select
                  name="awayTimeouts"
                  value={formData.awayTimeouts}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  HOME TIMEOUTS:
                </label>
                <select
                  name="homeTimeouts"
                  value={formData.homeTimeouts}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#0a0a0f',
                    color: '#4a9eff',
                    border: '1px solid #4a9eff',
                    padding: '0.5rem',
                    width: '100%',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.875rem'
                  }}
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
            style={{
              backgroundColor: (loading || Object.keys(validationErrors).length > 0) ? '#333' : '#4a9eff',
              color: (loading || Object.keys(validationErrors).length > 0) ? '#666' : '#0a0a0f',
              border: '1px solid #4a9eff',
              padding: '1rem',
              cursor: (loading || Object.keys(validationErrors).length > 0) ? 'not-allowed' : 'pointer',
              fontFamily: "'Courier New', monospace",
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            {loading ? '[ CALCULATING... ]' : '[ CALCULATE PREDICTIONS ]'}
          </button>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#2a0a0a',
              border: '1px solid #f00',
              color: '#f00',
              fontSize: '0.875rem'
            }}>
              ! ERROR: {error}
            </div>
          )}
        </form>
      </div>

      {/* Results Display */}
      {(epaResult || winProbResult) && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {/* Win Probability Card */}
            {winProbResult && (
              <div style={{
                backgroundColor: '#1a1a1f',
                border: '2px solid #4a9eff',
                padding: '2rem'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  color: '#4a9eff',
                  marginBottom: '2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid #333',
                  paddingBottom: '0.5rem'
                }}>
                  [ WIN PROBABILITY ]
                </h3>

                {/* Team percentages */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      color: '#4a9eff'
                    }}>
                      {(winProbResult.awayWinProbability * 100).toFixed(1)}%
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#888',
                      marginTop: '0.5rem'
                    }}>
                      {winProbResult.metadata.awayTeam}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      color: '#4a9eff'
                    }}>
                      {(winProbResult.homeWinProbability * 100).toFixed(1)}%
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#888',
                      marginTop: '0.5rem'
                    }}>
                      {winProbResult.metadata.homeTeam}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    height: '30px',
                    backgroundColor: '#0a0a0f',
                    border: '1px solid #333',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${winProbResult.homeWinProbability * 100}%`,
                      backgroundColor: '#4a9eff',
                      transition: 'width 0.5s'
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#e0e0e0',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      50%
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.625rem',
                    color: '#666',
                    marginTop: '0.25rem'
                  }}>
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Game summary */}
                <div style={{
                  backgroundColor: '#0a0a0f',
                  border: '1px solid #333',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#e0e0e0',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#4a9eff' }}>{winProbResult.metadata.homeTeam}</span>{' '}
                    {winProbResult.metadata.homeScore} - {winProbResult.metadata.awayScore}{' '}
                    <span style={{ fontWeight: 'bold', color: '#4a9eff' }}>{winProbResult.metadata.awayTeam}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                    Q{winProbResult.metadata.quarter} • {formData.minutes}:{formData.seconds.toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}

            {/* EPA Card */}
            {epaResult && (
              <div style={{
                backgroundColor: '#1a1a1f',
                border: '2px solid #4a9eff',
                padding: '2rem'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  color: '#4a9eff',
                  marginBottom: '2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid #333',
                  paddingBottom: '0.5rem'
                }}>
                  [ EXPECTED POINTS ADDED ]
                </h3>

                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{
                    fontSize: '6rem',
                    fontWeight: 'bold',
                    color: getEPAColor(epaResult.epa),
                    lineHeight: 1
                  }}>
                    {epaResult.epa > 0 ? '+' : ''}{epaResult.epa}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#888',
                    marginTop: '1rem'
                  }}>
                    {epaResult.metadata.fieldPosition}
                  </div>
                </div>

                {/* Metadata */}
                <div style={{
                  backgroundColor: '#0a0a0f',
                  border: '1px solid #333',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ color: '#888' }}>DOWN & DISTANCE:</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                      {epaResult.metadata.down} & {epaResult.metadata.distance}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ color: '#888' }}>RED ZONE:</span>
                    <span style={{
                      color: epaResult.metadata.redZone ? '#0f0' : '#666',
                      fontWeight: 'bold'
                    }}>
                      {epaResult.metadata.redZone ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ color: '#888' }}>POSSESSION:</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                      {epaResult.metadata.possession === 'home' ? epaResult.metadata.homeTeam : epaResult.metadata.awayTeam}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
        XGBOOST ML MODELS | TRAINED ON 285K+ PLAYS (2016-2024)
      </div>
    </div>
  )
}
