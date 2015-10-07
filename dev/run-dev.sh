#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR/..

export PORT=9200
export SESSION_ENCRYPTION_KEY=asdjhbwefbo23r23rbfik2roiwhefwbqw
export CONNECTOR_TOKEN_URL=http://dockerhost:9300/v1/frontend/tokens/{chargeTokenId}
export CONNECTOR_URL=http://dockerhost:9300/v1/frontend/charges/{chargeId}

npm run start