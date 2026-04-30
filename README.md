# DROP

Peer-to-peer file sharing in the browser. No uploads to any server -- files transfer directly between devices using WebRTC.

> **Same WiFi/network required.** All devices must be connected to the same local network (same WiFi router) to discover and transfer files to each other.

## How it works

1. A lightweight signaling server introduces peers to each other
2. Peers connect directly via WebRTC DataChannel
3. Files are chunked (16KB) and streamed with backpressure
4. End-to-end crypto handshake (Ed25519 / RSA-PSS fallback)

## Quick start

```bash
# Install dependencies
npm install

# Start the signaling server (Terminal 1)
npm run server

# Start the web app (Terminal 2)
npm run dev
```

Open `http://localhost:3000` on two devices (or two tabs). Both see each other in the peer list. Click a peer, pick files, send.

## Connecting from another device

Access the app via the host machine's IP (e.g. `http://192.168.x.x:3000`).

**Note**: WebRTC and Web Crypto API require a secure context. `localhost` works out of the box. For other IPs, either:
- Use HTTPS (self-signed cert)
- Chrome: enable `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for that origin

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Static export to `out/` |
| `npm run server` | WebSocket signaling server on port 8080 |
| `npm start` | Serve the static export |

## Architecture

```
Browser A ──WS──> Signaling Server <──WS── Browser B
                 (introduces peers)

Browser A <======== WebRTC DataChannel (P2P) ========> Browser B
           nonce -> token -> PIN -> file list -> chunks
```

**No file data passes through the signaling server.** It only relays connection setup messages (SDP offer/answer). All file transfer is peer-to-peer.

## Tech stack

- **Next.js 16** (static export -- no custom server needed for the UI)
- **WebRTC** with STUN (`stun:stun.l.google.com:19302`)
- **Zustand** for state management
- **Tailwind CSS v4** with glassmorphism
- **Web Crypto API** for authentication handshake
- **pako** for SDP compression
- **ws** for the signaling server

## Signaling server

`server/signaling.ts` -- a minimal WebSocket server (~100 lines):
- Clients connect and send a `REGISTER` message with device info
- Server assigns an ID, broadcasts peer join/leave events
- Relays `OFFER`/`ANSWER` messages between specific peers
- Ping/keepalive via empty messages

Configurable via `PORT` env var (default `8080`).

## Crypto handshake

On WebRTC DataChannel open, peers perform:
1. Nonce exchange (random 16 bytes each)
2. Token exchange (signed with Ed25519 or RSA-PSS, derived from nonce)
3. Optional PIN verification
4. File list transfer
5. Chunked file transfer (16KB chunks, 1MB backpressure threshold)

## License

MIT
