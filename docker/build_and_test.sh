#!/usr/bin/env bash
set -ueo pipefail
rm -rf node_modules
cp -R /tmp/node_modules /app/node_modules
npm run compile &&\
npm run lint
npm test -- --forbid-only --forbid-pending
findpacts=$(ls -1 ./pacts | wc -l)
if [ $findpacts -gt 0 ]
then
  echo "Got pact files"

  # prevent publish of any pacts with 'to-be' in their name
  if [[ $(find ./pacts/*-to-be*.json) ]]; then
    echo "Got to-be pact files.. renaming"
    for i in ./pacts/*-to-be-*.json; do mv "$i" "${i%.json}.ignore"; done
  fi

  echo "Publishing pact files"
  npm run publish-pacts

  echo "Published pact files"
else
  echo "No pact files found"
fi
