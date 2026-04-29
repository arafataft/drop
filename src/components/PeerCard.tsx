"use client";

import type { ClientInfo } from "@/types/peer";

interface PeerCardProps {
  peer: ClientInfo;
  onSend: (peer: ClientInfo) => void;
}

export function PeerCard({ peer, onSend }: PeerCardProps) {
  return (
    <button
      onClick={() => onSend(peer)}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer min-w-[140px]"
    >
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-semibold">
        {peer.alias.charAt(0).toUpperCase()}
      </div>
      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
        {peer.alias}
      </div>
      <div className="text-xs text-gray-500">{peer.deviceModel}</div>
      <div className="text-xs text-gray-400">{peer.deviceType}</div>
    </button>
  );
}
