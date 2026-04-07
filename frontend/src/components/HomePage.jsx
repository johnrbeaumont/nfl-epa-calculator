import { useState } from 'react'

const C = {
  bg: '#0f0f13',
  surface: '#17171e',
  surfaceHover: '#1e1e28',
  border: '#252535',
  borderBright: '#35354a',
  gold: '#c9a447',
  goldDim: 'rgba(201,164,71,0.1)',
  text: '#f0f0f0',
  muted: '#7a7a8a',
  dim: '#4a4a5a',
  font: "'All-ProSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontDisplay: "'AllProDisplay', 'All-ProSans', sans-serif",
}

function HomePage({ onNavigate }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.bg,
      color: C.text,
      fontFamily: C.font,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{
          fontSize: '0.68rem', letterSpacing: '0.25em', color: C.gold,
          fontWeight: '600', textTransform: 'uppercase', marginBottom: '1rem',
        }}>
          NFL Analytics
        </div>
        <h1 style={{
          fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.02em',
          lineHeight: 1.1, margin: 0, marginBottom: '1rem',
          fontFamily: C.fontDisplay,
        }}>
          <span style={{ color: C.text }}>Analytics </span>
          <span style={{ color: C.gold }}>Terminal</span>
        </h1>
        <div style={{ fontSize: '0.85rem', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34d058' }} />
          <span>System Online</span>
          <span style={{ color: C.dim }}>·</span>
          <span>2 Modules</span>
          <span style={{ color: C.dim }}>·</span>
          <span>Data: 2016–2025</span>
        </div>
      </div>

      {/* Module tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem',
        maxWidth: '860px',
        width: '100%',
      }}>
        <ModuleTile
          index="01"
          tag="Machine Learning"
          title="EPA Calculator"
          subtitle="Win Probability"
          description="Calculate Expected Points Added and Win Probability for any NFL game situation. Enter down, distance, field position, score, and time remaining for instant ML-powered predictions."
          stats={[
            { label: 'Model', value: 'XGBoost' },
            { label: 'R²', value: '0.962' },
            { label: 'Plays', value: '285K+' },
          ]}
          onClick={() => onNavigate('calculator')}
        />
        <ModuleTile
          index="02"
          tag="RFID Tracking"
          title="NGS Terminal"
          subtitle="Next Gen Stats"
          description="Explore NFL Next Gen Stats from 2016–2025. Browse player leaderboards by position, compare career stats, and view full team rosters with RFID tracking data."
          stats={[
            { label: 'Source', value: 'RFID 10Hz' },
            { label: 'Players', value: '1,000+' },
            { label: 'Seasons', value: '2016–2025' },
          ]}
          onClick={() => onNavigate('stats')}
        />
      </div>

      {/* Footer */}
      <div style={{ marginTop: '3rem', color: C.dim, fontSize: '0.72rem', textAlign: 'center' }}>
        NFL Analytics Terminal v1.0 · Built with Claude Code · Models trained on 285K+ plays
      </div>
    </div>
  )
}

function ModuleTile({ index, tag, title, subtitle, description, stats, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? C.surfaceHover : C.surface,
        border: `1px solid ${hovered ? C.gold : C.border}`,
        borderRadius: 12,
        color: C.text,
        padding: '1.75rem',
        cursor: 'pointer',
        fontFamily: C.font,
        textAlign: 'left',
        transition: 'border-color 0.15s, background-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Tag + number */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{
          backgroundColor: C.goldDim,
          border: `1px solid ${C.gold}44`,
          borderRadius: 20,
          padding: '0.2rem 0.65rem',
          color: C.gold,
          fontSize: '0.68rem',
          fontWeight: '600',
          letterSpacing: '0.05em',
        }}>
          {tag}
        </span>
        <span style={{ color: C.dim, fontSize: '0.7rem', fontWeight: '600' }}>
          {index}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.01em',
        color: hovered ? C.gold : C.text,
        marginBottom: '0.2rem',
        transition: 'color 0.15s',
      }}>
        {title}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: '0.75rem', color: C.muted, marginBottom: '1.25rem',
        fontWeight: '500',
      }}>
        {subtitle}
      </div>

      {/* Description */}
      <div style={{
        color: C.muted, fontSize: '0.82rem', lineHeight: 1.65,
        marginBottom: '1.5rem', flexGrow: 1,
      }}>
        {description}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: '1.5rem',
        borderTop: `1px solid ${C.border}`, paddingTop: '1rem',
        marginBottom: '1.25rem',
      }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ color: C.dim, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{s.label}</div>
            <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: '600' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Launch CTA */}
      <div style={{
        color: hovered ? C.gold : C.dim,
        fontSize: '0.75rem', fontWeight: '500',
        transition: 'color 0.15s',
      }}>
        {hovered ? '→ Open module' : 'Select to launch'}
      </div>
    </button>
  )
}

export default HomePage
