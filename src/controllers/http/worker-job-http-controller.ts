import { HttpHandlerOpts } from "../../interfaces";
import { getQueue } from "../../utils/queue-factory";
import { validatePagination, validateQueueName } from "../../validators";

/**
 * This controller is responsible for performing operations on a job that
 * is currently being processed by a worker. For example, updating the job's
 * progress or adding logs.
 * 
 */
export const WorkerJobHttpController = {
  updateProgress: async (opts: HttpHandlerOpts) => {
    const queueName = opts.params.queueName;
    try {
      validateQueueName(queueName);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const jobId = opts.params.jobId;
    try {
      const queue = await getQueue(queueName, opts.redisClient);
      await queue.updateJobProgress(jobId, await opts.req.json());
      return new Response('OK', { status: 200 });
    } catch (err) {
      return new Response((<Error>err).message, { status: 500 });
    }
  },

  addLog: async (opts: HttpHandlerOpts) => {
    const queueName = opts.params.queueName;
    try {
      validateQueueName(queueName);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const jobId = opts.params.jobId;
    try {
      const queue = await getQueue(queueName, opts.redisClient);

      const log = await opts.req.json();

      await queue.addJobLog(jobId, log);

      return new Response('OK', { status: 200 });
    } catch (err) {
      console.log(err);
      return new Response((<Error>err).message, { status: 500 });
    }
  },

  getLogs: async (opts: HttpHandlerOpts) => {
    const queueName = opts.params.queueName;
    let start, length;

    try {
      validateQueueName(queueName);

      start = parseInt(opts.searchParams?.get("start") || "0");
      length = parseInt(opts.searchParams?.get("length") || "10");

      validatePagination(start, length);
    } catch (err) {
      return new Response((<Error>err).message, { status: 400 });
    }

    const jobId = opts.params.jobId;
    try {
      const queue = await getQueue(queueName, opts.redisClient);
      const logs = await queue.getJobLogs(jobId, start, start + length - 1);
      return new Response(JSON.stringify(logs), { status: 200 });
    } catch (err) {
      return new Response((<Error>err).message, { status: 500 });
    }
  }
}
