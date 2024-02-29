import { JobJson } from "bullmq";
import { RouteMatcher } from "../utils/router-matcher";
import { authForWorkers } from "../authware/auth-for-workers";
import { WorkerJobHttpController } from "../controllers/http/worker-job-http-controller";
import { authByTokens } from "../authware/auth-by-tokens";

export default (routeMatcher: RouteMatcher) => {
  routeMatcher.addHttpRoute<JobJson[]>(
    "updateProgress",
    "/queues/:queueName/jobs/:jobId/progress",
    WorkerJobHttpController.updateProgress,
    "post",
    authForWorkers);

  routeMatcher.addHttpRoute<{ counts: number, jobs: JobJson[] }>(
    "addLog",
    "/queues/:queueName/jobs/:jobId/logs",
    WorkerJobHttpController.addLog,
    "post",
    authForWorkers);

  routeMatcher.addHttpRoute<{ counts: number, jobs: JobJson[] }>(
    "getLogs",
    "/queues/:queueName/jobs/:jobId/logs",
    WorkerJobHttpController.getLogs,
    "get",
    authByTokens);
}
