import type { Metadata } from "next";
import { coupleNames } from "@/content/event";
import { InvitationCard } from "@/components/InvitationCard";
import { InvitationExperience } from "@/components/InvitationExperience";
import { ReplyNotes } from "@/components/ReplyNotes";
import { emailConfigured } from "@/lib/server/mailer";

export const metadata: Metadata = {
  title: `Pozvánka · ${coupleNames}`,
};

// Fully static: the only server work happens in /api/rsvp.
export default function InvitationPage() {
  return (
    <main className="page">
      <InvitationExperience card={<InvitationCard />} notes={<ReplyNotes />} emailEnabled={emailConfigured()} />
    </main>
  );
}
