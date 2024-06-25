FROM node:18.20.3-alpine3.19@sha256:acb08e6aa07aa2c24bd4b8bb8031b9032dfa7b4aefadf111b634d3e0b7b18f39 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.20.3-alpine3.19@sha256:acb08e6aa07aa2c24bd4b8bb8031b9032dfa7b4aefadf111b634d3e0b7b18f39 AS final

RUN ["apk", "--no-cache", "upgrade"]

RUN ["apk", "add", "--no-cache", "tini"]

WORKDIR /app
COPY . .
RUN rm -rf ./test
# Copy in compile assets and deps from build container
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/govuk_modules ./govuk_modules
COPY --from=builder /app/public ./public
RUN npm prune --omit=dev

ENV PORT 9000
EXPOSE 9000

ENTRYPOINT ["tini", "--"]

CMD ["npm", "start"]
