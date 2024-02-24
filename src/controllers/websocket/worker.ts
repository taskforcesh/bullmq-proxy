import { WebSocketHandler, ServerWebSocket } from "bun";
import { MessageBroker } from "@taskforcesh/message-broker";
import { Worker, ConnectionOptions, Job } from "bullmq";

import { send } from "../utils";
import { info } from "../../utils/log";

export interface WorkerWebSocketData {
  connection: ConnectionOptions;
  worker: Worker;
  concurrency: number;
  queueName: string;
  mb: MessageBroker<object>;
}

export const openWorker = async (ws: ServerWebSocket<WorkerWebSocketData>) => {
  const { connection, queueName, concurrency } = ws.data;

  info(
    `Worker connected for queue ${queueName} with concurrency ${concurrency}`
  );

  const mb = (ws.data.mb = new MessageBroker<object>(async (msg: string | Buffer) =>
    send(ws, msg)
  ));

  ws.data.worker = new Worker(
    queueName,
    async (job: Job) => {
      const cmd = {
        type: "process",
        payload: job.data,
      };
      const { result, err } = <{ result?: any, err?: any }>await mb.sendData(cmd);
      if (typeof result !== "undefined" && !err) {
        return result;
      } else {
        throw new Error(err);
      }
    },
    {
      connection,
      concurrency,
    }
  );
};

export const WorkerController: WebSocketHandler<WorkerWebSocketData> = {
  open: openWorker,
  message: async (
    ws: ServerWebSocket<WorkerWebSocketData>,
    message: string | Buffer
  ) => {
    if (ws.data.mb) {
      const data = Buffer.from(message).toString();

      try {
        ws.data.mb.processMessage(JSON.parse(data));
      } catch (err) {
        console.error("error JSON parsing data", data, err);
      }
    }
  },
  close: (ws: ServerWebSocket<WorkerWebSocketData>, code, message) => {
    info(
      `WebSocket closed for worker (${ws.data.queueName}) with code ${code}${message ? `and message ${Buffer.from(
        message
      ).toString()}` : ""}`
    );

    const { worker, mb } = ws.data;
    mb && mb.close();
    worker && worker.close();
  },
};
