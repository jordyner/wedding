"use client";

import { event } from "@/content/event";
import { useTilt } from "./useTilt";

type Props = {
  disabled: boolean;
  onOpen: () => void;
};

const crackLeft = "polygon(0 0, 53% 0, 45% 24%, 55% 47%, 46% 71%, 52% 100%, 0 100%)";
const crackRight = "polygon(53% 0, 100% 0, 100% 100%, 52% 100%, 46% 71%, 55% 47%, 45% 24%)";

/** The closed envelope. Pure markup; the opening choreography is driven by classes on the stage. */
export function Envelope({ disabled, onOpen }: Props) {
  const tiltRef = useTilt<HTMLDivElement>(7, !disabled);
  const [a, b] = event.couple.initials;
  const monogram = `${a}${b}`;
  const seal = (clip: string, side: string) => (
    <span className={`seal-half seal-${side}`} style={{ clipPath: clip }}>
      <span className="seal-mono">{monogram}</span>
    </span>
  );

  return (
    <div className="envelope-float">
      <div className="envelope-tilt" ref={tiltRef}>
        <button
          type="button"
          className="envelope"
          onClick={onOpen}
          aria-disabled={disabled}
          aria-label="Otevřít obálku s pozvánkou"
          data-testid="envelope"
        >
          <span className="env-back" aria-hidden="true" />

          <span className="env-card paper" aria-hidden="true">
            <span className="mini-opening">{event.copy.cardOpening}</span>
            <span className="mini-names">
              <span>{event.couple.first}</span>
              <span className="amp">&amp;</span>
              <span>{event.couple.second}</span>
            </span>
          </span>

          <svg className="env-pocket" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 L50 39 L0 70 Z" fill="var(--envelope-side)" />
            <path d="M100 0 L50 39 L100 70 Z" fill="var(--envelope-side)" />
            <path d="M0 70 L50 33 L100 70 Z" fill="var(--envelope-bottom)" />
            <path
              d="M0 70 L50 33 L100 70"
              fill="none"
              stroke="rgb(120 80 72 / 0.14)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <span className="env-flap" aria-hidden="true">
            <span className="env-flap-face env-flap-front">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* soft cast shadow under the flap edge, painted once instead of a per-frame filter */}
                <path
                  d="M0 1.5 L48 98.5 Q50 102.5 52 98.5 L100 1.5"
                  fill="none"
                  stroke="rgb(80 50 44 / 0.10)"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <path d="M0 0 L100 0 L52 96 Q50 100 48 96 Z" fill="var(--envelope-flap)" />
                <path
                  d="M0 0 L48 96 Q50 100 52 96 L100 0"
                  fill="none"
                  stroke="rgb(120 80 72 / 0.12)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className={`env-seal${monogram.length > 3 ? " is-long" : ""}`}>
                {seal(crackLeft, "left")}
                {seal(crackRight, "right")}
              </span>
            </span>
            <span className="env-flap-face env-flap-back">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern
                    id="liner-stripes"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="4" height="4" fill="var(--liner)" />
                    <rect width="1.6" height="4" fill="var(--liner-stripe)" />
                  </pattern>
                </defs>
                <path d="M0 0 L100 0 L52 96 Q50 100 48 96 Z" fill="var(--envelope-flap)" />
                <path d="M5 0 L95 0 L51 88 Q50 90 49 88 Z" fill="url(#liner-stripes)" />
              </svg>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
