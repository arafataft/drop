"use client";

import type { FileDto } from "@/types/transfer";
import { formatFileSize } from "@/lib/file-utils";

interface SessionDialogProps {
  peerAlias: string;
  files: FileDto[];
  onAccept: (fileIds: string[]) => void;
  onReject: () => void;
}

export function SessionDialog({ peerAlias, files, onAccept, onReject }: SessionDialogProps) {
  return (
    <div className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="glass-strong rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden animate-slide-up sm:animate-scale-in">
        {/* Handle for mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-[var(--card-border)]" />
        </div>

        <div className="p-5 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white font-bold">
              {peerAlias.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Incoming Transfer</h2>
              <p className="text-xs text-[var(--muted)]">
                from <strong className="text-[var(--foreground)]">{peerAlias}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto px-5 pb-3">
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between text-sm glass rounded-lg px-3 py-2">
                <span className="text-[var(--foreground)] truncate mr-3">{file.name}</span>
                <span className="text-[var(--muted)] shrink-0 text-xs">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 p-4 border-t border-[var(--glass-border)]">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors font-medium"
          >
            Decline
          </button>
          <button
            onClick={() => onAccept(files.map((f) => f.id))}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
