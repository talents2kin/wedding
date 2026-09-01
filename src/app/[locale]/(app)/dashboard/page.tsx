import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/sign-in");

  const t = await getTranslations("dashboard");
  const displayName = session.user?.name ?? session.user?.email ?? "";

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">
        {t("welcome", { name: displayName })}
      </h1>
      <p className="text-muted-foreground">{t("noWedding")}</p>
    </main>
  );
}
