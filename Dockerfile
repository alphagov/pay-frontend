FROM node:16.20.1-alpine3.17@sha256:d68deb2974609e4a2d65046c8de72ad2095be2cffc9bf67f22acf38eeb6c7bb5 as builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --quiet

COPY . .
RUN npm run compile

FROM node:16.20.1-alpine3.17@sha256:d68deb2974609e4a2d65046c8de72ad2095be2cffc9bf67f22acf38eeb6c7bb5 AS final

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
