FROM govukpay/nodejs:10-alpine

ADD package.json /tmp/package.json
ADD package-lock.json /tmp/package-lock.json
# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk --no-cache --virtual build-dependencies add \
    python \
    make \
    g++ \
    && cd /tmp \
    && npm install --production \
    && apk del build-dependencies

ENV PORT 9000
EXPOSE 9000

WORKDIR /app
ADD . /app
ENV LD_LIBRARY_PATH /app/node_modules/appmetrics
RUN ln -s /tmp/node_modules /app/node_modules

CMD npm start
