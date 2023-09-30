import IORedis from "ioredis";

import {
    QueueController,
    WorkerController,
    QueueEventsController,
} from "./controllers";
import { RouteMatcher } from "./utils/router-matcher";
import { log, warn } from "./utils/log";
import { Server } from "bun";

const pkg = require("../package.json");

const routeMatcher = new RouteMatcher();

routeMatcher.addRoute<void>("health", "/");

routeMatcher.addRoute<{ queueName: string }>("queue", "/queues/:queueName");
routeMatcher.addRoute<{ queueName: string; concurrency: number }>(
    "worker",
    "/queues/:queueName/process/:concurrency"
);
routeMatcher.addRoute<{ queueName: string }>(
    "queue-events",
    "/queues/:queueName/events"
);

export const fetchHandler = (connection: IORedis, authTokens: string[] = []) => async (req: Request, server: Server) => {
    const url = new URL(req.url);
    const { searchParams } = url;

    const from =
        req.headers.get("x-forwarded-for") || req.headers.get("host");

    // TODO: We would like to move this auth to the websocket open method
    // but closing the websocket there leads to errors in the client.
    const token = searchParams.get("token");
    if (!token) {
        warn(
            `Unauthorized request (missing token) to path ${url.pathname.toString()} from ${from}`
        );
        return new Response("Unauthorized", { status: 401 });
    }

    if (!authTokens.includes(token!)) {
        warn(
            `Unauthorized request (invalid token) to path ${url.pathname.toString()} from ${from}`
        );
        return new Response("Unauthorized", { status: 401 });
    }

    // Choose controller based on path
    const route = routeMatcher.match(url.pathname);
    if (!route) {
        warn(
            `Not found request to path ${url.pathname.toString()} from ${req.headers.get("x-forwarded-for") || req.headers.get("host")
            }`
        );
        return new Response("Not found", { status: 404 });
    }

    const queueName = route.params?.queueName;
    let controller;
    let events;
    const concurrency = parseInt(route.params.concurrency, 10) || 1;
    switch (route.name) {
        case "worker":
            controller = WorkerController;
            log(
                `Worker connected for queue ${queueName} with concurrency ${concurrency}`
            );
            break;
        case "queue":
            controller = QueueController;
            log(`Queue connected for queue ${queueName}`);
            break;
        case "queue-events":
            controller = QueueEventsController;
            events = searchParams.get("events")?.split(",") || [];
            log(
                `Queue events connected for queue ${queueName} with events ${events}`
            );
            break;
        case "health":
            return new Response(
                `BullMQ Proxy (c) ${new Date().getFullYear()} Taskforce.sh v${pkg.version
                }`,
                { status: 200 }
            );
        default:
            return new Response("", { status: 404 });
    }

    if (
        server.upgrade(req, {
            data: {
                route,
                controller,
                queueName,
                concurrency,
                connection,
                events,
            },
        })
    ) {
        return; // Do not return a Response to signal that the upgrade is successful
    }
    return new Response("Upgrade failed :(", { status: 500 });
}
