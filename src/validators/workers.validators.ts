import { WorkerMetadata, WorkerEndpoint, WorkerSimpleOptions } from "../interfaces";
import { validateQueueName } from "./queue.validators";

export function isValidUrl(s: string) {
  const validProtocols = ['http:', 'https:'];
  try {
    const url = new URL(s);
    return validProtocols.includes(url.protocol);
  } catch (e) {
    return false;
  }
}

export const validateRemoveOnFinish = (removeOnFinish: {
  count?: number;
  age?: number;
}, field: "removeOnComplete" | "removeOnFail") => {
  const allowedFields = ['count', 'age'];
  for (const allowedField in removeOnFinish) {
    if (!allowedFields.includes(allowedField)) {
      throw new Error(`Invalid field: ${field}.${allowedField}`);
    }
  }

  if (removeOnFinish.count && (!Number.isInteger(removeOnFinish.count) || removeOnFinish.count <= 0)) {
    throw new Error(`Invalid ${field}.count`);
  }

  if (removeOnFinish.age && (!Number.isInteger(removeOnFinish.age) || removeOnFinish.age <= 0)) {
    throw new Error(`Invalid ${field}.age`);
  }
}

export const validateWorkerOptions = (workerOptions: WorkerSimpleOptions) => {
  const allowedFields = ['concurrency', 'removeOnComplete', 'removeOnFail', 'limiter', 'maxStalledCount'];
  for (const field in workerOptions) {
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  if (workerOptions.limiter && (!Number.isInteger(workerOptions.limiter.max) || workerOptions.limiter.max <= 0)) {
    throw new Error('Invalid limiter.max');
  }

  if (workerOptions.limiter && (!Number.isInteger(workerOptions.limiter.duration) || workerOptions.limiter.duration <= 0)) {
    throw new Error('Invalid limiter.duration');
  }

  if (workerOptions.maxStalledCount && (!Number.isInteger(workerOptions.maxStalledCount) || workerOptions.maxStalledCount <= 0)) {
    throw new Error('Invalid maxStalledCount');
  }

  if (workerOptions.concurrency && (!Number.isInteger(workerOptions.concurrency) || workerOptions.concurrency <= 0)) {
    throw new Error('Invalid concurrency');
  }

  if (workerOptions.removeOnComplete) {
    validateRemoveOnFinish(workerOptions.removeOnComplete, 'removeOnComplete');
  }

  if (workerOptions.removeOnFail) {
    validateRemoveOnFinish(workerOptions.removeOnFail, 'removeOnFail');
  }
}

export const validateWorkerEndpoint = (workerEndpoint: WorkerEndpoint) => {
  const requiredFields: (keyof WorkerEndpoint)[] = ['url', 'method'];
  for (const field of requiredFields) {
    if (!workerEndpoint[field]) {
      throw new Error(`${field} is required`);
    }
  }

  if (!isValidUrl(workerEndpoint.url)) {
    throw new Error('Invalid URL');
  }

  const validHttpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  if (!validHttpMethods.includes(workerEndpoint.method.toUpperCase())) {
    throw new Error(`Invalid HTTP method ${workerEndpoint.method}`);
  }

  const allowedFields = ['url', 'method', 'headers', 'timeout'];
  for (const field in workerEndpoint) {
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  if (workerEndpoint.timeout && (!Number.isInteger(workerEndpoint.timeout) || workerEndpoint.timeout <= 0)) {
    throw new Error('Invalid timeout');
  }
}

export const validateWorkerMetadata = (workerMetadata: WorkerMetadata) => {
  const requiredFields: (keyof WorkerMetadata)[] = ['queue', 'endpoint'];
  for (const field of requiredFields) {
    if (!workerMetadata[field]) {
      throw new Error(`${field} is required`);
    }
  }

  // Check that no extra fields are present
  const allowedFields = ['queue', 'endpoint', 'opts'];
  for (const field in workerMetadata) {
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  validateQueueName(workerMetadata.queue);

  validateWorkerEndpoint(workerMetadata.endpoint);

  if (workerMetadata.opts) {
    validateWorkerOptions(workerMetadata.opts);
  }
}
