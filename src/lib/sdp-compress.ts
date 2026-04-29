import pako from "pako";
import { encodeUint8ArrayToBase64, decodeBase64ToUint8Array } from "./base64";

export function compressSdp(sdp: string): string {
  const compressed = pako.deflate(new TextEncoder().encode(sdp));
  return encodeUint8ArrayToBase64(compressed);
}

export function decompressSdp(compressed: string): string {
  const bytes = decodeBase64ToUint8Array(compressed);
  const decompressed = pako.inflate(bytes);
  return new TextDecoder().decode(decompressed);
}
