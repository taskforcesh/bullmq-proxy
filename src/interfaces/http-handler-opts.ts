import { Redis, Cluster } from "ioredis";

export interface HttpHandlerOpts {
  req: Request;
  redisClient: Redis | Cluster;
  workersRedisClient: Redis | Cluster;
  params: { [key: string]: string };
  searchParams?: URLSearchParams;
}
