# BullMQ Proxy Client for Bun (Typescript)

This is a reference implementation of a BullMQ proxy client for Bun. This client is not intended for production use, but rather as a reference for how to implement a proxy client for other languages, as BullMQ is already avaialble for NodeJS and Bun.

## Testing

There is a test app that can be run to add some jobs to a queue and then process them. To run the test app, first start the proxy server (see the main README for instructions). Then you can just run the test app:

```bash
$ bun install
$ bun test/test.ts
```
