FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS base

RUN apk upgrade --no-cache

FROM base AS builder

# Upgrade npm — if updating the Node.js version, check if this
# is still necessary and make sure it never downgrades npm
RUN npm install -g npm@11.19.1

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