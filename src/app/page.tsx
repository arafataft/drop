"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignaling } from "@/hooks/use-signaling";
import { useFileTransfer } from "@/hooks/use-file-transfer";
import { usePeerStore } from "@/store/peer-store";
import { useTransferStore } from "@/store/transfer-store";
import { useSettingsStore } from "@/store/settings-store";
import { useToastStore } from "@/store/toast-store";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { DeviceAliasInput } from "@/components/DeviceAliasInput";
import { PeerList } from "@/components/PeerList";
import { FilePicker } from "@/components/FilePicker";
import { TransferList } from "@/components/TransferList";
import { SessionDialog } from "@/components/SessionDialog";
import type { ClientInfo } from "@/types/peer";
import type { FileDto } from "@/types/transfer";
import type { WsServerMessage } from "@/types/signaling";

export default function Home() {
  const [selectedPeer, setSelectedPeer] = useState<ClientInfo | null>(null);
  const [sessionPrompt, setSessionPrompt] = useState<{
    sessionId: string;
    peerAlias: string;
    files: FileDto[];
    resolve: (fileIds: string[]) => void;
  } | null>(null);

  const { alias, setAlias, _hasHydrated } = useSettingsStore();
  const { addToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { peers, isConnected } = usePeerStore();
  const sessionsMap = useTransferStore((s) => s.sessions);
  const sessions = Array.from(sessionsMap.values());
  const peerArray = Array.from(peers.values());

  const { send, receive, setFileSelectCallback, cancel } = useFileTransfer();

  // Auto-dismiss session prompt if the session is cancelled or finishes
  useEffect(() => {
    if (sessionPrompt) {
      const session = sessionsMap.get(sessionPrompt.sessionId);
      if (!session || session.status !== "in-progress") {
        sessionPrompt.resolve([]);
        setSessionPrompt(null);
      }
    }
  }, [sessionsMap, sessionPrompt]);

  const handleOffer = useCallback(
    (offer: Extract<WsServerMessage, { type: "OFFER" }>) => {
      const peer = usePeerStore.getState().peers.get(offer.target);
      const peerAlias = peer?.alias ?? "Unknown Peer";
      addToast(`📥 ${peerAlias} wants to send you files`, "info");
      
      if (!signalingRef.current || !keyPairRef.current) return;
      receive({
        signaling: signalingRef.current,
        offer,
        keyPair: keyPairRef.current,
        peerAlias,
      }).catch(console.error);
    },
    [receive, addToast]
  );

  const handleJoin = useCallback((peer: ClientInfo) => {
    addToast(`🟢 ${peer.alias} joined the room`, "success");
  }, [addToast]);

  const handleLeft = useCallback((peer: ClientInfo) => {
    addToast(`🔴 ${peer.alias} left the room`, "info");
  }, [addToast]);

  const { connect, disconnect, signalingRef, keyPairRef } = useSignaling(handleOffer, handleJoin, handleLeft);

  // Auto-connect once on mount, but only after hydration
  useEffect(() => {
    if (_hasHydrated) {
      connect().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  // Setup file select callback
  useEffect(() => {
    setFileSelectCallback((files) => {
      return new Promise<string[]>((resolve) => {
        const sessions = Array.from(useTransferStore.getState().sessions.values());
        // Find the most recent receiving session that is in-progress
        const session = sessions.reverse().find(s => s.direction === "receiving" && s.status === "in-progress");
        const peerAlias = session?.peerAlias ?? "Peer";
        if (session) {
          setSessionPrompt({ sessionId: session.id, peerAlias, files, resolve });
        } else {
          resolve([]);
        }
      });
    });
  }, [setFileSelectCallback]);

  const handleReconnect = useCallback(async () => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  const handleSend = useCallback(
    async (peer: ClientInfo) => {
      setSelectedPeer(peer);
    },
    []
  );

  const handleFilesSelected = useCallback(
    async (files: FileList) => {
      if (!selectedPeer || !signalingRef.current || !keyPairRef.current) return;
      await send({
        signaling: signalingRef.current,
        targetId: selectedPeer.id,
        targetAlias: selectedPeer.alias,
        files,
        keyPair: keyPairRef.current,
      });
      setSelectedPeer(null);
    },
    [selectedPeer, send, signalingRef, keyPairRef]
  );

  const handleAcceptIncoming = useCallback(
    (fileIds: string[]) => {
      sessionPrompt?.resolve(fileIds);
      setSessionPrompt(null);
    },
    [sessionPrompt]
  );

  const handleRejectIncoming = useCallback(() => {
    sessionPrompt?.resolve([]);
    setSessionPrompt(null);
  }, [sessionPrompt]);

  return (
    <div className="flex flex-col min-h-svh relative">
      {/* Background orbs */}
      <div className="orb-green" />
      <div className="orb-orange" />

      {/* Top bar */}
      <header className="sticky top-0 z-40 glass-strong border-b border-[var(--glass-border)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-rose-400 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-[var(--foreground)] tracking-tight">DROP</h1>
          </div>

          <div className="flex items-center gap-3">
            <DeviceAliasInput alias={mounted ? alias : ""} onAliasChange={setAlias} />
            <ConnectionStatus isConnected={isConnected} onReconnect={handleReconnect} peerCount={peerArray.length} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6 relative z-10">
        {/* File picker (when peer selected) */}
        {selectedPeer && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPeer(null)}
                  className="w-7 h-7 rounded-lg glass flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="text-sm text-[var(--muted)]">
                  Send to <strong className="text-[var(--foreground)]">{selectedPeer.alias}</strong>
                </span>
              </div>
            </div>
            <FilePicker onFilesSelected={handleFilesSelected} />
          </section>
        )}

        {/* Peer list */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Nearby</h2>
          <p className="text-[10px] text-[var(--muted)]/50 mb-3">Devices must be on the same WiFi or local network</p>
          <PeerList peers={peerArray} onSend={handleSend} />
        </section>

        {/* Transfers */}
        {sessions.length > 0 && (
          <section>
            <TransferList sessions={sessions} onCancel={cancel} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="glass border-t border-[var(--glass-border)] py-4">
        <p className="text-center text-[10px] text-[var(--muted)]/40 uppercase tracking-widest">
          Peer-to-peer &middot; End-to-end &middot; No server storage
        </p>
      </footer>

      {/* Incoming transfer dialog */}
      {sessionPrompt && (
        <SessionDialog
          peerAlias={sessionPrompt.peerAlias}
          files={sessionPrompt.files}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
        />
      )}
    </div>
  );
}
