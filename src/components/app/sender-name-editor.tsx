"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  weddingId: string;
  initialValue: string | null;
};

export function SenderNameEditor({ weddingId, initialValue }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [saved, setSaved] = useState(initialValue ?? "");
  const [isPending, startTransition] = useTransition();

  async function save() {
    startTransition(async () => {
      await fetch(`/api/wedding/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName: value.trim() || null }),
      });
      setSaved(value.trim());
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Marie & Pierre"
          className="h-7 w-48 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setValue(saved); setEditing(false); }
          }}
        />
        <button onClick={save} disabled={isPending} className="rounded-md p-1 hover:bg-muted">
          <Check className="h-3.5 w-3.5 text-primary" />
        </button>
        <button onClick={() => { setValue(saved); setEditing(false); }} className="rounded-md p-1 hover:bg-muted">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <span>{saved || "Définir le nom d'expéditeur"}</span>
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
