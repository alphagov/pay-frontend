#!/bin/ash

UV_THREADPOOL_SIZE=128 AWS_REGION=${ECS_AWS_REGION} chamber exec ${ECS_SERVICE} -- npm start
