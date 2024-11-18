import {
  WorkerMetadata,
  WorkerEndpoint,
  WorkerSimpleOptions,
} from "../interfaces";
import { validateQueueName } from "./queue.validators";

const validProtocols = new Set(["http:", "https:"]);
export function isValidUrl(s: string) {
  try {
    const url = new URL(s);
    return validProtocols.has(url.protocol);
  } catch (e) {
    return false;
  }
}

const allowedOnFinishFields = new Set(["count", "age"]);
export const validateRemoveOnFinish = (
  removeOnFinish: {
    count?: number;
    age?: number;
  },
  field: "removeOnComplete" | "removeOnFail"
) => {
  for (const allowedField in removeOnFinish) {
    if (!allowedOnFinishFields.has(allowedField)) {
      throw new Error(`Invalid field: ${field}.${allowedField}`);
    }
  }

  if (
    removeOnFinish.count &&
    (!Number.isInteger(removeOnFinish.count) || removeOnFinish.count <= 0)
  ) {
    throw new Error(`Invalid ${field}.count`);
  }

  if (
    removeOnFinish.age &&
    (!Number.isInteger(removeOnFinish.age) || removeOnFinish.age <= 0)
  ) {
    throw new Error(`Invalid ${field}.age`);
  }
};

const allowedWorkerOptionsFields = new Set([
  "concurrency",
  "removeOnComplete",
  "removeOnFail",
  "limiter",
  "maxStalledCount",
]);
export const validateWorkerOptions = (workerOptions: WorkerSimpleOptions) => {
  for (const field in workerOptions) {
    if (!allowedWorkerOptionsFields.has(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  if (
    workerOptions.limiter &&
    (!Number.isInteger(workerOptions.limiter.max) ||
      workerOptions.limiter.max <= 0)
  ) {
    throw new Error("Invalid limiter.max");
  }

  if (
    workerOptions.limiter &&
    (!Number.isInteger(workerOptions.limiter.duration) ||
      workerOptions.limiter.duration <= 0)
  ) {
    throw new Error("Invalid limiter.duration");
  }

  if (
    workerOptions.maxStalledCount &&
    (!Number.isInteger(workerOptions.maxStalledCount) ||
      workerOptions.maxStalledCount <= 0)
  ) {
    throw new Error("Invalid maxStalledCount");
  }

  if (
    workerOptions.concurrency &&
    (!Number.isInteger(workerOptions.concurrency) ||
      workerOptions.concurrency <= 0)
  ) {
    throw new Error("Invalid concurrency");
  }

  if (workerOptions.removeOnComplete) {
    validateRemoveOnFinish(workerOptions.removeOnComplete, "removeOnComplete");
  }

  if (workerOptions.removeOnFail) {
    validateRemoveOnFinish(workerOptions.removeOnFail, "removeOnFail");
  }
};

const validHttpMethods = new Set(["POST", "PUT", "PATCH"]);
const allowedEndpointFields = new Set(["url", "method", "headers", "timeout", "body"]);

export const validateWorkerEndpoint = (workerEndpoint: WorkerEndpoint) => {
  const requiredFields: (keyof WorkerEndpoint)[] = ["url", "method"];
  for (const field of requiredFields) {
    if (!workerEndpoint[field]) {
      throw new Error(`${field} is required`);
    }
  }

  if (!isValidUrl(workerEndpoint.url)) {
    throw new Error("Invalid URL");
  }

  if (!validHttpMethods.has(workerEndpoint.method.toUpperCase())) {
    throw new Error(`Invalid HTTP method ${workerEndpoint.method}`);
  }

  for (const field in workerEndpoint) {
    if (!allowedEndpointFields.has(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  if (
    workerEndpoint.timeout &&
    (!Number.isInteger(workerEndpoint.timeout) || workerEndpoint.timeout <= 0)
  ) {
    throw new Error("Invalid timeout");
  }
};

const allowedWorkerMetaddaFields = new Set(["queue", "endpoint", "opts"]);
export const validateWorkerMetadata = (workerMetadata: WorkerMetadata) => {
  const requiredFields: (keyof WorkerMetadata)[] = ["queue", "endpoint"];
  for (const field of requiredFields) {
    if (!workerMetadata[field]) {
      throw new Error(`${field} is required`);
    }
  }

  // Check that no extra fields are present
  for (const field in workerMetadata) {
    if (!allowedWorkerMetaddaFields.has(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  validateQueueName(workerMetadata.queue);

  validateWorkerEndpoint(workerMetadata.endpoint);

  if (workerMetadata.opts) {
    validateWorkerOptions(workerMetadata.opts);
  }
};
