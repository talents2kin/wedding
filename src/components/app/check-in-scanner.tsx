"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Search, UserCheck, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Guest = { id: string; name: string };

type CheckInEntry = { guestId: string; guestName: string; arrivedAt: string };

type Stats = {
  ceremonyLabel: string;
  totalExpected: number;
  arrivedCount: number;
  guests: Guest[];
  checkIns: CheckInEntry[];
};

type FeedbackState =
  | { kind: "idle" }
  | { kind: "success"; guestName: string }
  | { kind: "already"; guestName: string; arrivedAt: string }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// BarcodeDetector type declaration (not in lib.dom yet)
// ---------------------------------------------------------------------------

declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>;
  constructor(options?: { formats: string[] });
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<{ rawValue: string }[]>;
}

const hasBarcodeDetector = typeof BarcodeDetector !== "undefined";

// ---------------------------------------------------------------------------
// CheckInScanner
// ---------------------------------------------------------------------------

export function CheckInScanner({
  token,
  initialStats,
}: {
  token: string;
  initialStats: Stats;
}) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"scan" | "search" | "log">("scan");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const processingRef = useRef(false);

  // ── Polling: refresh stats every 5 s ─────────────────────────────────────

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/check-in/${token}`);
      if (res.ok) setStats(await res.json());
    } catch {
      // network error — ignore, keep stale
    }
  }, [token]);

  useEffect(() => {
    const id = setInterval(refreshStats, 5000);
    return () => clearInterval(id);
  }, [refreshStats]);

  // ── Camera lifecycle ──────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (hasBarcodeDetector) {
        detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      }
      setCameraActive(true);
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, []);

  // ── QR scan loop (BarcodeDetector) ───────────────────────────────────────

  const processCheckIn = useCallback(
    async (qr: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      stopCamera();

      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, qr }),
      });

      const data = await res.json();

      if (res.status === 201) {
        setFeedback({ kind: "success", guestName: data.guest.name });
        await refreshStats();
      } else if (res.status === 409) {
        setFeedback({
          kind: "already",
          guestName: data.guest.name,
          arrivedAt: data.arrivedAt,
        });
      } else {
        const msgMap: Record<string, string> = {
          invalid_qr: "QR code invalide.",
          wrong_ceremony: "Ce QR code est pour une autre cérémonie.",
          not_invited: "Cet invité n'est pas assigné à cette cérémonie.",
        };
        setFeedback({ kind: "error", message: msgMap[data.error] ?? "Erreur inattendue." });
      }

      processingRef.current = false;
    },
    [token, refreshStats, stopCamera]
  );

  useEffect(() => {
    if (!cameraActive || !hasBarcodeDetector || !detectorRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const detector = detectorRef.current;

    async function tick() {
      if (!processingRef.current && video.readyState >= 2) {
        try {
          const results = await detector.detect(video);
          if (results.length > 0) {
            await processCheckIn(results[0].rawValue);
            return;
          }
        } catch {
          // detector error — continue
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraActive, processCheckIn]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── File input fallback (when BarcodeDetector not supported) ─────────────

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // We can't decode without a library; ask user to try manual search instead
    setFeedback({
      kind: "error",
      message:
        "Scan depuis fichier non supporté sur ce navigateur. Utilisez la recherche manuelle.",
    });
    e.target.value = "";
  }

  // ── Manual check-in ───────────────────────────────────────────────────────

  async function checkInManually(guestId: string) {
    const res = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, guestId }),
    });
    const data = await res.json();

    if (res.status === 201) {
      setFeedback({ kind: "success", guestName: data.guest.name });
      setSearch("");
      await refreshStats();
    } else if (res.status === 409) {
      setFeedback({
        kind: "already",
        guestName: data.guest.name,
        arrivedAt: data.arrivedAt,
      });
    } else {
      setFeedback({ kind: "error", message: "Erreur lors du check-in." });
    }
  }

  const checkedInIds = new Set(stats.checkIns.map((c) => c.guestId));
  const filteredGuests = search.trim()
    ? stats.guests.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const pct =
    stats.totalExpected > 0
      ? Math.round((stats.arrivedCount / stats.totalExpected) * 100)
      : 0;

  return (
    <div className="flex min-h-svh flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4">
        <h1 className="text-lg font-bold">{stats.ceremonyLabel}</h1>
        <div className="mt-2 flex items-center gap-3">
          {/* Progress bar */}
          <div className="flex-1 overflow-hidden rounded-full bg-white/10 h-2">
            <div
              className="h-2 rounded-full bg-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-emerald-400">
            {stats.arrivedCount} / {stats.totalExpected}
          </span>
        </div>
        <p className="mt-1 text-xs text-white/40">{pct}% arrivés</p>
      </header>

      {/* Feedback toast */}
      {feedback.kind !== "idle" && (
        <div
          className={cn(
            "mx-4 mt-3 flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
            feedback.kind === "success"
              ? "bg-emerald-500/20 text-emerald-300"
              : feedback.kind === "already"
              ? "bg-amber-500/20 text-amber-300"
              : "bg-red-500/20 text-red-300"
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="flex-1">
            {feedback.kind === "success" && (
              <p>
                <span className="font-semibold">{feedback.guestName}</span> — arrivé(e) !
              </p>
            )}
            {feedback.kind === "already" && (
              <p>
                <span className="font-semibold">{feedback.guestName}</span> — déjà enregistré(e) à{" "}
                {new Date(feedback.arrivedAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {feedback.kind === "error" && <p>{feedback.message}</p>}
          </div>
          <button
            onClick={() => setFeedback({ kind: "idle" })}
            className="text-white/40 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 pt-4">
        {(["scan", "search", "log"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t !== "scan") stopCamera();
              setTab(t);
            }}
            className={cn(
              "flex-1 pb-3 text-sm font-medium transition-colors",
              tab === t
                ? "border-b-2 border-emerald-400 text-emerald-400"
                : "text-white/40 hover:text-white"
            )}
          >
            {t === "scan" ? "Scanner" : t === "search" ? "Rechercher" : "Journal"}
          </button>
        ))}
      </div>

      {/* Tab: Scanner */}
      {tab === "scan" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          {cameraError && (
            <p className="text-center text-sm text-red-400">{cameraError}</p>
          )}

          {cameraActive ? (
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-emerald-400/50">
              {/* Corner marks */}
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className="absolute top-3 left-3 h-8 w-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-3 right-3 h-8 w-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                {/* Scan line */}
                <div className="scan-line absolute left-4 right-4 h-0.5 bg-emerald-400/60" />
              </div>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full rounded-2xl"
                style={{ aspectRatio: "1/1", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <Camera className="h-12 w-12 text-white/30" />
              <p className="text-sm text-white/60">
                Pointez la caméra vers le QR code de l'invitation.
              </p>
            </div>
          )}

          <div className="flex w-full max-w-sm flex-col gap-2">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-95"
              >
                <Camera className="h-4 w-4" />
                Activer la caméra
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/5"
              >
                Arrêter
              </button>
            )}

            {/* File input fallback (non-BarcodeDetector browsers) */}
            {!hasBarcodeDetector && (
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/5">
                <Camera className="h-4 w-4" />
                Photo du QR code
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
            )}

            <button
              onClick={() => { stopCamera(); setTab("search"); }}
              className="text-xs text-white/30 hover:text-white/60"
            >
              Pas de QR code ? Rechercher par nom →
            </button>
          </div>
        </div>
      )}

      {/* Tab: Manual search */}
      {tab === "search" && (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              autoFocus
              type="text"
              placeholder="Nom de l'invité…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/30 hover:text-white">
                ×
              </button>
            )}
          </div>

          {filteredGuests.length > 0 ? (
            <ul className="flex flex-col gap-1 overflow-y-auto">
              {filteredGuests.map((guest) => {
                const arrived = checkedInIds.has(guest.id);
                return (
                  <li
                    key={guest.id}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
                  >
                    {arrived ? (
                      <UserCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border border-white/20" />
                    )}
                    <span className={cn("flex-1 text-sm", arrived && "text-white/40 line-through")}>
                      {guest.name}
                    </span>
                    {!arrived && (
                      <button
                        onClick={() => checkInManually(guest.id)}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 active:scale-95"
                      >
                        Arrivé(e)
                      </button>
                    )}
                    {arrived && (
                      <span className="text-xs text-emerald-400">Enregistré</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : search.trim() ? (
            <p className="text-center text-sm text-white/40">Aucun invité trouvé.</p>
          ) : (
            <p className="text-center text-sm text-white/30">Commencez à taper pour rechercher.</p>
          )}
        </div>
      )}

      {/* Tab: Log */}
      {tab === "log" && (
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/60">
              Arrivées ({stats.checkIns.length})
            </h2>
            <button
              onClick={refreshStats}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:bg-white/5"
            >
              <RefreshCw className="h-3 w-3" />
              Actualiser
            </button>
          </div>

          {stats.checkIns.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-sm text-white/30">Aucune arrivée enregistrée.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1 overflow-y-auto">
              {stats.checkIns.map((entry, i) => (
                <li
                  key={`${entry.guestId}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
                >
                  <UserCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="flex-1 text-sm">{entry.guestName}</span>
                  <span className="text-xs text-white/30">
                    {new Date(entry.arrivedAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
