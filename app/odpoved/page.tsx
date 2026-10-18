import type { Metadata } from "next";
import Link from "next/link";
import { coupleNames } from "@/content/event";
import { RecoverForm } from "@/components/RecoverForm";

export const metadata: Metadata = {
  title: "Ztracený odkaz",
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <main className="page">
      <div className="sheet">
        <p className="meta-line">{coupleNames}</p>
        <section className="paper reply reply-standalone" aria-labelledby="recover-title">
          <h1 className="reply-title" id="recover-title">
            Nemáš odkaz po ruce?
          </h1>
          <p className="reply-lede">
            Napiš e-mail, který jsi uvedl/a u své odpovědi, a odkaz pro úpravu ti pošleme znovu.
          </p>
          <RecoverForm />
        </section>
        <p className="footnote">
          Ještě jsi neodpověděl/a? <Link href="/pozvanka">Otevři pozvánku</Link>.
        </p>
      </div>
    </main>
  );
}
