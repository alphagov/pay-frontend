#!/bin/bash

npm install && npm run compile &&\
docker build -t govukpay/frontend:local .