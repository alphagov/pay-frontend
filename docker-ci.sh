#!/bin/bash
if [ "x${ghprbActualCommit}" = "x" ]; then
    COMMIT=$(git rev-parse HEAD)
else
    COMMIT=$ghprbActualCommit
fi

echo COMMIT=$COMMIT

