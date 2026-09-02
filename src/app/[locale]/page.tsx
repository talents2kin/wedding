import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Layers,
  Mail,
  ClipboardCheck,
  LayoutGrid,
  QrCode,
  Users,
  Check,
  Heart,
  Briefcase,
} from "lucide-react";

const featureIcons = {
  ceremony: Layers,
  invitations: Mail,
  rsvp: ClipboardCheck,
  seating: LayoutGrid,
  checkin: QrCode,
  groups: Users,
} as const;

const featureColSpans: Record<string, string> = {
  ceremony: "lg:col-span-2",
  seating: "lg:col-span-2",
  checkin: "lg:col-span-2",
};

const avatarStyles = [
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
];

export default function HomePage() {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">{tCommon("appName")}</span>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t("nav.features")}
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              {t("nav.pricing")}
            </a>
            <a href="#audiences" className="transition-colors hover:text-foreground">
              {t("nav.audiences")}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              {t("nav.cta")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          {/* Rose glow behind text */}
          <div
            className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_55%_70%_at_25%_0%,oklch(0.92_0.04_355/0.55),transparent_70%)]"
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* ── Text column */}
            <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-tight whitespace-pre-line">
                {t("hero.headline")}
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                {t("hero.subheadline")}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  {t("hero.ctaPrimary")}
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {t("hero.ctaSecondary")}
                </a>
              </div>
              <p className="text-xs text-muted-foreground">{t("hero.trustLine")}</p>
            </div>

            {/* ── Illustration column */}
            <div
              className="relative hidden h-[440px] lg:block"
              style={{
                backgroundImage:
                  "radial-gradient(oklch(0.84 0.03 355) 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            >
              {/* Main dashboard card */}
              <div className="absolute left-0 right-12 top-6 rounded-2xl border border-border bg-background p-5 shadow-[0_8px_30px_oklch(0.52_0.155_355/0.10)]">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Mariage
                    </p>
                    <p className="font-semibold">Huguette &amp; Déo</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    14 juin 2025
                  </span>
                </div>

                {/* Ceremony tabs */}
                <div className="mb-4 flex gap-1.5">
                  {(["Coutumier", "Civil", "Religieux"] as const).map((tab, i) => (
                    <span
                      key={tab}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        i === 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>

                {/* Stats grid */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {([["247", "invités"], ["186", "confirmés"], ["3", "cérémonies"]] as const).map(
                    ([n, label]) => (
                      <div key={label} className="rounded-lg bg-muted/60 p-3 text-center">
                        <p className="text-xl font-bold">{n}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    )
                  )}
                </div>

                {/* Confirmation progress */}
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>Confirmations reçues</span>
                    <span>75 %</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-1.5 w-3/4 rounded-full bg-primary" />
                  </div>
                </div>

                {/* Avatar stack */}
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-1.5">
                    {(["S", "M", "K", "A"] as const).map((initial, i) => (
                      <div
                        key={initial}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold ${avatarStyles[i]}`}
                      >
                        {initial}
                      </div>
                    ))}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] text-muted-foreground">
                      +12
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">nouveaux cette semaine</span>
                </div>
              </div>

              {/* RSVP float card — top right */}
              <div className="absolute right-0 top-0 w-52 rounded-xl border border-border bg-background p-4 shadow-[0_4px_16px_oklch(0.52_0.155_355/0.08)]">
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold">RSVP confirmé</span>
                </div>
                <p className="mb-0.5 text-sm font-medium">Tonny NSENGA</p>
                <p className="text-xs text-muted-foreground">Cérémonie civile · 2 pers.</p>
              </div>

              {/* Live check-in card — bottom right */}
              <div className="absolute bottom-4 right-0 w-56 rounded-xl border border-border bg-background p-4 shadow-[0_4px_16px_oklch(0.52_0.155_355/0.08)]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs font-semibold">Accueil en cours</span>
                </div>
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">142</span>
                  <span className="text-sm text-muted-foreground">/ 180 présents</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: "79%" }} />
                </div>
                <p className="mt-1 text-right text-[11px] text-muted-foreground">79 %</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────── */}
        <section id="features" className="border-t border-border bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight whitespace-pre-line">
                {t("features.title")}
              </h2>
              <p className="mt-3 text-muted-foreground">{t("features.subtitle")}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  "ceremony",
                  "invitations",
                  "rsvp",
                  "seating",
                  "checkin",
                  "groups",
                ] as const
              ).map((key) => {
                const Icon = featureIcons[key];
                const span = featureColSpans[key] ?? "";
                return (
                  <div
                    key={key}
                    className={`rounded-xl border border-border bg-background p-6 ${span}`}
                  >
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-semibold">{t(`features.${key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`features.${key}.description`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Audiences ───────────────────────────────────────── */}
        <section id="audiences" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
              {t("audiences.title")}
            </h2>
            <div className="grid gap-8 lg:grid-cols-2">
              {(["couple", "planner"] as const).map((audience) => {
                const Icon = audience === "couple" ? Heart : Briefcase;
                return (
                  <div key={audience} className="rounded-xl border border-border p-8">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold whitespace-pre-line">
                      {t(`audiences.${audience}.title`)}
                    </h3>
                    <p className="mb-6 text-muted-foreground">
                      {t(`audiences.${audience}.description`)}
                    </p>
                    <ul className="mb-8 space-y-2">
                      {(t.raw(`audiences.${audience}.points`) as string[]).map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-up"
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                    >
                      {t(`audiences.${audience}.cta`)}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────── */}
        <section id="pricing" className="border-t border-border bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight whitespace-pre-line">
                {t("pricing.title")}
              </h2>
              <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
            </div>

            {/* Couple plans */}
            <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
              {t("pricing.couple.label")}
            </p>
            <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-2xl">
              {(["free", "paid"] as const).map((plan) => {
                const isHighlighted = plan === "paid";
                return (
                  <div
                    key={plan}
                    className={`rounded-xl border bg-background p-7 ${
                      isHighlighted ? "border-foreground/30 shadow-sm" : "border-border"
                    }`}
                  >
                    <p className="mb-1 text-sm font-semibold">
                      {t(`pricing.couple.${plan}.name`)}
                    </p>
                    <p className="mb-1 text-3xl font-bold">
                      {t(`pricing.couple.${plan}.price`)}
                      {plan === "paid" && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {" "}/ {t(`pricing.couple.${plan}.period`)}
                        </span>
                      )}
                    </p>
                    <p className="mb-5 text-xs text-muted-foreground">
                      {t(`pricing.couple.${plan}.description`)}
                    </p>
                    <ul className="mb-6 space-y-2">
                      {(t.raw(`pricing.couple.${plan}.features`) as string[]).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-up"
                      className={`inline-flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        isHighlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/80"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {t(`pricing.couple.${plan}.cta`)}
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Planner plans */}
            <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
              {t("pricing.planner.label")}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-2xl">
              {(["starter", "pro"] as const).map((plan) => {
                const badge =
                  plan === "pro"
                    ? (t.raw("pricing.planner.pro") as Record<string, string>).badge
                    : null;
                const isHighlighted = plan === "pro";
                return (
                  <div
                    key={plan}
                    className={`relative rounded-xl border bg-background p-7 ${
                      isHighlighted ? "border-foreground/30 shadow-sm" : "border-border"
                    }`}
                  >
                    {badge && (
                      <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {badge}
                      </span>
                    )}
                    <p className="mb-1 text-sm font-semibold">
                      {t(`pricing.planner.${plan}.name`)}
                    </p>
                    <p className="mb-1 text-3xl font-bold">
                      {t(`pricing.planner.${plan}.price`)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}/ {t(`pricing.planner.${plan}.period`)}
                      </span>
                    </p>
                    <p className="mb-5 text-xs text-muted-foreground">
                      {t(`pricing.planner.${plan}.description`)}
                    </p>
                    <ul className="mb-6 space-y-2">
                      {(t.raw(`pricing.planner.${plan}.features`) as string[]).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-up"
                      className={`inline-flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        isHighlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/80"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      {t(`pricing.planner.${plan}.cta`)}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────── */}
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              {t("cta.headline")}
            </h2>
            <p className="mb-8 text-muted-foreground">{t("hero.trustLine")}</p>
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              {t("hero.ctaPrimary")}
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold text-foreground">{tCommon("appName")}</p>
            <p className="mt-1">{t("footer.tagline")}</p>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("footer.legalPrefix", { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}
