import { URL } from "url";

type RoutePattern<T> = {
  name: string;
  pattern: RegExp;
  paramNames: string[];
};

export class RouteMatcher {
  private routes: RoutePattern<any>[] = [];

  addRoute<T>(name: string, pattern: string): void {
    const paramNames: string[] = [];
    const regexPattern = new RegExp(
      "^" +
        pattern.replace(/:[^\/]+/g, (match) => {
          paramNames.push(match.substr(1));
          return "([^/]+)";
        }) +
        "$"
    );
    this.routes.push({ name, pattern: regexPattern, paramNames });
  }

  match(url: string): { name: string; params: any; query?: any } | null {
    const urlObj = new URL(url, "http://localhost"); // Adding a base URL since `URL` expects a complete URL
    const pathname = urlObj.pathname;

    for (const route of this.routes) {
      const matches = pathname.match(route.pattern);
      if (matches) {
        const params: { [key: string]: any } = {};
        route.paramNames.forEach((param, index) => {
          params[param] = matches[index + 1];
        });

        const result: { name: string; params: any; query?: any } = {
          name: route.name,
          params,
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
