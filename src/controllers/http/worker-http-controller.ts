import { createHash } from "crypto";

import { Job, Worker } from "bullmq";
import { Redis, Cluster } from "ioredis";
import { debug, info } from "../../utils/log";

import { HttpHandlerOpts, WorkerMetadata } from "../../interfaces";
import { validateWorkerMetadata } from "../../validators";
import { config } from "../../config";

const debugEnabled = config.debugEnabled;

const workers: { [queueName: string]: Worker } = {};
const metadatasShas: { [queueName: string]: string } = {};

const workerMetadataKey = config.workerMetadataKey;
const workerMetadataStream = config.workerMetadataStream;
const workerStreamBlockingTime = 5000;

const abortController = new AbortController();
export const gracefulShutdownWorkers = async () => {
  info(`Closing workers...`);
  abortController.abort();
  const closingWorkers = Object.keys(workers).map(async (queueName) => workers[queueName].close());
  await Promise.all(closingWorkers);
  info('Workers closed');
}

const workerFromMetadata = (queueName: string, workerMetadata: WorkerMetadata, connection: Redis | Cluster): Worker => {
  const { endpoint: workerEndpoint, opts: workerOptions } = workerMetadata;

  debugEnabled && debug(`Starting worker for queue ${queueName} with endpoint ${workerMetadata.endpoint.url} and options ${JSON.stringify(workerMetadata.opts) || 'default'}`);

  const worker = new Worker(queueName, async (job: Job, token?: string) => {
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
        body: JSON.stringify({ job: job.toJSON(), token }),
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
  }, { ...workerOptions, connection, prefix: config.defaultQueuePrefix });

  if (debugEnabled) {
    worker.on('failed', (job, err) => {
      debug(`Job ${job!.id} failed: ${err}`);
    });
  }

  return worker;
};

let lastEventId: string | undefined;

export const workerStreamListener = async (redisClient: Redis | Cluster, abortSignal: AbortSignal) => {
  const streamBlockingClient = redisClient.duplicate();
  let running = true;

  abortSignal.addEventListener('abort', () => {
    running = false;
    streamBlockingClient.disconnect();
  });

  while (running) {
    const streams = await redisClient.xread('BLOCK', workerStreamBlockingTime, 'STREAMS', workerMetadataStream, lastEventId || '0');

    // If we got no events, continue to the next iteration
    if (!streams || streams.length === 0) {
      continue;
    }

    const stream = streams[0];

    debugEnabled && debug(`Received ${streams.length} event${streams.length > 1 ? "s" : ""} from stream ${workerMetadataStream}`);

    const [_streamName, events] = stream;

    for (const [eventId, fields] of events) {

      lastEventId = eventId;
      const queueName = fields[1];
      const existingWorker = workers[queueName];
      const existingSha = metadatasShas[queueName];

      const workerMetadataRaw = await redisClient.hget(workerMetadataKey, queueName);


      // If workerMetadatadaVersion is older than the event id, we need to update the worker
      if (workerMetadataRaw) {
        const workerMetadataSha256 = createHash('sha256').update(workerMetadataRaw).digest('hex');

        if ((existingSha !== workerMetadataSha256)) {
          const workerMetadata = JSON.parse(workerMetadataRaw);
          workers[queueName] = workerFromMetadata(queueName, workerMetadata, redisClient);
          metadatasShas[queueName] = workerMetadataSha256;
          if (existingWorker) {
            await existingWorker.close();
          }
        }
      } else {
        // worker has been removed
        debugEnabled && debug(`Worker for queue ${queueName} has been removed`);

        if (existingWorker) {
          await existingWorker.close();
          delete workers[queueName];
          delete metadatasShas[queueName];
        }
      }
    }
  }
}

export const WorkerHttpController = {
  loadScripts: async (redisClient: Redis | Cluster) => {
    const luaScripts = {
      updateWorkerMetadata: `
        local workerMetadataKey = KEYS[1]
        local workerMetadataStream = KEYS[2]
        local queueName = ARGV[1]
        local workerMetadata = ARGV[2]
        local streamMaxLen = ARGV[3]
        redis.call('HSET', workerMetadataKey, queueName, workerMetadata)
        
        local eventId = redis.call('XADD', workerMetadataStream, 'MAXLEN', streamMaxLen, '*', 'worker', queueName)
        return eventId
      `,
      removeWorkerMetadata: `
        local workerMetadataKey = KEYS[1]
        local workerMetadataStream = KEYS[2]
        local queueName = ARGV[1]
        local streamMaxLen = ARGV[2]
        local removedWorker = redis.call('HDEL', workerMetadataKey, queueName)
        if removedWorker == 1 then
          local eventId = redis.call('XADD', workerMetadataStream, 'MAXLEN', streamMaxLen, '*', 'worker', queueName)
          return { removedWorker, eventId }
        end
      `
    }

    for (const [scriptName, script] of Object.entries(luaScripts)) {
      redisClient.defineCommand(scriptName, { numberOfKeys: 2, lua: script });
    }
  },

  /**
   * Load workers from Redis and start them.
   * 
   * @param redisClient 
   * @param workersRedisClient 
   */
  loadWorkers: async (redisClient: Redis | Cluster, workersRedisClient: Redis | Cluster) => {
    // Load workers from Redis and start them
    debugEnabled && debug('Loading workers from Redis...');
    const result = await redisClient.xrevrange(config.workerMetadataStream, '+', '-', 'COUNT', 1);
    if (result.length > 0) {
      [[lastEventId]] = result
    }
    const stream = redisClient.hscanStream(workerMetadataKey, { count: 10 });
    stream.on('data', (result: string[]) => {
      for (let i = 0; i < result.length; i += 2) {
        const queueName = result[i];
        const value = result[i + 1];

        const workerMetadata = JSON.parse(value) as WorkerMetadata;
        workers[queueName] = workerFromMetadata(queueName, workerMetadata, workersRedisClient);
        metadatasShas[queueName] = createHash('sha256').update(value).digest('hex');
      }
    });

    await new Promise<void>((resolve, reject) => {
      stream.on('end', () => {
        debugEnabled && debug('Workers loaded');
        resolve();
      });
      stream.on('error', (err) => {
        debugEnabled && debug(`Failed to load workers: ${err}`);
        reject(err);
      });
    });

    workerStreamListener(workersRedisClient, abortController.signal);
  },
  init: async (redisClient: Redis | Cluster, workersRedisClient: Redis | Cluster) => {
    await WorkerHttpController.loadScripts(redisClient);
    await WorkerHttpController.loadWorkers(redisClient, workersRedisClient);
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

    // Upsert worker metadata and notify all listeners about the change.
    try {
      const eventId = await (<any>redisClient)['updateWorkerMetadata'](
        workerMetadataKey,
        workerMetadataStream,
        queueName,
        JSON.stringify(workerMetadata),
        config.maxLenWorkerMetadataStream
      );

      lastEventId = eventId as string;

      return new Response('OK', { status: 200 });
    } catch (err) {
      const errMsg = `Failed to store worker metadata in Redis: ${err}`;
      debugEnabled && debug(errMsg);
      return new Response(errMsg, { status: 500 });
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

    try {
      const result = await (<any>redisClient)['removeWorkerMetadata'](
        workerMetadataKey,
        workerMetadataStream,
        queueName,
        config.maxLenWorkerMetadataStream
      );
      if (!result && !workers[queueName]) {
        return new Response('Worker not found', { status: 404 });
      }

      lastEventId = result[1];

      return new Response('OK', { status: 200 });
    } catch (_err) {
      const err = _err as Error;
      debugEnabled && debug(`Failed to remove worker: ${err}`);
      return new Response(`Failed to remove worker ${err.toString()}`, { status: 500 });
    }
  }
}
