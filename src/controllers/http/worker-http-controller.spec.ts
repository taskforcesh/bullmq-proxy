import { Redis } from 'ioredis';
import { describe, it, jest, mock, expect, beforeAll, afterAll } from "bun:test";
import { WorkerHttpController } from './worker-http-controller';

describe('WorkerHttpController.init', () => {

  it('should initialize workers from Redis metadata', async () => {
    await expect(WorkerHttpController.init(new Redis({
      maxRetriesPerRequest: null,
    }))).resolves.toBeUndefined;
  });
});

// Assuming fetch is mocked for testing external API call
mock.module('node-fetch', () => jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
})));

describe('WorkerHttpController.addWorker', () => {

  let redisClient: Redis;
  beforeAll(() => {
    redisClient = new Redis({
      maxRetriesPerRequest: null
    });
  });

  it('should add a worker with valid metadata', async () => {
    const fakeReq = {
      json: () => Promise.resolve({
        queue: 'validQueue',
        endpoint: {
          url: 'http://example.com',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      })
    } as Request;

    const response = await WorkerHttpController.addWorker({ req: fakeReq, redisClient, params: {} });
    expect(response).toBeDefined();
    expect(await response.text()).toBe("OK");
    expect(response!.status).toBe(200); // Assuming 200 is the success status code
  });

  it('should return a 400 response for invalid metadata', async () => {
    const fakeReq = {
      json: () => Promise.resolve({}) // Invalid metadata
    } as Request;

    const response = await WorkerHttpController.addWorker({ req: fakeReq, redisClient, params: {} });
    console.log(await response.text());
    expect(response).toBeDefined();
    expect(response!.status).toBe(400);
  });
});

describe('WorkerHttpController.removeWorker', () => {
  it('should remove a worker successfully', async () => {
    const opts = {
      req: {} as Request,
      params: { queueName: 'existingQueue' },
      redisClient: new Redis({
        maxRetriesPerRequest: null
      })
    };

    const response = await WorkerHttpController.removeWorker(opts);
    expect(response).toBeDefined();
    expect(response!.status).toBe(200); // Assuming 200 indicates success
  });
});
