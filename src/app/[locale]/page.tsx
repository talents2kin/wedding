import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        {t("common.appName")}
      </h1>
      <p className="max-w-md text-lg text-muted-foreground">
        {t("dashboard.noWedding")}
      </p>
      <div className="flex gap-3">
        <Link
          href="/sign-in"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          {t("nav.signIn")}
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t("nav.signUp")}
        </Link>
      </div>
    </main>
  );
}
