FROM node@sha256:1dd4309479f031295f3dfb61cf3afc3efeb1a991b012e105d1a95efc038b72f6 as builder

### Needed to run appmetrics and pact-mock-service
COPY sgerrand.rsa.pub /etc/apk/keys/sgerrand.rsa.pub
RUN ["apk", "--no-cache", "add", "ca-certificates", "python", "build-base", "bash", "ruby"]
RUN wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.28-r0/glibc-2.28-r0.apk && apk add --no-cache glibc-2.28-r0.apk && rm -f glibc-2.28-r0.apk
###

# add package.json before source for node_module cache layer
WORKDIR /app
COPY . /app

RUN npm install &&\
    npm run compile &&\
    pwd &&\
    npm test





FROM node@sha256:1dd4309479f031295f3dfb61cf3afc3efeb1a991b012e105d1a95efc038b72f6 as final



RUN ["apk", "add", "--no-cache", "tini"]



ENV PORT 9000
EXPOSE 9000

WORKDIR /app
COPY --from=builder /app /app
RUN npm prune --production
ENV LD_LIBRARY_PATH /app/node_modules/appmetrics

ENTRYPOINT ["tini", "--"]

CMD ["npm", "start"]
