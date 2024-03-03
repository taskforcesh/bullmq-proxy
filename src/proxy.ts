import { Cluster, Redis } from "ioredis";
import chalk from "chalk";

import { WebSocketBehaviour } from "./interfaces/websocket-behaviour";
import { warn } from "./utils/log";
import { fetchHandler } from "./fetch-handler";
import asciiArt from "./ascii-art";
import { WorkerHttpController } from "./controllers/http/worker-http-controller";

type WebSocketData = {
  createdAt: number;
  params: any;
  controller: WebSocketBehaviour;
};

const websocket = {
  message(ws: any, message: any) {
    const { controller } = ws.data;

    if (controller?.message) {
      controller.message(ws, message);
    } else {
      warn("No controller.message method");
    }
  },
  open(ws: any) {
    const { controller } = ws.data;
    if (controller?.open) {
      controller.open(ws);
    } else {
      warn("No controller.open method");
    }
  }, // a socket is opened
  close(ws: any, code: any, message: any) {
    const { controller } = ws.data;
    if (controller?.close) {
      controller.close(ws, code, message);
    } else {
      warn("No controller.close method");
    }
  }, // a socket is closed
  drain(ws: any) {
    const { controller } = ws.data;
    if (controller?.drain) {
      controller.drain(ws);
    } else {
      warn("No controller.drain method");
    }
  },
  perMessageDeflate: false,
};

export interface ProxyOpts {
  skipInitWorkers?: boolean;
}

export const startProxy = async (
  port: number,
  connection: Redis | Cluster,
  workersConnection: Redis | Cluster,
  opts: ProxyOpts = {},
) => {
  console.log(chalk.gray(asciiArt))

  if (opts.skipInitWorkers !== true) {
    await WorkerHttpController.init(connection, workersConnection);
  }

  const server = Bun.serve<WebSocketData>({
    port,
    fetch: fetchHandler(connection, workersConnection),
    websocket,
  });

  return server;
};
