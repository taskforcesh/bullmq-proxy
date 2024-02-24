/**
 * Describes an endpoint that a worker will call when processing a job.
 */
export interface WorkerEndpoint {
  /**
   * The URL of the endpoint that the worker will call when
   * processing a job.
   * 
   */
  url: string;

  /**
   * The HTTP method to use when calling the endpoint.
   */
  method: string;

  /**
   * Optional headers to include in the request to the endpoint.
   */
  headers?: Record<string, string>;

  /**
   * Optional timeout for the request to the endpoint in milliseconds.
   * If the endpoint does not respond within this time, the worker 
   * will fail the job (or start a retry mechanism if the job is
   * configured to do so).
   */
  timeout?: number;
}
