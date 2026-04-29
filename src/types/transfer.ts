export interface FileDto {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  sha256?: string;
}

export type TransferStatus =
  | "pending"
  | "waiting-for-pin"
  | "waiting-for-accept"
  | "in-progress"
  | "completed"
  | "failed"
  | "rejected";

export interface FileProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  bytesTransferred: number;
  status: "in-progress" | "completed" | "failed";
}

export interface TransferSession {
  id: string;
  peerId: string;
  peerAlias: string;
  direction: "sending" | "receiving";
  status: TransferStatus;
  files: FileDto[];
  fileProgress: Map<string, FileProgress>;
  createdAt: number;
}
