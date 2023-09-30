# Configure ENV variables
# PORT
# REDIS_HOST,
# REDIS_PORT
# REDIS_PASSWORD
# REDIS_TLS
# AUTH_TOKENS // comma separated list of tokens

FROM oven/bun:latest

EXPOSE 8080

COPY package.json ./
COPY bun.lockb ./
COPY src ./src

RUN bun install

#CMD bun run ./src/index.ts
CMD cat package.json 
HEALTHCHECK --interval=5s --timeout=5s --retries=3 CMD wget localhost:8080 -q -O - > /dev/null 2>&1
