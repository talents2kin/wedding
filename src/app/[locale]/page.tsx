import { useTranslations } from "next-intl";
import Link from "next/link";

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
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {t("hero.badge")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl whitespace-pre-line">
            {t("hero.headline")}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {t("hero.subheadline")}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
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
              ).map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-background p-6"
                >
                  <h3 className="mb-2 font-semibold">{t(`features.${key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`features.${key}.description`)}
                  </p>
                </div>
              ))}
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
              {(["couple", "planner"] as const).map((audience) => (
                <div
                  key={audience}
                  className="rounded-xl border border-border p-8"
                >
                  <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {t(`audiences.${audience}.tag`)}
                  </span>
                  <h3 className="mb-3 text-2xl font-bold whitespace-pre-line">
                    {t(`audiences.${audience}.title`)}
                  </h3>
                  <p className="mb-6 text-muted-foreground">
                    {t(`audiences.${audience}.description`)}
                  </p>
                  <ul className="mb-8 space-y-2">
                    {(
                      t.raw(`audiences.${audience}.points`) as string[]
                    ).map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm">
                        <span className="text-primary">✓</span>
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
              ))}
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
            <p className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {t("pricing.couple.label")}
            </p>
            <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-2xl">
              {(["free", "paid"] as const).map((plan) => (
                <div
                  key={plan}
                  className="rounded-xl border border-border bg-background p-7"
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
                    {(
                      t.raw(`pricing.couple.${plan}.features`) as string[]
                    ).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <span className="text-primary">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {t(`pricing.couple.${plan}.cta`)}
                  </Link>
                </div>
              ))}
            </div>

            {/* Planner plans */}
            <p className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {t("pricing.planner.label")}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-2xl">
              {(["starter", "pro"] as const).map((plan) => {
                const badge =
                  plan === "pro"
                    ? (t.raw("pricing.planner.pro") as Record<string, string>).badge
                    : null;
                return (
                  <div
                    key={plan}
                    className="relative rounded-xl border border-border bg-background p-7"
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
                      {(
                        t.raw(`pricing.planner.${plan}.features`) as string[]
                      ).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <span className="text-primary">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-up"
                      className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
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
              {t("hero.headline")}
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
