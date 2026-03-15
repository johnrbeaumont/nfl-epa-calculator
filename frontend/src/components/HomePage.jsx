function HomePage({ onNavigate }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#e0e0e0',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>

      {/* Title block */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '1rem' }}>
          ══════════════════════════════════════════════════════════════
        </div>
        <div style={{ color: '#4a9eff', fontSize: '0.75rem', letterSpacing: '0.4em', marginBottom: '0.75rem' }}>
          NFL ANALYTICS SYSTEM
        </div>
        <h1 style={{
          color: '#ffffff',
          fontSize: '2.75rem',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
          marginBottom: '0.75rem',
          lineHeight: 1
        }}>
          ANALYTICS<br />
          <span style={{ color: '#4a9eff' }}>TERMINAL</span>
        </h1>
        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
          <span style={{ color: '#0f0' }}>● SYSTEM ONLINE</span>
          <span style={{ margin: '0 1rem', color: '#333' }}>|</span>
          <span>2 MODULES LOADED</span>
          <span style={{ margin: '0 1rem', color: '#333' }}>|</span>
          <span>DATA: 2016–2024</span>
        </div>
        <div style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '0.15em' }}>
          ══════════════════════════════════════════════════════════════
        </div>
      </div>

      {/* Prompt */}
      <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
        SELECT A MODULE TO LAUNCH
      </div>

      {/* Module tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem',
        maxWidth: '860px',
        width: '100%'
      }}>

        {/* EPA Calculator */}
        <ModuleTile
          index="01"
          title="EPA CALCULATOR"
          subtitle="Win Probability"
          description="Calculate Expected Points Added and Win Probability for any NFL game situation. Enter down, distance, field position, score, and time remaining to get instant ML-powered predictions."
          stats={[
            { label: 'Model', value: 'XGBoost' },
            { label: 'R²', value: '0.962' },
            { label: 'MAE', value: '0.228' },
          ]}
          onClick={() => onNavigate('calculator')}
        />

        {/* NGS Terminal */}
        <ModuleTile
          index="02"
          title="NGS TERMINAL"
          subtitle="Next Gen Stats"
          description="Explore NFL Next Gen Stats from 2016–2024. Browse player leaderboards by position, compare career stats across seasons, and view full team rosters with RFID tracking data."
          stats={[
            { label: 'Source', value: 'RFID 10Hz' },
            { label: 'Players', value: '1,000+' },
            { label: 'Seasons', value: '2016–2024' },
          ]}
          onClick={() => onNavigate('stats')}
        />

      </div>

      {/* Footer */}
      <div style={{ marginTop: '3rem', color: '#444', fontSize: '0.7rem', textAlign: 'center', letterSpacing: '0.1em' }}>
        NFL ANALYTICS TERMINAL v1.0 &nbsp;·&nbsp; BUILT WITH CLAUDE CODE &nbsp;·&nbsp; MODELS TRAINED ON 285K+ PLAYS
      </div>
    </div>
  )
}

function ModuleTile({ index, title, subtitle, description, stats, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#12121a' : '#0f0f17',
        border: `1px solid ${hovered ? '#4a9eff' : '#2a2a3a'}`,
        color: '#e0e0e0',
        padding: '2rem',
        cursor: 'pointer',
        fontFamily: "'Courier New', monospace",
        textAlign: 'left',
        transition: 'border-color 0.15s, background-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 0
      }}
    >
      {/* Module number */}
      <div style={{
        color: hovered ? '#4a9eff' : '#555',
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        marginBottom: '1rem',
        transition: 'color 0.15s'
      }}>
        [ MODULE {index} ]
      </div>

      {/* Title */}
      <div style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: hovered ? '#ffffff' : '#e0e0e0',
        letterSpacing: '0.05em',
        marginBottom: '0.25rem',
        transition: 'color 0.15s'
      }}>
        {title}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: '0.7rem',
        color: '#4a9eff',
        letterSpacing: '0.2em',
        marginBottom: '1.25rem'
      }}>
        {subtitle.toUpperCase()}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #222', marginBottom: '1.25rem' }} />

      {/* Description */}
      <div style={{
        color: '#888',
        fontSize: '0.78rem',
        lineHeight: 1.65,
        marginBottom: '1.5rem',
        flexGrow: 1
      }}>
        {description}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        borderTop: '1px solid #222',
        paddingTop: '1rem',
        marginBottom: '1.25rem'
      }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.1em' }}>{s.label.toUpperCase()}</div>
            <div style={{ color: '#e0e0e0', fontSize: '0.8rem', fontWeight: 'bold' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Launch prompt */}
      <div style={{
        color: hovered ? '#4a9eff' : '#444',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        transition: 'color 0.15s'
      }}>
        {hovered ? '▶ LAUNCHING...' : '> PRESS TO LAUNCH'}
      </div>
    </button>
  )
}

import { useState } from 'react'
export default HomePage
