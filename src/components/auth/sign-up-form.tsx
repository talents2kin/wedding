"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "couple" | "planner";

export function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const router = useRouter();
  const [role, setRole] = useState<Role>("couple");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (res.status === 409) {
      setError(t("errorEmailTaken"));
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(t("errorInvalid"));
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result?.ok) {
      setError(t("errorInvalid"));
      setLoading(false);
      return;
    }

    router.push(role === "planner" ? "/planner/onboarding" : "/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Role selector */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("role")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["couple", "planner"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                role === r
                  ? "border-primary bg-primary/8 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              {r === "couple" ? t("roleCouple") : t("rolePlanner")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" type="text" required autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
      >
        {loading ? "…" : t("submit")}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/sign-in" className="underline underline-offset-4">
          {t("signInLink")}
        </Link>
      </p>
    </form>
  );
}
