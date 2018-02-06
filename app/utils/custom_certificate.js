'use strict'
// core dependencies
const path = require('path')
const fs = require('fs')

// npm dependencies
const logger = require('winston')

// constants
const CERTS_PATH = process.env.CERTS_PATH || path.join(__dirname, '/../../certs')
exports.getCertOptions = (certsPath) => {
  certsPath = certsPath || CERTS_PATH
  try {
    if (fs.lstatSync(certsPath).isDirectory()) {
      // Read everything from the certificates directories
      // Get everything that isn't a directory (e.g. files, symlinks)
      // Read it (assume it is a certificate)
      // Add it to the agentOptions list of CAs
      const ca = []
      fs.readdirSync(certsPath)
        .map(certPath => path.join(certsPath, certPath))
        .filter(fullCertPath => !fs.lstatSync(fullCertPath).isDirectory())
        .map(fullCertPath => fs.readFileSync(fullCertPath))
        .forEach(caCont => ca.push(caCont))
      return ca
    } else {
      logger.error('Provided CERTS_PATH is not a directory', {certsPath})
    }
  } catch (e) {
    logger.error('Provided CERTS_PATH could not be read', {certsPath})
  }
}
