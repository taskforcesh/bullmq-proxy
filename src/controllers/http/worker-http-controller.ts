
import { Worker } from "bullmq";
import { Redis, Cluster } from "ioredis";
import { debug } from "../../utils/log";

import { HttpHandlerOpts, WorkerMetadata } from "../../interfaces";
import { validateWorkerMetadata } from "../../validators";

const debugEnabled = process.env.DEBUG === 'true';

const workers: { [queueName: string]: Worker } = {};

const workerMetadataKey = process.env.WORKER_METADATA_KEY || 'bullmq-proxy:workers';

// Gracefully close all workers
process.on('exit', async () => {
  for (const queueName in workers) {
    await workers[queueName].close();
  }
});

const workerFromMetadata = (queueName: string, workerMetadata: WorkerMetadata, connection: Redis | Cluster): Worker => {
  const { endpoint: workerEndpoint, opts: workerOptions } = workerMetadata;

  debugEnabled && debug(`Starting worker for queue ${queueName} with endpoint ${workerMetadata.endpoint.url} and options ${workerMetadata.opts || 'default'}`);

  const worker = new Worker(queueName, async (job) => {
    debugEnabled && debug(`Processing job ${job.id} from queue ${queueName} with endpoint ${workerEndpoint.url}`);

    // Process job by calling an external service using the worker endpoint
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      debugEnabled && ("Timeout, aborting...")
      controller.abort()
    }, workerEndpoint.timeout || 3000)

    try {
      const response = await fetch(workerEndpoint.url, {
        method: workerEndpoint.method,
        headers: workerEndpoint.headers,
        body: JSON.stringify(job.toJSON()),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }
      debugEnabled && debug(`Job "${job.id}:${job.name}" processed successfully`);

      // If response is supposed to be json lets parse it
      if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json();
      } else {
        return response.text();
      }
    } catch (err) {
      debugEnabled && debug(`Failed to process job ${job.id}: ${(<Error>err).message}`);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }, { ...workerOptions, connection });

  if (debugEnabled) {
    worker.on('failed', (job, err) => {
      debug(`Job ${job!.id} failed: ${err}`);
    });
  }

  return worker;
};

export const WorkerHttpController = {
  init: (redisClient: Redis | Cluster) => {
    // Load workers from Redis and start them
    debugEnabled && debug('Loading workers from Redis...');
    const stream = redisClient.hscanStream(workerMetadataKey, { count: 10 });
    stream.on('data', (result: string[]) => {
      for (let i = 0; i < result.length; i += 2) {
        const queueName = result[i];
        const value = result[i + 1];

        const workerMetadata = JSON.parse(value) as WorkerMetadata;
        workers[queueName] = workerFromMetadata(queueName, workerMetadata, redisClient);
      }
    });

    return new Promise<void>((resolve, reject) => {
      stream.on('end', () => {
        debugEnabled && debug('Workers loaded');
        resolve();
      });
      stream.on('error', (err) => {
        debugEnabled && debug(`Failed to load workers: ${err}`);
        reject(err);
      });
    });
  },

  /**
   * Add a new worker to the system. A worker is a BullMQ worker that processes
   * jobs by calling an external service.
   * 
   * The worker metadata is stored in Redis so that the workers are re-instantiated
   * after a restart.
   * 
   * Only one worker per queue is allowed, so calling this method with the same
   * queue name will replace the existing worker.
   * 
   * @param opts 
   * 
   * @returns 
   */
  addWorker: async (opts: HttpHandlerOpts) => {
    const workerMetadata = await opts.req.json() as WorkerMetadata;

    try {
      validateWorkerMetadata(workerMetadata);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const { queue: queueName } = workerMetadata;
    const { redisClient } = opts;

    // Replace worker if it already exists
    const existingWorker = workers[queueName];
    const worker = workerFromMetadata(queueName, workerMetadata, redisClient);
    workers[queueName] = worker;

    // Upsert worker metadata in Redis for the worker to be able to reconnect after a restart
    try {
      await redisClient.hset(workerMetadataKey, queueName, JSON.stringify(workerMetadata));
      return new Response('OK', { status: 200 });
    } catch (err) {
      return new Response('Failed to store worker metadata in Redis', { status: 500 });
    } finally {
      if (existingWorker) {
        await existingWorker.close();
      }
    }
  },

  /**
   * 
   * Returns a list of all registered workers.
   * 
   * @param opts 
   * 
   * @returns { queue: string, url: string }[]
   * 
   */
  getWorkers: async (opts: HttpHandlerOpts) => {
    const workerMetadata = await opts.redisClient.hgetall(workerMetadataKey);

    // Filter out some metadata fields that are not needed by the client
    for (const queueName in workerMetadata) {
      workerMetadata[queueName] = JSON.parse(workerMetadata[queueName]).endpoint.url;
    }

    return new Response(JSON.stringify(workerMetadata), { status: 200 });
  },

  /**
   * Remove worker from the system.
   * 
   * @param opts
   */
  removeWorker: async (opts: HttpHandlerOpts) => {
    const { queueName } = opts.params;
    const { redisClient } = opts;

    const worker = workers[queueName];
    delete workers[queueName];
    try {
      if (worker) {
        await worker.close();
      }

      const removedWorker = await redisClient.hdel(workerMetadataKey, queueName);
      if (removedWorker === 0 && !worker) {
        return new Response('Worker not found', { status: 404 });
      }

      return new Response('OK', { status: 200 });
    } catch (err) {
      return new Response('Failed to remove worker', { status: 500 });
    }
  }
}
