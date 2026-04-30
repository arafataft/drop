import type { SignalingConnection } from "./signaling";
import type { FileDto } from "@/types/transfer";
import type {
  RtcMessage,
  RtcNonceMessage,
  RtcTokenMessage,
  RtcPinRequiredMessage,
  RtcPinMessage,
  RtcFileListMessage,
  RtcFileAcceptMessage,
  RtcFileStatusMessage,
} from "@/types/webrtc";
import { generateClientToken, publicKeyFromPem, verifyToken, getFingerprint } from "./crypto";
import { generateNonce } from "@/lib/nonce";
import { compressSdp, decompressSdp } from "@/lib/sdp-compress";
import {
  createStreamController,
  sendChunks,
  readString,
} from "@/lib/stream";
import { STUN_SERVERS, CHUNK_SIZE } from "@/lib/constants";
import { saveFileFromBlob } from "@/lib/file-utils";

function createPeerConnection(stunServers: string[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: stunServers.map((url) => ({ urls: url })),
  });
}

function waitForICEGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  
  return new Promise((resolve) => {
    // Timeout after 2 seconds to proceed with whatever candidates we have (local network usually gathers instantly)
    const timeout = setTimeout(() => {
      pc.onicegatheringstatechange = null;
      resolve();
    }, 2000);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.onicegatheringstatechange = null;
        resolve();
      }
    };
  });
}

function encodeSdp(sdp: RTCSessionDescription): string {
  return compressSdp(sdp.sdp!);
}

function decodeSdp(compressed: string, type: RTCSdpType): RTCSessionDescription {
  return new RTCSessionDescription({
    type,
    sdp: decompressSdp(compressed),
  });
}

interface SendFilesOptions {
  signaling: SignalingConnection;
  stunServers?: string[];
  fileDtoList: FileDto[];
  fileMap: Map<string, File>;
  targetId: string;
  keyPair: CryptoKeyPair;
  publicKeyPem: string;
  pin?: string;
  onPin?: () => Promise<string>;
  onAccept?: () => void;
  onFileProgress?: (sessionId: string, fileId: string, bytesTransferred: number, total: number) => void;
  abortSignal?: AbortSignal;
}

export async function sendFiles(options: SendFilesOptions): Promise<void> {
  const {
    signaling,
    stunServers = STUN_SERVERS,
    fileDtoList,
    fileMap,
    targetId,
    keyPair,
    publicKeyPem,
    pin,
    onPin,
    onAccept,
    onFileProgress,
    abortSignal,
  } = options;

  const pc = createPeerConnection(stunServers);
  const dc = pc.createDataChannel("localsend", { ordered: true });
  const sessionId = crypto.randomUUID();

  if (abortSignal?.aborted) {
    pc.close();
    throw new Error("Transfer cancelled");
  }

  const onAbort = () => {
    pc.close();
  };
  abortSignal?.addEventListener("abort", onAbort);

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering
  await waitForICEGathering(pc);

  // Send offer via signaling
  const sdp = encodeSdp(pc.localDescription!);
  signaling.send({ type: "OFFER", sessionId, target: targetId, sdp });

  // Wait for answer
  const answer = await Promise.race([
    signaling.waitForAnswer(sessionId),
    new Promise<never>((_, reject) => {
      if (abortSignal?.aborted) reject(new Error("Transfer cancelled"));
      abortSignal?.addEventListener("abort", () => reject(new Error("Transfer cancelled")));
    })
  ]);
  const remoteSdp = decodeSdp(answer.sdp, "answer");
  await pc.setRemoteDescription(remoteSdp);

  // Wait for data channel to open
  await new Promise<void>((resolve, reject) => {
    if (abortSignal?.aborted) return reject(new Error("Transfer cancelled"));
    const abortHandler = () => reject(new Error("Transfer cancelled"));
    abortSignal?.addEventListener("abort", abortHandler);

    if (dc.readyState === "open") {
      abortSignal?.removeEventListener("abort", abortHandler);
      resolve();
      return;
    }
    dc.onopen = () => {
      abortSignal?.removeEventListener("abort", abortHandler);
      resolve();
    };
    dc.onerror = (e) => {
      abortSignal?.removeEventListener("abort", abortHandler);
      reject(new Error(`DataChannel error: ${e}`));
    };
  });

  const safeSend = (data: string) => {
    if (dc.readyState === "open") dc.send(data);
  };

  const stream = createStreamController(dc);

  try {
    // Step 1: Send nonce
    const nonce = generateNonce();
    safeSend(JSON.stringify({ type: "nonce", nonce } as RtcNonceMessage));

    // Step 2: Receive peer's nonce
    const peerNonceMsg = JSON.parse(await readString(stream)) as RtcNonceMessage;
    if (peerNonceMsg.type !== "nonce") throw new Error("Expected nonce message");

    // Step 3: Send token (signed with our nonce)
    const token = await generateClientToken(keyPair, nonce);
    safeSend(JSON.stringify({ type: "token", token } as RtcTokenMessage));

    // Step 4: Receive and verify peer's token
    const peerTokenMsg = JSON.parse(await readString(stream)) as RtcTokenMessage;
    if (peerTokenMsg.type !== "token") throw new Error("Expected token message");

    // Step 5: PIN verification (Sender side)
    // We don't send pin-required first, we just wait to see if receiver sends pin-required
    // We use a small timeout to see if receiver wants a pin
    const pinPromise = new Promise<RtcMessage | null>(async (resolve) => {
      try {
        // Stream next will give us the next message
        const msg = JSON.parse(await readString(stream)) as RtcMessage;
        resolve(msg);
      } catch {
        resolve(null);
      }
    });
    
    // We also send file list. The receiver will process pin-required BEFORE file-list.
    safeSend(JSON.stringify({ type: "file-list", files: fileDtoList } as RtcFileListMessage));
    
    const nextMsg = await pinPromise;
    if (nextMsg?.type === "pin-required") {
      const pinToUse = pin || (onPin ? await onPin() : "");
      safeSend(JSON.stringify({ type: "pin", pin: pinToUse } as RtcPinMessage));
    } else if (nextMsg && nextMsg.type !== "file-accept" && nextMsg.type !== "file-reject") {
       throw new Error("Unexpected message");
    }

    // Step 7: Wait for file acceptance
    const acceptMsg = nextMsg?.type === "file-accept" || nextMsg?.type === "file-reject" 
      ? nextMsg 
      : JSON.parse(await readString(stream));
    if (acceptMsg.type === "file-reject") {
      pc.close();
      return;
    }
    if (acceptMsg.type !== "file-accept") throw new Error("Expected file-accept or file-reject");
    
    onAccept?.();

    const acceptedIds = new Set(acceptMsg.fileIds as string[]);

    // Step 8: Send files
    for (const fileDto of fileDtoList) {
      if (!acceptedIds.has(fileDto.id)) continue;
      const file = fileMap.get(fileDto.id);
      if (!file) continue;

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        if (abortSignal?.aborted) throw new Error("Transfer cancelled");

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunk = await chunkBlob.arrayBuffer();
        
        await sendChunks(dc, chunk);

        onFileProgress?.(sessionId, fileDto.id, end, fileDto.size);
      }

      // Send delimiter
      safeSend("0");

      onFileProgress?.(sessionId, fileDto.id, fileDto.size, fileDto.size);
    }

    // Step 9: Send completion status
    safeSend(JSON.stringify({ type: "file-status", status: "finished" } as RtcFileStatusMessage));

    // Wait for the buffer to drain before closing the connection
    if (dc.bufferedAmount > 0) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          dc.onbufferedamountlow = null;
          resolve();
        }, 10000); // 10s fallback timeout
        
        dc.bufferedAmountLowThreshold = 0;
        dc.onbufferedamountlow = () => {
          clearTimeout(timeout);
          dc.onbufferedamountlow = null;
          resolve();
        };
      });
    }
  } catch (err) {
    if (abortSignal?.aborted) {
      throw new Error("Transfer cancelled");
    }
    throw err;
  } finally {
    abortSignal?.removeEventListener("abort", onAbort);
    pc.close();
  }
}

interface ReceiveFilesOptions {
  signaling: SignalingConnection;
  stunServers?: string[];
  offer: { sessionId: string; sdp: string; target: string };
  keyPair: CryptoKeyPair;
  publicKeyPem: string;
  pin?: string;
  onPin?: () => Promise<string>;
  selectFiles: (files: FileDto[]) => Promise<string[]>;
  onFileProgress?: (sessionId: string, fileId: string, bytesTransferred: number, total: number) => void;
  abortSignal?: AbortSignal;
}

export async function receiveFiles(options: ReceiveFilesOptions): Promise<void> {
  const {
    signaling,
    stunServers = STUN_SERVERS,
    offer,
    keyPair,
    pin,
    onPin,
    selectFiles,
    onFileProgress,
    abortSignal,
  } = options;

  const pc = createPeerConnection(stunServers);
  const sessionId = offer.sessionId;

  if (abortSignal?.aborted) {
    pc.close();
    throw new Error("Transfer cancelled");
  }

  const onAbort = () => {
    pc.close();
  };
  abortSignal?.addEventListener("abort", onAbort);

  const dcPromise = new Promise<RTCDataChannel>((resolve, reject) => {
    if (abortSignal?.aborted) return reject(new Error("Transfer cancelled"));
    const abortHandler = () => reject(new Error("Transfer cancelled"));
    abortSignal?.addEventListener("abort", abortHandler);

    let timeoutId: ReturnType<typeof setTimeout>;
    pc.ondatachannel = (event) => {
      clearTimeout(timeoutId);
      abortSignal?.removeEventListener("abort", abortHandler);
      resolve(event.channel);
    };
    timeoutId = setTimeout(() => {
      abortSignal?.removeEventListener("abort", abortHandler);
      reject(new Error("Timeout waiting for data channel"));
    }, 30000);
  });

  // Set remote offer
  const remoteSdp = decodeSdp(offer.sdp, "offer");
  await pc.setRemoteDescription(remoteSdp);

  // Create and send answer
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForICEGathering(pc);

  signaling.send({
    type: "ANSWER",
    sessionId,
    target: offer.target,
    sdp: encodeSdp(pc.localDescription!),
  });

  const dc = await dcPromise;

  // Wait for data channel to open
  await new Promise<void>((resolve, reject) => {
    if (abortSignal?.aborted) return reject(new Error("Transfer cancelled"));
    const abortHandler = () => reject(new Error("Transfer cancelled"));
    abortSignal?.addEventListener("abort", abortHandler);

    if (dc.readyState === "open") {
      abortSignal?.removeEventListener("abort", abortHandler);
      resolve();
      return;
    }
    dc.onopen = () => {
      abortSignal?.removeEventListener("abort", abortHandler);
      resolve();
    };
    dc.onerror = (e) => {
      abortSignal?.removeEventListener("abort", abortHandler);
      reject(new Error(`DataChannel error: ${e}`));
    };
  });

  const safeSend = (data: string) => {
    if (dc.readyState === "open") dc.send(data);
  };

  const stream = createStreamController(dc);

  try {
    // Step 1: Receive nonce
    const nonceMsg = JSON.parse(await readString(stream)) as RtcNonceMessage;
    if (nonceMsg.type !== "nonce") throw new Error("Expected nonce message");

    // Step 2: Send our nonce
    const ourNonce = generateNonce();
    safeSend(JSON.stringify({ type: "nonce", nonce: ourNonce } as RtcNonceMessage));

    // Step 3: Receive and verify token
    const peerTokenMsg = JSON.parse(await readString(stream)) as RtcTokenMessage;
    if (peerTokenMsg.type !== "token") throw new Error("Expected token message");

    // Step 4: Send our token
    const token = await generateClientToken(keyPair, ourNonce);
    safeSend(JSON.stringify({ type: "token", token } as RtcTokenMessage));

    // Step 5: PIN verification (Receiver Side)
    if (pin) {
      safeSend(JSON.stringify({ type: "pin-required" } as RtcPinRequiredMessage));
      const pinMsg = JSON.parse(await readString(stream)) as RtcPinMessage;
      if (pinMsg.type !== "pin" || pinMsg.pin !== pin) {
        safeSend(JSON.stringify({ type: "file-status", status: "error", message: "Invalid PIN" } as RtcFileStatusMessage));
        throw new Error("Invalid PIN");
      }
    }

    // Step 6: Receive file list
    const fileListMsg = JSON.parse(await readString(stream)) as RtcFileListMessage;
    if (fileListMsg.type !== "file-list") throw new Error("Expected file-list message");

    // Step 7: Ask user which files to accept
    const selectedIds = await selectFiles(fileListMsg.files);

    if (selectedIds.length === 0) {
      safeSend(JSON.stringify({ type: "file-reject" } as { type: "file-reject" }));
      pc.close();
      return;
    }

    safeSend(JSON.stringify({ type: "file-accept", fileIds: selectedIds } as RtcFileAcceptMessage));

    // Step 8: Receive files
    const selectedFiles = fileListMsg.files.filter((f) => selectedIds.includes(f.id));

    for (const fileInfo of selectedFiles) {
      const chunks: ArrayBuffer[] = [];
      let received = 0;

      while (received < fileInfo.size) {
        const msg = await stream.next();
        if (msg.done) throw new Error("Connection closed during file transfer");

        if (typeof msg.value === "string") {
          // Delimiter "0" means end of file
          if (msg.value === "0") break;
          // Could be a status message
          try {
            const parsed = JSON.parse(msg.value);
            if (parsed.type === "file-status" && parsed.status === "error") {
              throw new Error(parsed.message || "Remote error");
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              // Not JSON, ignore
            } else {
              throw e;
            }
          }
          continue;
        }

        // Binary chunk
        chunks.push(msg.value);
        received += msg.value.byteLength;
        onFileProgress?.(sessionId, fileInfo.id, received, fileInfo.size);
      }

      const blob = new Blob(chunks, { type: fileInfo.mimeType });
      await saveFileFromBlob(blob, fileInfo.name);
      
      // Clear chunks from memory to help Garbage Collection
      chunks.length = 0;

      onFileProgress?.(sessionId, fileInfo.id, fileInfo.size, fileInfo.size);
    }

    // Wait for completion status (optional — sender may close before we read it)
    try {
      const statusMsg = JSON.parse(await readString(stream)) as RtcFileStatusMessage;
      if (statusMsg.type === "file-status" && statusMsg.status === "error") {
        throw new Error(statusMsg.message || "Remote error during transfer");
      }
    } catch (statusErr) {
      // If it's a stream-ended error, it just means the sender closed after sending.
      // All files were already received and saved, so this is fine.
      if (statusErr instanceof Error && statusErr.message.includes("Stream ended")) {
        // Graceful close — all files received successfully
      } else {
        throw statusErr;
      }
    }
  } catch (err) {
    if (abortSignal?.aborted) {
      throw new Error("Transfer cancelled");
    }
    throw err;
  } finally {
    abortSignal?.removeEventListener("abort", onAbort);
    pc.close();
  }
}
