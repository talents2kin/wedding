import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreatePlannerWeddingForm } from "@/components/app/create-planner-wedding-form";
import { Briefcase } from "lucide-react";

export default async function PlannerOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
    include: { _count: { select: { weddings: true } } },
  });

  // Not a planner → send to couple onboarding
  if (!plannerAccount) redirect("/onboarding");

  // At or above limit → cannot create more, go to list (upgrade prompt is there)
  if (plannerAccount._count.weddings >= plannerAccount.weddingLimit) redirect("/weddings");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Briefcase className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Votre premier mariage
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Créez le premier mariage que vous organisez. Vous pourrez en ajouter
            d&apos;autres ensuite.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
          <CreatePlannerWeddingForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Offre gratuite · 1 mariage actif inclus
        </p>
      </div>
    </main>
  );
}
