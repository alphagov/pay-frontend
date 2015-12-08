#!/bin/bash
cd ${0%/*}
case "$1" in
  'stop')
    echo 'Stopping redirector...'
    docker kill pay-frontend-redir && docker rm -f pay-frontend-redir
    ;;
  'start')
    echo 'Starting redirector...'
    ./env.sh 'docker run -d --name pay-frontend-redir --net host -e IN_PORT=$PORT -e OUT_PORT=$PORT -e OUT_IP=192.168.99.1 govukpay/devhelper'
    ;;
  *)
    echo 'Usage: ./redirect.sh [start|stop]'
    ;;
esac
