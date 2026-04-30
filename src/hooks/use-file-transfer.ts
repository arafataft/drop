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
  cancel: (sessionId: string) => void;
}

export function useFileTransfer(): UseFileTransferReturn {
  const { addSession, updateSessionStatus, updateFileProgress } = useTransferStore();
  const { pin } = useSettingsStore();
  const pendingOffer = useRef<Extract<WsServerMessage, { type: "OFFER" }> | null>(null);
  const pinPromptRef = useRef<string | null>(null);
  const pinResolveRef = useRef<((pin: string) => void) | null>(null);
  const fileSelectCbRef = useRef<((files: FileDto[]) => Promise<string[]>) | null>(null);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const cancel = useCallback(
    (sessionId: string) => {
      const controller = controllersRef.current.get(sessionId);
      if (controller) {
        controller.abort();
        controllersRef.current.delete(sessionId);
      }
      updateSessionStatus(sessionId, "failed");
    },
    [updateSessionStatus]
  );

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
      const abortController = new AbortController();
      controllersRef.current.set(sessionId, abortController);

      const initialProgress = new Map<string, any>();
      fileDtoList.forEach((f) => {
        initialProgress.set(f.id, {
          fileId: f.id,
          fileName: f.name,
          fileSize: f.size,
          bytesTransferred: 0,
          status: "in-progress",
        });
      });

      addSession({
        id: sessionId,
        peerId: targetId,
        peerAlias: targetAlias,
        direction: "sending",
        status: "waiting-for-accept",
        files: fileDtoList,
        fileProgress: initialProgress,
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
          abortSignal: abortController.signal,
        });
        updateSessionStatus(sessionId, "completed");
      } catch (err) {
        console.error("Send failed:", err);
        updateSessionStatus(sessionId, "failed");
      } finally {
        controllersRef.current.delete(sessionId);
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
      const abortController = new AbortController();
      controllersRef.current.set(sessionId, abortController);
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
          abortSignal: abortController.signal,
        });
        updateSessionStatus(sessionId, "completed");
      } catch (err) {
        console.error("Receive failed:", err);
        updateSessionStatus(sessionId, "failed");
      } finally {
        controllersRef.current.delete(sessionId);
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
    cancel,
  };
}
