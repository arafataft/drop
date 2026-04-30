import { CHUNK_SIZE, MAX_BUFFERED_AMOUNT } from "./constants";

export class StreamController implements AsyncIterableIterator<string | ArrayBuffer> {
  private messages: (string | ArrayBuffer)[] = [];
  private resolveNext: ((value: IteratorResult<string | ArrayBuffer>) => void) | null = null;
  private done = false;

  push(message: string | ArrayBuffer): void {
    if (this.done) return;
    if (this.resolveNext) {
      const resolve = this.resolveNext;
      this.resolveNext = null;
      resolve({ value: message, done: false });
    } else {
      this.messages.push(message);
    }
  }

  close(): void {
    this.done = true;
    this.messages = []; // Clear queue to avoid memory leak
    if (this.resolveNext) {
      const resolve = this.resolveNext;
      this.resolveNext = null;
      resolve({ value: undefined, done: true });
    }
  }

  clear(): void {
    this.messages = [];
  }

  async next(): Promise<IteratorResult<string | ArrayBuffer>> {
    if (this.messages.length > 0) {
      return { value: this.messages.shift()!, done: false };
    }
    if (this.done) {
      return { value: undefined, done: true };
    }
    return new Promise<IteratorResult<string | ArrayBuffer>>((resolve) => {
      this.resolveNext = resolve;
    });
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<string | ArrayBuffer> {
    return this;
  }
}

export function createStreamController(channel: RTCDataChannel): StreamController {
  const controller = new StreamController();

  channel.onmessage = (event: MessageEvent) => {
    controller.push(event.data);
  };

  channel.onclose = () => {
    controller.close();
  };

  return controller;
}

export async function sendChunks(
  channel: RTCDataChannel,
  data: ArrayBuffer
): Promise<void> {
  let offset = 0;
  while (offset < data.byteLength) {
    if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      await new Promise<void>((resolve, reject) => {
        if (channel.readyState !== "open") {
          reject(new Error("Channel closed during send"));
          return;
        }

        const handleClose = () => {
          channel.onbufferedamountlow = null;
          channel.removeEventListener("close", handleClose);
          reject(new Error("Channel closed while waiting for buffer to drain"));
        };
        channel.addEventListener("close", handleClose);

        channel.bufferedAmountLowThreshold = CHUNK_SIZE;
        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null;
          channel.removeEventListener("close", handleClose);
          resolve();
        };
      });
    }
    const end = Math.min(offset + CHUNK_SIZE, data.byteLength);
    channel.send(data.slice(offset, end));
    offset = end;
  }
}

export async function readString(stream: AsyncIterableIterator<string | ArrayBuffer>): Promise<string> {
  const result = await stream.next();
  if (result.done) throw new Error("Stream ended while waiting for string message");
  if (typeof result.value !== "string") throw new Error("Expected string message, got ArrayBuffer");
  return result.value;
}

export async function readArrayBuffer(stream: AsyncIterableIterator<string | ArrayBuffer>): Promise<ArrayBuffer> {
  const result = await stream.next();
  if (result.done) throw new Error("Stream ended while waiting for binary message");
  if (typeof result.value === "string") throw new Error("Expected ArrayBuffer, got string");
  return result.value;
}
