"use client";

import type { ClientInfo } from "@/types/peer";
import { PeerCard } from "./PeerCard";

interface PeerListProps {
  peers: ClientInfo[];
  onSend: (peer: ClientInfo) => void;
}

export function PeerList({ peers, onSend }: PeerListProps) {
  if (peers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4 animate-pulse">
          <svg className="w-7 h-7 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--muted)]">Scanning for devices</p>
        <p className="text-xs text-[var(--muted)]/60 mt-1 max-w-[240px]">
          Open this page on another device to start sharing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {peers.map((peer) => (
        <PeerCard key={peer.id} peer={peer} onSend={onSend} />
      ))}
    </div>
  );
}
