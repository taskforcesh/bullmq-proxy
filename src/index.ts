import IORedis, { Cluster, Redis } from "ioredis";

import { startProxy } from "./proxy";
import { config } from "./config";
import { debug, error, info } from "./utils/log";
import { gracefulShutdownWorkers } from "./controllers/http/worker-http-controller";
import { cleanCache } from "./utils/queue-factory";

const pkg = require("../package.json");

let connection: Redis | Cluster;
let workersConnection: Redis | Cluster;

if (config.redis.url) {
  connection = new IORedis(config.redis.url, {
    retryStrategy: () => 3000,
 //   maxRetriesPerRequest: 20,
    enableOfflineQueue: false,
  });
} else {
  connection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    username: config.redis.username,
    tls: config.redis.tls,
 //   maxRetriesPerRequest: 20,
    retryStrategy: () => 3000,
  });
}

connection.on("ready", () => {
  const url = config.redis.url || `redis://${config.redis.host}:${config.redis.port}`;
  const parsedUrl = new URL(url);
  info(`Connected to Redis at ${parsedUrl.host}`);
});

// Workers should never exahust the retries
workersConnection = connection.duplicate({
  maxRetriesPerRequest: null,
  enableOfflineQueue: true
});

connection.on("error", (err) => {
  error(`Redis connection error: ${err.message}`);
  if (config.debugEnabled) {
    debug(`Redis connection error with url: ${config.redis.url || `${config.redis.host}:${config.redis.port}`}`);
  }
})

workersConnection.on("error", (err) => {
  error(`Redis workers connection error: ${err.message}`);
  if (config.debugEnabled) {
    debug(`Redis workers connection error with url: ${config.redis.url || `${config.redis.host}:${config.redis.port}`}`);
  }
})

startProxy(config.port, connection, workersConnection).then((server) => {
  info(`Running BullMQ Proxy on port ${server.port} (c) ${new Date().getFullYear()} Taskforce.sh Inc. v${pkg.version}`);
}).catch((err) => {
  error(`Error starting server ${(<Error>err).message}`);
});

process.on("uncaughtException", (err) => {
  error(`Uncaught exception: ${err.message}`);
});

process.on("unhandledRejection", (err) => {
  error(`Unhandled rejection: ${err}`);
});

const gracefulShutdown = async (signal: number) => {
  info(`Received ${signal}, closing server...`);

  // Close workers
  await gracefulShutdownWorkers();

  // Close queues
  info("Closing queues...")
  await cleanCache();
  info("Queues closed");

  // Close Redis connections
  await connection.quit();
  await workersConnection.quit();

  // Exit process
  process.exit(0);
}

process.on("SIGINT", () => {
  info("Received SIGINT, shutting down");
  gracefulShutdown(15);
});

process.on("SIGTERM", () => {
  info("Received SIGTERM, shutting down");
  gracefulShutdown(15);
});
