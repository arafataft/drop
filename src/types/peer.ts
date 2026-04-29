export type PeerDeviceType = "mobile" | "desktop" | "web" | "headless" | "unknown";

export interface PeerInfo {
  alias: string;
  version: string;
  deviceModel: string;
  deviceType: PeerDeviceType;
  fingerprint?: string;
}

export interface ClientInfoWithoutId extends PeerInfo {
  token: string;
}

export interface ClientInfo extends ClientInfoWithoutId {
  id: string;
}
