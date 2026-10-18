/**
 * A stationery frame around the screen: a fine double rule and, in each corner, a
 * small garland: garden roses and a bud, with leafy stems and little blossoms running
 * along the edges. Long while the envelope is closed; as it opens the stems draw back
 * towards the corners, clear of the card. Purely decorative, behind the cards.
 */
type Pt = [number, number];
type Curve = [Pt, Pt, Pt, Pt];

/** How much of each stem stays once the card is open. */
const SHORT = 0.42;

// Stems run along the edges in a 480 × 480 box, corner at the origin.
const along = (start: number, len: number, wave: number): Curve => [
  [start, 8],
  [start + (len - start) * 0.33, 8 - wave],
  [start + (len - start) * 0.66, 8 + wave],
  [len, 7],
];
const mirror = (c: Curve): Curve => c.map(([x, y]) => [y, x]) as Curve;

const at = ([a, b, c, d]: Curve, t: number): Pt => {
  const u = 1 - t;
  const f = (i: 0 | 1) => u ** 3 * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t ** 3 * d[i];
  return [f(0), f(1)];
};
const angleAt = (c: Curve, t: number) => {
  const [x0, y0] = at(c, Math.max(0, t - 0.01));
  const [x1, y1] = at(c, Math.min(1, t + 0.01));
  return (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
};

// Deterministic jitter, so server and client draw the same garland.
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const f = (n: number) => n.toFixed(1);

/** A leaf on a short stalk, gently bent, with a midrib and a few veins. Base at the origin. */
function Leaf({ len, bend, tone }: { len: number; bend: number; tone: 0 | 1 }) {
  const p = len * 0.16; // stalk
  const l = len - p;
  const w = l * 0.3;
  const tip: Pt = [p + l, bend];
  const d =
    `M${f(p)} 0 C${f(p + l * 0.22)} ${f(-w * 1.15)} ${f(p + l * 0.68)} ${f(-w * 0.95 + bend * 0.5)} ${f(tip[0])} ${f(tip[1])}` +
    ` C${f(p + l * 0.7)} ${f(w * 0.75 + bend * 0.5)} ${f(p + l * 0.26)} ${f(w * 0.95)} ${f(p)} 0Z`;
  return (
    <>
      <path d={`M0 0 L${f(p)} 0`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d={d} fill={tone ? "var(--leaf-dark)" : "var(--leaf-light)"} stroke="currentColor" strokeWidth="0.9" />
      <path
        d={`M${f(p)} 0 Q${f(p + l * 0.5)} ${f(bend * 0.25)} ${f(p + l * 0.94)} ${f(bend * 0.92)}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      />
      {[0.3, 0.52, 0.72].map((v) => (
        <path
          key={v}
          d={`M${f(p + l * v)} ${f(bend * v * 0.4)} l${f(l * 0.12)} ${f(-w * 0.55)} M${f(p + l * v)} ${f(bend * v * 0.4)} l${f(l * 0.12)} ${f(w * 0.55)}`}
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.7"
        />
      ))}
    </>
  );
}

/** A small five-petal blossom. */
function Blossom({ r }: { r: number }) {
  return (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={r * 0.55}
          cy="0"
          rx={r * 0.55}
          ry={r * 0.36}
          transform={`rotate(${a})`}
          fill="var(--petal)"
          stroke="var(--petal-line)"
          strokeWidth="0.7"
        />
      ))}
      <circle r={r * 0.22} fill="var(--pollen)" />
    </>
  );
}

/** A garden rose seen from above: two rings of petals around a curled heart. */
function Rose({ r }: { r: number }) {
  const ring = (n: number, dist: number, rx: number, ry: number, rot: number, fill: string) =>
    Array.from({ length: n }, (_, i) => (
      <ellipse
        key={`${dist}-${i}`}
        cx={dist}
        cy="0"
        rx={rx}
        ry={ry}
        transform={`rotate(${rot + (360 / n) * i})`}
        fill={fill}
        stroke="var(--petal-line)"
        strokeWidth="0.8"
      />
    ));
  return (
    <>
      {ring(6, r * 0.5, r * 0.52, r * 0.44, 10, "var(--petal)")}
      {ring(5, r * 0.28, r * 0.38, r * 0.32, 40, "var(--petal-mid)")}
      <circle r={r * 0.3} fill="var(--petal-deep)" stroke="var(--petal-line)" strokeWidth="0.8" />
      <path
        d={`M${f(-r * 0.14)} ${f(r * 0.04)} a${f(r * 0.13)} ${f(r * 0.13)} 0 1 1 ${f(r * 0.2)} ${f(r * 0.1)} M${f(-r * 0.24)} ${f(-r * 0.06)} a${f(r * 0.24)} ${f(r * 0.24)} 0 0 1 ${f(r * 0.42)} ${f(-r * 0.08)}`}
        fill="none"
        stroke="var(--petal-line)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </>
  );
}

/** A closed rosebud with its green sepals, pointing along +x. */
function Bud({ len }: { len: number }) {
  return (
    <>
      <path d={`M0 0 L${f(len * 0.35)} 0`} stroke="currentColor" strokeWidth="1.1" />
      <path
        d={`M${f(len * 0.35)} 0 C${f(len * 0.5)} ${f(-len * 0.32)} ${f(len * 0.92)} ${f(-len * 0.2)} ${f(len)} 0 C${f(len * 0.92)} ${f(len * 0.2)} ${f(len * 0.5)} ${f(len * 0.32)} ${f(len * 0.35)} 0Z`}
        fill="var(--petal-mid)"
        stroke="var(--petal-line)"
        strokeWidth="0.8"
      />
      <path
        d={`M${f(len * 0.35)} 0 Q${f(len * 0.55)} ${f(-len * 0.26)} ${f(len * 0.68)} ${f(-len * 0.08)} M${f(len * 0.35)} 0 Q${f(len * 0.55)} ${f(len * 0.26)} ${f(len * 0.68)} ${f(len * 0.08)}`}
        fill="var(--leaf-dark)"
        stroke="currentColor"
        strokeWidth="0.7"
      />
    </>
  );
}

type Item = { t: number; x: number; y: number; angle: number; kind: "leaf" | "blossom" | "bud"; size: number; bend: number; tone: 0 | 1 };

function garland(c: Curve, seed: number) {
  const items: Item[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const t = 0.04 + (i / count) * 0.9 + rnd(seed + i) * 0.02;
    const [x, y] = at(c, t);
    const side = i % 2 ? 1 : -1;
    const spread = 28 + rnd(seed + i * 3) * 26;
    items.push({
      t,
      x,
      y,
      angle: angleAt(c, t) + side * spread,
      kind: "leaf",
      size: (40 + rnd(seed + i * 7) * 20) * (1 - t * 0.35),
      bend: side * (2 + rnd(seed + i * 11) * 5),
      tone: rnd(seed + i * 13) > 0.5 ? 1 : 0,
    });
  }
  for (const t of [0.3, 0.58, 0.8]) {
    const [x, y] = at(c, t);
    items.push({ t, x, y, angle: 0, kind: "blossom", size: 11 + rnd(seed + t * 100) * 4, bend: 0, tone: 0 });
  }
  const [tx, ty] = c[3];
  items.push({ t: 1, x: tx, y: ty, angle: angleAt(c, 1), kind: "bud", size: 30, bend: 0, tone: 0 });
  return { c, items };
}

const stems = [garland(along(80, 460, 10), 1), garland(mirror(along(80, 460, 10)), 2)];
// Short leafy sprays tucked behind the roses, pointing out of the corner.
const corner = [
  { x: 66, y: 66, angle: 45, size: 58, bend: 5 },
  { x: 92, y: 52, angle: 22, size: 48, bend: -4 },
  { x: 52, y: 92, angle: 68, size: 48, bend: 4 },
];

// Parts past the short length fold away when the envelope opens, tip first.
const tailDelay = (t: number) => Math.round(((1 - t) / (1 - SHORT)) * 650);

function Garland() {
  return (
    <svg className="frame-sprig" viewBox="0 0 480 480" style={{ ["--short" as string]: 1 - SHORT }}>
      {corner.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}>
          <Leaf len={l.size} bend={l.bend} tone={i % 2 ? 1 : 0} />
        </g>
      ))}
      {stems.map(({ c: [a, b, c, d], items }, i) => (
        <g key={i}>
          {/* a stem that thins towards its tip */}
          <path className="frame-stem" d={`M${a} C${b} ${c} ${d}`} pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d={`M${a} C${b} ${c} ${d}`} pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.3 1" />
          {items.map((it, j) => {
            const tail = it.t > SHORT;
            return (
              <g key={j} transform={`translate(${f(it.x)} ${f(it.y)}) rotate(${f(it.angle)})`}>
                <g
                  className={`frame-leaf${tail ? " is-tail" : ""}`}
                  style={tail ? { ["--d" as string]: `${tailDelay(it.t)}ms` } : undefined}
                >
                  {it.kind === "leaf" ? <Leaf len={it.size} bend={it.bend} tone={it.tone} /> : null}
                  {it.kind === "blossom" ? <Blossom r={it.size} /> : null}
                  {it.kind === "bud" ? <Bud len={it.size} /> : null}
                </g>
              </g>
            );
          })}
        </g>
      ))}
      {/* the corner cluster: a full rose, a smaller one and a bud */}
      <g transform="translate(100 24) rotate(-8)">
        <Bud len={32} />
      </g>
      <g transform="translate(28 108) rotate(82)">
        <Bud len={28} />
      </g>
      <g transform="translate(78 82)">
        <Rose r={24} />
      </g>
      <g transform="translate(38 38)">
        <Rose r={40} />
      </g>
    </svg>
  );
}

export function ScreenFrame() {
  return (
    <div className="screen-frame" aria-hidden="true">
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <span key={c} className={`frame-corner frame-${c}`}>
          <Garland />
        </span>
      ))}
    </div>
  );
}
