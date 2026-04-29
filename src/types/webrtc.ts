// Messages sent over WebRTC DataChannel (not signaling server)

export type RtcMessage =
  | RtcNonceMessage
  | RtcTokenMessage
  | RtcPinRequiredMessage
  | RtcPinMessage
  | RtcFileListMessage
  | RtcFileAcceptMessage
  | RtcFileRejectMessage
  | RtcFileChunkMessage
  | RtcFileStatusMessage;

export interface RtcNonceMessage {
  type: "nonce";
  nonce: string;
}

export interface RtcTokenMessage {
  type: "token";
  token: string;
}

export interface RtcPinRequiredMessage {
  type: "pin-required";
}

export interface RtcPinMessage {
  type: "pin";
  pin: string;
}

export interface RtcFileListMessage {
  type: "file-list";
  files: Array<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    sha256?: string;
  }>;
}

export interface RtcFileAcceptMessage {
  type: "file-accept";
  fileIds: string[];
}

export interface RtcFileRejectMessage {
  type: "file-reject";
}

export interface RtcFileChunkMessage {
  type: "file-chunk";
  fileId: string;
  chunkIndex: number;
  // data is sent as ArrayBuffer, not in this JSON envelope
}

export interface RtcFileStatusMessage {
  type: "file-status";
  status: "finished" | "error";
  fileId?: string;
  message?: string;
}
