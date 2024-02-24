import { JobState, Queue } from "bullmq";

import { LRUCache } from "../../cache";
import { HttpHandlerOpts } from "../../interfaces/http-handler-opts";
import { validateJob, validateQueueName } from "../../validators";

const cache = new LRUCache<Queue>(process.env.QUEUE_CACHE_SIZE ? parseInt(process.env.QUEUE_CACHE_SIZE) : 100, async (queueName, queue) => {
  await queue.close();
});

export const QueueHttpController = {
  /**
   * addJobs
   * @param opts 
   * @returns 
   */
  addJobs: async (opts: HttpHandlerOpts) => {
    const queueName = opts.params.queueName;
    try {
      validateQueueName(queueName);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    let queue = cache.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, { connection: opts.redisClient });
      cache.put(queueName, queue);
    }

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
  getJobs: async (opts: HttpHandlerOpts) => {
    const queueName = opts.params.queueName;
    let queue = cache.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, { connection: opts.redisClient });
      cache.put(queueName, queue);
    }

    const start = parseInt(opts.searchParams?.get("start") || "0");
    const length = parseInt(opts.searchParams?.get("length") || "10");

    if (isNaN(start) || isNaN(length)) {
      return new Response("Invalid start or length", { status: 400 });
    }

    if (start < 0 || length < 0) {
      return new Response("Start and length must be positive", { status: 400 });
    }

    if (length > 100) {
      return new Response("Length must be less than or equal to 100", { status: 400 });
    }

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
      queue.getJobs(statuses, start, start + length)
    ]);

    return new Response(JSON.stringify({ counts, jobs, start, length }), { status: 200 });
  }
}
