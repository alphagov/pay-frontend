FROM node:16.14.0-alpine3.15@sha256:2c6c59cf4d34d4f937ddfcf33bab9d8bbad8658d1b9de7b97622566a52167f2b AS base

RUN apk --no-cache --update upgrade \
  && apk add --no-cache tini

WORKDIR /app
COPY . .

FROM base as builder

RUN apk add --no-cache \
    build-base \
    python3 \
  && npm ci --quiet \
  && npm run compile

FROM base as final

# Copy in compile assets and deps from build container
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/govuk_modules ./govuk_modules
COPY --from=builder /app/public ./public
RUN npm prune --production

ENV PORT 9000
EXPOSE 9000

ENTRYPOINT ["tini", "--"]

CMD ["npm", "start"]
