import { Redis } from 'ioredis';
import { describe, it, jest, mock, expect, beforeAll, afterAll } from "bun:test";
import { WorkerHttpController } from './worker-http-controller';
import { config } from '../../config';

const fakeAddValidReq = {
  json: () => Promise.resolve({
    queue: 'validQueue',
    endpoint: {
      url: 'http://example.com',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
  })
} as Request;

describe('WorkerHttpController.init', () => {
  let redisClient: Redis;
  let workersRedisClient: Redis;

  beforeAll(async () => {
    redisClient = new Redis({
      maxRetriesPerRequest: null,
    });
    workersRedisClient = new Redis({
      maxRetriesPerRequest: null,
    });
    await WorkerHttpController.cleanMetadata(redisClient);
  });

  afterAll(async () => {
    await WorkerHttpController.cleanMetadata(redisClient);
    await redisClient.quit();
    await workersRedisClient.quit();
  });

  it('should initialize workers from Redis metadata', async () => {
    await WorkerHttpController.loadScripts(redisClient);

    const eventId = await (<any>redisClient).updateWorkerMetadata(
      config.workerMetadataKey,
      config.workerMetadataStream,
      'validQueue',
      JSON.stringify(await fakeAddValidReq.json()),
      config.maxLenWorkerMetadataStream,
    );
    expect(eventId).toBeString();

    await expect(
      WorkerHttpController.loadWorkers(redisClient, workersRedisClient),
    ).resolves.toBeUndefined();

    const response = await WorkerHttpController.getWorkers({
      req: {} as Request,
      redisClient,
      workersRedisClient,
      params: {},
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      validQueue: 'http://example.com',
    });
  });
});

// Assuming fetch is mocked for testing external API call
mock.module('node-fetch', () => jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
})));

describe('WorkerHttpController.addWorker', () => {

  let redisClient: Redis;
  beforeAll(async () => {
    redisClient = new Redis({
      maxRetriesPerRequest: null
    });
    await WorkerHttpController.cleanMetadata(redisClient);
    await WorkerHttpController.loadScripts(redisClient);
  });

  afterAll(async () => {
    await WorkerHttpController.cleanMetadata(redisClient);
    await redisClient.quit();
  });

  it('should add a worker with valid metadata', async () => {
    const response = await WorkerHttpController.addWorker({
      req: fakeAddValidReq,
      redisClient,
      workersRedisClient: redisClient,
      params: {}
    });
    expect(response).toBeDefined();
    expect(await response.text()).toBe("OK");
    expect(response!.status).toBe(200); // Assuming 200 is the success status code

    // Verify worker was added in Redis
    const workerMetadataKey = config.workerMetadataKey;
    const workerMetadata = await redisClient.hgetall(workerMetadataKey);
    expect(workerMetadata).toBeDefined();
    expect(workerMetadata.validQueue).toBeDefined();

    // Verify event was added in Redis
    const workerMetadataStream = config.workerMetadataStream;
    const streamLength = await redisClient.xlen(workerMetadataStream);
    expect(streamLength).toBeGreaterThan(0);
  });

  it('should return a 400 response for invalid metadata', async () => {
    const fakeReq = {
      json: () => Promise.resolve({}) // Invalid metadata
    } as Request;

    const response = await WorkerHttpController.addWorker({
      req: fakeReq,
      redisClient,
      workersRedisClient: redisClient,
      params: {}
    });
    expect(response).toBeDefined();
    expect(response!.status).toBe(400);
  });
});

describe('WorkerHttpController.removeWorker', () => {
  let redisClient: Redis;
  beforeAll(async () => {
    redisClient = new Redis({
      maxRetriesPerRequest: null
    });
    await WorkerHttpController.cleanMetadata(redisClient);
    await WorkerHttpController.loadScripts(redisClient);
  });

  afterAll(async () => {
    await WorkerHttpController.cleanMetadata(redisClient);
    await redisClient.quit();
  });

  it('should remove a worker successfully', async () => {
    const opts = {
      req: {} as Request,
      params: { queueName: 'validQueue' },
      redisClient,
      workersRedisClient: redisClient,
    };

    const responseAdd = await WorkerHttpController.addWorker({
      req: fakeAddValidReq,
      redisClient,
      workersRedisClient: redisClient,
      params: {},
    });
    expect(responseAdd).toBeDefined();

    const responseRemove = await WorkerHttpController.removeWorker(opts);
    expect(responseRemove).toBeDefined();
    expect(responseRemove!.status).toBe(200); // Assuming 200 indicates success

    // Verify worker was removed from Redis
    const workerMetadataKey = config.workerMetadataKey;
    const workerMetadata = await redisClient.hgetall(workerMetadataKey);
    expect(workerMetadata).toBeDefined();
    expect(workerMetadata.validQueue).toBeUndefined();

    // Verify event was added in Redis
    const workerMetadataStream = config.workerMetadataStream;
    const streamLength = await redisClient.xlen(workerMetadataStream);
    expect(streamLength).toBeGreaterThan(0);
  });

  it('should return 404 for non existing workers', async () => {
    const opts = {
      req: {} as Request,
      params: { queueName: 'non-existing-queue' },
      redisClient,
      workersRedisClient: redisClient,
    };

    const responseRemove = await WorkerHttpController.removeWorker(opts);
    expect(responseRemove).toBeDefined();
    expect(responseRemove!.status).toBe(404);
  });
});
