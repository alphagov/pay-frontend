FROM govukpay/nodejs:10-alpine

RUN apk update &&\
    apk upgrade &&\
    apk add --update bash ruby

# add package.json before source for node_module cache layer
ADD package.json /tmp/package.json
ADD package-lock.json /tmp/package-lock.json
# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk --no-cache --virtual build-dependencies add \
    python \
    make \
    g++ \
    && cd /tmp \
    && npm install \
    && apk del build-dependencies
WORKDIR /app
ENV LD_LIBRARY_PATH /app/node_modules/appmetrics
CMD ./docker/build_and_test.sh
