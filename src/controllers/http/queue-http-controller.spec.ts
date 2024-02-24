
import { describe, it, beforeEach, expect, jest, afterEach, mock } from 'bun:test';
import { QueueHttpController } from './queue-http-controller';
import { JobJson } from 'bullmq';

describe('QueueHttpController.addJobs', () => {
  let fakeReq;
  let opts: any;

  beforeEach(() => {
    // Setup a fake request and options
    fakeReq = {
      json: jest.fn().mockResolvedValue([{ name: 'jobName', data: 'jobData' }]), // Mock job data
    };

    opts = {
      req: fakeReq,
      params: { queueName: 'testQueue' },
      redisClient: {}, // Mock Redis client as needed
    };
  });

  afterEach(() => {
    mock.restore();
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
});

