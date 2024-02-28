
import { Redis } from 'ioredis';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { WorkerJobHttpController } from './worker-job-http-controller';

let redisClient: Redis;

beforeAll(async () => {
  redisClient = new Redis({
    maxRetriesPerRequest: null
  });
});

afterAll(async () => {
  await redisClient.quit();
});

describe('WorkerJobHttpController.updateProgress', () => {

  it('returns a 500 response if the job does not exist', async () => {
    const opts = {
      params: {
        queueName: 'invalid',
        jobId: '1'
      },
      req: {
        json: () => Promise.resolve({ progress: 50 })
      } as Request,
      redisClient: new Redis({
        maxRetriesPerRequest: null
      })
    };

    const response = await WorkerJobHttpController.updateProgress(opts);
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Missing key for job 1. updateProgress');
  });

  it('updates job progress and returns a 200 response', async () => {
    const authToken = 'test-123';
    const opts = {
      params: {
        queueName: 'valid',
        jobId: '1'
      },
      req: {
        json: () => Promise.resolve({ progress: 50 })
      } as Request,
      redisClient
    };

    await redisClient.hset('bull:valid:1', 'progress', 0);
    await redisClient.set('bull:valid:1:lock', authToken);

    const response = await WorkerJobHttpController.updateProgress(opts);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');

    // Verify that queue.updateJobProgress was called
    const progress = await redisClient.hget('bull:valid:1', 'progress');
    expect(progress).toBe('{\"progress\":50}');

    // cleanup
    await redisClient.del('bull:valid:1');
    await redisClient.del('bull:valid:1:lock');
  });
});


describe('WorkerJobHttpController.addLog', () => {
  it('adds a job log and returns a 200 response', async () => {
    const authToken = 'test-123';
    const jobId = "42";
    const logMessage = "Log message";

    const logsKey = `bull:valid:${jobId}:logs`;

    await redisClient.del(logsKey);

    // Assuming validateQueueName and getQueue are properly mocked above
    const opts = {
      params: {
        queueName: 'valid',
        jobId
      },
      req: {
        json: () => Promise.resolve(logMessage)
      } as Request,
      redisClient
    };

    await redisClient.hset(`bull:valid:${jobId}`, 'progress', 0);
    await redisClient.set(`bull:valid:${jobId}:lock`, authToken);

    const response = await WorkerJobHttpController.addLog(opts);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');

    const logs = await redisClient.lrange(logsKey, 0, -1);
    expect(logs).toBeArrayOfSize(1);
    expect(logs[0]).toBe(logMessage);
  });
});
