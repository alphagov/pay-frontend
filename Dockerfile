FROM node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS base

RUN apk upgrade --no-cache

FROM base AS builder

# Upgrade npm — if updating the Node.js version, check if this
# is still necessary and make sure it never downgrades npm
RUN npm install -g npm@11.18.0

WORKDIR /build-stage
COPY package.json package-lock.json .npmrc ./
RUN npm ci --quiet
COPY . ./
RUN npm run compile
RUN npm prune --omit=dev

FROM base AS final

WORKDIR /app
# Copy in compile assets and deps from build container
COPY --from=builder /build-stage/node_modules ./node_modules
COPY --from=builder /build-stage/govuk_modules ./govuk_modules
COPY --from=builder /build-stage/public ./public
COPY --from=builder /build-stage/app ./app
COPY --from=builder /build-stage/config ./config
COPY --from=builder /build-stage/locales ./locales
COPY --from=builder /build-stage/server.js ./
COPY --from=builder /build-stage/start.js ./

RUN apk add --no-cache tini \
    && rm -rf /usr/local/lib/node_modules/npm \
        /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm \
        /usr/local/bin/npx \
        /usr/local/bin/corepack \
        /opt/yarn-* \
        /usr/local/bin/yarn \
        /usr/local/bin/yarnpkg

ENV PORT=9000
EXPOSE 9000
ENTRYPOINT ["tini", "--"]
CMD ["node", "start.js"]