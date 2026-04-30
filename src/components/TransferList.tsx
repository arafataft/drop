"use client";

import type { TransferSession } from "@/types/transfer";
import { FileProgress } from "./FileProgress";
import { useTransferStore } from "@/store/transfer-store";

interface TransferListProps {
  sessions: TransferSession[];
  onCancel: (sessionId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  "in-progress": { label: "Transferring", color: "bg-[var(--accent)]/20 text-[var(--accent)]" },
  "waiting-for-accept": { label: "Waiting", color: "bg-blue-500/20 text-blue-400" },
  "waiting-for-pin": { label: "PIN Required", color: "bg-purple-500/20 text-purple-400" },
  completed: { label: "Done", color: "bg-[var(--success)]/20 text-[var(--success)]" },
  failed: { label: "Failed", color: "bg-[var(--danger)]/20 text-[var(--danger)]" },
  rejected: { label: "Rejected", color: "bg-yellow-500/20 text-yellow-400" },
};

export function TransferList({ sessions, onCancel }: TransferListProps) {
  const removeSession = useTransferStore((s) => s.removeSession);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Transfers</h3>
      {sessions.map((session) => {
        const status = statusConfig[session.status] ?? statusConfig["in-progress"];
        const isFinished = session.status !== "in-progress" && session.status !== "waiting-for-accept" && session.status !== "waiting-for-pin";
        
        return (
          <div
            key={session.id}
            className="glass rounded-2xl p-4 relative group"
          >
            {isFinished ? (
              <button
                onClick={() => removeSession(session.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-[var(--card)] opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] hover:text-[var(--danger)]"
                title="Clear transfer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onCancel(session.id)}
                className="absolute top-3 right-3 p-1 text-xs rounded-md bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="Cancel transfer"
              >
                Cancel
              </button>
            )}
            
            <div className="flex items-center justify-between mb-3 pr-8">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <span className="text-[var(--muted)]">
                  {session.direction === "sending" ? "To" : "From"}
                </span>
                <span className="font-semibold">{session.peerAlias}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="space-y-2">
              {Array.from(session.fileProgress.values()).map((fp) => (
                <FileProgress key={fp.fileId} progress={fp} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
