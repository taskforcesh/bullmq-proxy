import IORedis from "ioredis";

import {
  QueueController,
  WorkerController,
  QueueEventsController,
} from "./controllers";
import { RouteMatcher } from "./utils/router-matcher";
import { warn } from "./utils/log";
import { Server } from "bun";
import queuesRoutes from "./routes/queues-routes";
import asciiArt from "./ascii-art";
import workersRoutes from "./routes/workers-routes";

const pkg = require("../package.json");

const routeMatcher = new RouteMatcher();

// Standard HTTP Routes
queuesRoutes(routeMatcher);
workersRoutes(routeMatcher);

// WebSocket Routes
routeMatcher.addWebSocketRoute<{ queueName: string }>("queue", "/ws/queues/:queueName", QueueController);
routeMatcher.addWebSocketRoute<{ queueName: string; concurrency: number }>(
  "worker",
  "/ws/queues/:queueName/process/:concurrency", WorkerController
);
routeMatcher.addWebSocketRoute<{ queueName: string }>(
  "queue-events",
  "/ws/queues/:queueName/events", QueueEventsController
);

export const fetchHandler = (connection: IORedis, authTokens: string[] = []) => async (req: Request, server: Server) => {
  const url = new URL(req.url);
  const { searchParams } = url;
  const { method } = req;

  if (url.pathname === "/" && method === "GET") {
    return new Response(
      `${asciiArt}\nBullMQ Proxy (c) ${new Date().getFullYear()} Taskforce.sh Inc. v${pkg.version
      }`,
      { status: 200 }
    );
  }

  const from =
    req.headers.get("x-forwarded-for") || req.headers.get("host");

  const token = searchParams.get("token") || req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    warn(
      `Unauthorized request (missing token) to path ${url.pathname.toString()} from ${from}`
    );
    return new Response("Unauthorized", { status: 401 });
  }

  if (!authTokens.includes(token!)) {
    warn(
      `Unauthorized request (invalid token) to path ${url.pathname.toString()} from ${from}`
    );
    return new Response("Unauthorized", { status: 401 });
  }

  // Choose controller based on path
  const route = routeMatcher.match(url.pathname, method);
  if (!route) {
    warn(
      `Not found request to path ${url.pathname.toString()} from ${req.headers.get("x-forwarded-for") || req.headers.get("host")
      }`
    );
    return new Response("Not found", { status: 404 });
  }

  const queueName = route.params?.queueName;
  let controller;
  let events;
  const concurrency = parseInt(route.params.concurrency, 10) || 1;

  if (route.websocketHandler) {
    controller = route.websocketHandler;
    if (
      server.upgrade(req, {
        data: {
          route,
          controller,
          queueName,
          concurrency,
          connection,
          events,
          searchParams
        },
      })
    ) {
      return; // Do not return a Response to signal that the upgrade is successful
    }
    return new Response("Upgrade failed :(", { status: 500 });
  } else if (route.httpHandler) {
    return route.httpHandler({ req, params: route.params, searchParams, redisClient: connection });
  } else {
    return new Response("Not found", { status: 404 });
  }
}
