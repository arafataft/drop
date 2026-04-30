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
      <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-[var(--accent)]/30 group-hover:shadow-lg group-hover:shadow-[var(--accent)]/40 transition-shadow">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--foreground)] truncate">
          {peer.alias}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium mt-0.5">
          {peer.deviceType}
        </div>
      </div>
      <svg className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    </button>
  );
}
