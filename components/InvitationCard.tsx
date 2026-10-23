import { event } from "@/content/event";

export function InvitationCard({ decorative = false }: { decorative?: boolean }) {
  const P = decorative ? "span" : "p";
  const H1 = decorative ? "span" : "h1";
  const Dl = decorative ? "span" : "dl";
  const Dd = decorative ? "span" : "dd";
  const dt = (label: string) => (decorative ? null : <dt className="sr-only">{label}</dt>);

  return (
    <>
      <span className="inv-foil" aria-hidden="true" />
      <span className="inv-foil inv-foil-inner" aria-hidden="true" />
      <P className="inv-opening">{event.copy.cardOpening}</P>

      <H1 className="inv-names" id={decorative ? undefined : "invitation-title"}>
        <span className="name name-1">{event.couple.first}</span>
        <span className="amp">a</span>
        <span className="name name-2">{event.couple.second}</span>
      </H1>

      <P className="inv-invite">{event.copy.cardInvitation}</P>

      <svg className="ornament" viewBox="0 0 144 16" aria-hidden="true">
        <path className="draw draw-l" d="M58 8 H0" stroke="url(#foil-gold)" strokeWidth="1" pathLength={1} />
        <path className="draw draw-r" d="M86 8 H144" stroke="url(#foil-gold)" strokeWidth="1" pathLength={1} />
        <path
          className="draw"
          d="M72 2.5 L77.5 8 L72 13.5 L66.5 8 Z"
          fill="none"
          stroke="url(#foil-gold)"
          strokeWidth="1"
          pathLength={1}
        />
        <circle cx="62" cy="8" r="1.2" fill="url(#foil-gold)" />
        <circle cx="82" cy="8" r="1.2" fill="url(#foil-gold)" />
      </svg>

      <Dl className="inv-details">
        {dt("Datum")}
        <Dd className="inv-detail inv-date">{event.date}</Dd>
        {event.time ? dt("Čas") : null}
        {event.time ? <Dd className="inv-detail inv-time">{event.time}</Dd> : null}
        {dt("Místo")}
        <Dd className="inv-detail inv-venue">{event.venue.name}</Dd>
        {event.venue.address ? <Dd className="inv-detail inv-address">{event.venue.address}</Dd> : null}
      </Dl>
    </>
  );
}
