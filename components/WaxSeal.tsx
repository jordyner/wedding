/**
 * A pressed wax seal drawn in SVG: an irregular poured edge, body lit from the
 * top-left, a stamped well, embossed initials, a gloss highlight and an idle glint.
 * Shared gradients live in <WaxSealDefs/>, rendered once per page.
 */

// Deterministic "poured wax" outline around (50, 50).
const blob = (() => {
  const n = 30;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = 44 + 2.1 * Math.sin(3 * t + 1) + 1.3 * Math.sin(7 * t + 0.5) + 0.8 * Math.sin(11 * t + 2);
    return [50 + r * Math.cos(t), 50 + r * Math.sin(t)] as const;
  });
  const mid = (a: readonly number[], b: readonly number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (v: number) => v.toFixed(2);
  let d = `M${mid(pts[n - 1], pts[0]).map(f).join(" ")}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % n]);
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  });
  return `${d}Z`;
})();

export function WaxSealDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="wax-body" cx="34%" cy="28%" r="78%">
          <stop offset="0" stopColor="#b8615b" />
          <stop offset="0.38" stopColor="#8f3433" />
          <stop offset="0.78" stopColor="#702427" />
          <stop offset="1" stopColor="#4f171a" />
        </radialGradient>
        <radialGradient id="wax-well" cx="64%" cy="70%" r="72%">
          <stop offset="0" stopColor="#8e3936" />
          <stop offset="0.6" stopColor="#7a2a2b" />
          <stop offset="1" stopColor="#611f22" />
        </radialGradient>
        <linearGradient id="wax-rim" x1="0.15" y1="0.1" x2="0.85" y2="0.9">
          <stop offset="0" stopColor="rgb(255 214 206 / 0.8)" />
          <stop offset="0.5" stopColor="rgb(255 214 206 / 0.08)" />
          <stop offset="1" stopColor="rgb(60 8 12 / 0.45)" />
        </linearGradient>
        <linearGradient id="wax-well-edge" x1="0.15" y1="0.1" x2="0.85" y2="0.9">
          <stop offset="0" stopColor="rgb(70 10 14 / 0.8)" />
          <stop offset="1" stopColor="rgb(255 200 192 / 0.65)" />
        </linearGradient>
        <linearGradient id="wax-glint" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgb(255 255 255 / 0)" />
          <stop offset="0.5" stopColor="rgb(255 250 246 / 0.55)" />
          <stop offset="1" stopColor="rgb(255 255 255 / 0)" />
        </linearGradient>
        <filter id="wax-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="wax-gloss" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <clipPath id="wax-clip">
          <path d={blob} />
        </clipPath>
      </defs>
    </svg>
  );
}

export function WaxSeal({ monogram }: { monogram: string }) {
  const long = monogram.length > 3;
  return (
    <svg className="wax-seal" viewBox="-8 -8 116 120" aria-hidden="true" focusable="false">
      {/* cast shadow and the wax's thickness */}
      <path d={blob} transform="translate(1.5 4.2)" fill="rgb(60 16 18 / 0.42)" filter="url(#wax-soft)" />
      <path d={blob} transform="translate(0 2)" fill="#3f1214" />
      <path d={blob} fill="url(#wax-body)" />
      {/* uneven poured surface */}
      <path d={blob} fill="url(#env-grain)" opacity="0.35" />
      <path d={blob} fill="none" stroke="url(#wax-rim)" strokeWidth="1.2" />

      {/* stamped well */}
      <circle cx="50" cy="50" r="31" fill="url(#wax-well)" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="url(#wax-well-edge)" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="26.5" fill="none" stroke="rgb(255 205 198 / 0.4)" strokeWidth="0.6" />
      <circle cx="50.4" cy="50.6" r="26.5" fill="none" stroke="rgb(60 8 12 / 0.4)" strokeWidth="0.6" />

      {/* embossed initials: highlight, shadow, face */}
      <g className="wax-mono" fontSize={long ? 15 : 30} textAnchor="middle" dominantBaseline="central">
        <text x="49.4" y="50.8" fill="rgb(255 205 198 / 0.7)">
          {monogram}
        </text>
        <text x="50.8" y="52.4" fill="rgb(56 6 10 / 0.6)">
          {monogram}
        </text>
        <text x="50" y="51.6" fill="#86322f">
          {monogram}
        </text>
      </g>

      {/* gloss and a slow glint across the wax */}
      <ellipse cx="34" cy="28" rx="13" ry="6" transform="rotate(-32 34 28)" fill="rgb(255 240 236 / 0.26)" filter="url(#wax-gloss)" />
      {/* sharp specular glints on the raised rim */}
      <ellipse cx="27" cy="36" rx="3.2" ry="1.2" transform="rotate(-55 27 36)" fill="rgb(255 245 242 / 0.42)" />
      <ellipse cx="44" cy="15" rx="3.6" ry="1" transform="rotate(-12 44 15)" fill="rgb(255 245 242 / 0.36)" />
      <g clipPath="url(#wax-clip)">
        <rect className="wax-glint" x="-40" y="-10" width="34" height="130" fill="url(#wax-glint)" transform="rotate(18 50 50)" />
      </g>
    </svg>
  );
}
