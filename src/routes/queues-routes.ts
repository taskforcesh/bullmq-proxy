import { JobJson } from "bullmq";
import { QueueHttpController } from "../controllers/http/queue-http-controller";
import { RouteMatcher } from "../utils/router-matcher";

export default (routeMatcher: RouteMatcher) => {
  routeMatcher.addHttpRoute<JobJson[]>(
    "addJobs",
    "/queues/:queueName",
    QueueHttpController.addJobs,
    "post");

  routeMatcher.addHttpRoute<{ counts: number, jobs: JobJson[] }>(
    "getJobs",
    "/queues/:queueName",
    QueueHttpController.getJobs);
}
