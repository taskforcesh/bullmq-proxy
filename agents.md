# BullMQ Proxy - Comprehensive Guide for AI Agents

## Project Overview

**BullMQ Proxy** is a lightweight HTTP-based proxy service for [BullMQ](https://bullmq.io/), enabling interaction with Redis-backed job queues through RESTful HTTP and WebSocket APIs. Built with [Bun.js](https://bun.sh/), it provides a language-agnostic interface to BullMQ's powerful job queue capabilities.

### Core Purpose

- **Language Agnostic**: Work with BullMQ from any language that supports HTTP
- **Serverless Support**: Run workers in serverless environments without direct Redis connections
- **Redis Isolation**: Protect Redis instances from untrusted sources
- **Access Control**: Token-based authentication for queue operations
- **Scalability**: Deploy multiple proxy instances for redundancy and load distribution

### Repository Information

- **Repository**: https://github.com/taskforcesh/bullmq-proxy
- **License**: MIT
- **Author**: Manuel Astudillo (Taskforce.sh Inc.)
- **Current Version**: 1.5.3
- **Runtime**: Bun.js
- **Primary Language**: TypeScript (91.8%)

## Architecture

### Technology Stack

- **Runtime**: Bun.js (high-performance JavaScript runtime)
- **Queue System**: BullMQ v5.41.0+
- **Database**: Redis/DragonflyDB (via ioredis)
- **Protocols**: HTTP/REST and WebSockets
- **Validation**: TypeBox (@sinclair/typebox)
- **Language**: TypeScript

### System Components

```
┌─────────────┐
│   Clients   │ (HTTP/WebSocket)
└──────┬──────┘
       │
┌──────▼──────────────┐
│  BullMQ Proxy       │
│  ┌───────────────┐  │
│  │ HTTP Routes   │  │
│  │ - Queues      │  │
│  │ - Workers     │  │
│  │ - Jobs        │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ WebSocket     │  │
│  │ - Queue Ops   │  │
│  │ - Job Process │  │
│  │ - Events      │  │
│  └───────────────┘  │
└──────┬──────────────┘
       │
┌──────▼──────┐
│    Redis    │
└─────────────┘
```

### Core Modules

#### 1. **Proxy Core** (`src/proxy.ts`, `src/index.ts`)
- Server initialization with Bun.serve
- Redis connection management (separate connections for queues and workers)
- WebSocket upgrade handling
- Graceful shutdown with cleanup

#### 2. **HTTP Controllers**

**Queue Controller** (`src/controllers/http/queue-http-controller.ts`)
- `POST /queues/:queueName/jobs` - Add jobs (bulk)
- `GET /queues/:queueName/jobs` - Get jobs with pagination and status filtering
- `GET /queues/:queueName/jobs/:jobId` - Get single job

**Worker Controller** (`src/controllers/http/worker-http-controller.ts`)
- `POST /workers` - Register worker with endpoint metadata
- `GET /workers` - List all registered workers
- `DELETE /workers/:queueName` - Remove worker
- Worker stream listener for real-time worker updates
- Lua scripts for atomic Redis operations

**Job Controller** (`src/controllers/http/worker-job-http-controller.ts`)
- `POST /queues/:queueName/jobs/:jobId/progress` - Update job progress
- `POST /queues/:queueName/jobs/:jobId/logs` - Add job logs
- `GET /queues/:queueName/jobs/:jobId/logs` - Get job logs

#### 3. **WebSocket Controllers**

**Queue WebSocket** (`src/controllers/websocket/queue.ts`)
- Endpoint: `ws://host/ws/queues/:queueName`
- Direct BullMQ Queue method invocation via message passing
- Bidirectional communication with message broker

**Worker WebSocket** (`src/controllers/websocket/worker.ts`)
- Endpoint: `ws://host/ws/queues/:queueName/process/:concurrency`
- Job processing with configurable concurrency
- Real-time job data streaming to client

**Queue Events WebSocket** (`src/controllers/websocket/queue-events.ts`)
- Endpoint: `ws://host/ws/queues/:queueName/events`
- Subscribe to queue events (completed, failed, progress, etc.)

#### 4. **Message Broker** (`src/controllers/websocket/message-broker.ts`)
- Custom implementation for non-acknowledged protocols
- Request-response pattern over WebSockets
- Timeout management (15s default)
- Promise-based API

#### 5. **Authentication**

**Token-Based Auth** (`src/authware/auth-by-tokens.ts`)
- Bearer token authentication
- Configured via `AUTH_TOKENS` environment variable
- Applied to queue and worker operations

**Worker Job Auth** (`src/authware/auth-for-workers.ts`)
- Token validation against job lock keys
- Ensures only the processing worker can modify job state
- Prevents unauthorized job manipulation

#### 6. **Validation** (`src/validators/`)
- Queue name validation (length, characters)
- Job schema validation
- Worker metadata validation (endpoint, options)
- Repeat options validation
- Deduplication options validation

#### 7. **Utilities**

**Queue Factory** (`src/utils/queue-factory.ts`)
- LRU cache for Queue instances (configurable size)
- Automatic queue instantiation and cleanup
- Connection reuse

**Route Matcher** (`src/utils/router-matcher.ts`)
- Path-based routing with parameter extraction
- HTTP method matching
- WebSocket upgrade support
- Authentication middleware integration

**Cache** (`src/cache.ts`)
- Generic LRU cache implementation
- Automatic eviction with cleanup callbacks
- Used for queue instance management

### Configuration

Environment variables (see `src/config.ts`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `REDIS_URL` | - | Redis connection URL (takes precedence) |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_USERNAME` | - | Redis username |
| `REDIS_PASSWORD` | - | Redis password |
| `REDIS_TLS` | false | Enable TLS for Redis |
| `AUTH_TOKENS` | [] | Comma-separated auth tokens |
| `QUEUE_PREFIX` | bull | BullMQ queue prefix |
| `QUEUE_CACHE_SIZE` | 100 | Max cached queue instances |
| `DEBUG` | false | Enable debug logging |
| `MIN_QUEUE_NAME_LENGTH` | 3 | Minimum queue name length |
| `MAX_QUEUE_NAME_LENGTH` | 100 | Maximum queue name length |
| `WORKER_METADATA_KEY` | bmqp:w:meta | Redis key for worker metadata |
| `WORKER_METADATA_STREAM` | bmpq:w:stream | Redis stream for worker events |
| `MAX_LEN_WORKER_METADATA_STREAM` | 100 | Max stream length |

## API Reference

### REST API

#### Queue Operations

**Add Jobs**
```http
POST /queues/:queueName/jobs
Authorization: Bearer {token}
Content-Type: application/json

[
  {
    "name": "job-type",
    "data": { "key": "value" },
    "opts": {
      "delay": 1000,
      "attempts": 3,
      "priority": 1
    }
  }
]
```

**Get Jobs**
```http
GET /queues/:queueName/jobs?start=0&length=10&statuses=waiting,active
Authorization: Bearer {token}
```

Returns:
```json
{
  "counts": { "waiting": 5, "active": 2 },
  "jobs": [...],
  "start": 0,
  "length": 10
}
```

**Get Single Job**
```http
GET /queues/:queueName/jobs/:jobId
Authorization: Bearer {token}
```

#### Worker Operations

**Register Worker**
```http
POST /workers
Authorization: Bearer {token}
Content-Type: application/json

{
  "queue": "myQueue",
  "endpoint": {
    "url": "https://my-service.com/process-job",
    "method": "POST",
    "headers": {
      "X-Custom-Header": "value"
    },
    "timeout": 30000
  },
  "opts": {
    "concurrency": 5,
    "removeOnComplete": { "count": 100, "age": 3600 },
    "removeOnFail": { "count": 1000 },
    "limiter": { "max": 10, "duration": 1000 },
    "maxStalledCount": 2
  }
}
```

The worker will call the endpoint with:
```json
{
  "job": {
    "id": "123",
    "name": "job-type",
    "data": { ... },
    "opts": { ... }
  },
  "token": "job-lock-token"
}
```

**List Workers**
```http
GET /workers
Authorization: Bearer {token}
```

**Remove Worker**
```http
DELETE /workers/:queueName
Authorization: Bearer {token}
```

#### Job Operations (Worker-Only)

**Update Progress**
```http
POST /queues/:queueName/jobs/:jobId/progress
Authorization: Bearer {job-lock-token}
Content-Type: application/json

{ "progress": 50 }
```

**Add Log**
```http
POST /queues/:queueName/jobs/:jobId/logs
Authorization: Bearer {job-lock-token}
Content-Type: application/json

{ "log": "Processing step 1" }
```

**Get Logs**
```http
GET /queues/:queueName/jobs/:jobId/logs?start=0&end=-1
Authorization: Bearer {token}
```

### WebSocket API

#### Queue Operations

Connect to `ws://host/ws/queues/:queueName`

Send commands:
```json
{
  "id": 1,
  "data": {
    "fn": "add",
    "args": ["jobName", { "key": "value" }, { "delay": 1000 }]
  }
}
```

Receive response:
```json
{
  "id": 1,
  "data": {
    "ok": { "id": "123", "name": "jobName", ... }
  }
}
```

Supported functions:
- `add`, `pause`, `resume`, `getWorkers`, `getJobs`, `getJobCounts`, `getJobLogs`

#### Worker Processing

Connect to `ws://host/ws/queues/:queueName/process/:concurrency`

Receive job:
```json
{
  "id": 1,
  "data": {
    "type": "process",
    "payload": { "job": "data" }
  }
}
```

Respond with result:
```json
{
  "id": 1,
  "data": {
    "result": { "processed": true }
  }
}
```

#### Queue Events

Connect to `ws://host/ws/queues/:queueName/events`

Subscribe to events:
```json
{
  "id": 1,
  "data": {
    "fn": "on",
    "args": ["completed"]
  }
}
```

Receive events:
```json
{
  "id": 0,
  "data": {
    "event": "completed",
    "args": [{ "jobId": "123", "returnvalue": "result" }]
  }
}
```

## Client Libraries

### Official Clients

#### Bun/TypeScript Client (`clients/bun/`)
- Full TypeScript support
- WebSocket-based Queue and Worker clients
- Auto-reconnection
- Promise-based API

**Installation:**
```bash
cd clients/bun
bun install
```

**Usage:**
```typescript
import { QueueClient, WorkerClient } from "./src";

const queue = new QueueClient({
  host: "ws://localhost:8080/ws",
  queueName: "myQueue",
  token: "auth-token"
});

await queue.add("job-name", { data: "value" });

const worker = new WorkerClient({
  host: "ws://localhost:8080/ws",
  queueName: "myQueue",
  token: "auth-token",
  concurrency: 5
});

worker.process(async (job) => {
  console.log("Processing", job.data);
  return { result: "done" };
});
```

#### Go Client (`clients/golang/`)
- WebSocket-based
- Queue and Worker support
- Type-safe job handling

**Installation:**
```bash
cd clients/golang
go get
```

**Usage:**
```go
import "taskforce.sh/bullmq_proxy_client/queue"

q := queue.NewQueue("ws://localhost:8080/ws/queues/myQueue")
job, err := q.AddJob("jobName", map[string]interface{}{
  "key": "value",
}, nil)
```

### Creating Custom Clients

To create a client for another language:

1. **WebSocket Connection**: Establish connection to appropriate endpoint
2. **Message Format**: Send/receive JSON messages with `id` and `data` fields
3. **Message Broker Pattern**: Implement request-response correlation using message IDs
4. **Auto-Reconnection**: Handle disconnections gracefully
5. **Authentication**: Include Bearer token in initial connection or headers

Example message flow:
```
Client -> Server: {"id": 1, "data": {"fn": "add", "args": [...]}}
Server -> Client: {"id": 1, "data": {"ok": {...}}} or {"id": 1, "data": {"err": "..."}}
```

## Worker Architecture

### HTTP-Based Workers

Workers in BullMQ Proxy operate differently from native BullMQ workers:

1. **Worker Registration**: Register an HTTP endpoint that will process jobs
2. **Job Delegation**: Proxy fetches job from Redis and calls your endpoint
3. **Job Processing**: Your endpoint processes the job and returns result
4. **Completion**: Proxy marks job as complete/failed based on response

**Benefits:**
- Run workers in any language
- Deploy to serverless platforms (AWS Lambda, Google Cloud Functions, etc.)
- No direct Redis connection needed
- Automatic job lifecycle management

### Worker Metadata Persistence

Worker configurations are stored in Redis using:
- **Hash**: `bmqp:w:meta` stores worker metadata per queue
- **Stream**: `bmpq:w:stream` notifies all proxy instances of changes
- **SHA256**: Used to detect configuration changes

This enables:
- **Redundancy**: Multiple proxy instances stay synchronized
- **Persistence**: Workers restart automatically after proxy restart
- **Hot Reload**: Update worker configuration without downtime

### Worker Options

Supported BullMQ worker options:
- `concurrency`: Number of parallel jobs
- `removeOnComplete`: Auto-cleanup for completed jobs
- `removeOnFail`: Auto-cleanup for failed jobs
- `limiter`: Rate limiting configuration
- `maxStalledCount`: Max stalled job retries

**Not supported** (proxy manages these):
- `connection`, `blockingConnection`
- `autorun`, `stalledInterval`
- `skipLockRenewal`, `lockDuration`
- `useWorkerThreads`

## Testing

### Test Structure

Tests use Bun's built-in test runner (`bun:test`):

```bash
# Run all tests
bun test

# Run specific test file
bun test src/proxy.spec.ts

# Run E2E tests
bun run test:e2e
```

### Test Coverage

**Unit Tests:**
- `src/cache.spec.ts` - LRU cache implementation
- `src/proxy.spec.ts` - Proxy initialization
- `src/controllers/**/*.spec.ts` - Controller logic
- `src/validators/**/*.spec.ts` - Validation rules
- `src/authware/**/*.spec.ts` - Authentication

**E2E Tests:**
- `src/e2e-test.ts` - End-to-end workflow testing

### Testing Strategy

1. **Mock Redis**: Use `jest.mock()` for ioredis
2. **Mock HTTP**: Mock Request/Response objects
3. **Integration**: Test full request/response cycles
4. **WebSocket**: Test WebSocket upgrade and message handling

## Deployment

### Docker Deployment

**Using Pre-built Image:**
```bash
docker run -p 8080:8080 \
  -e REDIS_HOST=redis \
  -e AUTH_TOKENS=secret-token \
  ghcr.io/taskforcesh/bullmq-proxy:latest
```

**Docker Compose:**
```yaml
version: '3'
services:
  proxy:
    image: ghcr.io/taskforcesh/bullmq-proxy:latest
    ports:
      - 8080:8080
    environment:
      REDIS_HOST: redis
      AUTH_TOKENS: secret-token
  redis:
    image: redis:alpine
```

**Building Custom Image:**
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lockb ./
COPY src ./src
RUN bun install --production
CMD bun start
EXPOSE 8080
```

### Kubernetes Deployment

Deploy multiple replicas for high availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bullmq-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bullmq-proxy
  template:
    metadata:
      labels:
        app: bullmq-proxy
    spec:
      containers:
      - name: proxy
        image: ghcr.io/taskforcesh/bullmq-proxy:latest
        env:
        - name: REDIS_HOST
          value: redis-service
        - name: AUTH_TOKENS
          valueFrom:
            secretKeyRef:
              name: proxy-secrets
              key: auth-tokens
        ports:
        - containerPort: 8080
```

### Production Considerations

1. **Redis Connection**:
   - Use connection pooling
   - Configure retry strategy
   - Separate connections for queues and workers
   - Enable TLS for production

2. **Authentication**:
   - Use strong, randomly generated tokens
   - Rotate tokens regularly
   - Different tokens for different services
   - Store tokens in secrets manager

3. **Monitoring**:
   - Track job processing rates
   - Monitor Redis connection health
   - Log failed jobs and errors
   - Set up alerting for worker failures

4. **Scaling**:
   - Run multiple proxy instances
   - Use Redis Cluster for high throughput
   - Scale workers independently
   - Consider worker endpoint timeouts

5. **Security**:
   - Use HTTPS for worker endpoints
   - Enable Redis TLS
   - Network isolation for Redis
   - Rate limiting at proxy level

## Development

### Setup

```bash
# Install dependencies
bun install

# Run in development mode (auto-reload)
bun run dev

# Run in production mode
bun start

# Type checking
bun run tsc

# Format code
bunx prettier --write .
```

### Project Structure

```
bullmq-proxy/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── http/          # REST API controllers
│   │   └── websocket/     # WebSocket controllers
│   ├── routes/            # Route definitions
│   ├── authware/          # Authentication middleware
│   ├── validators/        # Input validation
│   ├── interfaces/        # TypeScript interfaces
│   ├── utils/             # Utilities
│   ├── index.ts           # Entry point
│   ├── proxy.ts           # Server setup
│   └── config.ts          # Configuration
├── clients/               # Client libraries
│   ├── bun/               # TypeScript/Bun client
│   └── golang/            # Go client
├── docs/                  # Documentation
├── benchmarks/            # Performance benchmarks
└── docker-compose.yml     # Local development setup
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with default settings
- **Linting**: No explicit ESLint (Bun handles this)
- **Commits**: Conventional Commits (enforced by commitlint)
- **Naming**: camelCase for variables, PascalCase for types/classes

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with conventional commits
4. Run tests: `bun test`
5. Submit pull request

**Commit Message Format:**
```
type(scope): description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Known Limitations & Gaps

### Current Limitations

1. **Queue Actions** (Not Implemented):
   - Pause queue
   - Resume queue
   - Clean queue
   - Obliterate queue

2. **Job Actions** (Not Implemented):
   - Promote job
   - Retry job
   - Remove job
   - Update job data

3. **Advanced Features** (Not Implemented):
   - Job flows/parent-child relationships
   - Dynamic rate limiting
   - Manual job consumption
   - Global queue event listeners
   - Job priority modification
   - Job dependencies

4. **Worker Features**:
   - Limited worker options support
   - No worker metrics/statistics
   - No worker pause/resume
   - No sandboxed processors

5. **Performance**:
   - Additional latency from HTTP layer
   - WebSocket connection overhead
   - No built-in request batching

6. **Security**:
   - Basic token authentication only
   - No role-based access control (RBAC)
   - No per-queue access control
   - No rate limiting per client

### Missing Features from Native BullMQ

- Advanced telemetry and metrics
- Built-in UI/dashboard
- Job prioritization updates
- Complex job patterns (flows)
- Observability hooks
- Custom job naming strategies
- Advanced retry strategies

### Areas for Improvement

1. **API Completeness**: Implement missing queue and job actions
2. **Documentation**: More examples and use cases
3. **Client Libraries**: Clients for Python, Ruby, Java, .NET
4. **Monitoring**: Built-in metrics and health endpoints
5. **Rate Limiting**: Per-client rate limiting
6. **RBAC**: Fine-grained access control
7. **Batching**: Support for batch operations
8. **Compression**: WebSocket message compression
9. **Validation**: More comprehensive input validation
10. **Error Handling**: Better error messages and codes

## Troubleshooting

### Common Issues

**Connection Refused**
- Check Redis is running and accessible
- Verify `REDIS_HOST` and `REDIS_PORT`
- Check network connectivity and firewall rules

**Authentication Failed**
- Ensure `AUTH_TOKENS` is set
- Verify Bearer token in Authorization header
- Check token format (no spaces, correct encoding)

**Worker Not Processing Jobs**
- Verify worker endpoint is accessible from proxy
- Check worker endpoint returns 200 OK
- Verify worker timeout is sufficient
- Check job lock token is valid

**Job Stalled**
- Worker endpoint timeout too low
- Worker crashed during processing
- Network issues between proxy and worker
- Redis connection lost

**WebSocket Connection Drops**
- Check network stability
- Implement auto-reconnection in client
- Verify proxy is not being restarted
- Check for connection timeout settings

### Debug Mode

Enable debug logging:
```bash
DEBUG=true bun start
```

This will log:
- Redis connection events
- Job processing steps
- Worker registration/removal
- WebSocket connections
- Authentication attempts

### Health Check

```bash
curl http://localhost:8080/
```

Should return:
```
BullMQ Proxy (c) 2025 Taskforce.sh Inc. v1.5.3
```

## Roadmap

See [README.md](README.md) for the current roadmap. Key priorities:

- [ ] Queue actions: Pause, Resume, Clean, Obliterate
- [ ] Job actions: promote, retry, remove
- [ ] Support for adding flows
- [ ] Dynamic rate-limit
- [ ] Manually consume jobs
- [ ] Listen to global queue events

## Resources

- **Documentation**: https://docs.bullmq.net/
- **GitHub**: https://github.com/taskforcesh/bullmq-proxy
- **BullMQ**: https://bullmq.io/
- **Bun.js**: https://bun.sh/
- **Issues**: https://github.com/taskforcesh/bullmq-proxy/issues

## License

MIT License - Copyright (c) 2023-2024 Manuel Astudillo

---

**Last Updated**: November 16, 2025
**Document Version**: 1.0
**Proxy Version**: 1.5.3
