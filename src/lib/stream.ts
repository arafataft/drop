import { CHUNK_SIZE, MAX_BUFFERED_AMOUNT } from "./constants";

export class StreamController {
  private messages: (string | ArrayBuffer)[] = [];
  private resolve: ((value: IteratorResult<string | ArrayBuffer>) => void) | null = null;
  private done = false;

  push(message: string | ArrayBuffer): void {
    if (this.done) return;
    if (this.resolve) {
      const resolve = this.resolve;
      this.resolve = null;
      resolve({ value: message, done: false });
    } else {
      this.messages.push(message);
    }
  }

  close(): void {
    this.done = true;
    if (this.resolve) {
      const resolve = this.resolve;
      this.resolve = null;
      resolve({ value: undefined, done: true });
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<string | ArrayBuffer> {
    while (true) {
      if (this.messages.length > 0) {
        yield this.messages.shift()!;
        continue;
      }
      if (this.done) return;
      const result = await new Promise<IteratorResult<string | ArrayBuffer>>((resolve) => {
        this.resolve = resolve;
      });
      if (result.done) return;
      yield result.value;
    }
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
      await new Promise<void>((resolve) => {
        channel.bufferedAmountLowThreshold = CHUNK_SIZE;
        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null;
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
