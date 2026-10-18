import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="sheet">
        <section className="paper reply reply-standalone done" aria-labelledby="nf-title">
          <h1 className="reply-title" id="nf-title">
            Tahle stránka neexistuje
          </h1>
          <p className="soft">Možná je v adrese překlep.</p>
          <div>
            <Link className="btn" href="/pozvanka">
              Zpět na pozvánku
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
