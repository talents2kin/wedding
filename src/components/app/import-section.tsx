"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { GuestImporter } from "@/components/app/guest-importer";

type Props = {
  weddingId: string;
};

export function ImportSection({ weddingId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Upload className="h-4 w-4" />
        Importer
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Import CSV / Excel</p>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <GuestImporter
        weddingId={weddingId}
        onImported={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
