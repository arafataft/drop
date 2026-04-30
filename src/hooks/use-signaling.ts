"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SignalingConnection } from "@/services/signaling";
import { usePeerStore } from "@/store/peer-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  generateKeyPair,
  upgradeToEd25519IfSupported,
  generateClientToken,
  getFingerprint,
} from "@/services/crypto";
import type { ClientInfoWithoutId, ClientInfo, PeerDeviceType } from "@/types/peer";
import type { WsServerMessage } from "@/types/signaling";
import { PROTOCOL_VERSION } from "@/lib/constants";

interface UseSignalingReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  signalingRef: React.MutableRefObject<SignalingConnection | null>;
  keyPairRef: React.MutableRefObject<CryptoKeyPair | null>;
  connectionError: string | null;
}

export function useSignaling(
  onOffer?: (offer: Extract<WsServerMessage, { type: "OFFER" }>) => void,
  onJoin?: (peer: ClientInfo) => void,
  onLeft?: (peer: ClientInfo) => void
): UseSignalingReturn {
  const signalingRef = useRef<SignalingConnection | null>(null);
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const fingerprintRef = useRef<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const {
    setSelfId,
    setSelfInfo,
    setConnected,
    addPeer,
    removePeer,
    updatePeer,
    setPeers,
    clearPeers,
  } = usePeerStore();

  const { alias } = useSettingsStore();

  const buildClientInfo = useCallback(
    async (keyPair: CryptoKeyPair): Promise<ClientInfoWithoutId> => {
      const token = await generateClientToken(keyPair);
      const fingerprint = await getFingerprint(keyPair);
      fingerprintRef.current = fingerprint;
      return {
        alias,
        version: PROTOCOL_VERSION,
        deviceModel: "Web Browser",
        deviceType: "web" as PeerDeviceType,
        token,
        fingerprint,
      };
    },
    [alias]
  );

  const connect = useCallback(async () => {
    if (signalingRef.current?.isConnected) return;

    if (!crypto?.subtle) {
      setConnectionError("Secure context required. Access this app via https:// or localhost.");
      return;
    }

    try {
      setConnectionError(null);

      // Generate key pair
      await upgradeToEd25519IfSupported();
      const keyPair = await generateKeyPair();
      keyPairRef.current = keyPair;

      const info = await buildClientInfo(keyPair);

      const connection = await SignalingConnection.connect(info, {
        onMessage: (message: WsServerMessage) => {
          switch (message.type) {
            case "HELLO":
              setSelfId(message.client.id);
              setSelfInfo(message.client);
              setPeers(message.peers);
              break;
            case "JOIN":
              addPeer(message.peer);
              onJoin?.(message.peer);
              break;
            case "LEFT": {
              const peer = usePeerStore.getState().peers.get(message.peerId);
              if (peer) onLeft?.(peer);
              removePeer(message.peerId);
              break;
            }
            case "UPDATE":
              updatePeer(message.peer);
              break;
            case "OFFER":
              onOffer?.(message);
              break;
            case "ANSWER":
              // Handled by signaling connection internally
              break;
            case "ERROR":
              console.error("Signaling error:", message.message);
              break;
          }
        },
        onClose: () => {
          setConnected(false);
          clearPeers();
          signalingRef.current = null;
        },
        generateNewInfo: async () => {
          if (!keyPairRef.current) throw new Error("No key pair");
          return buildClientInfo(keyPairRef.current);
        },
      });

      signalingRef.current = connection;
      setConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setConnectionError(message);
      setConnected(false);
    }
  }, [buildClientInfo, setSelfId, setSelfInfo, setConnected, addPeer, removePeer, updatePeer, setPeers, clearPeers, onOffer, onJoin, onLeft]);

  const disconnect = useCallback(() => {
    signalingRef.current?.close();
    signalingRef.current = null;
    setConnected(false);
    clearPeers();
    setSelfId(null);
    setSelfInfo(null);
  }, [setConnected, clearPeers, setSelfId, setSelfInfo]);

  useEffect(() => {
    return () => {
      signalingRef.current?.close();
    };
  }, []);

  return { connect, disconnect, signalingRef, keyPairRef, connectionError };
}
