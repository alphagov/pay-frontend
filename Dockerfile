FROM node:18.18.2-alpine3.18@sha256:0fe7402d11d8c85474c6ec6f9c9c8048cd0549c95535832b7f0735a4b47690a5 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.18.2-alpine3.18@sha256:0fe7402d11d8c85474c6ec6f9c9c8048cd0549c95535832b7f0735a4b47690a5 AS final

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
