"use client";

import { useState, useEffect } from "react";
import { Mail, UserMinus, ChevronDown } from "lucide-react";

type CollaboratorRole = "ADMIN" | "EDITOR" | "VIEWER";

type Collaborator = {
  id: string;
  role: CollaboratorRole;
  user: { id: string; name: string | null; email: string };
};

type Invite = {
  id: string;
  email: string;
  role: CollaboratorRole;
  createdAt: string;
  expiresAt: string;
};

const ROLE_LABEL: Record<CollaboratorRole, string> = {
  ADMIN: "Admin",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
};

type Props = {
  weddingId: string;
  currentUserId: string;
  canManage: boolean; // owner or admin
};

export function CollaboratorManager({ weddingId, currentUserId, canManage }: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("EDITOR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/wedding/${weddingId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators ?? []);
        setInvites(data.invites ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [weddingId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/wedding/${weddingId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: Record<string, string> = {
          already_collaborator: "Cet utilisateur est déjà collaborateur.",
          cannot_invite_self: "Vous ne pouvez pas vous inviter vous-même.",
          forbidden: "Accès refusé.",
        };
        setError(msg[data.error] ?? "Une erreur est survenue.");
        return;
      }
      setEmail("");
      setSuccess("Invitation envoyée à " + email.trim());
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(collaboratorId: string, newRole: CollaboratorRole) {
    const res = await fetch(`/api/wedding/${weddingId}/collaborators/${collaboratorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) await load();
  }

  async function handleRemove(collaboratorId: string) {
    const res = await fetch(`/api/wedding/${weddingId}/collaborators/${collaboratorId}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  }

  if (loading) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-sm font-semibold">Collaborateurs</h2>

      {/* Current collaborators */}
      {collaborators.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {collaborators.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{c.user.name ?? c.user.email}</p>
                    <p className="text-xs text-muted-foreground">{c.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="relative inline-block">
                        <select
                          value={c.role}
                          onChange={(e) => handleRoleChange(c.id, e.target.value as CollaboratorRole)}
                          className="appearance-none rounded-md border border-border bg-background py-1 pl-2 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="VIEWER">Lecteur</option>
                          <option value="EDITOR">Éditeur</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {ROLE_LABEL[c.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(canManage || c.user.id === currentUserId) && (
                      <button
                        onClick={() => handleRemove(c.id)}
                        title={c.user.id === currentUserId ? "Quitter" : "Retirer"}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          <table className="w-full text-xs text-muted-foreground">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-5 py-2 text-left font-medium">En attente</th>
                <th className="px-4 py-2 text-center font-medium">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td className="flex items-center gap-2 px-5 py-2">
                    <Mail className="h-3 w-3 shrink-0" />
                    {inv.email}
                  </td>
                  <td className="px-4 py-2 text-center">{ROLE_LABEL[inv.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite form — only for owner / admin */}
      {canManage && (
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); setSuccess(null); }}
            placeholder="Email du collaborateur"
            required
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              className="h-9 appearance-none rounded-lg border border-border bg-background py-0 pl-3 pr-7 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="VIEWER">Lecteur</option>
              <option value="EDITOR">Éditeur</option>
              <option value="ADMIN">Admin</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
          >
            {submitting ? "Envoi…" : "Inviter"}
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {success && <p className="mt-2 text-xs text-emerald-600">{success}</p>}
    </div>
  );
}
