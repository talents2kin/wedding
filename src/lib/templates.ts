// ---------------------------------------------------------------------------
// Platform-provided invitation templates (static catalog, no DB model needed)
// Placeholders: {{guestName}} {{genderPrefix}} {{ceremonyLabel}} {{date}} {{venue}} {{senderName}}
// ---------------------------------------------------------------------------

export type Template = {
  id: string;
  name: string;
  description: string;
  bodyText: string;
  isPremium: boolean;
};

export const TEMPLATES: Template[] = [
  {
    id: "classique",
    name: "Classique",
    description: "Une invitation sobre et élégante pour toutes les cérémonies.",
    bodyText:
      "{{genderPrefix}} {{guestName}},\n\nNous avons le plaisir de vous inviter à notre {{ceremonyLabel}}," +
      "\nle {{date}}{{venue}}.\n\nVotre présence nous ferait le plus grand honneur." +
      "\n\nCordialement,\n{{senderName}}",
    isPremium: false,
  },
  {
    id: "romantique",
    name: "Romantique",
    description: "Un style chaleureux pour partager votre bonheur.",
    bodyText:
      "Chère famille, chers amis,\n\n{{senderName}} vous convient à célébrer avec eux leur {{ceremonyLabel}}" +
      "\nle {{date}}{{venue}}.\n\nAvec toute notre affection,\n{{senderName}}",
    isPremium: false,
  },
  {
    id: "moderne",
    name: "Moderne",
    description: "Design minimaliste et contemporain. Réservé aux forfaits premium.",
    bodyText:
      "{{genderPrefix}} {{guestName}},\n\nVous êtes invité(e) à notre {{ceremonyLabel}}" +
      "\n📅 {{date}}\n{{venue}}\n\n— {{senderName}}",
    isPremium: true,
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Render a template body with guest + ceremony context
// ---------------------------------------------------------------------------

export type TemplateVars = {
  guestName: string;
  genderPrefix: string; // "M." | "Mme" | ""
  ceremonyLabel: string;
  date: string;
  venue: string;
  senderName: string;
};

export function renderBody(bodyText: string, vars: TemplateVars): string {
  return bodyText
    .replace(/{{guestName}}/g, vars.guestName)
    .replace(/{{genderPrefix}}/g, vars.genderPrefix)
    .replace(/{{ceremonyLabel}}/g, vars.ceremonyLabel)
    .replace(/{{date}}/g, vars.date)
    .replace(/{{venue}}/g, vars.venue ? ` à ${vars.venue}` : "")
    .replace(/{{senderName}}/g, vars.senderName);
}
