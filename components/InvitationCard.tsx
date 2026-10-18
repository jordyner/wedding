import { event } from "@/content/event";

/** The paper invitation. Real HTML text, all facts from content/event.ts. */
export function InvitationCard() {
  return (
    <>
      <p className="inv-opening">{event.copy.cardOpening}</p>

      <h1 className="inv-names" id="invitation-title">
        <span className="name">{event.couple.first}</span>
        <span className="amp">&amp;</span>
        <span className="name">{event.couple.second}</span>
      </h1>

      <p className="inv-invite">{event.copy.cardInvitation}</p>

      <svg className="ornament" viewBox="0 0 144 16" aria-hidden="true">
        <path d="M0 8 H58" stroke="currentColor" strokeWidth="1" />
        <path d="M86 8 H144" stroke="currentColor" strokeWidth="1" />
        <path d="M72 2.5 L77.5 8 L72 13.5 L66.5 8 Z" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="62" cy="8" r="1.2" fill="currentColor" />
        <circle cx="82" cy="8" r="1.2" fill="currentColor" />
      </svg>

      <dl className="inv-details">
        <dt className="sr-only">Datum</dt>
        <dd className="inv-date">{event.date}</dd>
        <dt className="sr-only">Čas</dt>
        <dd className="inv-time">{event.time}</dd>
        <dt className="sr-only">Místo</dt>
        <dd className="inv-venue">{event.venue.name}</dd>
        {event.venue.address ? <dd className="inv-address">{event.venue.address}</dd> : null}
      </dl>
    </>
  );
}
