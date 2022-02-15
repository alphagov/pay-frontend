FROM node:12.22.10-alpine3.15@sha256:f150ebf9402f0dd6a9c4cb208ed64884cfa7c8a6ccae3f749a7b12156c25ad88 as builder
### Needed to run pact-mock-service
COPY sgerrand.rsa.pub /etc/apk/keys/sgerrand.rsa.pub
RUN ["apk", "--no-cache", "add", "ca-certificates", "python2", "build-base", "bash", "ruby"]
RUN wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.28-r0/glibc-2.28-r0.apk && apk add --no-cache glibc-2.28-r0.apk && rm -f glibc-2.28-r0.apk
###
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile && npm run snyk-protect

FROM node:12.22.10-alpine3.15@sha256:f150ebf9402f0dd6a9c4cb208ed64884cfa7c8a6ccae3f749a7b12156c25ad88 as final

RUN ["apk", "--no-cache", "upgrade"]

RUN ["apk", "add", "--no-cache", "tini"]

WORKDIR /app
COPY . .
RUN rm -rf ./test
# Copy in compile assets and deps from build container
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/govuk_modules ./govuk_modules
COPY --from=builder /app/public ./public
RUN npm prune --production

ENV PORT 9000
EXPOSE 9000

ENTRYPOINT ["tini", "--"]

CMD ["npm", "start"]
