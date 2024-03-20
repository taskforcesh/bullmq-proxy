import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest, mock } from "bun:test";
import { Server } from "bun";
import { cleanProxy, startProxy } from "./proxy";
import { Redis } from "ioredis";
import { config } from "./config";
import { JobJson, Queue } from "bullmq";
import { cleanCache } from "./utils/queue-factory";
import { WorkerHttpController } from "./controllers/http/worker-http-controller";

const token = 'test-token';

describe("e2e", () => {

  const queueName = 'testQueue-e2e';

  beforeAll(() => {
    mock.module('./config', () => ({
      config: {
        ...config,
        authTokens: [token]
      }
    }));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let redisClient: Redis;
  beforeEach(() => {
    redisClient = new Redis({
      maxRetriesPerRequest: null
    });
  });

  afterEach(async () => {
    const queue = new Queue(queueName, { connection: redisClient, prefix: config.defaultQueuePrefix });
    await queue.obliterate({ force: true });

    // We need to clean the cache to eliminate side-effects between tests
    await cleanCache();

    await queue.close();

    await cleanProxy(redisClient);

    await redisClient.quit();
  });

  it("process a job updating progress and adding logs", async () => {
    const proxy = await startProxy(0, redisClient, redisClient.duplicate());
    const proxyPort = proxy.port;

    let server: Server;
    const processingJob = new Promise<void>((resolve, reject) => {
      server = Bun.serve({
        // Typescript requires this dummy websocket
        websocket: undefined as any,
        port: 0,
        async fetch(req: Request) {
          try {
            const { job, token } = await req.json();
            expect(job).toHaveProperty('name', 'test-job');
            expect(job).toHaveProperty('data', 'test');
            expect(job).toHaveProperty('opts');
            expect(token).toBe(token);

            const updateProgress = await fetch(`http://localhost:${proxyPort}/queues/${queueName}/jobs/${job.id}/progress`, {
              method: 'POST',
              body: JSON.stringify(100),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            expect(updateProgress.status).toBe(200);

            const addLogs = await fetch(`http://localhost:${proxyPort}/queues/${queueName}/jobs/${job.id}/logs`, {
              method: 'POST',
              body: JSON.stringify("log message"),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            expect(addLogs.status).toBe(200);

            resolve();
            return new Response("foo bar");
          }
          catch (e) {
            console.error(e);
            reject(e);
          }
        }
      })
    });

    // Add a job to a queue
    const addJobResponse = await fetch(`http://localhost:${proxyPort}/queues/${queueName}/jobs`, {
      method: 'POST',
      body: JSON.stringify([{ name: "test-job", data: 'test' }]),
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${token}`
      },
    });

    expect(addJobResponse.status).toBe(200);
    const jobsAdded = await addJobResponse.json();

    expect(jobsAdded).toHaveLength(1);
    expect(jobsAdded[0]).toHaveProperty('id');
    expect(jobsAdded[0]).toHaveProperty('name', 'test-job');
    expect(jobsAdded[0]).toHaveProperty('data', 'test');
    expect(jobsAdded[0]).toHaveProperty('opts');

    // Register a worker
    const workerResponse = await fetch(`http://localhost:${proxyPort}/workers`, {
      method: 'POST',
      body: JSON.stringify({
        queue: queueName,
        endpoint: {
          url: `http://localhost:${server!.port}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${token}`
      },
    });
    
    expect(await workerResponse.text()).toBe("OK");
    expect(workerResponse.status).toBe(200);
    await processingJob;

    // Wait so that the job has a chance to return its value
    await new Promise(resolve => setTimeout(resolve, 1000));

    const getJobResponse = await fetch(`http://localhost:${proxyPort}/queues/${queueName}/jobs/${jobsAdded[0].id}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    expect(getJobResponse.status).toBe(200);
    const job = await getJobResponse.json() as JobJson;

    expect(job).toHaveProperty('id', jobsAdded[0].id);
    expect(job).toHaveProperty('name', 'test-job');
    expect(job).toHaveProperty('data', 'test');
    expect(job).toHaveProperty('opts');
    expect(job.returnvalue).toBe("foo bar");
    expect(job.progress).toBe(100);

    const getJobLogsResponse = await fetch(`http://localhost:${proxyPort}/queues/${queueName}/jobs/${jobsAdded[0].id}/logs`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    expect(getJobLogsResponse.status).toBe(200);
    const { logs, count } = await getJobLogsResponse.json() as { count: number, logs: string[] };
    expect(count).toBe(1);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toBe("log message");

    server!.stop();
    proxy.stop();
  })
});
