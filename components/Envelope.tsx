"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { event } from "@/content/event";
import { InvitationCard } from "./InvitationCard";
import { WaxSeal } from "./WaxSeal";

const crackLeft = "polygon(0 0, 53% 0, 45% 24%, 55% 47%, 46% 71%, 52% 100%, 0 100%)";
const crackRight = "polygon(53% 0, 100% 0, 100% 100%, 52% 100%, 46% 71%, 55% 47%, 45% 24%)";
/** How far (px) an upward drag has to travel before the envelope opens itself. */
const PULL_TO_OPEN = 56;

// Envelope geometry in a 100 × 66 box (the envelope's own 3:2 aspect ratio, so nothing
// is stretched). Like a real envelope, the bottom pocket is shallow and the top flap
// comes down past it, so the folds never meet in one point; the seal sits on the
// flap's tip.
const SIDE_L = "M0 0 L50 36 L0 66 Z";
const SIDE_R = "M100 0 L50 36 L100 66 Z";
const BOTTOM = "M0 66 L0 64.5 C18 54 36 43 46.5 38.6 Q50 37.3 53.5 38.6 C64 43 82 54 100 64.5 L100 66 Z";
const BOTTOM_EDGE = "M0 64.5 C18 54 36 43 46.5 38.6 Q50 37.3 53.5 38.6 C64 43 82 54 100 64.5";
// Top flap in a 100 × 42 box (64 % of the envelope's height).
const FLAP = "M0 0 H100 C82 14 64 29 53.4 39.6 Q50 42 46.6 39.6 C36 29 18 14 0 0 Z";
const FLAP_EDGE = "M0 0 C18 14 36 29 46.6 39.6 Q50 42 53.4 39.6 C64 29 82 14 100 0";
// Inside of the flap, drawn upside down: the back face is mirrored once by its own
// rotateX(180deg) and again by the opening, so it ends up base-down, point-up.
const FLAP_INSIDE = "M0 42 H100 C82 28 64 13 53.4 2.4 Q50 0 46.6 2.4 C36 13 18 28 0 42 Z";
const LINER = "M5 42 H95 C79 29 62 15 52.6 6.2 Q50 4.4 47.4 6.2 C38 15 21 29 5 42 Z";

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .2 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/** Shared gradients and patterns for every envelope part. Render once. */
export function EnvelopeDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="env-side-l" x1="0" y1="0.2" x2="1" y2="0.55">
          <stop offset="0" stopColor="#e5d6bd" />
          <stop offset="0.7" stopColor="#eee3d0" />
          <stop offset="1" stopColor="#f2e8d6" />
        </linearGradient>
        <linearGradient id="env-side-r" x1="1" y1="0.2" x2="0" y2="0.55">
          <stop offset="0" stopColor="#dfcfb3" />
          <stop offset="0.7" stopColor="#eadfca" />
          <stop offset="1" stopColor="#eee3d0" />
        </linearGradient>
        <radialGradient id="env-light" cx="0.22" cy="0.12" r="1.1">
          <stop offset="0" stopColor="rgb(255 252 244 / 0.28)" />
          <stop offset="0.55" stopColor="rgb(255 252 244 / 0)" />
          <stop offset="1" stopColor="rgb(66 50 30 / 0.07)" />
        </radialGradient>
        <linearGradient id="env-fold-shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(76 58 36 / 0.16)" />
          <stop offset="1" stopColor="rgb(76 58 36 / 0)" />
        </linearGradient>
        <linearGradient id="env-bottom" x1="0.3" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#f8f2e6" />
          <stop offset="0.6" stopColor="#f4ecdd" />
          <stop offset="1" stopColor="#ede2cf" />
        </linearGradient>
        <linearGradient id="env-flap" x1="0.35" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#f6efe2" />
          <stop offset="0.65" stopColor="#f0e6d4" />
          <stop offset="1" stopColor="#e7dac3" />
        </linearGradient>
        <pattern id="env-liner" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="var(--liner)" />
          <rect width="1.6" height="4" fill="var(--liner-stripe)" />
        </pattern>
        <pattern id="env-grain" width="36" height="25.2" patternUnits="userSpaceOnUse">
          <image href={GRAIN} width="36" height="25.2" preserveAspectRatio="none" />
        </pattern>
        {/* gold foil for the card's ornament (see .inv-foil in globals.css) */}
        <linearGradient id="foil-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="144" y2="0">
          <stop offset="0" stopColor="#b38f57" />
          <stop offset="0.5" stopColor="#e0c690" />
          <stop offset="1" stopColor="#b38f57" />
        </linearGradient>
        <filter id="env-soft" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
    </svg>
  );
}

export function EnvelopeBack() {
  return <span className="env-back" aria-hidden="true" />;
}

export function EnvelopePocket() {
  return (
    <span className="env-pocket" aria-hidden="true">
      <svg viewBox="0 0 100 66">
        <path d={SIDE_L} fill="url(#env-side-l)" />
        <path d={SIDE_R} fill="url(#env-side-r)" />
        {/* the bottom flap is glued over the side flaps and casts a soft shadow on them */}
        <path d={BOTTOM} transform="translate(0 -1.1)" fill="rgb(76 58 36 / 0.22)" filter="url(#env-soft)" />
        <path d={BOTTOM} fill="url(#env-bottom)" />
        {[SIDE_L, SIDE_R, BOTTOM].map((d) => (
          <g key={d}>
            <path d={d} fill="url(#env-grain)" opacity="0.5" />
            <path d={d} fill="url(#env-light)" />
          </g>
        ))}
        <path d={BOTTOM_EDGE} fill="none" stroke="rgb(255 251 242 / 0.4)" strokeWidth="0.25" />
        {/* paper edge along the envelope's bottom */}
        <path d="M0 65.7 H100" stroke="rgb(255 251 242 / 0.4)" strokeWidth="0.4" />
      </svg>
    </span>
  );
}

export function EnvelopeFlap({ open = false, seal }: { open?: boolean; seal?: React.ReactNode }) {
  return (
    <span className={`env-flap${open ? " is-open" : ""}`} aria-hidden="true">
      <span className="env-flap-face env-flap-front">
        <svg viewBox="0 0 100 42">
          {/* shadow the closed flap casts on the envelope below it */}
          <path d={FLAP} transform="translate(0 1.2)" fill="rgb(76 58 36 / 0.2)" filter="url(#env-soft)" />
          <path d={FLAP} fill="url(#env-flap)" />
          <path d={FLAP} fill="url(#env-grain)" opacity="0.5" />
          <path d={FLAP} fill="url(#env-light)" />
          {/* the fold along the hinge catches a little shadow */}
          <rect x="0" y="0" width="100" height="3" fill="url(#env-fold-shadow)" />
          <path d={FLAP_EDGE} fill="none" stroke="rgb(255 251 242 / 0.35)" strokeWidth="0.25" />
        </svg>
        <span className="env-flap-shade" />
        {seal}
      </span>
      <span className="env-flap-face env-flap-back">
        <svg viewBox="0 0 100 42">
          <path d={FLAP_INSIDE} fill="url(#env-flap)" />
          <path d={LINER} fill="url(#env-liner)" />
        </svg>
        <span className="env-flap-shade" />
      </span>
    </span>
  );
}

type Props = {
  disabled: boolean;
  onOpen: () => void;
  envelopeRef: RefObject<HTMLButtonElement | null>;
  miniRef: RefObject<HTMLSpanElement | null>;
};

/** The closed envelope: tap, click, Enter/Space, or pull the card up to open. */
export function Envelope({ disabled, onOpen, envelopeRef, miniRef }: Props) {
  const [pressed, setPressed] = useState(false);
  const drag = useRef<{ y: number; id: number } | null>(null);
  const [a, b] = event.couple.initials;
  const monogram = `${a}${b}`;

  // The card inside is the real invitation, scaled down so the hand-off to the
  // full-size card is seamless. Its scale depends on the viewport.
  useEffect(() => {
    const button = envelopeRef.current;
    const mini = miniRef.current;
    if (!button || !mini) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // Same width the open card gets: the page minus its side gutters, at most --card-w.
      const page = button.closest(".page");
      const gutter = page ? parseFloat(getComputedStyle(page).paddingLeft) : rem;
      const maxWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-w")) * rem || 34 * rem;
      const cardWidth = Math.min(document.documentElement.clientWidth - 2 * gutter, maxWidth);
      mini.style.width = `${cardWidth}px`;
      mini.style.setProperty("--mini-scale", String((button.offsetWidth * 0.86) / cardWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(button);
    return () => ro.disconnect();
  }, [envelopeRef, miniRef]);

  function setPull(n: number) {
    envelopeRef.current?.style.setProperty("--pull-n", n.toFixed(3));
  }

  function release(keepPull = false) {
    drag.current = null;
    setPressed(false);
    if (!keepPull) setPull(0);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || e.button !== 0) return;
    drag.current = { y: e.clientY, id: e.pointerId };
    setPressed(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = Math.min(0, e.clientY - d.y);
    setPull(Math.min(1, -dy / PULL_TO_OPEN));
    if (-dy >= PULL_TO_OPEN) {
      release(true);
      onOpen();
    }
  }

  const seal = (clip: string, side: string) => (
    <span className={`seal-half seal-${side}`} style={{ clipPath: clip }}>
      <WaxSeal monogram={monogram} />
    </span>
  );

  return (
    <div className="envelope-float">
      <div className="envelope-tilt">
        <button
          ref={envelopeRef}
          type="button"
          className="envelope"
          onClick={onOpen}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => release()}
          onPointerCancel={() => release()}
          onPointerLeave={() => drag.current && release()}
          data-pressed={pressed ? "" : undefined}
          aria-disabled={disabled}
          aria-label="Otevřít obálku s pozvánkou"
          data-testid="envelope"
        >
          <EnvelopeBack />

          {/* the card can only be seen above the envelope's bottom edge, like in a real pocket */}
          <span className="env-card-window" aria-hidden="true">
            <span className="env-card">
              <span className="mini-invitation paper invitation" ref={miniRef}>
                <InvitationCard decorative />
              </span>
            </span>
          </span>

          <EnvelopePocket />

          <EnvelopeFlap
            seal={
              <span className="env-seal">
                {seal(crackLeft, "left")}
                {seal(crackRight, "right")}
              </span>
            }
          />
        </button>
      </div>
    </div>
  );
}
