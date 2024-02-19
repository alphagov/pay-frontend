FROM node:18.19.1-alpine3.18@sha256:bacc59da35fc5ddf4b93846733e0d5b9bfe49a118a0240e9d31578dd6a7417c0 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.19.1-alpine3.18@sha256:bacc59da35fc5ddf4b93846733e0d5b9bfe49a118a0240e9d31578dd6a7417c0 AS final

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
