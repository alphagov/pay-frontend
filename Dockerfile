FROM node:18.20.5-alpine3.20@sha256:2827b0ceb8d855cf7d2cdf2b0a8e9f5c3c91362b49f9c8d35f7db0d34167fd89 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.20.5-alpine3.20@sha256:2827b0ceb8d855cf7d2cdf2b0a8e9f5c3c91362b49f9c8d35f7db0d34167fd89 AS final

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
