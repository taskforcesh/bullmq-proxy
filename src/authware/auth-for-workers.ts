import { getQueue } from "../utils/queue-factory";
import { warn } from "../utils/log";
import { Cluster, Redis } from "ioredis";

/**
 * Authenticate and authorize job actions based on the job's lock token.
 */
export const authForWorkers = async (
  req: Request,
  url: URL,
  params: Record<string, string>,
  connection: Redis | Cluster): Promise<boolean> => {
  const from =
    req.headers.get("x-forwarded-for") || req.headers.get("host");

  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    warn(
      `Unauthorized request (missing token) to path ${url.pathname.toString()} from ${from}`
    );
    return false;
  }

  // Check if the token is valid for the given job id.
  const jobId = params.jobId;
  const queueName = params.queueName;

  if (!jobId || !queueName) {
    warn(
      `Unauthorized request (missing jobId or queueName) to path ${url.pathname.toString()} from ${from}`
    );
    return false;
  }

  const queue = await getQueue(queueName, connection);
  const prefix = queue.opts.prefix;
  const jobLockKey = `${prefix}:${queueName}:${jobId}:lock`;
  const lockToken = await connection.get(jobLockKey);

  if (lockToken !== token) {
    warn(
      `Unauthorized request (invalid token) to path ${url.pathname.toString()} from ${from}`
    );
    return false;
  }

  return true;
}
