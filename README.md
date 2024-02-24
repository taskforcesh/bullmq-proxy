# BullMQ Proxy

This lightweight service works as a proxy for BullMQ queues. It has applications in many useful cases:

- Work with your queues in any language or platform that supports HTTP.
- Run your workers in serverless environments.
- Isolate your Redis instances and only allow BullMQ operations from untrusted sources.
- Implement Access Control for your queues (coming soon).

The proxy provides a simple Restful HTTP API that supports the most important features available in BullMQ. You
can add jobs with any options you like and instantiate workers, also with any BullMQ compatible options.

## Roadmap

[x] Initial support for adding and processing jobs for any queue.
[x] Queue getters (retrieve jobs in any status from any queue).
[ ] Support redundancy (multiple proxies running in parallel).
[ ] Queue actions: Pause, Resume, Clean and Obliterate.
[ ] Job actions: promote, retry, remove.
[ ] Support for adding flows.
[ ] Dynamic rate-limit.
[ ] Manually consume jobs.

Although the service is not yet feature complete, you are very welcome to try it out and give us
feedback and report any issues you may find.

## Installation

As we wanted to maximize performance and reduce overhead as much as possible, we are using [Bun](https://github.com/oven-sh/bun) as our runtime instead of NodeJS. Bun has the fastest HTTP (and Websocket) server for any javascript runtime.

The proxy can be installed as a dependency in your project (if you use bun), but we also
provide a Dockerfile that can be used to just run the proxy easily on any system that supports Docker.

## Use as a Docker container

```bash
docker build -t bullmq-proxy github.com/taskforcesh/bullmq-proxy
docker run -p 8080:8080 -e REDIS_HOST=redis -e REDIS_PORT=6379 -e AUTH_KEYS=my-auth-key-1,my-auth-key-2 bullmq-proxy
```

## Use as a dependency (Not yet available)

```bash
 bun add bullmq-proxy ioredis
```

```typescript
import IORedis from 'ioredis'
import { startProxy } from './proxy'

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
})

// Start proxyn passing an IORedis connection and an array of auth keys
startProxy(connection, ['my-auth-key-1', 'my-auth-key-2'])
```

## Developing

If you want to contribute to this project, you can clone the repository and run the proxy locally using the following command:

```bash
AUTH_TOKENS=1234 bun --watch src/index.ts
```

Which will start the proxy locally connected to a local Redis instance (on port 6379) and listening on port 8080.
If you then use a websocket client to connect to the proxy, you will see the following output in the console:

```bash
Starting BullMQ Proxy on port 8080 (c) 2024 Taskforce.sh Inc. v0.1.0
[1696158613843] BullMQ Proxy: Worker connected for queue test-queue with concurrency 20
[1696158613849] BullMQ Proxy: Queue connected for queue test-queue
[1696158613850] BullMQ Proxy: Queue events connected for queue test-queue with events waiting,active
[1696158613851] BullMQ Proxy: Subscribing to event: waiting, for queue: test-queue
[1696158613851] BullMQ Proxy: Subscribing to event: active, for queue: test-queue
```

# Connecting to the proxy

## HTTP Protocol

It is possible to access all the proxy features by using a standard HTTP REST-inspired API.

### Add jobs

Jobs can be easily added to a queue using the `POST /queues/:queueName` endpoint. The endpoint expects
a JSON body with the following interface:

```ts
type PostJobsBody = PostJobBody[];

interface PostJobBody {
  data: any;
  opts: JobOpts;
}

interface JobOpts {
  ...
}
```

The interface accepts an array of one or more jobs, that are to be added to the queue. Note that the call is atomic
and thus all or none of the jobs will be added to the queue if the call succeeds or fails respectively.

### Utility

- Get jobs
- Remove jobs
- Clean queue
- Pause queue
- Resume queue
- Promote job
- etc.

### Register endpoints

Several mechanisms can be used to process jobs that have been added to the queue. The first one is by registering
an endpoint that will receive the job. The endpoint is normally a URL that the Proxy will call as soon as there are jobs to be processed. This is a powerful mechanism as it allows to processing of jobs serverless, for instance, the endpoint could be an AWS Lambda or Cloudflare function.

The endpoints are registered using the `POST /endpoints/:queueName` endpoint. The endpoint expects a JSON
body with the following interface:

```ts
interface Endpoint {
  url: string
  method: 'POST'
  headers: { [index: string]: string }
  opts: {
    concurrency?: number // Default 1
    rateLimit?: {
      max: number
      duration: number
    }
  }
}
```

Note that only one endpoint can be registered per queue, calling this API more than once for a given queue name
will just overwrite any existing endpoint.

When an endpoint is called to process a job, the call should not return until the job has been completed (or failed). A call that times out will be considered a failed job by the proxy.

### List endpoints

### Remove endpoint

## WebSocket protocol

The proxy defines a very simple protocol that is used to communicate with the proxy. The protocol is based on JSON messages that are sent back and forth between the client and the proxy.

All the messages have the following structure:

```typescript
interface Message {
  id: number
  data: QueuePayload | WorkerPayload | EventPayload
}
```

The `id` field is used to identify the message and the `data` field contains the actual data of the message, which can be anything and is defined below.

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
  fn: QueueFunction // Any function defined in BullMQ API (add, pause, resume, etc)
  args: any[] // Arguments for the function
}
```

The proxy will validate the function and the arguments and will return the result of the function call to the client, or an error if the function call failed following this interface:

```typescript
interface QueueResult {
  ok?: any // Result of the function call if it was successful
  err?: {
    message: string
    stack: string
  }
}
```

## [Worker API](#worker-api)

The Worker API is accessible at the `/queue/:queueName/process/:concurrency` endpoint. It allows you to start consuming jobs from a queue with the specified concurrency. As soon as the WebSocket connection is established, the proxy will start sending WebSocket messages with the jobs that are supposed to be processed by this client and send a message back to the proxy with the result of the job.

```typescript
interface WorkerPayload {
  type: 'process'
  payload: any // Any job payload
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
  event: string // Event name
  args: any[] // Array of arguments for the event
}
```
