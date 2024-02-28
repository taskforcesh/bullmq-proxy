import { Cluster, Redis } from "ioredis";

import { LRUCache } from "../cache";
import { config } from "../config";
import { Queue } from "bullmq";

const cache = new LRUCache<Queue>(config.queueCacheSize, async (queueName, queue) => {
  await queue.close();
});

export const getQueue = async (queueName: string, redisClient: Redis | Cluster) => {
  let queue = cache.get(queueName);
  if (!queue) {
    queue = new Queue(queueName, { connection: redisClient, prefix: config.defaultQueuePrefix });
    cache.put(queueName, queue);
  }
  return queue;
}

/**
 * Clear the cache.
 * 
 * Closes all queues and clears the cache.
 */
export const cleanCache = async () => {
  await cache.clear();
}
