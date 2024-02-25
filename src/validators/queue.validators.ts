import { BackoffOptions, JobJson, JobsOptions, RepeatOptions } from "bullmq";
import { config } from "../config";

export const validateQueueName = (queueName: string) => {
  if (queueName.length < config.minQueueNameLength) {
    throw new Error(`queue name must be at least ${config.minQueueNameLength} characters long`);
  }

  if (queueName.length > config.maxQueueNameLength) {
    throw new Error(`queue name must be at most ${config.maxQueueNameLength} characters long`);
  }
}

export const validateJob = (job: JobJson) => {
  // Validate required fields
  const requiredFields: (keyof JobJson)[] = ["name", "data"];
  for (const field of requiredFields) {
    if (!job[field]) {
      throw new Error(`${field} is required`);
    }
  }

  // Validate no extra fields are present
  const allowedFields: (keyof JobJson)[] = ["name", "data", "opts"];
  for (const field in job) {
    if (!allowedFields.includes(field as keyof JobJson)) {
      throw new Error(`Unexpected field: ${field}`);
    }
  }

  // Validate opts
  if (job.opts) {
    validateJobOpts(job.opts);
  }
}

export const validateRepeatOpts = (opts: RepeatOptions) => {
  const allowedFields: (keyof RepeatOptions)[] = ["every", "limit", "key", "immediately"];
  for (const field in opts) {
    if (!allowedFields.includes(field as keyof RepeatOptions)) {
      throw new Error(`Unexpected field: opts.${field}`);
    }
  }

  const requiredFields: (keyof RepeatOptions)[] = ["every"];
  for (const field of requiredFields) {
    if (!opts[field]) {
      throw new Error(`repeat.${field} is required`);
    }
  }

  if (opts.every && (!Number.isInteger(opts.every) || opts.every <= 0)) {
    throw new Error(`Invalid every ${opts.every}`);
  }

  if (opts.limit && (!Number.isInteger(opts.limit) || opts.limit <= 0)) {
    throw new Error(`Invalid limit ${opts.limit}`);
  }

  if (typeof opts.immediately !== "undefined" && typeof opts.immediately !== "boolean") {
    throw new Error(`Invalid immediately ${opts.immediately}, must be a boolean`);
  }

  if (opts.key && typeof opts.key !== "string") {
    throw new Error(`Invalid key ${opts.key}, must be a string`);
  }
}

export const validateJobOpts = (opts: JobsOptions) => {
  const allowedFields: (keyof JobsOptions)[] = [
    "delay",
    "lifo",
    "priority",
    "attempts",
    "backoff",
    "jobId",
    // "repeat", // Disabled as we need to support repeatable jobs on addBulk.
    "removeOnComplete",
    "removeOnFail"];
  for (const field in opts) {
    if (!allowedFields.includes(field as keyof JobsOptions)) {
      throw new Error(`Unexpected field: opts.${field}`);
    }
  }

  if (opts.delay && (!Number.isInteger(opts.delay) || opts.delay < 0)) {
    throw new Error(`Invalid delay ${opts.delay}`);
  }

  if (typeof opts.priority !== "undefined" &&
    (!Number.isInteger(opts.priority) ||
      opts.priority! <= 0 ||
      opts.priority! > 2_097_152)) {
    throw new Error(`Invalid priority ${opts.priority}`);
  }

  if (opts.attempts && (!Number.isInteger(opts.attempts) || opts.attempts < 0)) {
    throw new Error(`Invalid attempts ${opts.attempts}`);
  }

  if (opts.backoff && !["fixed", "exponential"].includes((<BackoffOptions>opts.backoff)?.type)) {
    throw new Error(`Invalid backoff ${(<BackoffOptions>opts.backoff)?.type}`);
  }

  if (typeof opts.lifo !== "undefined" && typeof opts.lifo !== "boolean") {
    throw new Error(`Invalid lifo ${opts.lifo}, must be a boolean`);
  }

  if (opts.jobId && typeof opts.jobId !== "string") {
    throw new Error(`Invalid jobId ${opts.jobId}, must be a string`);
  }

  if (opts.repeat) {
    validateRepeatOpts(opts.repeat);
  }
}
