FROM oven/bun:latest

LABEL org.opencontainers.image.description BullMQ Proxy - Access BullMQ Queues via HTTP

EXPOSE 8080

ENV NODE_ENV=production

COPY package.json ./
COPY bun.lockb ./
COPY src ./src

RUN bun install --production --ignore-scripts

CMD bun start
HEALTHCHECK --interval=5s --timeout=5s --retries=3 CMD bun -e "fetch('http://localhost:8080').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

LABEL org.opencontainers.image.source="https://github.com/taskforcesh/bullmq-proxy"
LABEL org.opencontainers.image.description "BullMQ Proxy - Access BullMQ Queues via HTTP and WebSockets"
