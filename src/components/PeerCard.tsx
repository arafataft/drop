"use client";

import type { ClientInfo } from "@/types/peer";

interface PeerCardProps {
  peer: ClientInfo;
  onSend: (peer: ClientInfo) => void;
}

export function PeerCard({ peer, onSend }: PeerCardProps) {
  const initial = peer.alias.charAt(0).toUpperCase();

  return (
    <button
      onClick={() => onSend(peer)}
      className="group glass flex items-center gap-3 p-3.5 rounded-2xl hover:border-[var(--accent)] transition-all cursor-pointer animate-scale-in w-full text-left"
    >
      <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent)] to-rose-400 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-[var(--accent)]/30 group-hover:shadow-lg group-hover:shadow-[var(--accent)]/40 transition-shadow relative">
        {initial}
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[var(--success)] rounded-full border-2 border-white dark:border-[var(--card)] animate-pulse-dot" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--foreground)] truncate">
          {peer.alias}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium mt-0.5 flex items-center gap-1.5">
          {peer.deviceType === "mobile" && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          )}
          {peer.deviceType === "desktop" && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          )}
          {peer.deviceType === "web" && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          )}
          {peer.deviceType}
        </div>
      </div>
      <svg className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    </button>
  );
}
