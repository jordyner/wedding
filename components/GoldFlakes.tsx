"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * A one-off shower of gold leaf as the invitation opens: a few dozen flakes drift
 * down over the card, turning so they catch the light, then the layer removes
 * itself. Transform and opacity only, so it stays smooth on phones.
 */
const COUNT = 28;
const LIFETIME_MS = 6500;

// Irregular torn-foil outlines, picked at random per flake.
const SHAPES = [
  "polygon(10% 0, 90% 12%, 100% 70%, 60% 100%, 0 80%)",
  "polygon(0 20%, 70% 0, 100% 45%, 80% 100%, 15% 90%)",
  "polygon(30% 0, 100% 30%, 85% 85%, 20% 100%, 0 40%)",
  "polygon(0 0, 100% 25%, 70% 100%, 10% 70%)",
];

type Flake = { style: CSSProperties; shape: string };

function makeFlakes(): Flake[] {
  return Array.from({ length: COUNT }, () => {
    const size = 5 + Math.random() * 9;
    return {
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      style: {
        left: `${Math.random() * 100}%`,
        width: size,
        height: size * (0.7 + Math.random() * 0.5),
        ["--drift" as string]: `${(Math.random() - 0.5) * 120}px`,
        ["--fall" as string]: `${2800 + Math.random() * 2200}ms`,
        ["--delay" as string]: `${Math.random() * 1400}ms`,
        ["--spin" as string]: `${700 + Math.random() * 900}ms`,
        ["--tilt" as string]: `${Math.random() * 360}deg`,
      },
    };
  });
}

export function GoldFlakes() {
  const [flakes, setFlakes] = useState<Flake[] | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setFlakes(makeFlakes());
    const t = window.setTimeout(() => setFlakes(null), LIFETIME_MS + 1500);
    return () => clearTimeout(t);
  }, []);

  if (!flakes) return null;
  return (
    <div className="gold-flakes" aria-hidden="true">
      {flakes.map((f, i) => (
        <span key={i} className="gold-flake" style={f.style}>
          <span className="gold-flake-leaf" style={{ clipPath: f.shape }} />
        </span>
      ))}
    </div>
  );
}
