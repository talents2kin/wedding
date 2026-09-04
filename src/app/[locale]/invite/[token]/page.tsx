"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type InviteInfo = {
  weddingId: string;
  weddingName: string;
  weddingDate: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  expiresAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
};

const ROLE_DESC: Record<string, string> = {
  ADMIN: "Accès complet sauf suppression du mariage",
  EDITOR: "Gérer invités, cérémonies, plan de table et invitations",
  VIEWER: "Lecture seule",
};

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(
            data.error === "expired"
              ? "Ce lien d'invitation a expiré."
              : data.error === "already_accepted"
              ? "Cette invitation a déjà été acceptée."
              : "Invitation introuvable."
          );
        } else {
          setInvite(data);
        }
      })
      .catch(() => setError("Impossible de charger l'invitation."));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "unauthorized") {
          router.push(`/sign-in?redirect=/invite/${token}`);
          return;
        }
        if (data.error === "email_mismatch") {
          setError("Ce lien d'invitation ne correspond pas à votre compte. Connectez-vous avec l'adresse " + invite?.email);
          return;
        }
        setError("Une erreur est survenue. Réessayez.");
        return;
      }
      setAccepted(true);
      setTimeout(() => router.push(`/weddings/${data.weddingId}`), 2000);
    } finally {
      setAccepting(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-4 text-3xl">🎉</div>
          <h1 className="mb-2 text-lg font-semibold">Invitation acceptée !</h1>
          <p className="text-sm text-muted-foreground">Redirection vers le mariage…</p>
        </div>
      </div>
    );
  }

  const date = new Date(invite.weddingDate);
  const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">Invitation à collaborer</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Vous avez été invité à rejoindre l'organisation d'un mariage.
        </p>

        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-base font-semibold">{invite.weddingName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{dateStr}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {ROLE_LABEL[invite.role]}
            </span>
            <span className="text-xs text-muted-foreground">{ROLE_DESC[invite.role]}</span>
          </div>
        </div>

        <p className="mb-6 text-xs text-muted-foreground">
          Invitation envoyée à <span className="font-medium">{invite.email}</span>.
          Connectez-vous avec ce compte pour accepter.
        </p>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
        >
          {accepting ? "Acceptation…" : "Accepter l'invitation"}
        </button>
      </div>
    </div>
  );
}
