import { encodeUint8ArrayToBase64, decodeBase64ToUint8Array } from "@/lib/base64";

type CryptoMethod = "Ed25519" | "RSA-PSS";
type HashMethod = "SHA-256";

let preferredMethod: CryptoMethod = "RSA-PSS";

export function isWebCryptoSupported(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

export async function upgradeToEd25519IfSupported(): Promise<void> {
  if (!isWebCryptoSupported()) return;
  try {
    const testKey = await crypto.subtle.generateKey("Ed25519", false, ["sign"]);
    if (testKey) {
      preferredMethod = "Ed25519";
    }
  } catch {
    // Ed25519 not supported, stick with RSA-PSS
  }
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  if (preferredMethod === "Ed25519") {
    return crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  }
  return crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
}

export async function cryptoKeyToPem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  let binary = "";
  const bytes = new Uint8Array(exported);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getSignAlgorithm(): AlgorithmIdentifier | RsaPssParams {
  if (preferredMethod === "Ed25519") return "Ed25519";
  return { name: "RSA-PSS", saltLength: 32 };
}

function getVerifyAlgorithm(): AlgorithmIdentifier | RsaPssParams {
  if (preferredMethod === "Ed25519") return "Ed25519";
  return { name: "RSA-PSS", saltLength: 32 };
}

async function getPublicKeyDer(privateKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("spki", privateKey);
}

export async function publicKeyFromDer(der: ArrayBuffer): Promise<CryptoKey> {
  const algorithm =
    preferredMethod === "Ed25519"
      ? "Ed25519"
      : { name: "RSA-PSS", hash: "SHA-256" };
  return crypto.subtle.importKey("spki", der, algorithm, true, ["verify"]);
}

export async function publicKeyFromPem(pem: string): Promise<CryptoKey> {
  const binary = atob(pem);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return publicKeyFromDer(bytes.buffer);
}

function getHashMethod(): HashMethod {
  return "SHA-256";
}

function getSignMethod(): CryptoMethod {
  return preferredMethod;
}

async function hashData(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return new Uint8Array(hash);
}

function generateSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

async function signData(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign(getSignAlgorithm(), key, data as BufferSource);
  return new Uint8Array(sig);
}

export async function generateClientToken(
  keyPair: CryptoKeyPair,
  nonce?: string
): Promise<string> {
  const hashMethod = getHashMethod();
  const signMethod = getSignMethod();

  // Build the data to hash: timestamp or nonce + public key DER + salt
  const timestamp = nonce || Date.now().toString();
  const publicKeyDer = await getPublicKeyDer(keyPair.publicKey);
  const salt = generateSalt();

  // Concatenate: timestamp + publicKeyDer + salt
  const timestampBytes = new TextEncoder().encode(timestamp);
  const dataToHash = new Uint8Array(
    timestampBytes.length + publicKeyDer.byteLength + salt.length
  );
  dataToHash.set(timestampBytes, 0);
  dataToHash.set(new Uint8Array(publicKeyDer), timestampBytes.length);
  dataToHash.set(salt, timestampBytes.length + publicKeyDer.byteLength);

  const hash = await hashData(dataToHash);
  const signature = await signData(keyPair.privateKey, hash);

  // Token format: hashMethod.hashB64.saltB64.signMethod.signatureB64
  return [
    hashMethod,
    encodeUint8ArrayToBase64(hash),
    encodeUint8ArrayToBase64(salt),
    signMethod,
    encodeUint8ArrayToBase64(signature),
  ].join(".");
}

export async function verifyToken(
  publicKey: CryptoKey,
  token: string
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 5) return false;

  const [_hashMethod, hashB64, saltB64, signMethod, signatureB64] = parts;

  const hash = decodeBase64ToUint8Array(hashB64);
  const salt = decodeBase64ToUint8Array(saltB64);
  const signature = decodeBase64ToUint8Array(signatureB64);

  // Determine algorithm from signMethod
  const algorithm: AlgorithmIdentifier | RsaPssParams =
    signMethod === "Ed25519" ? "Ed25519" : { name: "RSA-PSS", saltLength: 32 };

  try {
    return crypto.subtle.verify(algorithm, publicKey, signature as BufferSource, hash as BufferSource);
  } catch {
    return false;
  }
}

export async function getFingerprint(keyPair: CryptoKeyPair): Promise<string> {
  const der = await getPublicKeyDer(keyPair.publicKey);
  const hash = await crypto.subtle.digest("SHA-256", der);
  const bytes = new Uint8Array(hash);
  // First 8 bytes as hex, colon-separated
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}
