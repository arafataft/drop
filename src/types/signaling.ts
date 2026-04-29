import type { ClientInfo, ClientInfoWithoutId } from "./peer";

// Server -> Client messages
export type WsServerMessage =
  | { type: "HELLO"; client: ClientInfo; peers: ClientInfo[] }
  | { type: "JOIN"; peer: ClientInfo }
  | { type: "LEFT"; peerId: string }
  | { type: "UPDATE"; peer: ClientInfo }
  | { type: "OFFER"; sessionId: string; target: string; sdp: string }
  | { type: "ANSWER"; sessionId: string; target: string; sdp: string }
  | { type: "ERROR"; message: string };

// Client -> Server messages
export type WsClientMessage =
  | { type: "UPDATE"; info: ClientInfoWithoutId }
  | { type: "OFFER"; sessionId: string; target: string; sdp: string }
  | { type: "ANSWER"; sessionId: string; target: string; sdp: string };

export interface SdpMessage {
  sessionId: string;
  target: string;
  sdp: string;
}
