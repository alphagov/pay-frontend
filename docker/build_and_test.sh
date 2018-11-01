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
  for i in ./pacts/*-to-be-*.json; do mv "$i" "${i%.json}.ignore"; done
  npm run publish-pacts
else
  echo "No pact files found"
fi