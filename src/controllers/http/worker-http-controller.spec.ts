import { Redis } from 'ioredis';
import { describe, it, jest, mock, expect, beforeAll, afterAll } from "bun:test";
import { WorkerHttpController } from './worker-http-controller';

mock.module('ioredis', () => ({
  Redis: jest.fn(() => ({
    hscanStream: jest.fn(() => ({
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          process.nextTick(callback, ['queueName', JSON.stringify({ endpoint: { url: '', method: '', headers: {} } })]);
        } else if (event === 'end') {
          process.nextTick(callback);
        }
      }),
    })),
    hset: jest.fn().mockResolvedValue(true),
    hdel: jest.fn().mockResolvedValue(true),
  })),
}));

describe('WorkerHttpController.init', () => {

  beforeAll(() => {

  });

  afterAll(() => {
    mock.restore();
  });


  it('should initialize workers from Redis metadata', async () => {
    await expect(WorkerHttpController.init(new Redis())).resolves.toBeUndefined;
  });
});

// Assuming fetch is mocked for testing external API call
mock.module('node-fetch', () => jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
})));

describe('WorkerHttpController.addWorker', () => {

  beforeAll(() => {

  });

  afterAll(() => {
    mock.restore();
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

    const response = await WorkerHttpController.addWorker({ req: fakeReq, redisClient: new Redis(), params: {} });
    expect(response).toBeDefined();
    expect(await response.text()).toBe("OK");
    expect(response!.status).toBe(200); // Assuming 200 is the success status code
  });

  it('should return a 400 response for invalid metadata', async () => {
    const fakeReq = {
      json: () => Promise.resolve({}) // Invalid metadata
    } as Request;

    const response = await WorkerHttpController.addWorker({ req: fakeReq, redisClient: new Redis(), params: {} });
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
      redisClient: new Redis()
    };

    const response = await WorkerHttpController.removeWorker(opts);
    expect(response).toBeDefined();
    expect(response!.status).toBe(200); // Assuming 200 indicates success
  });
});

