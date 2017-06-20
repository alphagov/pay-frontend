FROM node:6.10.0-alpine

RUN apk update && apk upgrade

# Install packages needed for production
RUN apk add --update bash python make g++ libc6-compat

ENV PORT 9000

EXPOSE 9000

# add package.json before source for node_module cache
ADD package.json /tmp/package.json
RUN cd /tmp && npm install

ADD . /app
WORKDIR /app

# copy cached node_modules to /app/node_modules
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

RUN npm install && npm run compile && npm test && npm prune --production

RUN apk del python make g++

CMD bash ./docker-startup.sh
