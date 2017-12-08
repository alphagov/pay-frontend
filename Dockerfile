FROM node:6.12.0-alpine

RUN apk update &&\
    apk upgrade &&\
    apk add --update libc6-compat

ENV PORT 9000
EXPOSE 9000

ADD package.json /tmp/package.json
RUN cd /tmp && npm install --production

WORKDIR /app
ADD . /app

RUN ln -s /tmp/node_modules /app/node_modules

CMD npm start
