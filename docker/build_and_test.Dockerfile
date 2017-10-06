FROM node:8.5.0

# add package.json before source for node_module cache layer
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
WORKDIR /app

CMD ./docker/build_and_test.sh
