#!/usr/bin/env node
const { unlink, readdir, stat } = require('fs').promises

const pact = require('@pact-foundation/pact-node')
const pactDirPath = `${__dirname}/../pacts/`

async function publish () {
  const opts = {
    pactFilesOrDirs: [pactDirPath],
    pactBroker: process.env.PACT_BROKER_URL,
    consumerVersion: process.env.PACT_CONSUMER_VERSION,
    pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
    pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
    tags: process.env.PACT_CONSUMER_TAG
  }

  await pact.publishPacts(opts)
  console.log('Pacts published')
}

async function removePactsNotToBePublished () {
  const files = await readdir(pactDirPath)
  // todo: fix this 'to-be' nonsense
  files
    .filter(filename => filename.includes('to-be'))
    .forEach(async filename => await unlink(pactDirPath + filename))
}

async function run () {
  // make sure pact dir exists, and clean out any files marked to be
  try {
    await stat(pactDirPath)
    await removePactsNotToBePublished()
    await publish()
  } catch (e) {
    console.log('Unable to publish pacts', e)
    throw e
  }
}

run()
