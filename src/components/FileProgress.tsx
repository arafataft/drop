"use client";

import type { FileProgress as FileProgressType } from "@/types/transfer";

interface FileProgressProps {
  progress: FileProgressType;
}

export function FileProgress({ progress }: FileProgressProps) {
  const percent =
    progress.fileSize > 0
      ? Math.round((progress.bytesTransferred / progress.fileSize) * 100)
      : 0;

  const barColor =
    progress.status === "completed"
      ? "bg-[var(--success)]"
      : progress.status === "failed"
      ? "bg-[var(--danger)]"
      : "bg-[var(--accent)]";

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="truncate text-[var(--foreground)]/80 pr-2">{progress.fileName || "..."}</span>
          <span className="text-[var(--muted)] shrink-0 tabular-nums">{percent}%</span>
        </div>
        <div className="h-1 bg-[var(--bar-track)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor} ${
              progress.status === "in-progress" ? "progress-active" : ""
            }`}
            style={{
              width: `${percent}%`,
              backgroundImage:
                progress.status === "in-progress"
                  ? "linear-gradient(90deg, var(--accent), #a78bfa, var(--accent))"
                  : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
