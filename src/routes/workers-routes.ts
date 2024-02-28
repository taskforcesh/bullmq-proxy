import { JobJson } from "bullmq";
import { WorkerHttpController } from "../controllers/http/worker-http-controller";
import { RouteMatcher } from "../utils/router-matcher";
import { WorkerMetadata } from "../interfaces";

import { authByTokens } from "../authware/auth-by-tokens";

export default (routeMatcher: RouteMatcher) => {
  routeMatcher.addHttpRoute<JobJson[]>(
    "addWorker",
    "/workers",
    WorkerHttpController.addWorker,
    "post",
    authByTokens);

  routeMatcher.addHttpRoute<WorkerMetadata>(
    "getWorkers",
    "/workers",
    WorkerHttpController.getWorkers,
    "get",
    authByTokens)

  routeMatcher.addHttpRoute<WorkerMetadata>(
    "removeWorker",
    "/workers/:queueName",
    WorkerHttpController.removeWorker,
    "delete",
    authByTokens)
}
