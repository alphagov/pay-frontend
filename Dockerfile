FROM node:16.20.0-alpine3.17@sha256:01b4c77bab0eec8c12c15ca96d1da583ee61d3bd710432d6fa5d0bf9132ae5e0 as builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:16.20.0-alpine3.17@sha256:01b4c77bab0eec8c12c15ca96d1da583ee61d3bd710432d6fa5d0bf9132ae5e0 as final

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
