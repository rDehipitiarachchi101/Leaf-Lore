// ─────────────────────────────────────────────────────────────────────────────
//  YOUR PIECE: the phyllotactic spiral.
//
//  Given a leaf's index i (0 = first session for this book) and a spacing
//  constant k, return where that leaf sits relative to the cluster's center.
//  From the spec: leaf i sits at angle i × 137.5°, radius k × √i.
//
//  Things to think through:
//    - Math.cos / Math.sin take radians, not degrees.
//    - In SVG, +y points DOWN the screen.
//    - What should leaf 0 do?
//
//  The placeholder below just lines leaves up in a row so the slice runs.
//  Replace it, then ask Claude to review. Leaves already rotate to point away
//  from the center, so once this is a spiral they'll fan out on their own.
// ─────────────────────────────────────────────────────────────────────────────

export type Point = { x: number; y: number }

export function leafPosition(i: number, k: number): Point {
  return { x: i * k * 2.5, y: 0 }
}
