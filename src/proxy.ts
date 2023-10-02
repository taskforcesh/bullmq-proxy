import IORedis from "ioredis";
import chalk from "chalk";

import { WebSocketBehaviour } from "./interfaces/websocket-behaviour";
import { warn } from "./utils/log";
import { fetchHandler } from "./fetch-handler";

const pkg = require("../package.json");

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

export const startProxy = (
  port: number,
  connection: IORedis,
  authTokens: string[] = [],
) => {
  console.log(
    chalk.green(
      `Starting BullMQ Proxy on port ${port} (c) ${new Date().getFullYear()} Taskforce.sh v${pkg.version
      }`
    )
  );
  Bun.serve<WebSocketData>({
    port,
    fetch: fetchHandler(connection, authTokens),
    websocket,
  });
};
