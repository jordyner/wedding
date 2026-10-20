import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soukromá pozvánka",
  robots: { index: false, follow: false },
};

/** Shown by proxy.ts to anyone without the invitation key. Says nothing about the wedding. */
export default function LockedPage() {
  return (
    <main className="page">
      <div className="sheet">
        <section className="paper reply reply-standalone done" aria-labelledby="locked-title">
          <h1 className="reply-title" id="locked-title">
            Tahle pozvánka je soukromá
          </h1>
          <p className="soft">Otevři ji prosím přes odkaz, který ti od nás přišel.</p>
        </section>
      </div>
    </main>
  );
}
