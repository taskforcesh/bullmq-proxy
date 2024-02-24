import { WebSocketHandler } from "bun";

import { URL } from "url";
import { HttpHandlerOpts } from "../interfaces/http-handler-opts";

type HttpHandler = (opts: HttpHandlerOpts) => Promise<Response>

type RoutePattern<T = any> = {
  name: string;
  pattern: RegExp;
  paramNames: string[];
  method?: string;
  websocketHandler?: WebSocketHandler<T>;
  httpHandler?: HttpHandler;
};

type MatchResult = {
  name: string;
  params: any;
  query?: any;
  websocketHandler?: WebSocketHandler;
  httpHandler?: HttpHandler;
};

export class RouteMatcher {
  private routes: RoutePattern<any>[] = [];

  addRoute<T>(name: string, pattern: string, handler?: WebSocketHandler<T> | HttpHandler): void {
    const paramNames: string[] = [];
    const regexPattern = new RegExp(
      "^" +
      pattern.replace(/:[^\/]+/g, (match) => {
        paramNames.push(match.substr(1));
        return "([^/]+)";
      }) +
      "$"
    );

    // Determine if handler is a WebSocketHandler or an HttpHandler
    let httpHandler: HttpHandler | undefined;
    let websocketHandler: WebSocketHandler<T> | undefined;
    if (handler) {
      if (typeof handler === "function") {
        httpHandler = handler;
      } else {
        websocketHandler = handler;
      }
    }
    this.routes.push({ name, pattern: regexPattern, paramNames, httpHandler, websocketHandler });
  }

  addWebSocketRoute<T>(name: string, pattern: string, handler: WebSocketHandler<T>): void {
    this.addRoute<T>(name, pattern, handler);
  }

  addHttpRoute<T>(name: string, pattern: string, handler: HttpHandler, method: string = "get"): void {
    this.addRoute<T>(name, pattern, handler);
    this.routes[this.routes.length - 1].method = method.toLowerCase();
  }

  match(url: string, method: string = "get"): MatchResult | null {
    const urlObj = new URL(url, "http://localhost"); // Adding a base URL since `URL` expects a complete URL
    const pathname = urlObj.pathname;

    method = method.toLowerCase();

    for (const route of this.routes) {
      const matches = pathname.match(route.pattern)

      if (matches && (!route.method || route.method === method)) {
        const params: { [key: string]: any } = {};
        route.paramNames.forEach((param, index) => {
          params[param] = matches[index + 1];
        });

        const result: MatchResult = {
          name: route.name,
          params,
          websocketHandler: route.websocketHandler,
          httpHandler: route.httpHandler,
        };

        if (urlObj.search) {
          // If there's a query string
          const query: { [key: string]: string | string[] } = {};
          urlObj.searchParams.forEach((value, key) => {
            if (value.includes(",")) {
              query[key] = value.split(",").map((str) => str.trim());
            } else {
              query[key] = value;
            }
          });
          result.query = query;
        }

        return result;
      }
    }
    return null;
  }
}
