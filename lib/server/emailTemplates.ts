import { accommodationLabel, coupleNames, siteName } from "@/content/event";
import { attendanceLabel, type Accommodation, type Attendance } from "@/lib/rsvp";

type Summary = { fullName: string; attendance: Attendance; accommodation: Accommodation | null };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function accommodationLine(r: Summary): string {
  if (r.attendance === "yes" && r.accommodation) return accommodationLabel(r.accommodation);
  if (r.attendance === "undecided") return "Rozhodneš se později";
  return "—";
}

const colors = { page: "#f3ebe6", paper: "#fcf8f1", ink: "#3b3230", soft: "#6b5a55", accent: "#9b5550", rule: "#e6cfc8" };

function layout(inner: string, preheader: string): string {
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${escapeHtml(siteName)}</title></head>
<body style="margin:0;padding:0;background:${colors.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${colors.paper};border:1px solid ${colors.rule};">
<tr><td style="padding:40px 32px;font-family:Georgia,'Times New Roman',serif;color:${colors.ink};font-size:17px;line-height:1.6;">
<p style="margin:0 0 4px;text-align:center;font-style:italic;color:${colors.soft};font-size:15px;">${escapeHtml(coupleNames)}</p>
<hr style="border:0;border-top:1px solid ${colors.rule};margin:16px auto 28px;width:64px;">
${inner}
</td></tr></table>
<p style="font-family:Georgia,serif;font-size:13px;color:${colors.soft};margin:20px 0 0;">${escapeHtml(siteName)}</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;"><tr>
<td style="border:1px solid ${colors.accent};border-radius:999px;">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;font-family:Georgia,serif;font-size:16px;color:${colors.accent};text-decoration:none;letter-spacing:.02em;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

export function confirmationEmail(r: Summary, editUrl: string) {
  const subject = "Díky za odpověď — odkaz pro případné změny";
  const rows = [
    ["Jméno", r.fullName],
    ["Dorazíš?", attendanceLabel[r.attendance]],
    ["Ubytování", accommodationLine(r)],
  ];
  const html = layout(
    `<p style="margin:0 0 16px;">Ahoj,</p>
<p style="margin:0 0 20px;">díky, že dáváš vědět! Tvoji předběžnou odpověď máme uloženou:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${colors.rule};">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${colors.rule};color:${colors.soft};font-size:15px;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${colors.rule};">${escapeHtml(v)}</td></tr>`,
  )
  .join("")}
</table>
<p style="margin:24px 0 0;">Kdyby se něco změnilo, odpověď můžeš kdykoli upravit tady:</p>
${button(editUrl, "Upravit odpověď")}
<p style="margin:0 0 16px;font-size:15px;color:${colors.soft};">Odkaz je jen pro tebe — kdo ho má, může tvoji odpověď změnit. Prosíme, nepřeposílej ho.</p>
<p style="margin:0 0 16px;font-size:15px;color:${colors.soft};">Zatím je vše předběžné. Před svatbou se ti ještě ozveme a účast si společně potvrdíme.</p>
<p style="margin:24px 0 0;">Moc se těšíme!<br>${escapeHtml(coupleNames)}</p>`,
    "Tvoji předběžnou odpověď máme. Uvnitř je odkaz pro případné změny.",
  );
  const text = `Ahoj,

díky, že dáváš vědět! Tvoji předběžnou odpověď máme uloženou:

Jméno: ${r.fullName}
Dorazíš? ${attendanceLabel[r.attendance]}
Ubytování: ${accommodationLine(r)}

Kdyby se něco změnilo, odpověď můžeš kdykoli upravit tady:
${editUrl}

Odkaz je jen pro tebe — kdo ho má, může tvoji odpověď změnit. Prosíme, nepřeposílej ho.

Zatím je vše předběžné. Před svatbou se ti ještě ozveme a účast si společně potvrdíme.

Moc se těšíme!
${coupleNames}
`;
  return { subject, html, text };
}

export function recoveryEmail(links: { fullName: string; url: string }[]) {
  const subject = "Tvůj odkaz pro úpravu odpovědi";
  const many = links.length > 1;
  const html = layout(
    `<p style="margin:0 0 16px;">Ahoj,</p>
<p style="margin:0 0 8px;">${
      many
        ? "posíláme odkazy k odpovědím, které jsme pod tímto e-mailem uložili:"
        : "posíláme odkaz, přes který můžeš upravit svoji odpověď na naši pozvánku:"
    }</p>
${links
  .map(
    (l) =>
      `${many ? `<p style="margin:24px 0 0;text-align:center;">${escapeHtml(l.fullName)}</p>` : ""}${button(l.url, "Upravit odpověď")}`,
  )
  .join("")}
<p style="margin:0 0 16px;font-size:15px;color:${colors.soft};">Odkaz je jen pro tebe — prosíme, nepřeposílej ho. Starší odkazy, které už máš, fungují dál.</p>
<p style="margin:0 0 16px;font-size:15px;color:${colors.soft};">Pokud jsi o odkaz nežádal/a, nic se neděje — e-mail můžeš klidně smazat.</p>
<p style="margin:24px 0 0;">${escapeHtml(coupleNames)}</p>`,
    "Odkaz pro úpravu tvé odpovědi na svatební pozvánku.",
  );
  const text = `Ahoj,

${many ? "posíláme odkazy k odpovědím, které jsme pod tímto e-mailem uložili:" : "posíláme odkaz, přes který můžeš upravit svoji odpověď na naši pozvánku:"}

${links.map((l) => (many ? `${l.fullName}: ${l.url}` : l.url)).join("\n")}

Odkaz je jen pro tebe — prosíme, nepřeposílej ho. Starší odkazy, které už máš, fungují dál.
Pokud jsi o odkaz nežádal/a, nic se neděje — e-mail můžeš klidně smazat.

${coupleNames}
`;
  return { subject, html, text };
}

