import { create } from "zustand";
import type { ClientInfo } from "@/types/peer";

interface PeerState {
  selfId: string | null;
  selfInfo: ClientInfo | null;
  peers: Map<string, ClientInfo>;
  isConnected: boolean;
  setSelfId: (id: string | null) => void;
  setSelfInfo: (info: ClientInfo | null) => void;
  setConnected: (connected: boolean) => void;
  addPeer: (peer: ClientInfo) => void;
  removePeer: (peerId: string) => void;
  updatePeer: (peer: ClientInfo) => void;
  setPeers: (peers: ClientInfo[]) => void;
  clearPeers: () => void;
}

export const usePeerStore = create<PeerState>()((set) => ({
  selfId: null,
  selfInfo: null,
  peers: new Map(),
  isConnected: false,
  setSelfId: (id) => set({ selfId: id }),
  setSelfInfo: (info) => set({ selfInfo: info }),
  setConnected: (connected) => set({ isConnected: connected }),
  addPeer: (peer) =>
    set((state) => {
      const peers = new Map(state.peers);
      peers.set(peer.id, peer);
      return { peers };
    }),
  removePeer: (peerId) =>
    set((state) => {
      const peers = new Map(state.peers);
      peers.delete(peerId);
      return { peers };
    }),
  updatePeer: (peer) =>
    set((state) => {
      const peers = new Map(state.peers);
      peers.set(peer.id, peer);
      return { peers };
    }),
  setPeers: (peersList) =>
    set(() => {
      const peers = new Map<string, ClientInfo>();
      for (const p of peersList) {
        peers.set(p.id, p);
      }
      return { peers };
    }),
  clearPeers: () => set({ peers: new Map() }),
}));
