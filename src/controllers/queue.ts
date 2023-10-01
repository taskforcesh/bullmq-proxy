import { Message, MessageBroker } from "@taskforcesh/message-broker";
import { Queue, ConnectionOptions } from "bullmq";
import { Value } from "@sinclair/typebox/value";
import { ServerWebSocket } from "bun";

import { WebSocketBehaviour } from "../interfaces/websocket-behaviour";
import { respond, send } from "./utils";
import { log } from "../utils/log";
import { QueueSchema, QueueSchemaType } from "./commands";

export interface QueueWebSocketData {
  connection: ConnectionOptions;
  queue: Queue;
  queueName: string;
  mb: MessageBroker<object>;
}

export const openQueue = async (ws: ServerWebSocket<QueueWebSocketData>) => {
  const { connection, queueName } = ws.data;
  ws.data.queue = new Queue(queueName, { connection });
  ws.data.mb = new MessageBroker<object>(async (msg: string | Buffer) => send(ws, msg));
};

export const QueueController: WebSocketBehaviour = {
  open: openQueue,

  message: async (
    ws: ServerWebSocket<QueueWebSocketData>,
    message: string | Buffer
  ) => {
    try {
      const parsedMessage = <Message<QueueSchemaType>>(
        JSON.parse(message.toString())
      );

      const errors = Value.Errors(QueueSchema, parsedMessage.data);
      const firstError = errors.First();
      if (firstError) {
        // The errors are difficult to read, so we'll just send a generic one
        // until we can do something better.
        respond(ws, parsedMessage.id, { err: { message: `Invalid message ${message}`, stack: "" } })
        return;
      }

      const queue = ws.data.queue;
      const { fn, args } = parsedMessage.data;
      try {
        const result = await queue[fn].apply(queue, args);
        respond(ws, parsedMessage.id, { ok: result });
      } catch (err) {
        respond(ws, parsedMessage.id, { err: (<Error>err).message });
      }
    } catch (err) {
      console.error(err);
    }
  },

  drain: (ws) => {
    // console.log("WebSocket backpressure: " + ws.getBufferedAmount());
  },

  close: async (ws, code, message) => {
    log(
      `WebSocket closed for queue (${ws.data.queueName}) with code ${code}${message ? `and message ${Buffer.from(
        message
      ).toString()}` : ""}`
    );

    const queue = ws.data.queue;
    if (queue) {
      ws.data.queue = null;
      await queue.close();
    }
  },
};
