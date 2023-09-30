import { ServerWebSocket } from "bun";
import { MessageBroker } from "@taskforcesh/message-broker";
import { QueueEvents, ConnectionOptions, QueueEventsListener } from "bullmq";

import { WebSocketBehaviour } from "../interfaces/websocket-behaviour";
import { send } from "./utils";
import { log } from "../utils/log";

export interface QueueEventsWebSocketData {
  connection: ConnectionOptions;
  queueEvents: QueueEvents;
  queueName: string;
  events?: (keyof QueueEventsListener)[];
  mb: MessageBroker<object>;
}

export const openQueueEvents = async (
  ws: ServerWebSocket<QueueEventsWebSocketData>
) => {
  const { connection, queueName } = ws.data;
  const queueEvents = (ws.data.queueEvents = new QueueEvents(queueName, {
    connection,
  }));

  const messageBroker = (ws.data.mb = new MessageBroker<object>(
    async (msg: string | Buffer) => send(ws, msg)
  ));

  const events = ws.data.events || [];
  const cleanUps = [];

  events.forEach((event) => {
    const eventHandler = async (...args: any[]) => {
      await messageBroker.sendData(
        {
          event,
          args,
        },
        { noack: true }
      );
    };
    log(`Subscribing to event: ${event}, for queue: ${queueName}`);
    queueEvents.on(event, eventHandler);
    cleanUps.push(() => queueEvents.off(event, eventHandler));
  });
};

export const QueueEventsController: WebSocketBehaviour = {
  open: openQueueEvents,

  message: async (
    _ws: ServerWebSocket<QueueEventsWebSocketData>,
    _message: string | Buffer
  ) => { },

  drain: (_ws) => {
    // console.log("WebSocket backpressure: " + ws.getBufferedAmount());
  },

  close: async (ws, code, message) => {
    log(
      `WebSocket closed for queue events (${ws.data.queueName}) with code ${code}${message ? `and message ${Buffer.from(
        message
      ).toString()}` : ""}`
    );

    const { queueEvents } = ws.data;
    if (queueEvents) {
      ws.data.queueEvents = null;
      await queueEvents.close();
    }
  },
};
