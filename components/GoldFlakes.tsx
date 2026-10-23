"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A one-off shower of gold leaf as the invitation opens: a few dozen flakes drift
 * down over the card, turning so they catch the light, then the layer removes
 * itself. Transform and opacity only, so it stays smooth on phones.
 */
const COUNT = 28;
const LIFETIME_MS = 6500;
const MOUNT_DELAY_MS = 900;

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
    // Created a little later, not in the busy frame where the card takes over from the
    // envelope; the CSS delay is shorter by the same amount, so they still fall on cue.
    const show = window.setTimeout(() => setFlakes(makeFlakes()), MOUNT_DELAY_MS);
    const hide = window.setTimeout(() => setFlakes(null), MOUNT_DELAY_MS + LIFETIME_MS + 1500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
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

const BURST_COUNT = 12;
const BURST_MS = 2100;

/** A pinch of gold leaf where the guest taps the card: pops out, then drifts down. */
export function GoldBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const [flakes] = useState(() =>
    Array.from({ length: BURST_COUNT }, () => {
      const size = 4 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      const reach = 18 + Math.random() * 34;
      return {
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        style: {
          width: size,
          height: size * (0.7 + Math.random() * 0.5),
          ["--pop-x" as string]: `${Math.cos(angle) * reach}px`,
          ["--pop-y" as string]: `${Math.min(0, Math.sin(angle)) * reach * 0.8 - 16}px`,
          ["--sink" as string]: `${80 + Math.random() * 70}px`,
          ["--fall" as string]: `${1500 + Math.random() * 400}ms`,
          ["--spin" as string]: `${500 + Math.random() * 600}ms`,
          ["--tilt" as string]: `${Math.random() * 360}deg`,
        } as CSSProperties,
      };
    }),
  );

  // the parent passes a fresh callback on every render; only the first timer counts
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), BURST_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="gold-burst" style={{ left: x, top: y }} aria-hidden="true">
      {flakes.map((f, i) => (
        <span key={i} className="gold-burst-flake" style={f.style}>
          {/* sideways drift and the rise-and-fall run on separate layers, each with its
              own easing, so every flake follows one smooth arc */}
          <span className="gold-burst-arc">
            <span className="gold-flake-leaf" style={{ clipPath: f.shape }} />
          </span>
        </span>
      ))}
    </div>
  );
}
