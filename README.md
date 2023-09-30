# BullMQ Proxy

This is a lightweight and fast proxy for BullMQ that allows you to access your queues via websockets. As BullMQ is currently a library available only for NodeJS and Python, this proxy allows you to access your queues from any language that supports websockets.

## Installation

As we wanted to maximize performance and reduce overhead as much as possible, we are using [Bun](https://github.com/oven-sh/bun) as
our runtime.

The proxy can be installed as a dependency in your project (if you use bun), but we also
provide a Dockerfile that can be used to just run the proxy easily on any system that supports Docker.

## Use as a dependency (Not yet available)

```bash
 bun add bullmq-proxy ioredis
```

```typescript
import IORedis from "ioredis";
import { startProxy } from "./proxy";

const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

// Start proxyn passing an IORedis connection and an array of auth keys
startProxy(connection, ["my-auth-key-1", "my-auth-key-2"]);
```

## Use as a Docker container

```bash
docker build -t bullmq-proxy github.com/taskforcesh/bullmq-proxy
docker run -p 8080:8080 -e REDIS_HOST=redis -e REDIS_PORT=6379 -e AUTH_KEYS=my-auth-key-1,my-auth-key-2 bullmq-proxy
```

# Connecting to the proxy

The proxy exposes a websocket API that can be used to interact with your queues. It provides 3 different APIs depending on what you want to do. The APIs are:

## [Queue API](#queue-api)

The Queue API is accessible at the `/queue/:queueName` endpoint. It allows you to add jobs to a queue, pause, resume, empty, get the number of jobs in the queue, etc.

## [Worker API](#worker-api)

The Worker API is accessible at the `/queue/:queueName/process/:concurrency` endpoint. It allows you start consuming jobs from a queue with the specified concurrency.

## [Events API](#events-api)

The Events API is accessible at the `/queue/:queueName/events` endpoint. It allows you to subscribe to the global events
that happen in a queue.
