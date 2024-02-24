import { JobJson } from "bullmq";
import { WorkerHttpController } from "../controllers/http/worker-http-controller";
import { RouteMatcher } from "../utils/router-matcher";
import { WorkerMetadata } from "../interfaces";

export default (routeMatcher: RouteMatcher) => {
  routeMatcher.addHttpRoute<JobJson[]>(
    "addWorker",
    "/workers",
    WorkerHttpController.addWorker,
    "post");

  routeMatcher.addHttpRoute<WorkerMetadata>(
    "getWorkers",
    "/workers",
    WorkerHttpController.getWorkers,
    "get")

  routeMatcher.addHttpRoute<WorkerMetadata>(
    "removeWorker",
    "/workers/:queueName",
    WorkerHttpController.removeWorker,
    "delete")
}
