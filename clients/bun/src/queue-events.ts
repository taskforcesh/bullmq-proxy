import { EventEmitter } from "events";
import { Message } from "@taskforcesh/message-broker";
import { WebSocketClient } from "./ws-autoreconnect";

import { connect } from "./utils";
import { QueueEventsListener } from "bullmq";

export class QueueEvents extends EventEmitter {
  private ws: WebSocketClient;
  private connecting: Promise<WebSocketClient>;

  async open(
    {
      host,
      queueName,
      token,
    }: { host: string; queueName: string; token: string },
    events: string[]
  ) {
    if (!this.connecting) {
      this.connecting = connect(
        `${host}/queues/${queueName}/events`,
        token,
        { events: events.join(",") },
        (
          msg: Message<{
            event: keyof QueueEventsListener;
            args: any[];
          }>
        ) => {
          if (msg?.data) {
            const { event, args } = msg.data;
            this.emit(event, ...args);
          }
        }
      );
    }
    if (!this.ws) {
      this.ws = await this.connecting;
    }
  }

  async close() {
    const ws = await this.connecting;
    ws.close();
    this.ws = null;
  }
}
