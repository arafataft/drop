"use client";

import type { FileProgress as FileProgressType } from "@/types/transfer";
import { formatFileSize } from "@/lib/file-utils";

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
    <div className="flex items-center gap-3 py-2">
      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
        progress.status === "completed" ? "bg-[var(--success)]/10 text-[var(--success)]" :
        progress.status === "failed" ? "bg-[var(--danger)]/10 text-[var(--danger)]" :
        "bg-[var(--accent)]/10 text-[var(--accent)]"
      }`}>
        {progress.status === "completed" ? (
          <svg className="w-6 h-6 animate-scale-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="truncate text-[var(--foreground)]/90 font-medium pr-2">{progress.fileName || "..."}</span>
          <span className="text-[var(--muted)] shrink-0 tabular-nums">
            {formatFileSize(progress.bytesTransferred)} / {formatFileSize(progress.fileSize)} ({percent}%)
          </span>
        </div>
        <div className="h-1.5 bg-[var(--bar-track)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor} ${
              progress.status === "in-progress" ? "progress-active" : ""
            }`}
            style={{
              width: `${percent}%`,
              backgroundImage:
                progress.status === "in-progress"
                  ? "linear-gradient(90deg, var(--accent), #fb7185, var(--accent))"
                  : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
