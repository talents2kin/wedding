import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateWeddingForm } from "@/components/app/create-wedding-form";
import { Heart } from "lucide-react";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // Already has a wedding — skip onboarding
  const coupleAccount = await db.coupleAccount.findUnique({
    where: { userId: session.user.id },
    include: { wedding: true },
  });
  if (coupleAccount?.wedding) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Créez votre mariage
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            En quelques secondes. Vous pourrez ajouter vos cérémonies et vos
            invités ensuite.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
          <CreateWeddingForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Gratuit pour commencer · Aucune carte bancaire requise
        </p>
      </div>
    </main>
  );
}
