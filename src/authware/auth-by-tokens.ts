import { Cluster, Redis } from "ioredis";
import { config } from "../config";
import { warn } from "../utils/log";

export const authByTokens = async (
  req: Request,
  url: URL,
  _params: Record<string, string>,
  _connection?: Redis | Cluster): Promise<boolean> => {
  const authTokens = config.authTokens;

  const from =
    req.headers.get("x-forwarded-for") || req.headers.get("host");

  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    warn(
      `Unauthorized request (missing token) to path ${url.pathname.toString()} from ${from}`
    );
    return false;
  }

  if (!authTokens.includes(token!)) {
    warn(
      `Unauthorized request (invalid token) to path ${url.pathname.toString()} from ${from}`
    );
    return false;
  }

  return true;
}
