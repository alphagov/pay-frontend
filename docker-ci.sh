#!/bin/bash
if [ "x${ghprbActualCommit}" = "x" ]; then
    COMMIT=$(git rev-parse HEAD)
else
    COMMIT=$ghprbActualCommit
fi

IMAGE="govukpay/frontend:$COMMIT"
npm install && npm test && docker build -t $IMAGE . && docker push $IMAGE
