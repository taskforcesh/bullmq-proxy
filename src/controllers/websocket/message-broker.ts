/**
 * Message broker.
 *
 * Super simple and efficiente message broker to be used for communication between processes
 * via non-acknowledged protocol (UDP, WebSockets, etc).
 *
 */

import { EventEmitter } from "events";
import { BufferSource } from "../../interfaces";

export interface Message<T> {
  id: number;
  data: T;
}

export class MessageBroker<T> extends EventEmitter {
  private messageId = 0;
  private messageTimeouts: { [index: number]: Timer } = {};

  private pendingMessages: {
    [index: number]: {
      resolve: (data: any) => void;
      reject: (err: Error) => void;
    };
  } = {};

  constructor(
    private send: (msg: string | BufferSource) => Promise<void>,
    private opts = { messageTimeout: 15000 }
  ) {
    super();
  }

  processMessage({ id, data }: Message<T>) {
    delete this.pendingMessages[id];
    this.emit(`${id}`, data);
  }

  sendData<K>(data: T, { noack }: { noack?: boolean } = {}): Promise<K> {
    const msg = { id: this.messageId++, data };

    // TODO: Support binary data too.
    this.send(JSON.stringify(msg));

    if (noack) {
      return Promise.resolve(null as K);
    }

    return new Promise((resolve, reject) => {
      this.pendingMessages[msg.id] = { resolve, reject };

      let responseHandler: (data: K) => void;

      const timeout = setTimeout(() => {
        delete this.pendingMessages[msg.id];
        this.removeListener(`${msg.id}`, responseHandler);
        reject(new Error("Timeout"));
      }, this.opts.messageTimeout);

      this.messageTimeouts[msg.id] = timeout; // Track the timeout

      responseHandler = (data: K) => {
        delete this.pendingMessages[msg.id];
        clearTimeout(timeout);
        resolve(data);
      };

      this.once(`${msg.id}`, responseHandler);
    });
  }

  close() {
    for (const key in this.pendingMessages) {
      this.pendingMessages[key].reject(new Error("Connection closed"));
      if (this.messageTimeouts[key]) {
        clearTimeout(this.messageTimeouts[key]);
        delete this.messageTimeouts[key];
      }
    }
    this.pendingMessages = {};
  }
}
