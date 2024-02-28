import { JobJson } from "bullmq";
import { QueueHttpController } from "../controllers/http/queue-http-controller";
import { RouteMatcher } from "../utils/router-matcher";
import { authByTokens } from "../authware/auth-by-tokens";

export default (routeMatcher: RouteMatcher) => {
  routeMatcher.addHttpRoute<JobJson[]>(
    "addJobs",
    "/queues/:queueName/jobs",
    QueueHttpController.addJobs,
    "post",
    authByTokens);

  routeMatcher.addHttpRoute<{ counts: number, jobs: JobJson[] }>(
    "getJobs",
    "/queues/:queueName/jobs",
    QueueHttpController.getJobs,
    "get",
    authByTokens);

  routeMatcher.addHttpRoute<JobJson>(
    "getJob",
    "/queues/:queueName/jobs/:jobId",
    QueueHttpController.getJob,
    "get",
    authByTokens);
}
