import { Server } from "bun";
import IORedis, { Cluster, Redis } from "ioredis";

import { startProxy } from "./proxy";
import { config } from "./config";
import { error, info } from "./utils/log";

const pkg = require("../package.json");

let connection: Redis | Cluster;

if (config.redis.uri) {
  connection = new IORedis(config.redis.uri, {
    retryStrategy: () => 1000,
    maxRetriesPerRequest: null,
  });
} else {
  connection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    username: config.redis.username,
    tls: config.redis.tls,
    retryStrategy: () => 1000,
    maxRetriesPerRequest: null,
  });
}

connection.on("error", (err) => {
  console.error("Redis connection error", err);
})

startProxy(config.port, connection).then((server: Server) => {
  info(`Running BullMQ Proxy on port ${server.port} (c) ${new Date().getFullYear()} Taskforce.sh Inc. v${pkg.version}`);
}).catch((err) => {
  error(`Error starting server ${(<Error>err).message}`);
});
