import IORedis from "ioredis";
import { startProxy } from "./proxy";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  retryStrategy: () => 1000,
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error("Redis connection error", err);
})

const port = parseInt(process.env.PORT || "8080", 10);

startProxy(port, connection, (process.env.AUTH_TOKENS || "").split(","));
