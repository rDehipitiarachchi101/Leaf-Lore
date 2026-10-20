import type { Session } from './api'

type LeafProps = {
  session: Session
  x: number
  y: number
  isToday: boolean
}

// A leaf pointing along +x from its stem at (0,0).
const LEAF_PATH = 'M0,0 C8,-10 26,-10 34,0 C26,10 8,10 0,0 Z'

/**
 * Size and brightness are derived from pages read ÷ the goal snapshot stored with the session,
 * so a leaf keeps its look even if the goal changes later.
 */
export function Leaf({ session, x, y, isToday }: LeafProps) {
  const ratio = Math.min(session.pagesRead / session.goalPages, 1)
  const met = session.pagesRead >= session.goalPages
  const scale = 0.55 + 0.45 * ratio
  const opacity = met ? 1 : 0.4 + 0.45 * ratio
  // Point the leaf away from the cluster's center
  const angle = x === 0 && y === 0 ? -90 : (Math.atan2(y, x) * 180) / Math.PI

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
      opacity={opacity}
      className={isToday ? 'leaf leaf--today' : 'leaf'}
    >
      <title>{`${session.localDate}: ${session.pagesRead} of ${session.goalPages} pages`}</title>
      <path d={LEAF_PATH} />
      <path d="M2,0 L30,0" className="leaf__rib" />
    </g>
  )
}
