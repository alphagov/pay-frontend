#!/bin/bash
docker build --file docker/build_and_test.Dockerfile -t govukpay/frontend-build:local . &&\
docker run --volume $(pwd):/app:rw govukpay/frontend-build:local &&\
docker build -t govukpay/frontend:local .