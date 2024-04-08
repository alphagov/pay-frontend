FROM node:18.20.1-alpine3.19@sha256:cbd31807a8b4621a9dea342a03f14e8c53f5ca78a395f426bb5bd0e7f071c47c AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:18.20.1-alpine3.19@sha256:cbd31807a8b4621a9dea342a03f14e8c53f5ca78a395f426bb5bd0e7f071c47c AS final

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
