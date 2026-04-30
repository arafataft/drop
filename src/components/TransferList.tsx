"use client";

import type { TransferSession } from "@/types/transfer";
import { FileProgress } from "./FileProgress";

interface TransferListProps {
  sessions: TransferSession[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  "in-progress": { label: "Transferring", color: "bg-[var(--accent)]/20 text-[var(--accent)]" },
  completed: { label: "Done", color: "bg-[var(--success)]/20 text-[var(--success)]" },
  failed: { label: "Failed", color: "bg-[var(--danger)]/20 text-[var(--danger)]" },
  rejected: { label: "Rejected", color: "bg-yellow-500/20 text-yellow-400" },
};

export function TransferList({ sessions }: TransferListProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Transfers</h3>
      {sessions.map((session) => {
        const status = statusConfig[session.status] ?? statusConfig["in-progress"];
        return (
          <div
            key={session.id}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
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
