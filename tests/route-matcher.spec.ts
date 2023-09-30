import { expect } from "chai";
import { describe, it, beforeEach } from "bun:test";
import { RouteMatcher } from "../src/utils/router-matcher";

describe("RouteMatcher", () => {
  let matcher: RouteMatcher;

  beforeEach(() => {
    matcher = new RouteMatcher();
    matcher.addRoute("queueRoute", "/queues/:queueName");
    matcher.addRoute("jobsRoute", "/queues/:queuename/jobs");
    matcher.addRoute("eventsRoute", "/queues/:queuename/events");
    matcher.addRoute("processRoute", "/queues/:queuename/process/:concurrency");
  });

  it("should correctly match and extract queuename for queueRoute", () => {
    const result = matcher.match("/queues/test%20queue");
    expect(result).to.deep.equal({
      name: "queueRoute",
      params: { queueName: "test%20queue" },
    });
  });

  it("should correctly match and extract queuename for jobsRoute", () => {
    const result = matcher.match("/queues/testQueue/jobs");
    expect(result).to.deep.equal({
      name: "jobsRoute",
      params: { queuename: "testQueue" },
    });
  });

  it("should correctly match and extract queuename for eventsRoute", () => {
    const result = matcher.match("/queues/testQueue/events");
    expect(result).to.deep.equal({
      name: "eventsRoute",
      params: { queuename: "testQueue" },
    });
  });

  it("should match and extract queuename and concurrency for processRoute", () => {
    const result = matcher.match("/queues/testQueue/process/5");
    expect(result).to.deep.equal({
      name: "processRoute",
      params: {
        queuename: "testQueue",
        concurrency: "5",
      },
    });
  });

  it("should return null for unmatched path", () => {
    const result = matcher.match("/unmatched/pathname");
    expect(result).to.be.null;
  });

  it("should match and extract string concurrency for processRoute", () => {
    const result = matcher.match("/queues/testQueue/process/async");
    expect(result).to.deep.equal({
      name: "processRoute",
      params: {
        queuename: "testQueue",
        concurrency: "async",
      },
    });
  });

  it("should extract query parameters", () => {
    const result = matcher.match(
      "/queues/testQueue/jobs?type=urgent&priority=high"
    );
    expect(result).to.deep.equal({
      name: "jobsRoute",
      params: { queuename: "testQueue" },
      query: {
        type: "urgent",
        priority: "high",
      },
    });
  });
  it("should return empty query object when no query parameters are present", () => {
    const result = matcher.match("/queues/testQueue/jobs");
    expect(result).to.deep.equal({
      name: "jobsRoute",
      params: { queuename: "testQueue" },
      // No 'query' property is expected here now
    });
  });

  it("should handle query parameters without path parameters", () => {
    matcher.addRoute("listRoute", "/list");
    const result = matcher.match("/list?category=electronics&page=2");
    expect(result).to.deep.equal({
      name: "listRoute",
      params: {},
      query: {
        category: "electronics",
        page: "2",
      },
    });
  });

  it("should extract query parameters as lists", () => {
    const result = matcher.match(
      "/queues/testQueue/jobs?events=waiting,completed,active"
    );
    expect(result).to.deep.equal({
      name: "jobsRoute",
      params: { queuename: "testQueue" },
      query: {
        events: ["waiting", "completed", "active"],
      },
    });
  });

  it("should handle mixed query parameters (lists and singles)", () => {
    const result = matcher.match(
      "/queues/testQueue/jobs?events=waiting,completed,active&type=urgent"
    );
    expect(result).to.deep.equal({
      name: "jobsRoute",
      params: { queuename: "testQueue" },
      query: {
        events: ["waiting", "completed", "active"],
        type: "urgent",
      },
    });
  });

  it("should handle query parameters with spaces correctly", () => {
    const result = matcher.match(
      "/queues/testQueue/jobs?events=waiting, completed , active"
    );
    expect(result).to.deep.equal({
      name: "jobsRoute",
      params: { queuename: "testQueue" },
      query: {
        events: ["waiting", "completed", "active"],
      },
    });
  });
});
