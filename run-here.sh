#!/bin/bash
ENV_FILE="$WORKSPACE/pay-scripts/services/frontend.env"
if [ -f $ENV_FILE ]
then
  set -a
  source $ENV_FILE
  set +a  
fi

# redirect dockerhost:$PORT to here
docker run -d --name pay-frontend-redirector --net host \
 -e IN_PORT=$PORT -e OUT_PORT=$PORT -e OUT_IP=192.168.99.1 govukpay/devhelper

npm run start
