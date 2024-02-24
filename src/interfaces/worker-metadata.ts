import { WorkerOptions } from "bullmq";
import { WorkerEndpoint } from "./worker-endpoint";

export type WorkerSimpleOptions = Omit<WorkerOptions,
  'connection' |
  'blockingConnection' |
  'skipVersionCheck' |
  'autorun' |
  'stalledInterval' |
  'skipStalledCheck' |
  'skipLockRenewal' |
  'drainDelay' |
  'lockDuration' |
  'lockRenewTime' |
  'runRetryDelay' |
  'settings' |
  'useWorkerThreads'>;

export interface WorkerMetadata {
  queue: string;
  endpoint: WorkerEndpoint;
  opts?: WorkerSimpleOptions;
}
