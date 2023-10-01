# BullMQ Proxy

This is a lightweight and fast proxy for BullMQ that allows you to access your queues via websockets. As BullMQ is currently a library available only for NodeJS and Python, this proxy allows you to access your queues from any language that supports websockets.

Note: this is a work in progress and it is not ready for production yet.

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

## WebSocket protocol

The proxy defines a very simple protocol that is used to communicate with the proxy. The protocol is based on JSON messages that are sent back and forth between the client and the proxy.

All the messages have the following structure:

```typescript
interface Message {
  id: number;
  data: QueuePayload | WorkerPayload | EventPayload;
}
```

The `id` field is used to identify the message and the `data` field contains the actual data of the message, which can be anything, and is defined below.

The id field must be unique for each message sent by the client, and it will be guaranteed unique for every message sent by the proxy. The easiest and most efficient way to implement this uniqueness is to use a counter that is incremented for each message sent by the client (this is the way the proxy does it internally).

## Security

The proxy allows you to define an array of auth keys that will be used to authenticate the client. The client must send the auth key as a query parameter when connecting to the proxy. If the auth key is not valid, the proxy will close the connection.

So for example, if you have defined the auth keys `my-auth-key-1` and `my-auth-key-2`, you can connect to the proxy using the following URL: `ws://localhost:8080/queue/my-queue?authKey=my-auth-key-1`. For production it is expected that you will always
use a secure connection (wss) and that you will use a secure auth key.

# API

The data field varies depending on the type of the websocket connection. There are 3 different types of connections:

## [Queue API](#queue-api)

The Queue API is accessible at the `/queue/:queueName` endpoint. It allows you to add jobs to a queue, pause, resume, empty, get the number of jobs in the queue, etc.

```typescript
interface QueuePayload {
  fn: QueueFunction; // Any function defined in BullMQ API (add, pause, resume, etc)
  args: any[]; // Arguments for the function
}
```

The proxy will validate the function and the arguments and will return the result of the function call to the client, or an error if the function call failed following this interface:

```typescript
interface QueueResult {
  ok?: any; // Result of the function call if it was successful
  err?: {
    message: string,
    stack: string,
  }
}
```

## [Worker API](#worker-api)

The Worker API is accessible at the `/queue/:queueName/process/:concurrency` endpoint. It allows you start consuming jobs from a queue with the specified concurrency. As soon as the websocket connection is stablished, the proxy will start sending websocket messages with the jobs that are supposed to be processed by this client and send a message back to the proxy with the result of the job.

```typescript
interface WorkerPayload {
  type: "process";
  payload: any; // Any job payload
}
```

The proxy will send a message with the type `process` and the payload will be the job payload. The client is supposed to process the job and send a message back to the proxy with the result of the job.

## [Events API](#events-api)

The Events API is accessible at the `/queue/:queueName/events` endpoint. It allows you to subscribe to the global events
that happen in a queue. You choose which events to listen to by passing an array of event names to the proxy as a query parameter.
For example, to listen to the `completed` and `failed` events, you would connect to the websocket endpoint using this URL:
`/queue/:queueName/events?events=completed,failed`.
Everytime such an event is produced in the queue, the proxy will send a message to the client with the event name and the payload of the event.

```typescript
interface EventPayload {
  event: string; // Event name
  args: any[]; // Array of arguments for the event
}
```
