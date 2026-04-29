import { encodeUint8ArrayToBase64 } from "./base64";

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return encodeUint8ArrayToBase64(bytes);
}
