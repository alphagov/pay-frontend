#!/bin/bash

COMMIT=$(git rev-parse HEAD)
IMAGE="govukpay/frontend:$COMMIT"
npm install && npm test && docker build -t $IMAGE . && docker push $IMAGE
