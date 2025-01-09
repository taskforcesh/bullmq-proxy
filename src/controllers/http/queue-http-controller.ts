import { JobState, Queue } from "bullmq";

import { HttpHandlerOpts } from "../../interfaces/http-handler-opts";
import { validateJob, validatePagination, validateQueueName } from "../../validators";
import { getQueue } from "../../utils/queue-factory";

type QueueHttpControllerOpts = Omit<HttpHandlerOpts, "workersRedisClient">;

export const QueueHttpController = {
  /**
   * addJobs
   * @param opts 
   * @returns 
   */
  addJobs: async (opts: QueueHttpControllerOpts) => {
    const queueName = opts.params.queueName;
    try {
      validateQueueName(queueName);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const queue = await getQueue(queueName, opts.redisClient);

    try {
      const body = await opts.req.json();

      try {
        if (!Array.isArray(body)) {
          throw new Error("Body must be an array");
        }

        for (const job of body) {
          validateJob(job);
        }
      } catch (err) {
        return new Response((<Error>err).message, { status: 400 });
      }

      const result = await queue.addBulk(body);
      return new Response(JSON.stringify(result), { status: 200 });
    } catch (err) {
      return new Response((<Error>err).message, { status: 500 });
    }
  },

  /**
   * getJobs
  * @param opts
    @returns jobs from the queue with pagination.
    Uses "start" and "length" as query parameters.
    and optional "statuses" query parameter to filter by status.
  */
  getJobs: async (opts: QueueHttpControllerOpts) => {
    const queueName = opts.params.queueName;
    let start;
    let length;

    try {
      validateQueueName(queueName);

      start = parseInt(opts.searchParams?.get("start") || "0");
      length = parseInt(opts.searchParams?.get("length") || "10");

      validatePagination(start, length);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const queue = await getQueue(queueName, opts.redisClient);

    const statuses: JobState[] =
      (opts.searchParams?.get("statuses") || "waiting,active,completed,failed").split(",").filter((s) => s) as JobState[];

    // Check if the statuses are valid
    const validStatuses = ["waiting", "active", "completed", "failed", "delayed"];
    for (const status of statuses) {
      if (!validStatuses.includes(status)) {
        return new Response(`Invalid status: ${status}`, { status: 400 });
      }
    }

    const [counts, jobs] = await Promise.all([
      queue.getJobCounts(...statuses),
      queue.getJobs(statuses, start, start + length - 1)
    ]);

    return new Response(JSON.stringify({ counts, jobs, start, length }), { status: 200 });
  },

  /**
   * getJob
   * @param opts 
   * @returns 
   */
  getJob: async (opts: QueueHttpControllerOpts) => {
    const queueName = opts.params.queueName;
    try {
      validateQueueName(queueName);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const queue = await getQueue(queueName, opts.redisClient);

    const jobId = opts.params.jobId;
    const job = await queue.getJob(jobId);

    if (!job) {
      return new Response("Job not found", { status: 404 });
    }

    return new Response(JSON.stringify(job), { status: 200 });
  },

  /**
   * clearQueue
   * @param opts
   * @returns clears jobs from the queue based on status and grace period
   */
  clearQueue: async (opts: QueueHttpControllerOpts) => {
    const queueName = opts.params.queueName;
    try {
      validateQueueName(queueName);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const queue = await getQueue(queueName, opts.redisClient);

    const status = opts.searchParams?.get("status")
    if (!status) {
      return new Response("Missing status query parameter", { status: 400 });
    }

    try {
      // Log current queue status
      const countsBefore = await queue.getJobCounts();
      console.log('Counts before clean:', countsBefore);

      // Pause queue to ensure safe deletion
      await queue.pause();
      console.log('Queue paused');

      try {
        // Get all jobs in wait status
        const jobs = await queue.getJobs([status as JobState]);

        // Iterate through each job and remove it
        for (let job of jobs) {
          await job.remove();
        }

        console.log('All wait jobs cleaned');
      } catch (error) {
        console.error('Error cleaning wait jobs:', error);
      }

      // Resume queue
      await queue.resume();
      console.log('Queue resumed');

      // Log status after cleanup
      const countsAfter = await queue.getJobCounts();
      console.log('Counts after clean:', countsAfter);

      return new Response(JSON.stringify({ countsBefore, countsAfter }), { status: 200 });
    } catch (err) {
      // Ensure queue is resumed on error
      await queue.resume().catch(() => { });
      return new Response((<Error>err).message, { status: 500 });
    }
  }
}
