/**
 * Morning light through a window: a few blurred leaf shadows drifting slowly across
 * the table. Purely decorative; static under reduced motion.
 */
const leaves: [number, number, number, number][] = [
  // cx, cy, length, angle
  [70, 40, 46, -30],
  [118, 70, 52, 20],
  [150, 120, 48, -40],
  [200, 150, 56, 15],
  [230, 205, 44, -25],
  [285, 230, 58, 30],
  [310, 290, 46, -15],
  [365, 310, 52, 40],
  [120, 150, 40, 70],
  [250, 120, 38, -60],
];

export function TableLight() {
  return (
    <div className="table-light" aria-hidden="true">
      <svg viewBox="0 0 420 380">
        <path d="M20 10 C 140 90, 220 170, 400 340" fill="none" stroke="currentColor" strokeWidth="4" />
        {leaves.map(([cx, cy, len, angle], i) => (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={len / 2}
            ry={len / 5.2}
            transform={`rotate(${angle} ${cx} ${cy})`}
            fill="currentColor"
          />
        ))}
      </svg>
    </div>
  );
}
