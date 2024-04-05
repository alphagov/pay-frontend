FROM node:18.20.1-alpine3.19@sha256:fdaafba89e47a9716571df803d7759392b51ba7fbaddbeefdb433abbaedc25f6 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.20.1-alpine3.19@sha256:fdaafba89e47a9716571df803d7759392b51ba7fbaddbeefdb433abbaedc25f6 AS final

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
