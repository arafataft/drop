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
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="glass-strong rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden animate-slide-up sm:animate-scale-in border-2 border-[var(--accent)] animate-pulse-border">
        {/* Handle for mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-[var(--card-border)]" />
        </div>

        <div className="p-5 pb-3 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-rose-400 flex items-center justify-center text-white font-bold relative">
              {peerAlias.charAt(0).toUpperCase()}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--success)] rounded-full border-2 border-white dark:border-[var(--card)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Incoming Transfer</h2>
              <p className="text-xs text-[var(--muted)]">
                from <strong className="text-[var(--foreground)]">{peerAlias}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto px-5 py-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 flex justify-between">
            <span>{files.length} File{files.length !== 1 ? 's' : ''}</span>
            <span>{formatFileSize(totalSize)} Total</span>
          </div>
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id} className="flex items-center text-sm glass rounded-lg px-3 py-2">
                <svg className="w-5 h-5 text-[var(--accent)] mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-[var(--foreground)] truncate flex-1">{file.name}</span>
                <span className="text-[var(--muted)] shrink-0 text-xs ml-3">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 p-4 border-t border-[var(--glass-border)] bg-[var(--card)]/50">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-all font-medium"
          >
            Decline
          </button>
          <button
            onClick={() => onAccept(files.map((f) => f.id))}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-gradient-to-r from-[var(--accent)] to-rose-400 text-white hover:from-[var(--accent-hover)] hover:to-rose-500 transition-all font-medium shadow-lg shadow-[var(--accent)]/30 hover:shadow-[var(--accent)]/50 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
