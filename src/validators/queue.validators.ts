import { BackoffOptions, JobJson, JobsOptions, RepeatOptions, DeduplicationOptions } from "bullmq";
import { config } from "../config";

export const validateQueueName = (queueName: string) => {
  if (queueName.length < config.minQueueNameLength) {
    throw new Error(`queue name must be at least ${config.minQueueNameLength} characters long`);
  }

  if (queueName.length > config.maxQueueNameLength) {
    throw new Error(`queue name must be at most ${config.maxQueueNameLength} characters long`);
  }
}

const allowedJobFields = new Set(["name", "data", "opts"]);
export const validateJob = (job: JobJson) => {
  // Validate required fields
  const requiredFields: (keyof JobJson)[] = ["name", "data"];
  for (const field of requiredFields) {
    if (!job[field]) {
      throw new Error(`${field} is required`);
    }
  }

  // Validate no extra fields are present
  for (const field in job) {
    if (!allowedJobFields.has(field as keyof JobJson)) {
      throw new Error(`Unexpected field: ${field}`);
    }
  }

  // Validate opts
  if (job.opts) {
    validateJobOpts(job.opts);
  }
}

const allowedFields: Set<(keyof RepeatOptions)> = new Set(["every", "limit", "key", "immediately"]);
export const validateRepeatOpts = (opts: RepeatOptions) => {

  for (const field in opts) {
    if (!allowedFields.has(field as keyof RepeatOptions)) {
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

const allowedDeduplicationFields = new Set(["id", "ttl"]);
export const validateDeduplicationOpts = (opts: DeduplicationOptions) => {
  for (const field in opts) {
    if (!allowedDeduplicationFields.has(field as keyof DeduplicationOptions)) {
      throw new Error(`Unexpected field: opts.${String(field)}`);
    }
  }

  if (typeof opts.id !== "string") {
    throw new Error(`Invalid deduplication.id ${opts.id}, must be a string`);
  }

  if (typeof opts.ttl !== "undefined" && typeof opts.ttl !== "number") {
    throw new Error(`Invalid deduplication.ttl ${opts.ttl}, must be a number`);
  }

  if (opts.ttl && opts.ttl <= 0) {
    throw new Error(`Invalid deduplication.ttl ${opts.ttl}, must be greater than 0`);
  }
}

const allowedBackoffFields = new Set(["type", "delay"]);
export const validateBackoffOpts = (opts: number | BackoffOptions) => {
  if (typeof opts === "number") {
    if (opts < 0) {
      throw new Error(`Invalid backoff delay ${opts}, must be greater than 0`);
    }
  }
  
  if (typeof opts !== "object" || opts === null || Array.isArray(opts)) {
    throw new Error(`Invalid backoff ${opts}, must be a number or an object`);
  }

  if (Object.keys(opts).length === 0) {
    throw new Error(`Invalid backoff ${JSON.stringify(opts)}, must be a number or an object with at least the type field`);
  }

  for (const field in opts) {
    if (!allowedBackoffFields.has(field as keyof BackoffOptions)) {
      throw new Error(`Unexpected field: opts.${field}`);
    }
  }

  if (!["fixed", "exponential"].includes(opts.type) && opts.delay !== undefined) {
    throw new Error(`Invalid backoff type ${opts.type}, must be "fixed" or "exponential" if delay is provided`);
  }

  if (typeof opts.delay !== "undefined" && typeof opts.delay !== "number") {
    throw new Error(`Invalid backoff delay ${opts.delay}, must be a number`);
  }

  if (opts.delay && opts.delay < 0) {
    throw new Error(`Invalid backoff delay ${opts.delay}, must be greater than 0`);
  }
}

const allowedJobOptsFields: Set<(keyof JobsOptions)> = new Set([
  "delay",
  "lifo",
  "priority",
  "attempts",
  "backoff",
  "jobId",
  "deduplication",
  // "repeat", // Disabled as we need to support repeatable jobs on addBulk.
  "removeOnComplete",
  "removeOnFail"]);

export const validateJobOpts = (opts: JobsOptions) => {

  for (const field in opts) {
    if (!allowedJobOptsFields.has(field as keyof JobsOptions)) {
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

  if (opts.backoff) {
    validateBackoffOpts(opts.backoff);
  }

  if (typeof opts.lifo !== "undefined" && typeof opts.lifo !== "boolean") {
    throw new Error(`Invalid lifo ${opts.lifo}, must be a boolean`);
  }

  if (opts.jobId && typeof opts.jobId !== "string") {
    throw new Error(`Invalid jobId ${opts.jobId}, must be a string`);
  }

  if (opts.deduplication) {
    validateDeduplicationOpts(opts.deduplication);
  }

  if (opts.repeat) {
    validateRepeatOpts(opts.repeat);
  }
}

export const validatePagination = (start: number, length: number) => {
  if (isNaN(start) || isNaN(length)) {
    throw new Error("Invalid start or length");
  }

  if (start < 0 || length < 0) {
    throw new Error("Start and length must be positive");
  }

  if (length > 100) {
    throw new Error("Length must be less than or equal to 100");
  }
}
