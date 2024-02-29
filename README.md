# BullMQ Proxy

This lightweight service works as a proxy for BullMQ queues. It has applications in many useful cases:

- Work with your queues in any language or platform that supports HTTP.
- Run your workers in serverless environments.
- Isolate your Redis instances and allow BullMQ operations from untrusted sources (such as external service for example a web app)
- Implement Access Control for your queues (coming soon).

The proxy provides a simple Restful HTTP API that supports the most important features available in BullMQ. You
can add jobs with any options you like and instantiate workers, also with any BullMQ compatible options.

## Roadmap

- [x] Initial support for adding and processing jobs for any queue.
- [x] Queue getters (retrieve jobs in any status from any queue).
- [ ] Support redundancy (multiple proxies running in parallel).
- [ ] Queue actions: Pause, Resume, Clean and Obliterate.
- [x] Job processing actions: update progress, add logs.
- [ ] Job actions: promote, retry, remove.
- [ ] Support for adding flows.
- [ ] Dynamic rate-limit.
- [ ] Manually consume jobs.

Although the service is not yet feature complete, you are very welcome to try it out and give us
feedback and report any issues you may find.

## Documentation

The latest documentation can be found at https://docs.bullmq.net/

## License

MIT License

## Copyright

(c) 2023-2024 Manuel Astudillo.
