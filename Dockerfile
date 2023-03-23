FROM node:19.8.1-alpine3.17@sha256:a67a33f791d1c86ced985f339fa160f6188f590ebbe963fe11cc00adc971fa41 as builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:19.8.1-alpine3.17@sha256:a67a33f791d1c86ced985f339fa160f6188f590ebbe963fe11cc00adc971fa41 as final

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
