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
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No peers discovered</p>
        <p className="text-sm mt-1">
          Make sure other devices are connected to the same network and have this app open.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {peers.map((peer) => (
        <PeerCard key={peer.id} peer={peer} onSend={onSend} />
      ))}
    </div>
  );
}
