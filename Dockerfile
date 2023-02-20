FROM node:16.19.1-alpine3.17@sha256:25828d5c4ae9824273db9ca2e923da2d29bbae78f534e979f09eb99a2e812e94 as builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:16.18.1-alpine3.16@sha256:868e2b6c8923d87a4bbfb157d757898061c9000aaaedf64472074fa7b62d0e72 as final

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
