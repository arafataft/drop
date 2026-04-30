import { WebSocketServer, WebSocket } from "ws";

const PORT = parseInt(process.env.PORT || "8080", 10);

interface ClientInfo {
  id: string;
  alias: string;
  version: string;
  deviceModel: string;
  deviceType: string;
  token: string;
  fingerprint?: string;
}

interface Client {
  ws: WebSocket;
  info: ClientInfo;
}

const clients = new Map<string, Client>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function broadcast(clientId: string, message: object): void {
  const data = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id !== clientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function send(ws: WebSocket, message: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function removeClient(id: string): void {
  const client = clients.get(id);
  if (!client) return;
  clients.delete(id);
  broadcast(id, { type: "LEFT", peerId: id });
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws, req) => {
  let clientId = "";

  ws.on("message", (raw) => {
    const text = raw.toString();

    // Empty message = ping
    if (text === "") return;

    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    switch (msg.type) {
      case "REGISTER": {
        // First message: client sends { type: "REGISTER", info: ClientInfoWithoutId }
        clientId = generateId();
        const info: ClientInfo = { ...msg.info, id: clientId };
        const peerList = Array.from(clients.values()).map((c) => c.info);

        clients.set(clientId, { ws, info });

        // Send HELLO with own info + existing peers
        send(ws, { type: "HELLO", client: info, peers: peerList });

        // Tell everyone else about new peer
        broadcast(clientId, { type: "JOIN", peer: info });
        break;
      }

      case "UPDATE": {
        const client = clients.get(clientId);
        if (!client) return;
        client.info = { ...msg.info, id: clientId };
        broadcast(clientId, { type: "UPDATE", peer: client.info });
        break;
      }

      case "OFFER": {
        // Relay to target: { type: "OFFER", sessionId, target, sdp }
        const target = clients.get(msg.target);
        if (target) {
          send(target.ws, {
            type: "OFFER",
            sessionId: msg.sessionId,
            target: clientId,
            sdp: msg.sdp,
          });
        }
        break;
      }

      case "ANSWER": {
        // Relay to target: { type: "ANSWER", sessionId, target, sdp }
        const target = clients.get(msg.target);
        if (target) {
          send(target.ws, {
            type: "ANSWER",
            sessionId: msg.sessionId,
            target: clientId,
            sdp: msg.sdp,
          });
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    if (clientId) removeClient(clientId);
  });

  ws.on("error", () => {
    if (clientId) removeClient(clientId);
  });
});

console.log(`DROP signaling server running on ws://localhost:${PORT}`);
