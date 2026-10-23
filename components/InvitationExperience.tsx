"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { event } from "@/content/event";
import {
  Envelope,
  EnvelopeBack,
  EnvelopeDefs,
  EnvelopeFlap,
  EnvelopePocket,
} from "./Envelope";
import { RsvpForm } from "./RsvpForm";
import { WaxSealDefs } from "./WaxSeal";

type Phase = "closed" | "opening" | "open";
type Handoff = { env: DOMRect; mini: DOMRect };

// Matches the opening keyframes in globals.css (seal → flap → card rises).
const OPENING_MS = 1520;
// Envelope is drawn away, then the card comes forward to full size.
const SLIDE_MS = 460;
const SETTLE_MS = 760;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * closed envelope → opening → invitation card → reply card (on request).
 * The phase only moves forward, so repeated taps cannot restart or break the animation.
 */
export function InvitationExperience({
  card,
  notes,
}: {
  card: ReactNode;
  notes: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [animate, setAnimate] = useState(true);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);

  const envelopeRef = useRef<HTMLButtonElement>(null);
  const miniRef = useRef<HTMLSpanElement>(null);
  const ghostBackRef = useRef<HTMLDivElement>(null);
  const ghostFrontRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const replyTitleRef = useRef<HTMLHeadingElement>(null);
  const replyRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function open() {
    if (phase !== "closed") return;
    navigator.vibrate?.(12);
    if (prefersReducedMotion()) {
      setAnimate(false);
      setPhase("open");
      return;
    }
    setPhase("opening");
    timers.current.push(
      window.setTimeout(() => {
        const env = envelopeRef.current?.getBoundingClientRect();
        const mini = miniRef.current?.getBoundingClientRect();
        if (env && mini) setHandoff({ env, mini });
        setPhase("open");
      }, OPENING_MS),
    );
  }

  // Hand-off: the real card starts exactly where the miniature was, the envelope
  // slides away underneath it, then the card comes forward to its place.
  useLayoutEffect(() => {
    if (phase !== "open") return;
    window.scrollTo({ top: 0, behavior: "instant" });
    const cardEl = cardRef.current;
    const back = ghostBackRef.current;
    const front = ghostFrontRef.current;
    if (!handoff || !cardEl || !back || !front) {
      cardEl?.focus({ preventScroll: true });
      return;
    }

    const final = cardEl.getBoundingClientRect();
    const s = handoff.mini.width / final.width;
    const from = `translate(${handoff.mini.left - final.left}px, ${handoff.mini.top - final.top}px) scale(${s})`;
    // Bottom of the card that was still inside the pocket, in card pixels.
    const hiddenStart = Math.max(
      0,
      final.height - (handoff.env.bottom - handoff.mini.top) / s,
    );
    // The envelope travels off-screen and at least far enough to uncover the whole card.
    // (+ the open flap, which stands above the envelope's top edge).
    const distance = Math.max(
      window.innerHeight - handoff.env.top + handoff.env.height * 0.6 + 40,
      hiddenStart * s + 40,
    );
    const setClip = (bottom: number | null) => {
      const value =
        bottom === null ? "" : `inset(-80px -80px ${bottom}px -80px)`;
      cardEl.style.clipPath = value;
      cardEl.style.setProperty("-webkit-clip-path", value);
    };

    // Stage 1 (frame-driven so the clip works in every engine): the envelope is drawn
    // away downward and the card is uncovered exactly as fast as the pocket leaves it.
    let frame = 0;
    let cancelled = false;
    let settle: Animation | null = null;
    // No CSS transition may interpolate these jumps (the tilt has one on transform).
    cardEl.style.transition = "none";
    cardEl.style.transformOrigin = "0 0";
    cardEl.style.transform = from;
    setClip(hiddenStart);
    const start = performance.now();
    const step = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / SLIDE_MS);
      const travelled = distance * t * t * t; // ease-in: the envelope gathers speed
      back.style.transform =
        front.style.transform = `translateY(${travelled}px)`;
      setClip(Math.max(0, hiddenStart - travelled / s));
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      // Stage 2: the card comes forward to its place (compositor-only transform).
      back.style.visibility = front.style.visibility = "hidden";
      setClip(null);
      cardEl.style.transform = "";
      cardEl.style.transformOrigin = "";
      settle = cardEl.animate(
        [
          { transformOrigin: "0 0", transform: from },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: SETTLE_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      settle.finished
        .then(() => {
          if (cancelled) return;
          cardEl.style.transition = "";
          setHandoff(null);
          // Don't pull focus back if the guest has already moved on (e.g. into the reply form).
          const active = document.activeElement;
          if (!active || active === document.body)
            cardEl.focus({ preventScroll: true });
        })
        .catch(() => {});
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      settle?.cancel();
      setClip(null);
      cardEl.style.transform = "";
      cardEl.style.transformOrigin = "";
      cardEl.style.transition = "";
    };
    // Runs once per hand-off; `handoff` is set in the same update as `phase`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Jump straight to the form. Measured from layout offsets, not getBoundingClientRect:
  // the reply card is still mid-unfold (transformed) when this runs.
  function goToReply() {
    const reply = replyRef.current;
    replyTitleRef.current?.focus({ preventScroll: true });
    if (!reply) return;
    let top = 0;
    for (
      let el: HTMLElement | null = reply;
      el;
      el = el.offsetParent as HTMLElement | null
    )
      top += el.offsetTop;
    const margin = parseFloat(getComputedStyle(reply).scrollMarginTop) || 0;
    window.scrollTo({ top: top - margin, behavior: "instant" });
  }

  useEffect(() => {
    if (replyOpen) goToReply();
  }, [replyOpen]);

  const ghostStyle = handoff
    ? {
        left: handoff.env.left,
        top: handoff.env.top,
        width: handoff.env.width,
        height: handoff.env.height,
      }
    : undefined;

  return (
    <>
      <EnvelopeDefs />
      <WaxSealDefs />

      {phase !== "open" ? (
        <div className={`envelope-stage is-${phase}`} data-phase={phase}>
          <Envelope
            disabled={phase !== "closed"}
            onOpen={open}
            envelopeRef={envelopeRef}
            miniRef={miniRef}
          />
          <p className="envelope-hint" aria-hidden="true">
            {event.copy.envelopeHint}
          </p>
        </div>
      ) : (
        <div className="sheet" data-phase="open">
          {handoff ? (
            <div
              className="envelope-ghost is-back"
              style={ghostStyle}
              ref={ghostBackRef}
              aria-hidden="true"
            >
              <EnvelopeBack />
              <EnvelopeFlap open />
            </div>
          ) : null}

          {/* card + reply button: one screen, centred vertically when the window is taller */}
          <div className="first-screen">
            <div className="card-tilt">
              <article
                ref={cardRef}
                className="paper invitation"
                aria-labelledby="invitation-title"
                tabIndex={-1}
                data-testid="invitation"
              >
                {card}
              </article>
            </div>

            {handoff ? (
              <div
                className="envelope-ghost is-front"
                style={ghostStyle}
                ref={ghostFrontRef}
                aria-hidden="true"
              >
                <EnvelopePocket />
              </div>
            ) : null}

            {/* Always visible; once the reply card is open it takes the guest back to it. */}
            <div className={`respond${animate ? " is-entering" : ""}`}>
              <button
                type="button"
                className="btn"
                onClick={() => (replyOpen ? goToReply() : setReplyOpen(true))}
                aria-expanded={replyOpen}
                aria-controls="odpoved"
              >
                {event.copy.rsvpButton}
              </button>
            </div>
          </div>

          {replyOpen ? (
            <section
              ref={replyRef}
              id="odpoved"
              className={`paper reply${animate ? " is-entering" : ""}`}
              aria-labelledby="reply-title"
              data-testid="reply"
            >
              <h2
                className="reply-title"
                id="reply-title"
                ref={replyTitleRef}
                tabIndex={-1}
              >
                Dáš nám vědět?
              </h2>
              <p className="reply-lede">
                Teď nám stačí jen vědět, jestli dorazíš. Všechny ostatní
                podrobnosti se dozvíš brzy.
              </p>
              {notes}
              <RsvpForm mode={{ kind: "create" }} titleId="reply-title" />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
