FROM node:6.12.0-alpine

RUN apk update &&\
    apk upgrade &&\
    apk add --update libc6-compat

ENV PORT 9000
EXPOSE 9000

WORKDIR /app
ADD . /app

CMD npm start
