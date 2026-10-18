import type { Metadata } from "next";
import Link from "next/link";
import { coupleNames } from "@/content/event";
import { RsvpForm } from "@/components/RsvpForm";
import { ReplyNotes } from "@/components/ReplyNotes";
import { getDb } from "@/lib/server/db";
import { getByToken, type EditableResponse } from "@/lib/server/rsvpService";

export const metadata: Metadata = {
  title: "Tvoje odpověď",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function EditPage({ params }: PageProps<"/odpoved/[token]">) {
  const { token } = await params;

  let response: EditableResponse | null = null;
  let storageDown = false;
  try {
    response = await getByToken(getDb(), token);
  } catch {
    storageDown = true;
  }

  return (
    <main className="page">
      <div className="sheet">
        <p className="meta-line">{coupleNames}</p>
        <section className="paper reply reply-standalone" aria-labelledby="edit-title">
          {response ? (
            <>
              <h1 className="reply-title" id="edit-title">
                Tvoje odpověď
              </h1>
              <p className="reply-lede">
                Tady můžeš svoji předběžnou odpověď kdykoli změnit. Před svatbou si účast ještě potvrdíme.
              </p>
              <ReplyNotes />
              <RsvpForm
                mode={{
                  kind: "edit",
                  token,
                  initial: {
                    fullName: response.fullName,
                    email: response.email,
                    attendance: response.attendance,
                    accommodation: response.accommodation,
                  },
                }}
              />
            </>
          ) : storageDown ? (
            <div className="done">
              <h1 className="reply-title" id="edit-title">
                Teď se nám to nedaří načíst
              </h1>
              <p>Tvoje odpověď je v pořádku, jen se k ní momentálně nedostaneme. Zkus to prosím za chvíli znovu.</p>
            </div>
          ) : (
            <div className="done" data-testid="invalid-token">
              <h1 className="reply-title" id="edit-title">
                Tenhle odkaz nefunguje
              </h1>
              <p>Možná se při kopírování zkrátil, nebo už neplatí.</p>
              <p className="soft">
                Nový odkaz ti rádi pošleme na e-mail, který jsi u odpovědi uvedl/a.
              </p>
              <div>
                <Link className="btn" href="/odpoved">
                  Poslat nový odkaz
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
