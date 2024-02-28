
import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { QueueHttpController } from './queue-http-controller';
import { JobJson, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { cleanCache } from '../../utils/queue-factory';

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
    const queue = new Queue('testQueue', { connection: redisClient });
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
