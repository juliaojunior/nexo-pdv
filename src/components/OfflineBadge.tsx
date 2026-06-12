"use client";

import { useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { WifiOff, CloudUpload, AlertTriangle } from "lucide-react";
import { db } from "@/db/db";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Chip de status no header: offline / vendas aguardando sync / vendas rejeitadas
export function OfflineBadge() {
  // Server snapshot `true`: no SSR assumimos online para não piscar o chip
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );

  const pendingCount = useLiveQuery(
    () => db.pendingSales.where("status").equals("pending").count(),
    [],
    0
  );
  const failedCount = useLiveQuery(
    () => db.pendingSales.where("status").equals("failed").count(),
    [],
    0
  );

  if (failedCount > 0) {
    return (
      <span className="flex items-center gap-1 bg-danger/15 text-danger border border-danger/40 rounded-full px-2.5 py-1 text-[11px] font-bold">
        <AlertTriangle size={12} /> {failedCount}
      </span>
    );
  }

  if (!online) {
    return (
      <span className="flex items-center gap-1 bg-surface-raised text-muted border border-border/50 rounded-full px-2.5 py-1 text-[11px] font-bold">
        <WifiOff size={12} /> Offline{pendingCount > 0 ? ` · ${pendingCount}` : ""}
      </span>
    );
  }

  if (pendingCount > 0) {
    return (
      <span className="flex items-center gap-1 bg-primary/15 text-primary-bright border border-primary/40 rounded-full px-2.5 py-1 text-[11px] font-bold">
        <CloudUpload size={12} /> {pendingCount}
      </span>
    );
  }

  return null;
}
