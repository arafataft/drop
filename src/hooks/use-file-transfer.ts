"use client";

import { useCallback, useRef } from "react";
import { sendFiles, receiveFiles } from "@/services/webrtc";
import { useTransferStore } from "@/store/transfer-store";
import { useSettingsStore } from "@/store/settings-store";
import type { FileDto } from "@/types/transfer";
import type { SignalingConnection } from "@/services/signaling";
import type { WsServerMessage } from "@/types/signaling";

interface UseFileTransferReturn {
  send: (opts: {
    signaling: SignalingConnection;
    targetId: string;
    targetAlias: string;
    files: FileList;
    keyPair: CryptoKeyPair;
  }) => Promise<void>;
  receive: (opts: {
    signaling: SignalingConnection;
    offer: Extract<WsServerMessage, { type: "OFFER" }>;
    keyPair: CryptoKeyPair;
    peerAlias: string;
  }) => Promise<void>;
  pendingOffer: React.MutableRefObject<Extract<WsServerMessage, { type: "OFFER" }> | null>;
  setPinPrompt: (prompt: string | null) => void;
  pinPrompt: string | null;
  setFileSelectCallback: (cb: ((files: FileDto[]) => Promise<string[]>) | null) => void;
}

export function useFileTransfer(): UseFileTransferReturn {
  const { addSession, updateSessionStatus, updateFileProgress } = useTransferStore();
  const { pin } = useSettingsStore();
  const pendingOffer = useRef<Extract<WsServerMessage, { type: "OFFER" }> | null>(null);
  const pinPromptRef = useRef<string | null>(null);
  const pinResolveRef = useRef<((pin: string) => void) | null>(null);
  const fileSelectCbRef = useRef<((files: FileDto[]) => Promise<string[]>) | null>(null);

  const setPinPrompt = useCallback((prompt: string | null) => {
    pinPromptRef.current = prompt;
  }, []);

  const setFileSelectCallback = useCallback(
    (cb: ((files: FileDto[]) => Promise<string[]>) | null) => {
      fileSelectCbRef.current = cb;
    },
    []
  );

  const send = useCallback(
    async (opts: {
      signaling: SignalingConnection;
      targetId: string;
      targetAlias: string;
      files: FileList;
      keyPair: CryptoKeyPair;
    }) => {
      const { signaling, targetId, targetAlias, files, keyPair } = opts;

      const fileDtoList: FileDto[] = [];
      const fileMap = new Map<string, File>();

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const id = crypto.randomUUID();
        fileDtoList.push({
          id,
          name: f.name,
          size: f.size,
          mimeType: f.type || "application/octet-stream",
        });
        fileMap.set(id, f);
      }

      const sessionId = crypto.randomUUID();
      addSession({
        id: sessionId,
        peerId: targetId,
        peerAlias: targetAlias,
        direction: "sending",
        status: "in-progress",
        files: fileDtoList,
        fileProgress: new Map(),
        createdAt: Date.now(),
      });

      try {
        await sendFiles({
          signaling,
          fileDtoList,
          fileMap,
          targetId,
          keyPair,
          publicKeyPem: "",
          pin: pin || undefined,
          onFileProgress: (sid, fileId, bytes, total) => {
            updateFileProgress(sid, {
              fileId,
              fileName: fileDtoList.find((f) => f.id === fileId)?.name ?? "",
              fileSize: total,
              bytesTransferred: bytes,
              status: bytes >= total ? "completed" : "in-progress",
            });
          },
        });
        updateSessionStatus(sessionId, "completed");
      } catch (err) {
        console.error("Send failed:", err);
        updateSessionStatus(sessionId, "failed");
      }
    },
    [addSession, updateFileProgress, updateSessionStatus, pin]
  );

  const receive = useCallback(
    async (opts: {
      signaling: SignalingConnection;
      offer: Extract<WsServerMessage, { type: "OFFER" }>;
      keyPair: CryptoKeyPair;
      peerAlias: string;
    }) => {
      const { signaling, offer, keyPair, peerAlias } = opts;
      const sessionId = offer.sessionId;
      let fileList: FileDto[] = [];

      try {
        await receiveFiles({
          signaling,
          offer,
          keyPair,
          publicKeyPem: "",
          pin: pin || undefined,
          selectFiles: async (files) => {
            fileList = files;
            addSession({
              id: sessionId,
              peerId: offer.target,
              peerAlias,
              direction: "receiving",
              status: "in-progress",
              files,
              fileProgress: new Map(),
              createdAt: Date.now(),
            });
            if (fileSelectCbRef.current) {
              return fileSelectCbRef.current(files);
            }
            // Default: accept all
            return files.map((f) => f.id);
          },
          onFileProgress: (sid, fileId, bytes, total) => {
            const fileName = fileList.find((f) => f.id === fileId)?.name ?? "";
            updateFileProgress(sid, {
              fileId,
              fileName,
              fileSize: total,
              bytesTransferred: bytes,
              status: bytes >= total ? "completed" : "in-progress",
            });
          },
        });
        updateSessionStatus(sessionId, "completed");
      } catch (err) {
        console.error("Receive failed:", err);
        updateSessionStatus(sessionId, "failed");
      }
    },
    [pin, updateFileProgress, updateSessionStatus]
  );

  return {
    send,
    receive,
    pendingOffer,
    setPinPrompt,
    pinPrompt: pinPromptRef.current,
    setFileSelectCallback,
  };
}
