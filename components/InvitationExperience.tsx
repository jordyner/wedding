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
import { GoldBurst, GoldFlakes } from "./GoldFlakes";
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
  emailEnabled = true,
}: {
  card: ReactNode;
  notes: ReactNode;
  /** false while the site runs without email: the form then never promises one */
  emailEnabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [animate, setAnimate] = useState(true);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const burstId = useRef(0);

  // A small hidden delight: tapping the card scatters a pinch of gold leaf.
  function sprinkleGold(e: React.MouseEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.getSelection()?.toString()) return;
    const id = ++burstId.current;
    setBursts((all) => [...all.slice(-3), { id, x: e.clientX, y: e.clientY }]);
  }

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
    // How far the card (at its starting size) still reaches below the envelope's bottom edge.
    const hidden = Math.max(0, handoff.mini.top + final.height * s - handoff.env.bottom);
    // The envelope travels off-screen and at least far enough to uncover the whole card.
    // (+ the open flap, which stands above the envelope's top edge).
    const distance = Math.max(
      window.innerHeight - handoff.env.top + handoff.env.height * 0.6 + 40,
      hidden + 40,
    );
    // The card may only show above the envelope's bottom edge. The clip sits on the card's
    // wrapper and never changes: the wrapper travels down with the envelope while the card
    // travels back up by the same amount, so the edge uncovers it and every frame is a
    // compositor-only transform (no per-frame clip, style or paint work on the main thread).
    const clipBox = cardEl.parentElement as HTMLElement;
    // The wrapper travelling down must not make the page taller for a moment: a page that
    // grows and shrinks back makes phones jump (scrollbar, toolbar, rubber-band).
    const sheet = cardEl.closest<HTMLElement>(".sheet");
    const clip = `inset(-100vh -80px ${final.bottom - handoff.env.bottom}px -80px)`;
    const setClip = (value: string) => {
      clipBox.style.clipPath = value;
      clipBox.style.setProperty("-webkit-clip-path", value);
    };

    let cancelled = false;
    let settle: Animation | null = null;
    // No CSS transition may interpolate these jumps (the tilt has one on transform).
    cardEl.style.transition = "none";
    cardEl.style.transformOrigin = "0 0";
    cardEl.style.transform = from;
    setClip(clip);
    if (sheet) sheet.style.overflowY = "clip";

    // Stage 1: the envelope is drawn away downward, gathering speed (ease-in cubic).
    const slide = { duration: SLIDE_MS, easing: "cubic-bezier(0.32, 0, 0.67, 0)", fill: "forwards" as const };
    const away = [{ transform: "translateY(0)" }, { transform: `translateY(${distance}px)` }];
    const stage1 = [
      back.animate(away, slide),
      front.animate(away, slide),
      clipBox.animate(away, slide),
      cardEl.animate(
        [
          { transform: `translateY(0) ${from}` },
          { transform: `translateY(${-distance}px) ${from}` },
        ],
        slide,
      ),
    ];
    stage1[0].finished
      .then(() => {
        if (cancelled) return;
        // Stage 2: the card comes forward to its place (compositor-only transform).
        back.style.visibility = front.style.visibility = "hidden";
        setClip("");
        stage1.forEach((a) => a.cancel());
        if (sheet) sheet.style.overflowY = "";
        cardEl.style.transform = "";
        cardEl.style.transformOrigin = "";
        settle = cardEl.animate(
          [
            { transformOrigin: "0 0", transform: from },
            { transformOrigin: "0 0", transform: "none" },
          ],
          { duration: SETTLE_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
        return settle.finished;
      })
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

    return () => {
      cancelled = true;
      stage1.forEach((a) => a.cancel());
      settle?.cancel();
      setClip("");
      if (sheet) sheet.style.overflowY = "";
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

  // Phones: place the floating button just under the card, so the two read as one
  // centred group (it still floats, and never sits lower than the screen edge).
  const respondRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== "open") return;
    const place = () => {
      const card = cardRef.current;
      const respond = respondRef.current;
      if (!card || !respond) return;
      if (!window.matchMedia("(max-width: 40rem)").matches) {
        respond.style.removeProperty("--respond-bottom");
        return;
      }
      let top = 0;
      for (let el: HTMLElement | null = card; el; el = el.offsetParent as HTMLElement | null) top += el.offsetTop;
      const button = respond.querySelector("button");
      const gap = 18;
      const bottom = window.innerHeight - (top + card.offsetHeight) - gap - (button?.offsetHeight ?? 44);
      respond.style.setProperty("--respond-bottom", `${Math.max(16, Math.round(bottom))}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [phase]);

  // The floating button steps aside while the reply card is on screen.
  const [replyInView, setReplyInView] = useState(false);
  useEffect(() => {
    const el = replyRef.current;
    if (!replyOpen || !el) return;
    const io = new IntersectionObserver(([entry]) => setReplyInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
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
          {animate ? <GoldFlakes /> : null}
          {bursts.map((b) => (
            <GoldBurst key={b.id} x={b.x} y={b.y} onDone={() => setBursts((all) => all.filter((o) => o.id !== b.id))} />
          ))}
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
                onClick={sprinkleGold}
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
            <div
              ref={respondRef}
              className={`respond${animate ? " is-entering" : ""}${replyInView ? " is-away" : ""}`}
            >
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
              <RsvpForm mode={{ kind: "create" }} titleId="reply-title" emailEnabled={emailEnabled} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
