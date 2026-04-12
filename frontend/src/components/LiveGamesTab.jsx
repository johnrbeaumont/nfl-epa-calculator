import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const C = {
  bg: '#0f0f13',
  surface: '#17171e',
  surfaceHover: '#1e1e28',
  surfaceSelected: '#1a1a2e',
  border: '#252535',
  borderBright: '#35354a',
  gold: '#c9a447',
  goldDim: 'rgba(201,164,71,0.08)',
  text: '#f0f0f0',
  muted: '#7a7a8a',
  dim: '#4a4a5a',
  green: '#34d058',
  red: '#f85149',
  blue: '#4a9eff',
  font: "'All-ProSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontDisplay: "'AllProDisplay', 'All-ProSans', sans-serif",
  fontStats: "'All-ProStats', 'All-ProSans', sans-serif",
  fontCond: "'EndzoneSansCond', 'All-ProSans', sans-serif",
}

// ─── Ensure a team hex color reads well on our dark (#0f0f13) background ──────
// Uses HSL lightness (not luminance) so dark navies like #002244 are caught.
// Tries alt_color first when primary is too dark; boosts hue as last resort.
function chartColor(primary = '888888', alt = '') {
  const parse = (hex) => {
    const h = hex.replace('#', '').slice(0, 6).padEnd(6, '0')
    const r = parseInt(h.slice(0,2), 16) / 255
    const g = parseInt(h.slice(2,4), 16) / 255
    const b = parseInt(h.slice(4,6), 16) / 255
    const max = Math.max(r,g,b), min = Math.min(r,g,b)
    const l = (max + min) / 2
    const d = max - min
    let hDeg = 0
    if (d > 0) {
      if (max === r) hDeg = ((g - b) / d + 6) % 6
      else if (max === g) hDeg = (b - r) / d + 2
      else hDeg = (r - g) / d + 4
    }
    const s = d === 0 ? 0 : d / (l > 0.5 ? 2 - max - min : max + min)
    return { hex: h, l, hDeg, s }
  }
  const THRESHOLD = 0.28   // HSL lightness cut-off for dark backgrounds
  const p = parse(primary)
  if (p.l >= THRESHOLD) return `#${p.hex}`
  // Primary too dark — try alt_color before boosting
  if (alt) {
    const a = parse(alt)
    if (a.l >= THRESHOLD) return `#${a.hex}`
  }
  // Both too dark — preserve hue/sat, force lightness to 58%
  return `hsl(${Math.round(p.hDeg * 60)}, ${Math.round(p.s * 100)}%, 58%)`
}

// ─── Team Logo ────────────────────────────────────────────────────────────────
function TeamLogo({ teamId, size = 32, style = {} }) {
  if (!teamId) return null
  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${teamId}.png`}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block', ...style }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ORDINAL = (d) => ['', 'st', 'nd', 'rd', 'th'][d] ?? 'th'
const downStr  = (d, yd) => d ? `${d}${ORDINAL(d)} & ${yd}` : null
const fieldStr = (yl) => {
  if (yl == null) return '—'
  if (yl === 50)  return 'Midfield'
  if (yl > 50)   return `Own ${100 - yl}`
  return `Opp ${yl}`
}
const fmtEP = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2)
const fmtWP = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`
const fmtDelta = (v, scale = 1) =>
  v == null ? null : (v >= 0 ? '+' : '') + (v * scale).toFixed(scale === 100 ? 1 : 2) + (scale === 100 ? '%' : '')

// ─── Hover Tooltip (HTML overlay, always readable at any SVG scale) ──────────
function PlayTooltip({ play, clientX, clientY, homeAbbrev, awayAbbrev, homeCC = C.gold, awayCC = C.muted }) {
  if (!play) return null

  const yl      = play.yardline_100
  const isRZ    = yl != null && yl <= 20
  const posTeam = play.is_home_offense ? homeAbbrev : awayAbbrev
  const posCC   = play.is_home_offense ? homeCC : awayCC
  const epDelta = fmtDelta(play.ep_delta)
  const wpDelta = fmtDelta(play.wp_delta, 100)
  const text    = (play.play_text || '').trim()

  // Keep tooltip inside viewport
  const tipLeft = Math.min(clientX + 14, (typeof window !== 'undefined' ? window.innerWidth : 1400) - 230)
  const tipTop  = Math.max(8, clientY - 50)

  return (
    <div style={{
      position: 'fixed', left: tipLeft, top: tipTop,
      zIndex: 9999, pointerEvents: 'none',
      width: 218,
      backgroundColor: '#0b0b10',
      border: `1px solid ${C.borderBright}`,
      borderRadius: 8,
      padding: '9px 12px',
      fontFamily: C.font,
      fontSize: '0.73rem',
      color: C.text,
      lineHeight: 1.55,
      boxShadow: '0 6px 24px rgba(0,0,0,0.65)',
    }}>
      {/* Possession + down/dist */}
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: posCC, fontWeight: 700, fontSize: '0.78rem' }}>
          {posTeam} ball
        </span>
        <span style={{ color: C.text, fontWeight: 700 }}>
          {downStr(play.down, play.ydstogo) ?? '—'}
        </span>
      </div>

      {/* Field position */}
      <Row label="Field pos"
        value={<span style={{ color: isRZ ? C.red : C.text, fontWeight: 600 }}>
          {fieldStr(yl)}{isRZ ? ' (RZ)' : ''}
        </span>}
      />

      {/* Score */}
      <Row label="Score"
        value={`${awayAbbrev} ${play.away_score}  —  ${homeAbbrev} ${play.home_score}`}
      />

      {/* Quarter + clock */}
      <Row label="Time" value={`Q${play.period}  ${play.clock}`} />

      <div style={{ borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />

      {/* EP */}
      <Row
        label="EP"
        value={
          <span>
            <span style={{
              color: play.ep > 0.2 ? C.green : play.ep < -0.2 ? C.red : C.muted,
              fontWeight: 700,
            }}>{fmtEP(play.ep)}</span>
            {epDelta && (
              <span style={{
                color: play.ep_delta > 0 ? C.green : play.ep_delta < 0 ? C.red : C.muted,
                fontSize: '0.65rem', marginLeft: 7,
              }}>Δ{epDelta}</span>
            )}
          </span>
        }
      />

      {/* WP */}
      <Row
        label={`${homeAbbrev} WP`}
        value={
          <span>
            <span style={{ color: C.gold, fontWeight: 700 }}>{fmtWP(play.wp)}</span>
            {wpDelta && (
              <span style={{
                color: play.wp_delta > 0 ? C.green : play.wp_delta < 0 ? C.red : C.muted,
                fontSize: '0.65rem', marginLeft: 7,
              }}>Δ{wpDelta}</span>
            )}
          </span>
        }
      />

      {/* Play text */}
      {text && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          marginTop: 6, paddingTop: 5,
          color: C.muted, fontSize: '0.67rem', lineHeight: 1.45,
        }}>
          {text.length > 68 ? text.slice(0, 68) + '…' : text}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 6 }}>
      <span style={{ color: C.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.text, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ─── WP Chart ─────────────────────────────────────────────────────────────────
function WPChart({ plays, homeAbbrev, awayAbbrev, homeColor, awayColor, homeCC = C.gold, awayCC = C.muted }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [tooltip, setTooltip]       = useState(null)

  if (!plays || plays.length < 2) {
    return (
      <div style={{ color: C.muted, fontSize: '0.78rem', padding: '2rem 0', textAlign: 'center' }}>
        {plays?.length === 1 ? '> Waiting for more plays…' : '> No play data yet'}
      </div>
    )
  }

  const W = 720, H = 130, PL = 42, PT = 8, PB = 20, PR = 8
  const totalW = W + PL + PR, totalH = H + PT + PB
  const n = plays.length
  const xAt = (i) => PL + (i / Math.max(n - 1, 1)) * W
  const yAt = (wp) => PT + (1 - wp) * H
  const midY = yAt(0.5)

  const homePolyPts = [
    `${xAt(0)},${midY}`,
    ...plays.map((p, i) => `${xAt(i)},${Math.min(yAt(p.wp), midY)}`),
    `${xAt(n - 1)},${midY}`,
  ].join(' ')

  const awayPolyPts = [
    `${xAt(0)},${midY}`,
    ...plays.map((p, i) => `${xAt(i)},${Math.max(yAt(p.wp), midY)}`),
    `${xAt(n - 1)},${midY}`,
  ].join(' ')

  const linePoints = plays.map((p, i) => `${xAt(i)},${yAt(p.wp)}`).join(' ')

  const quarterBounds = []
  let lastPeriod = plays[0].period
  for (let i = 1; i < n; i++) {
    if (plays[i].period !== lastPeriod) {
      quarterBounds.push({ x: xAt(i), label: `Q${plays[i].period}` })
      lastPeriod = plays[i].period
    }
  }

  const handleMouseMove = (e) => {
    const bbox = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - bbox.left) / bbox.width * totalW
    if (svgX < PL || svgX > PL + W) { setHoveredIdx(null); setTooltip(null); return }
    const idx = Math.max(0, Math.min(n - 1, Math.round((svgX - PL) / W * (n - 1))))
    setHoveredIdx(idx)
    setTooltip({ play: plays[idx], clientX: e.clientX, clientY: e.clientY })
  }

  const handleMouseLeave = () => { setHoveredIdx(null); setTooltip(null) }

  const hov = hoveredIdx !== null ? plays[hoveredIdx] : null

  return (
    <>
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: hoveredIdx !== null ? 'crosshair' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <polygon points={homePolyPts} fill={`#${homeColor}20`} />
        <polygon points={awayPolyPts} fill={`#${awayColor}20`} />

        {quarterBounds.map((q, i) => (
          <g key={i}>
            <line x1={q.x} y1={PT} x2={q.x} y2={PT + H} stroke={C.borderBright} strokeWidth="1" strokeDasharray="2,4" />
            <text x={q.x + 3} y={PT + 10} fontSize="8" fill={C.dim} fontFamily={C.font}>{q.label}</text>
          </g>
        ))}

        <line x1={PL} y1={midY} x2={PL + W} y2={midY} stroke={C.borderBright} strokeWidth="1" strokeDasharray="4,3" />

        {/* Hover crosshair */}
        {hoveredIdx !== null && (
          <>
            <line
              x1={xAt(hoveredIdx)} y1={PT}
              x2={xAt(hoveredIdx)} y2={PT + H}
              stroke={C.gold} strokeWidth="1" strokeDasharray="2,3" opacity="0.6"
            />
            <line
              x1={PL} y1={yAt(hov.wp)}
              x2={PL + W} y2={yAt(hov.wp)}
              stroke={C.gold} strokeWidth="1" strokeDasharray="2,3" opacity="0.3"
            />
          </>
        )}

        <polyline points={linePoints} fill="none" stroke={C.gold} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Last play dot */}
        <circle cx={xAt(n - 1)} cy={yAt(plays[n - 1].wp)} r="4" fill={C.gold} />

        {/* Hovered dot (larger) */}
        {hoveredIdx !== null && hoveredIdx !== n - 1 && (
          <circle cx={xAt(hoveredIdx)} cy={yAt(hov.wp)} r="5" fill={C.gold} stroke="#0f0f13" strokeWidth="1.5" />
        )}

        {[1.0, 0.75, 0.5, 0.25, 0.0].map(wp => (
          <text key={wp} x={PL - 4} y={yAt(wp) + 3.5} textAnchor="end" fontSize="8.5" fill={C.muted} fontFamily={C.font}>
            {`${(wp * 100).toFixed(0)}%`}
          </text>
        ))}

        <text x={PL + 2} y={midY - 5}  fontSize="8.5" fill={homeCC} fontFamily={C.font} fontWeight="700">{homeAbbrev}</text>
        <text x={PL + 2} y={midY + 13} fontSize="8.5" fill={awayCC} fontFamily={C.font} fontWeight="700">{awayAbbrev}</text>
      </svg>

      {tooltip && (
        <PlayTooltip
          play={tooltip.play}
          clientX={tooltip.clientX}
          clientY={tooltip.clientY}
          homeAbbrev={homeAbbrev}
          awayAbbrev={awayAbbrev}
          homeCC={homeCC}
          awayCC={awayCC}
        />
      )}
    </>
  )
}

// ─── EP Chart ─────────────────────────────────────────────────────────────────
function EPChart({ plays, homeAbbrev, awayAbbrev, homeCC = C.blue, awayCC = C.gold }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [tooltip, setTooltip]       = useState(null)

  if (!plays || plays.length < 2) return null

  const homeFill = homeCC
  const awayFill = awayCC

  const W = 720, H = 110, PL = 42, PT = 8, PB = 20, PR = 8
  const totalW = W + PL + PR, totalH = H + PT + PB
  const n = plays.length
  const EP_MAX = 7
  const xAt  = (i)  => PL + (i / Math.max(n - 1, 1)) * W
  const yAt  = (ep) => PT + H / 2 - (ep / EP_MAX) * (H / 2)
  const zeroY = PT + H / 2
  const barW  = Math.max(2, Math.min(10, (W / n) * 0.7))

  const linePoints = plays.map((p, i) => `${xAt(i)},${yAt(p.ep)}`).join(' ')

  const handleMouseMove = (e) => {
    const bbox = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - bbox.left) / bbox.width * totalW
    if (svgX < PL || svgX > PL + W) { setHoveredIdx(null); setTooltip(null); return }
    const idx = Math.max(0, Math.min(n - 1, Math.round((svgX - PL) / W * (n - 1))))
    setHoveredIdx(idx)
    setTooltip({ play: plays[idx], clientX: e.clientX, clientY: e.clientY })
  }

  const handleMouseLeave = () => { setHoveredIdx(null); setTooltip(null) }

  return (
    <>
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: hoveredIdx !== null ? 'crosshair' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <line x1={PL} y1={zeroY} x2={PL + W} y2={zeroY} stroke={C.borderBright} strokeWidth="1" />

        {/* Hover guide line */}
        {hoveredIdx !== null && (
          <line
            x1={xAt(hoveredIdx)} y1={PT}
            x2={xAt(hoveredIdx)} y2={PT + H}
            stroke={C.gold} strokeWidth="1" strokeDasharray="2,3" opacity="0.6"
          />
        )}

        {/* EP bars */}
        {plays.map((p, i) => {
          const bx   = xAt(i) - barW / 2
          const barY = yAt(p.ep)
          const barH = Math.abs(barY - zeroY)
          const isHov = i === hoveredIdx
          const fill  = p.is_home_offense ? homeFill : awayFill
          return (
            <rect
              key={p.play_id || i}
              x={bx}
              y={p.ep >= 0 ? barY : zeroY}
              width={isHov ? barW * 1.6 : barW}
              height={Math.max(1, barH)}
              fill={fill}
              opacity={isHov ? 0.95 : 0.65}
            />
          )
        })}

        <polyline points={linePoints} fill="none" stroke={`${C.muted}88`} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        <circle cx={xAt(n - 1)} cy={yAt(plays[n - 1].ep)} r="3.5" fill={plays[n-1].is_home_offense ? homeFill : awayFill} />
        {hoveredIdx !== null && hoveredIdx !== n - 1 && (
          <circle cx={xAt(hoveredIdx)} cy={yAt(plays[hoveredIdx].ep)} r="5"
            fill={plays[hoveredIdx].is_home_offense ? homeFill : awayFill}
            stroke="#0f0f13" strokeWidth="1.5" />
        )}

        {[EP_MAX, 3.5, 0, -3.5, -EP_MAX].map(v => (
          <text key={v} x={PL - 4} y={yAt(v) + 3.5} textAnchor="end" fontSize="8.5" fill={C.muted} fontFamily={C.font}>
            {v > 0 ? `+${v}` : v}
          </text>
        ))}

        {/* Legend */}
        <rect x={PL + W - 80} y={PT} width="8" height="8" fill={homeFill} opacity="0.8" />
        <text x={PL + W - 68} y={PT + 7.5} fontSize="8" fill={C.muted} fontFamily={C.font}>{homeAbbrev}</text>
        <rect x={PL + W - 40} y={PT} width="8" height="8" fill={awayFill} opacity="0.8" />
        <text x={PL + W - 28} y={PT + 7.5} fontSize="8" fill={C.muted} fontFamily={C.font}>{awayAbbrev}</text>
      </svg>

      {tooltip && (
        <PlayTooltip
          play={tooltip.play}
          clientX={tooltip.clientX}
          clientY={tooltip.clientY}
          homeAbbrev={homeAbbrev}
          awayAbbrev={awayAbbrev}
          homeCC={homeCC}
          awayCC={awayCC}
        />
      )}
    </>
  )
}

// ─── Situation Bar (shown inside the game header) ─────────────────────────────
function StatChip({ label, value, badge }) {
  return (
    <div>
      <div style={{
        fontSize: '0.58rem', color: C.dim, letterSpacing: '0.1em',
        fontWeight: 700, textTransform: 'uppercase', marginBottom: 3,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {value}
        {badge && (
          <span style={{
            fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.05em',
            color: C.red, backgroundColor: 'rgba(248,81,73,0.12)',
            border: '1px solid rgba(248,81,73,0.3)',
            borderRadius: 3, padding: '1px 4px',
          }}>{badge}</span>
        )}
      </div>
    </div>
  )
}

function Dot({ filled }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      backgroundColor: filled ? 'currentColor' : 'transparent',
      border: '1.5px solid currentColor', marginRight: 2,
      verticalAlign: 'middle',
    }} />
  )
}

function SituationBar({ lastPlay, situation, homeAbbrev, awayAbbrev, homeTeam, awayTeam, playCount, homeCC = C.gold, awayCC = C.muted }) {
  if (!lastPlay && !situation) return null

  const down  = lastPlay?.down
  const ydstg = lastPlay?.ydstogo
  const yl100 = lastPlay?.yardline_100
  const isHomeOff = lastPlay?.is_home_offense
  const period = lastPlay?.period
  const clock  = lastPlay?.clock
  const isRZ   = yl100 != null && yl100 <= 20

  const posTeam  = isHomeOff != null ? (isHomeOff ? homeAbbrev : awayAbbrev) : null
  const posColor = isHomeOff ? homeCC : awayCC

  // Timeouts from live scoreboard situation
  const homeTO = situation?.home_timeouts
  const awayTO  = situation?.away_timeouts

  const TimeoutRow = ({ abbrev, count, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: C.muted, fontSize: '0.68rem', minWidth: 24 }}>{abbrev}</span>
      <span style={{ color, display: 'flex', alignItems: 'center' }}>
        {[0, 1, 2].map(i => <Dot key={i} filled={i < count} />)}
      </span>
    </div>
  )

  return (
    <div style={{
      borderTop: `1px solid ${C.border}`,
      paddingTop: '0.75rem', marginTop: '0.75rem',
      display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start',
    }}>
      {/* Possession */}
      {posTeam && (
        <StatChip
          label="Possession"
          value={<span style={{ fontSize: '0.82rem', fontWeight: 700, color: posColor }}>{posTeam}</span>}
        />
      )}

      {/* Down & distance */}
      {downStr(down, ydstg) && (
        <StatChip
          label="Situation"
          value={<span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>{downStr(down, ydstg)}</span>}
        />
      )}

      {/* Field position */}
      {yl100 != null && (
        <StatChip
          label="Field pos"
          value={<span style={{ fontSize: '0.82rem', fontWeight: 700, color: isRZ ? C.red : C.text }}>{fieldStr(yl100)}</span>}
          badge={isRZ ? 'RED ZONE' : null}
        />
      )}

      {/* Time */}
      {period && clock && (
        <StatChip
          label="Time"
          value={<span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>Q{period}  {clock}</span>}
        />
      )}

      {/* Timeouts */}
      {(homeTO != null || awayTO != null) && (
        <StatChip
          label="Timeouts"
          value={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <TimeoutRow abbrev={awayAbbrev} count={awayTO ?? 3} color={awayCC} />
              <TimeoutRow abbrev={homeAbbrev} count={homeTO ?? 3} color={homeCC} />
            </div>
          }
        />
      )}

      {/* Plays analyzed — push to right */}
      {playCount > 0 && (
        <StatChip
          label="Plays analyzed"
          value={<span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.muted }}>{playCount}</span>}
        />
      )}
    </div>
  )
}

// ─── Game Card ────────────────────────────────────────────────────────────────
function GameCard({ game, selected, onClick }) {
  const [hovered, setHovered] = useState(false)
  const { status, home_team, away_team } = game
  const isLive = status.is_live
  const isFinal = status.is_final

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: selected ? C.surfaceSelected : hovered ? C.surfaceHover : C.surface,
        border: `1px solid ${selected ? C.gold : hovered ? C.borderBright : C.border}`,
        borderRadius: 10, padding: '0.9rem 1.1rem',
        minWidth: 148, maxWidth: 180,
        color: C.text, cursor: 'pointer', fontFamily: C.font,
        textAlign: 'left', flexShrink: 0, position: 'relative',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {isLive && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: C.green, display: 'inline-block',
          boxShadow: `0 0 5px ${C.green}`,
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <TeamLogo teamId={away_team.team_id} size={20} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', fontFamily: C.fontCond, textTransform: 'uppercase' }}>{away_team.abbrev}</span>
        </div>
        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: isFinal || isLive ? C.text : C.muted, fontFamily: C.fontStats }}>{away_team.score}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <TeamLogo teamId={home_team.team_id} size={20} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', fontFamily: C.fontCond, textTransform: 'uppercase' }}>{home_team.abbrev}</span>
        </div>
        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: isFinal || isLive ? C.text : C.muted, fontFamily: C.fontStats }}>{home_team.score}</span>
      </div>
      <div style={{
        fontSize: '0.68rem',
        color: isLive ? C.green : isFinal ? C.dim : C.gold,
        fontWeight: 600, letterSpacing: '0.04em',
        borderTop: `1px solid ${C.border}`, paddingTop: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {status.detail || (isLive ? 'LIVE' : isFinal ? 'FINAL' : 'UPCOMING')}
      </div>
    </button>
  )
}

// ─── Plays Table (used inside each quarter section) ──────────────────────────
function PlaysTable({ plays, homeAbbrev, awayAbbrev, homeTeamId, awayTeamId, homeCC = C.gold, awayCC = C.muted }) {
  const epDeltaColor = (v) => v == null ? C.muted : v > 0.5 ? C.green : v < -0.5 ? C.red : C.muted
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', fontFamily: C.font }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['CLOCK', 'TEAM', 'SITUATION', 'FIELD POS', 'EP', 'ΔEPA', 'HOME WP%', 'PLAY'].map(h => (
              <th key={h} style={{
                padding: '0.35rem 0.6rem', textAlign: h === 'EP' || h === 'ΔEPA' || h === 'HOME WP%' ? 'right' : 'left',
                color: C.muted, fontWeight: 600, fontSize: '0.62rem',
                letterSpacing: '0.06em', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plays.map((p, i) => (
            <tr key={p.play_id || i} style={{
              borderBottom: `1px solid ${C.border}`,
              backgroundColor: p.scoring_play ? C.goldDim : 'transparent',
            }}>
              <td style={{ padding: '0.4rem 0.6rem', color: C.muted, whiteSpace: 'nowrap' }}>{p.clock}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TeamLogo teamId={p.is_home_offense ? homeTeamId : awayTeamId} size={16} />
                  <span style={{ fontWeight: 700, color: p.is_home_offense ? homeCC : awayCC }}>
                    {p.is_home_offense ? homeAbbrev : awayAbbrev}
                  </span>
                </div>
              </td>
              <td style={{ padding: '0.4rem 0.6rem', color: C.muted, whiteSpace: 'nowrap' }}>
                {p.down ? `${p.down}${ORDINAL(p.down)} & ${p.ydstogo}` : '—'}
              </td>
              <td style={{ padding: '0.4rem 0.6rem', color: p.yardline_100 <= 20 ? C.red : C.muted, whiteSpace: 'nowrap' }}>
                {fieldStr(p.yardline_100)}
              </td>
              <td style={{ padding: '0.4rem 0.6rem', color: p.ep > 0.2 ? C.green : p.ep < -0.2 ? C.red : C.muted, fontWeight: 600, textAlign: 'right' }}>
                {fmtEP(p.ep)}
              </td>
              <td style={{ padding: '0.4rem 0.6rem', color: epDeltaColor(p.ep_delta), fontWeight: 600, textAlign: 'right' }}>
                {fmtDelta(p.ep_delta) ?? '—'}
              </td>
              <td style={{ padding: '0.4rem 0.6rem', color: C.text, textAlign: 'right' }}>
                {fmtWP(p.wp)}
              </td>
              <td style={{ padding: '0.4rem 0.6rem', color: C.muted, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.play_text || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Quarter Accordion ────────────────────────────────────────────────────────
function QuarterAccordion({ plays, homeAbbrev, awayAbbrev, homeTeamId, awayTeamId, homeCC = C.gold, awayCC = C.muted }) {
  if (!plays || plays.length === 0) return null

  // Group plays into ordered period buckets
  const groups = []
  plays.forEach(p => {
    const label = p.period <= 4 ? `Q${p.period}` : `OT${p.period - 4}`
    const last = groups[groups.length - 1]
    if (last && last.label === label) { last.plays.push(p) }
    else { groups.push({ label, plays: [p] }) }
  })

  const lastLabel = groups[groups.length - 1]?.label
  // Default: only the current quarter open; previous quarters closed
  const [openSet, setOpenSet] = useState(() => new Set(lastLabel ? [lastLabel] : []))

  // When a new quarter starts, auto-open it (lock it open)
  useEffect(() => {
    if (lastLabel) setOpenSet(prev => prev.has(lastLabel) ? prev : new Set([...prev, lastLabel]))
  }, [lastLabel])

  const toggle = (label) => {
    if (label === lastLabel) return  // current quarter stays locked open
    setOpenSet(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  return (
    <div>
      {[...groups].reverse().map(({ label, plays: qPlays }) => {
        const isOpen = openSet.has(label)
        const isLast = label === lastLabel
        const canToggle = !isLast
        return (
          <div key={label} style={{ marginBottom: '0.4rem' }}>
            <button
              onClick={() => toggle(label)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isOpen ? C.surfaceHover : 'none',
                border: `1px solid ${isOpen ? C.borderBright : C.border}`,
                borderRadius: isOpen ? '8px 8px 0 0' : 8,
                padding: '0.55rem 0.9rem',
                cursor: canToggle ? 'pointer' : 'default',
                fontFamily: C.font, color: C.text,
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: isLast ? C.gold : C.text }}>
                  {label}
                </span>
                {isLast && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: C.green,
                    backgroundColor: 'rgba(52,208,88,0.1)', border: '1px solid rgba(52,208,88,0.3)',
                    borderRadius: 3, padding: '1px 5px' }}>CURRENT</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.68rem', color: C.muted }}>{qPlays.length} plays</span>
                {canToggle && (
                  <span style={{
                    fontSize: '0.8rem', fontWeight: 700, color: C.dim,
                    width: 14, textAlign: 'center', lineHeight: 1,
                  }}>{isOpen ? '−' : '+'}</span>
                )}
              </div>
            </button>
            {isOpen && (
              <div style={{
                border: `1px solid ${C.borderBright}`, borderTop: 'none',
                borderRadius: '0 0 8px 8px', overflow: 'hidden',
              }}>
                <PlaysTable
                  plays={qPlays}
                  homeAbbrev={homeAbbrev}
                  awayAbbrev={awayAbbrev}
                  homeTeamId={homeTeamId}
                  awayTeamId={awayTeamId}
                  homeCC={homeCC}
                  awayCC={awayCC}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Game Info Bar ────────────────────────────────────────────────────────────
function GameInfoBar({ context }) {
  if (!context) return null

  const items = []

  if (context.venue_name) {
    const loc = context.neutral_site
      ? `${context.venue_name}${context.venue_location ? ' · ' + context.venue_location : ''} · Neutral`
      : context.venue_location
        ? `${context.venue_name} · ${context.venue_location}`
        : context.venue_name
    items.push({ label: 'Stadium', value: loc })
  }

  const surfaceLabel = context.indoor
    ? 'Indoor'
    : context.surface || null
  if (surfaceLabel) items.push({ label: 'Surface', value: surfaceLabel })

  if (context.kickoff_utc) {
    try {
      const d = new Date(context.kickoff_utc)
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', hour12: true })
      const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      items.push({ label: 'Kickoff', value: `${time} · ${date}` })
    } catch { /* ignore bad dates */ }
  }

  if (!context.indoor && context.weather_desc) {
    items.push({ label: 'Weather', value: context.weather_desc })
  }
  if (!context.indoor && context.wind) {
    items.push({ label: 'Wind', value: context.wind })
  }

  if (context.broadcast) items.push({ label: 'TV', value: context.broadcast })

  if (context.attendance) {
    items.push({ label: 'Attendance', value: context.attendance.toLocaleString() })
  }

  if (items.length === 0) return null

  return (
    <div style={{
      borderTop: `1px solid ${C.border}`,
      paddingTop: '0.85rem', marginTop: '0.85rem',
      display: 'flex', flexWrap: 'wrap', gap: '0 2.5rem',
      rowGap: '0.75rem',
    }}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <div style={{
            fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.11em',
            color: C.dim, textTransform: 'uppercase', marginBottom: 3,
            fontFamily: C.font,
          }}>{label}</div>
          <div style={{ fontSize: '0.79rem', color: C.muted, fontFamily: C.font }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Misc UI Helpers ──────────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em',
      color: C.gold, textTransform: 'uppercase', marginBottom: '0.75rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      fontFamily: C.font,
    }}>
      <span>{'>'}</span><span>{children}</span>
    </div>
  )
}

function ChartBlock({ label, children }) {
  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem',
    }}>
      <div style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
        color: C.muted, textTransform: 'uppercase', marginBottom: '0.5rem',
      }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveGamesTab({ onNavigate }) {
  const [games,        setGames]        = useState([])
  const [selectedId,   setSelectedId]   = useState(null)
  const [gameDetail,   setGameDetail]   = useState(null)
  const [boardLoading, setBoardLoading] = useState(true)
  const [detailLoading,setDetailLoading]= useState(false)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [boardError,   setBoardError]   = useState(null)

  const fetchScoreboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/live/scoreboard`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGames(data.games || [])
      setLastUpdated(new Date())
      setBoardError(null)
    } catch {
      setBoardError('Could not load scoreboard — check backend connection')
    } finally {
      setBoardLoading(false)
    }
  }, [])

  const fetchGameDetail = useCallback(async (gameId) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/live/game/${gameId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setGameDetail(await res.json())
    } catch (err) {
      console.error('Game detail fetch failed:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Scoreboard: poll every 30 s
  useEffect(() => {
    fetchScoreboard()
    const t = setInterval(fetchScoreboard, 30000)
    return () => clearInterval(t)
  }, [fetchScoreboard])

  // Game detail: fetch on selection; poll every 30 s if live
  const selectedGame = games.find(g => g.id === selectedId) ?? null
  useEffect(() => {
    if (!selectedId) return
    fetchGameDetail(selectedId)
    if (!selectedGame?.status?.is_live) return
    const t = setInterval(() => fetchGameDetail(selectedId), 30000)
    return () => clearInterval(t)
  }, [selectedId, selectedGame?.status?.is_live, fetchGameDetail])

  const anyLive  = games.some(g => g.status.is_live)
  const timeFmt  = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  const plays    = gameDetail?.plays ?? []
  const lastPlay = plays.length > 0 ? plays[plays.length - 1] : null

  // Resolved team colors — visible on dark background, distinct for same-primary teams
  const homeCC = selectedGame
    ? chartColor(selectedGame.home_team.color, selectedGame.home_team.alt_color)
    : C.muted
  const awayCC = selectedGame
    ? chartColor(selectedGame.away_team.color, selectedGame.away_team.alt_color)
    : C.muted

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: C.font }}>

      {/* ── Nav bar ── */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: C.surface,
      }}>
        <button
          onClick={onNavigate}
          style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.muted, fontSize: '0.72rem', fontFamily: C.font,
            padding: '0.3rem 0.7rem', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.target.style.borderColor = C.gold; e.target.style.color = C.gold }}
          onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted }}
        >← HOME</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em', color: C.gold }}>
            LIVE GAMES
          </span>
          {anyLive && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', color: C.green }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.green, display: 'inline-block', boxShadow: `0 0 5px ${C.green}` }} />
              LIVE
            </span>
          )}
        </div>

        <span style={{ fontSize: '0.68rem', color: C.dim }}>Updated: {timeFmt}</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem 1.5rem 3rem' }}>

        {/* ── Scoreboard ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <SectionHeader>Scoreboard</SectionHeader>

          {boardLoading && (
            <div style={{ color: C.muted, fontSize: '0.78rem', padding: '1.5rem 0' }}>{'> Loading scoreboard…'}</div>
          )}
          {boardError && !boardLoading && (
            <div style={{ color: C.red, fontSize: '0.78rem', padding: '1.5rem 0' }}>{'> '}{boardError}</div>
          )}
          {!boardLoading && !boardError && games.length === 0 && (
            <div style={{
              color: C.muted, fontSize: '0.8rem', padding: '1.5rem',
              border: `1px solid ${C.border}`, borderRadius: 10, backgroundColor: C.surface,
            }}>
              <div style={{ color: C.gold, marginBottom: '0.5rem' }}>{'> NO GAMES CURRENTLY SCHEDULED'}</div>
              <div style={{ lineHeight: 1.7 }}>NFL regular season runs September through January. The board will be empty during the off-season.</div>
            </div>
          )}
          {!boardLoading && games.length > 0 && (
            <div style={{
              display: 'flex', gap: '0.75rem',
              overflowX: 'auto', paddingBottom: '0.5rem',
              scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent`,
            }}>
              {games.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  selected={selectedId === game.id}
                  onClick={() => {
                    if (selectedId !== game.id) setGameDetail(null)
                    setSelectedId(game.id)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Game Detail ── */}
        {selectedGame && (
          <div>

            {/* ── Scoreline + Situation ── */}
            <div style={{
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '1rem 1.4rem', marginBottom: '1rem',
            }}>
              {/* Centered score block */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <ScoreBlock
                    label="AWAY"
                    abbrev={selectedGame.away_team.abbrev}
                    score={gameDetail?.away_team.score ?? selectedGame.away_team.score}
                    teamId={selectedGame.away_team.team_id}
                    side="left"
                  />
                  <span style={{ color: C.border, fontSize: '2rem', fontWeight: 200, lineHeight: 1 }}>|</span>
                  <ScoreBlock
                    label="HOME"
                    abbrev={selectedGame.home_team.abbrev}
                    score={gameDetail?.home_team.score ?? selectedGame.home_team.score}
                    teamId={selectedGame.home_team.team_id}
                    side="right"
                  />
                </div>

                {/* Status + last play inline */}
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem 0.6rem', maxWidth: 680 }}>
                  <span style={{
                    fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0,
                    color: selectedGame.status.is_live ? C.green : selectedGame.status.is_final ? C.muted : C.gold,
                  }}>
                    {gameDetail?.status.detail || selectedGame.status.detail || '—'}
                  </span>
                  {detailLoading && <span style={{ fontSize: '0.65rem', color: C.gold, flexShrink: 0 }}>› Updating…</span>}
                  {lastPlay?.play_text && (
                    <>
                      <span style={{ color: C.dim, flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: '0.76rem', color: C.muted, lineHeight: 1.4 }}>
                        {lastPlay.play_text.length > 90 ? lastPlay.play_text.slice(0, 90) + '…' : lastPlay.play_text}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Situation bar */}
              <SituationBar
                lastPlay={lastPlay}
                situation={selectedGame.situation}
                homeAbbrev={selectedGame.home_team.abbrev}
                awayAbbrev={selectedGame.away_team.abbrev}
                homeTeam={selectedGame.home_team}
                awayTeam={selectedGame.away_team}
                playCount={plays.length}
                homeCC={homeCC}
                awayCC={awayCC}
              />

              {/* Game context: venue / weather / broadcast */}
              <GameInfoBar context={gameDetail?.context} />
            </div>

            {/* Charts */}
            {plays.length >= 2 && (
              <>
                <ChartBlock label="Win Probability — Home Team %">
                  <WPChart
                    plays={plays}
                    homeAbbrev={selectedGame.home_team.abbrev}
                    awayAbbrev={selectedGame.away_team.abbrev}
                    homeColor={selectedGame.home_team.color}
                    awayColor={selectedGame.away_team.color}
                    homeCC={homeCC}
                    awayCC={awayCC}
                  />
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '0.4rem', fontSize: '0.78rem' }}>
                    <span>
                      <span style={{ color: C.muted }}>Home ({selectedGame.home_team.abbrev}): </span>
                      <span style={{ color: C.gold, fontWeight: 700 }}>{fmtWP(lastPlay?.wp)}</span>
                    </span>
                    <span>
                      <span style={{ color: C.muted }}>Away ({selectedGame.away_team.abbrev}): </span>
                      <span style={{ color: C.gold, fontWeight: 700 }}>
                        {lastPlay ? fmtWP(1 - lastPlay.wp) : '—'}
                      </span>
                    </span>
                    <span style={{ color: C.dim, fontSize: '0.68rem', marginLeft: 'auto' }}>
                      Hover for play details
                    </span>
                  </div>
                </ChartBlock>

                <ChartBlock label="Expected Points — Per Play">
                  <EPChart
                    plays={plays}
                    homeAbbrev={selectedGame.home_team.abbrev}
                    awayAbbrev={selectedGame.away_team.abbrev}
                    homeCC={homeCC}
                    awayCC={awayCC}
                  />
                  <div style={{ fontSize: '0.68rem', color: C.dim, marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      Bar: <span style={{ color: homeCC }}>■</span> {selectedGame.home_team.abbrev} offense &nbsp;|&nbsp;
                      <span style={{ color: awayCC }}>■</span> {selectedGame.away_team.abbrev} offense
                    </span>
                    <span style={{ color: C.dim }}>Hover for play details</span>
                  </div>
                </ChartBlock>
              </>
            )}

            {/* Waiting state */}
            {plays.length < 2 && !detailLoading && (
              <div style={{
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '2rem', textAlign: 'center',
                color: C.muted, fontSize: '0.82rem', marginBottom: '1rem',
              }}>
                {selectedGame.status.is_pregame
                  ? '> GAME HAS NOT STARTED — charts will appear once plays begin'
                  : plays.length === 0 ? '> Loading play-by-play data…' : '> Waiting for more plays to build charts'}
              </div>
            )}

            {/* Play-by-play accordion */}
            {plays.length > 0 && (
              <div style={{
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '1rem 1.25rem',
              }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
                  color: C.muted, textTransform: 'uppercase', marginBottom: '0.75rem',
                }}>
                  Play-by-Play — {plays.length} plays
                </div>
                <QuarterAccordion
                  plays={plays}
                  homeAbbrev={selectedGame.home_team.abbrev}
                  awayAbbrev={selectedGame.away_team.abbrev}
                  homeTeamId={selectedGame.home_team.team_id}
                  awayTeamId={selectedGame.away_team.team_id}
                  homeCC={homeCC}
                  awayCC={awayCC}
                />
              </div>
            )}
          </div>
        )}

        {!selectedId && !boardLoading && games.length > 0 && (
          <div style={{
            color: C.muted, fontSize: '0.8rem', textAlign: 'center',
            padding: '2.5rem', border: `1px dashed ${C.border}`, borderRadius: 10,
          }}>
            {'> Select a game above to view EP and Win Probability charts'}
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreBlock({ label, abbrev, score, teamId, side = 'left' }) {
  const identity = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {side === 'left' && <TeamLogo teamId={teamId} size={52} />}
      <div style={{ textAlign: side === 'left' ? 'left' : 'right' }}>
        <div style={{ fontSize: '0.58rem', color: C.muted, letterSpacing: '0.12em', marginBottom: 3, fontFamily: C.font }}>{label}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.06em', color: C.text, fontFamily: C.fontCond, textTransform: 'uppercase' }}>{abbrev}</div>
      </div>
      {side === 'right' && <TeamLogo teamId={teamId} size={52} />}
    </div>
  )
  const scoreEl = (
    <div style={{ fontSize: '3rem', fontWeight: 900, color: C.text, lineHeight: 1, fontFamily: C.fontStats, letterSpacing: '-0.03em', minWidth: 56, textAlign: 'center' }}>{score}</div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      {side === 'left' ? <>{identity}{scoreEl}</> : <>{scoreEl}{identity}</>}
    </div>
  )
}
