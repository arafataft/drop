"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignaling } from "@/hooks/use-signaling";
import { useFileTransfer } from "@/hooks/use-file-transfer";
import { usePeerStore } from "@/store/peer-store";
import { useTransferStore } from "@/store/transfer-store";
import { useSettingsStore } from "@/store/settings-store";
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
  const [incomingOffer, setIncomingOffer] = useState<{
    offer: Extract<WsServerMessage, { type: "OFFER" }>;
    peerAlias: string;
  } | null>(null);
  const [incomingFiles, setIncomingFiles] = useState<FileDto[]>([]);
  const [fileSelectResolve, setFileSelectResolve] = useState<((ids: string[]) => void) | null>(null);

  const { alias, setAlias, initAlias } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Initialize alias and mark client-side mount
  useEffect(() => {
    initAlias();
    setMounted(true);
  }, [initAlias]);
  const { peers, isConnected } = usePeerStore();
  const sessionsMap = useTransferStore((s) => s.sessions);
  const sessions = Array.from(sessionsMap.values());
  const peerArray = Array.from(peers.values());

  const handleOffer = useCallback(
    (offer: Extract<WsServerMessage, { type: "OFFER" }>) => {
      const peer = peers.get(offer.target);
      setIncomingOffer({
        offer,
        peerAlias: peer?.alias ?? "Unknown Peer",
      });
    },
    [peers]
  );

  const { connect, disconnect, signalingRef, keyPairRef, connectionError } = useSignaling(handleOffer);
  const { send, receive } = useFileTransfer();

  // Auto-connect once on mount
  useEffect(() => {
    connect().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    async (fileIds: string[]) => {
      if (!incomingOffer || !signalingRef.current || !keyPairRef.current) return;
      setIncomingOffer(null);

      await receive({
        signaling: signalingRef.current,
        offer: incomingOffer.offer,
        keyPair: keyPairRef.current,
      });
    },
    [incomingOffer, receive, signalingRef, keyPairRef]
  );

  const handleRejectIncoming = useCallback(() => {
    setIncomingOffer(null);
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex flex-1 w-full max-w-2xl flex-col py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">DROP</h1>
            <p className="text-sm text-gray-500">Peer-to-peer file sharing</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">You are:</span>
              <DeviceAliasInput alias={mounted ? alias : ""} onAliasChange={setAlias} />
            </div>
            <ConnectionStatus
              isConnected={isConnected}
              onConnect={connect}
              onDisconnect={disconnect}
            />
          </div>
        </div>

        {/* Error Banner */}
        {connectionError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <p className="font-medium">Connection failed</p>
            <p className="text-red-500 mt-0.5">{connectionError}</p>
            <button
              onClick={() => connect()}
              className="mt-2 text-xs px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Peer List */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Nearby Devices</h2>
          <PeerList peers={peerArray} onSend={handleSend} />
        </section>

        {/* File Picker (shown when peer selected) */}
        {selectedPeer && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">
                Send to <strong>{selectedPeer.alias}</strong>
              </h2>
              <button
                onClick={() => setSelectedPeer(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <FilePicker onFilesSelected={handleFilesSelected} />
          </section>
        )}

        {/* Transfer List */}
        {sessions.length > 0 && (
          <section className="mt-6">
            <TransferList sessions={sessions} />
          </section>
        )}

        {/* Incoming Transfer Dialog */}
        {incomingOffer && (
          <SessionDialog
            peerAlias={incomingOffer.peerAlias}
            files={incomingFiles.length > 0 ? incomingFiles : []}
            onAccept={handleAcceptIncoming}
            onReject={handleRejectIncoming}
          />
        )}
      </main>
    </div>
  );
}
