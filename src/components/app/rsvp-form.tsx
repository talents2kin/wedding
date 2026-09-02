"use client";

import { useState, useTransition } from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RsvpStatus = "CONFIRMED" | "DECLINED";
type GuestType = "SINGLETON" | "COUPLE";
type Gender = "MR" | "MME";

type Step = "form" | "success" | "declined";

export function RsvpForm({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("form");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPlusOne, setShowPlusOne] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+243 ");
  const [email, setEmail] = useState("");
  const [guestType, setGuestType] = useState<GuestType>("SINGLETON");
  const [gender, setGender] = useState<Gender>("MR");
  const [rsvp, setRsvp] = useState<RsvpStatus>("CONFIRMED");
  const [mealPref, setMealPref] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [plusOnePhone, setPlusOnePhone] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/register/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() === "+243" ? null : phone.trim() || null,
          email: email.trim() || null,
          guestType,
          gender: guestType === "SINGLETON" ? gender : null,
          rsvp,
          mealPref: mealPref.trim() || null,
          plusOneName: showPlusOne && guestType === "COUPLE" ? plusOneName.trim() || null : null,
          plusOnePhone: showPlusOne && guestType === "COUPLE" ? plusOnePhone.trim() || null : null,
        }),
      });

      if (res.status === 422) {
        setError("Le nombre maximum d'invités a été atteint. Veuillez contacter les organisateurs.");
        return;
      }
      if (!res.ok) {
        setError("Une erreur s'est produite. Veuillez réessayer.");
        return;
      }

      setStep(rsvp === "CONFIRMED" ? "success" : "declined");
    });
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Présence confirmée !</h2>
        <p className="text-gray-500">
          Merci, <strong>{name}</strong>. Votre présence a bien été enregistrée. À très bientôt !
        </p>
      </div>
    );
  }

  if (step === "declined") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <X className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Réponse enregistrée</h2>
        <p className="text-gray-500">
          Merci pour votre réponse, <strong>{name}</strong>. Vous serez toujours dans nos pensées.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Guest type */}
      <div className="flex gap-2">
        {(["SINGLETON", "COUPLE"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setGuestType(t)}
            className={cn(
              "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors",
              guestType === t
                ? "border-rose-400 bg-rose-50 text-rose-700"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            {t === "SINGLETON" ? "Individuel" : "Couple"}
          </button>
        ))}
      </div>

      {/* Gender — only for SINGLETON */}
      {guestType === "SINGLETON" && (
        <div className="flex gap-2">
          {(["MR", "MME"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={cn(
                "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors",
                gender === g
                  ? "border-rose-400 bg-rose-50 text-rose-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              {g === "MR" ? "M." : "Mme"}
            </button>
          ))}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
          {guestType === "COUPLE" ? "Nom du couple *" : "Votre nom *"}
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={guestType === "COUPLE" ? "Dupont & Martin" : "Jean Dupont"}
          className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
        />
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+243 8X XXX XXXX"
          className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@example.com"
          className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
        />
      </div>

      {/* RSVP */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium text-gray-700">Votre réponse *</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRsvp("CONFIRMED")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors",
              rsvp === "CONFIRMED"
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            <Check className="h-4 w-4" />
            Je serai présent(e)
          </button>
          <button
            type="button"
            onClick={() => setRsvp("DECLINED")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors",
              rsvp === "DECLINED"
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            <X className="h-4 w-4" />
            Je ne pourrai pas
          </button>
        </div>
      </div>

      {/* Observation / meal pref */}
      {rsvp === "CONFIRMED" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mealPref" className="text-sm font-medium text-gray-700">
            Observation <span className="font-normal text-gray-400">(régime, allergie…)</span>
          </Label>
          <textarea
            id="mealPref"
            value={mealPref}
            onChange={(e) => setMealPref(e.target.value)}
            placeholder="Je suis végétarien, allergie aux arachides…"
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-300"
          />
        </div>
      )}

      {/* +1 section for couples */}
      {guestType === "COUPLE" && rsvp === "CONFIRMED" && (
        <button
          type="button"
          onClick={() => setShowPlusOne((v) => !v)}
          className="flex items-center gap-1.5 self-start text-sm text-rose-600 hover:underline"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", showPlusOne && "rotate-180")} />
          {showPlusOne ? "Masquer les détails accompagnant" : "Ajouter les détails accompagnant"}
        </button>
      )}

      {showPlusOne && guestType === "COUPLE" && rsvp === "CONFIRMED" && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Accompagnant(e)</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plusOneName" className="text-sm text-gray-700">Nom</Label>
            <Input
              id="plusOneName"
              value={plusOneName}
              onChange={(e) => setPlusOneName(e.target.value)}
              placeholder="Marie Martin"
              className="h-10 rounded-xl border-gray-200 bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plusOnePhone" className="text-sm text-gray-700">Téléphone</Label>
            <Input
              id="plusOnePhone"
              type="tel"
              value={plusOnePhone}
              onChange={(e) => setPlusOnePhone(e.target.value)}
              placeholder="+243 8X XXX XXXX"
              className="h-10 rounded-xl border-gray-200 bg-white"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="mt-1 h-12 w-full rounded-xl bg-rose-500 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
      >
        {isPending ? "Envoi en cours…" : "Confirmer ma réponse"}
      </button>
    </form>
  );
}
