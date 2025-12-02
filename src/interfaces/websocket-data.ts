import { WebSocketHandler } from "bun";
import { ConnectionOptions } from "bullmq";

/**
 * Data associated with each WebSocket connection in the proxy.
 */
export type WebSocketData = {
  route: any;
  controller: WebSocketHandler<any>;
  queueName: string;
  concurrency: number;
  connection: ConnectionOptions;
  events: any;
  searchParams: URLSearchParams;
};
