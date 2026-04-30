import type { ClientInfoWithoutId, ClientInfo } from "@/types/peer";
import type { WsServerMessage, WsClientMessage } from "@/types/signaling";
import { PING_INTERVAL, FINGERPRINT_UPDATE_INTERVAL, SIGNALING_URL } from "@/lib/constants";

interface SignalingCallbacks {
  onMessage: (message: WsServerMessage) => void;
  onClose: () => void;
  generateNewInfo: () => Promise<ClientInfoWithoutId>;
}

export class SignalingConnection {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private fingerprintInterval: ReturnType<typeof setInterval> | null = null;
  private answerResolvers = new Map<
    string,
    { resolve: (msg: Extract<WsServerMessage, { type: "ANSWER" }>) => void; reject: (err: Error) => void }
  >();
  private closePromise: Promise<void> | null = null;
  private closeResolve: (() => void) | null = null;
  private info: ClientInfoWithoutId;
  private callbacks: SignalingCallbacks;

  private constructor(info: ClientInfoWithoutId, callbacks: SignalingCallbacks) {
    this.info = info;
    this.callbacks = callbacks;
  }

  static async connect(
    info: ClientInfoWithoutId,
    callbacks: SignalingCallbacks,
    url: string = SIGNALING_URL
  ): Promise<SignalingConnection> {
    const conn = new SignalingConnection(info, callbacks);
    await conn.doConnect(url);
    return conn;
  }

  private doConnect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      this.ws = new WebSocket(url);
      this.closePromise = new Promise<void>((r) => {
        this.closeResolve = r;
      });

      this.ws.onopen = () => {
        // Send REGISTER with client info
        this.ws!.send(JSON.stringify({ type: "REGISTER", info: this.info }));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (event.data === "" || event.data == null) return;
        try {
          const message: WsServerMessage = JSON.parse(event.data);

          // First message must be HELLO - that's when we're truly connected
          if (!settled) {
            if (message.type === "HELLO") {
              settled = true;
              this.startPing();
              this.startFingerprintUpdate();
              this.callbacks.onMessage(message);
              resolve();
              return;
            }
            // Any other first message means something is wrong
            settled = true;
            reject(new Error("Unexpected message from server"));
            return;
          }

          if (message.type === "ANSWER") {
            const resolver = this.answerResolvers.get(message.sessionId);
            if (resolver) {
              this.answerResolvers.delete(message.sessionId);
              resolver.resolve(message);
            }
          }
          this.callbacks.onMessage(message);
        } catch {
          // ignore non-JSON
        }
      };

      this.ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket connection error"));
        }
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.stopFingerprintUpdate();
        for (const [, resolver] of this.answerResolvers) {
          resolver.reject(new Error("Connection closed"));
        }
        this.answerResolvers.clear();
        this.callbacks.onClose();
        if (this.closeResolve) this.closeResolve();
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket connection closed before open"));
        }
      };
    });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send("");
      }
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private startFingerprintUpdate(): void {
    this.fingerprintInterval = setInterval(async () => {
      const newInfo = await this.callbacks.generateNewInfo();
      this.info = newInfo;
      this.send({ type: "UPDATE", info: newInfo });
    }, FINGERPRINT_UPDATE_INTERVAL);
  }

  private stopFingerprintUpdate(): void {
    if (this.fingerprintInterval) {
      clearInterval(this.fingerprintInterval);
      this.fingerprintInterval = null;
    }
  }

  send(message: WsClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  waitForAnswer(sessionId: string): Promise<Extract<WsServerMessage, { type: "ANSWER" }>> {
    return new Promise((resolve, reject) => {
      this.answerResolvers.set(sessionId, { resolve, reject });
    });
  }

  waitUntilClose(): Promise<void> {
    return this.closePromise ?? Promise.resolve();
  }

  close(): void {
    this.ws?.close();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
