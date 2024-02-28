import { afterAll, beforeAll, describe, expect, it, jest, mock } from "bun:test";
import { authForWorkers } from "./auth-for-workers";
import { Redis } from "ioredis";

let redisClient: Redis;

beforeAll(async () => {
  // Reset mocks before each test
  redisClient = new Redis({
    maxRetriesPerRequest: null
  });
});

afterAll(async () => {
  // Restore all mocks after all tests
  await redisClient.quit();
});

describe('authForWorkers', () => {
  it('returns false if the token is missing', async () => {
    const req = new Request("http://example.com?queueName=testQueue&jobId=123", {
      headers: {}
    });
    const url = new URL(req.url);
    const mockConnection = <unknown>{ get: jest.fn() } as Redis;

    const result = await authForWorkers(req, url, {}, mockConnection);

    expect(result).toBe(false);
  });


  it('returns false if jobId or queueName is missing', async () => {
    const req = new Request("http://example.com?token=someToken", {
      headers: {}
    });
    const url = new URL(req.url);
    const mockConnection = <unknown>{ get: jest.fn() } as Redis;

    const result = await authForWorkers(req, url, {}, mockConnection);
    expect(result).toBe(false);
  });

  it('returns false if the token is invalid', async () => {
    const req = new Request("http://example.com?queueName=testQueue&jobId=123", {
      headers: {
        "Authorization": "Bearer invalidToken"
      }
    });
    const url = new URL(req.url);
    const mockConnection = <unknown>{
      get: jest.fn().mockResolvedValue('validToken')
    } as Redis;

    const result = await authForWorkers(req, url, {}, mockConnection);
    expect(result).toBe(false);
  });

  it('returns true if the token is valid and all parameters are present', async () => {
    const queueName = 'testQueue';
    const jobId = '123';

    const req = new Request(`http://example.com?queueName=${queueName}&jobId=${jobId}`, {
      headers: {
        "Authorization": "Bearer validToken"
      }
    });
    const url = new URL(req.url);
    const mockConnection = <unknown>{
      get: jest.fn().mockResolvedValue('validToken')
    } as Redis;

    const result = await authForWorkers(req, url, { queueName, jobId }, mockConnection);

    expect(result).toBe(true);
  });
});
