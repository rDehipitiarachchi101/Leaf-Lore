import type { Session } from './api'
import { Leaf } from './Leaf'
import { leafPosition } from './leafPosition'

const SPACING = 14 // k in the spiral formula
const PAD = 44 // room for a full-size leaf around the outermost stems

/** One book's cluster: one leaf per session, placed by leafPosition(i). */
export function Cluster({ sessions, today }: { sessions: Session[]; today: string }) {
  const placed = sessions.map((s, i) => ({ s, ...leafPosition(i, SPACING) }))

  // Fit the view to wherever the leaves ended up, so any placement rule stays visible
  const xs = placed.map((p) => p.x).concat(0)
  const ys = placed.map((p) => p.y).concat(0)
  const minX = Math.min(...xs) - PAD
  const minY = Math.min(...ys) - PAD
  const width = Math.max(...xs) - minX + PAD
  const height = Math.max(...ys) - minY + PAD

  return (
    <svg
      className="cluster"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="img"
      aria-label={`${sessions.length} reading session${sessions.length === 1 ? '' : 's'} on this book`}
    >
      <circle r={3} className="cluster__center" />
      {placed.map(({ s, x, y }) => (
        <Leaf key={s.id} session={s} x={x} y={y} isToday={s.localDate === today} />
      ))}
    </svg>
  )
}
