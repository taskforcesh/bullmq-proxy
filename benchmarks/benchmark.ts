import { startProxy } from '../src/proxy';
import { Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const numJobs = 10000;
const queueName = 'test-queue';

async function benchmarkBullMQ() {
  const redisClient = new Redis();
  const workersRedisClient = new Redis({
    maxRetriesPerRequest: null
  });

  const addingBullMQjobs: Promise<Job<any, any, string>>[] = [];
  const queue = new Queue(queueName, { connection: redisClient });

  for (let i = 0; i < numJobs; i++) {
    const jobPromise = queue.add('test-job', `${i}`)
    addingBullMQjobs.push(jobPromise);
  }

  const startTime = Date.now();
  await Promise.all(addingBullMQjobs);
  const duration = Date.now() - startTime;
  console.log(`Added ${numJobs} jobs in ${duration}ms, numJobs/s: ${numJobs / ((duration) / 1000)}`);

  let worker: Worker;
  const processingBullMQJobs = new Promise<void>((resolve, reject) => {
    let count = 0;

    worker = new Worker(queueName, async (job) => {
      count++;
      if (count === numJobs) {
        resolve();
      }
      return job.data;
    }, { connection: workersRedisClient, concurrency: 300 });
  });

  const startTime2 = Date.now();
  await processingBullMQJobs;
  const duration2 = Date.now() - startTime2;
  console.log(`Processed ${numJobs} jobs in ${duration2}ms, numJobs/s: ${numJobs / ((duration2) / 1000)}`);

  await queue.close();
  await worker!.close();
  await redisClient.quit();
  await workersRedisClient.quit();
}

async function benchmarkProxy() {
  const redisClient = new Redis();
  const workersRedisClient = new Redis({
    maxRetriesPerRequest: null
  });

  const proxy = await startProxy(0, redisClient, workersRedisClient);
  const proxyPort = proxy.port;

  const token = process.env.AUTH_TOKENS?.split(',')[0];

  const startTime = Date.now();

  const addingJobs: Promise<Response>[] = [];
  for (let i = 0; i < numJobs; i++) {
    const addingJob = fetch(`http://localhost:${proxyPort}/queues/${queueName}/jobs`, {
      method: 'POST',
      body: JSON.stringify([{ name: "test-job", data: `${i}` }]),
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${token}`
      },
    });

    addingJobs.push(addingJob);
  }

  await Promise.all(addingJobs);

  const duration = Date.now() - startTime;
  console.log(`Added ${numJobs} jobs in ${duration}ms, numJobs/s: ${numJobs / ((duration) / 1000)}`);

  let count = 0;
  const processingJobs = new Promise<void>(async (resolve, reject) => {
    const server = Bun.serve({
      // Typescript requires this dummy websocket
      websocket: undefined as any,
      port: 0,
      async fetch(req: Request) {
        const { job, token } = await req.json();

        count++;
        if (count === numJobs - 1) {
          resolve();
        }

        return new Response("done!");
      }
    })

    const registerWorkerResponse = await fetch(`http://localhost:${proxyPort}/workers`, {
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
        opts: {
          concurrency: 100,
        }
      }),
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${token}`
      },
    });

    const startTime = Date.now();
    await processingJobs;

    const duration = Date.now() - startTime;
    console.log(`Processed ${numJobs} jobs in ${duration}ms, numJobs/s: ${numJobs / ((duration) / 1000)}`);
  });
}


async function benchmarck() {
  for (let i = 0; i < 5; i++) {
    console.log(`\nBenchmark ${i + 1}`)
    await benchmarkBullMQ();
  }

  console.log(`\nBenchmark Proxy`)
  await benchmarkProxy();
}

benchmarck();
