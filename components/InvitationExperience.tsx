"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { event } from "@/content/event";
import { Envelope } from "./Envelope";
import { RsvpForm } from "./RsvpForm";

type Phase = "closed" | "opening" | "settling" | "open";

// Matches the keyframes in globals.css.
const OPENING_MS = 960;
const SETTLING_MS = 320;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * closed envelope → opening → invitation card → reply card (on request).
 * The phase only moves forward, so repeated taps cannot restart or break the animation.
 */
export function InvitationExperience({ card, notes }: { card: ReactNode; notes: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [animate, setAnimate] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const replyTitleRef = useRef<HTMLHeadingElement>(null);
  const replyRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function open() {
    if (phase !== "closed") return;
    if (prefersReducedMotion()) {
      setAnimate(false);
      setPhase("open");
      return;
    }
    setPhase("opening");
    timers.current.push(
      window.setTimeout(() => setPhase("settling"), OPENING_MS),
      window.setTimeout(() => setPhase("open"), OPENING_MS + SETTLING_MS),
    );
  }

  useEffect(() => {
    if (phase !== "open") return;
    window.scrollTo({ top: 0, behavior: "instant" });
    cardRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (!replyOpen) return;
    replyTitleRef.current?.focus({ preventScroll: true });
    replyRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
  }, [replyOpen]);

  if (phase !== "open") {
    return (
      <div className={`envelope-stage is-${phase}`} data-phase={phase}>
        <p className="envelope-intro">{event.copy.envelopeIntro}</p>
        <Envelope disabled={phase !== "closed"} onOpen={open} />
        <p className="envelope-hint" aria-hidden="true">
          {event.copy.envelopeHint}
        </p>
      </div>
    );
  }

  return (
    <div className="sheet" data-phase="open">
      <article
        ref={cardRef}
        className={`paper invitation${animate ? " is-entering" : ""}`}
        aria-labelledby="invitation-title"
        tabIndex={-1}
        data-testid="invitation"
      >
        {card}
      </article>

      {!replyOpen ? (
        <div className={`respond${animate ? " is-entering" : ""}`}>
          <button
            type="button"
            className="btn"
            onClick={() => setReplyOpen(true)}
            aria-expanded={false}
            aria-controls="odpoved"
          >
            {event.copy.rsvpButton}
          </button>
        </div>
      ) : null}

      {replyOpen ? (
        <section
          ref={replyRef}
          id="odpoved"
          className={`paper reply${animate ? " is-entering" : ""}`}
          aria-labelledby="reply-title"
          data-testid="reply"
        >
          <h2 className="reply-title" id="reply-title" ref={replyTitleRef} tabIndex={-1}>
            Dáš nám vědět?
          </h2>
          <p className="reply-lede">
            Zatím jde o předběžné potvrzení. Finální účast a podrobnosti si ověříme později.
          </p>
          {notes}
          <RsvpForm mode={{ kind: "create" }} titleId="reply-title" />
        </section>
      ) : null}
    </div>
  );
}
