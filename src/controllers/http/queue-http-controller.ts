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
  }
}
