
import { describe, it, expect, jest, beforeEach, afterEach } from 'bun:test';
import { QueueHttpController } from './queue-http-controller';
import { JobJson, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { cleanCache } from '../../utils/queue-factory';
import { config } from '../../config';

describe('QueueHttpController.addJobs', () => {
  let fakeReq: Request;
  let opts: any;

  let redisClient: Redis;
  beforeEach(() => {
    // Setup a fake request and options
    fakeReq = <unknown>{
      json: jest.fn().mockResolvedValue([{ name: 'jobName', data: 'jobData' }]), // Mock job data
    } as Request;

    redisClient = new Redis();

    opts = {
      req: fakeReq,
      params: { queueName: 'testQueue' },
      redisClient,
    };
  });

  afterEach(async () => {
    // Clean up
    const queue = new Queue('testQueue', { connection: redisClient, prefix: config.defaultQueuePrefix });
    await queue.obliterate({ force: true });

    // We need to clean the cache to eliminate side-effects between tests
    await cleanCache();

    await queue.close();
    await redisClient.quit();
  });

  it('should add jobs successfully', async () => {
    const response = await QueueHttpController.addJobs(opts);
    expect(response).toBeDefined();
    expect(response!.status).toBe(200);

    const jobs = await response!.json() as JobJson[];

    expect(jobs).toBeArrayOfSize(1);
    expect(jobs[0]).toHaveProperty('name', 'jobName');
    expect(jobs[0]).toHaveProperty('data', 'jobData');
  });

  it('should be possible to get a job after adding it', async () => {
    const response = await QueueHttpController.addJobs(opts);
    const jobs = await response!.json() as JobJson[];

    expect(jobs).toBeArrayOfSize(1);
    expect(jobs[0]).toHaveProperty('name', 'jobName');
    expect(jobs[0]).toHaveProperty('data', 'jobData');

    const optsGet = {
      params: { queueName: 'testQueue', jobId: jobs[0].id },
      req: <unknown>fakeReq as Request,
      redisClient: new Redis(),
    };

    const getResponse = await QueueHttpController.getJob(optsGet);
    expect(getResponse).toBeDefined();
    expect(getResponse!.status).toBe(200);
    const job = await getResponse!.json() as JobJson;
    expect(job).toHaveProperty('name', 'jobName');
    expect(job).toHaveProperty('data', 'jobData');
  });
});

describe('QueueHttpController.clearQueue', () => {
  let redisClient: Redis;
  let opts: any;

  beforeEach(async () => {
    redisClient = new Redis();
    opts = {
      params: { queueName: 'testQueue' },
      searchParams: new URLSearchParams(),
      redisClient
    };

    // Add some test jobs
    const queue = new Queue('testQueue', { connection: redisClient });
    await queue.add('testJob1', { data: 1 });
    await queue.add('testJob2', { data: 2 });
    await queue.close();
  });

  afterEach(async () => {
    const queue = new Queue('testQueue', { connection: redisClient });
    await queue.obliterate({ force: true });
    await queue.close();
    await redisClient.quit();
  });

  it('should clear completed jobs successfully', async () => {
    // Set status to completed
    opts.searchParams.set('status', 'completed');

    const response = await QueueHttpController.clearQueue(opts);
    expect(response).toBeDefined();
    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result).toHaveProperty('count');
  });

  it('should return 400 for invalid status', async () => {
    opts.searchParams.set('status', 'invalidStatus');

    const response = await QueueHttpController.clearQueue(opts);
    expect(response).toBeDefined();
    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid gracePeriod', async () => {
    opts.searchParams.set('gracePeriod', 'invalidNumber');

    const response = await QueueHttpController.clearQueue(opts);
    expect(response).toBeDefined();
    expect(response.status).toBe(400);
  });
});
