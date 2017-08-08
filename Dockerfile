FROM node:6.11.1-alpine


ENV PORT 9000
EXPOSE 9000

# add package.json before source for node_module cache
ADD package.json /app/package.json
WORKDIR /app
RUN npm install --production

ADD . /app

RUN apk update &&\
    apk upgrade &&\
    apk add --update bash python make g++ libc6-compat &&\
    npm install &&\
    npm run compile &&\
    npm test &&\
    npm prune --production &&\
    apk del python make g++ &&\
    rm -rf govuk_modules &&\
    rm -rf coverage &&\
    rm -rf .nyc_output

CMD bash ./docker-startup.sh
