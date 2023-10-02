import { Message } from "@taskforcesh/message-broker";
import { connect, respond } from "./utils";
import { WebSocketClient } from "./ws-autoreconnect";

export class QueueWorker {
  private ws: WebSocketClient;
  private connecting: Promise<WebSocketClient>;

  async open<T, Q = void>(
    {
      host,
      queueName,
      token,
    }: { host: string; queueName: string; token: string },
    concurrency: number,
    processor: (job: T) => Promise<Q>
  ) {
    if (this.connecting) {
      throw new Error("Can only open connection once");
    }
    this.connecting = connect(
      `${host}/queues/${queueName}/process/${concurrency}`,
      token,
      {},
      (msg: Message<{ type: "process", payload: any }>) => {
        const { id, data } = msg;
        if (data.type === "process") {
          callProcessor(this.ws, id, data.payload, processor);
        } else {
          console.error("Unknown Worker message type", data.type);
        }
      }
    );
    this.ws = await this.connecting;
  }

  async close() {
    const ws = await this.connecting;
    ws.close();
  }
}

type processorFunc = (job: any) => Promise<{}>;

async function callProcessor(
  ws: WebSocketClient,
  id: number,
  data: any,
  processor: processorFunc
) {
  try {
    const result = await processor({ data });
    respond(ws, id, { result: result || null });
  } catch (err) {
    respond(ws, id, { err: { message: err.message, stack: err.stack } });
  }
}
