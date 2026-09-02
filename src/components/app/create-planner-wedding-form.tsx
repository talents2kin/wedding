"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, ArrowRight } from "lucide-react";

export function CreatePlannerWeddingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const date = form.get("date") as string;

    const res = await fetch("/api/planner/wedding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date }),
    });

    if (!res.ok) {
      setError("Impossible de créer le mariage. Vérifiez les informations saisies.");
      setLoading(false);
      return;
    }

    router.push("/weddings");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom du mariage</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="ex. Sophie & Koffi"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">
          <CalendarDays className="mb-0.5 mr-1.5 inline h-3.5 w-3.5" />
          Date du mariage
        </Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer le mariage"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
