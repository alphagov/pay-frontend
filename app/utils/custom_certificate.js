var path = require('path')
var fs = require('fs')

var logger = require('winston')

module.exports = {
  getCertOptions: function () {
    var certsPath = process.env.CERTS_PATH || path.join(__dirname, '/../../certs')

    try {
      if (!fs.lstatSync(certsPath).isDirectory()) {
        logger.error('Provided CERTS_PATH is not a directory', {
          certsPath: certsPath
        })
        return
      }
    } catch (e) {
      logger.error('Provided CERTS_PATH could not be read', {
        certsPath: certsPath
      })
      return
    }

    var ca = []
    // Read everything from the certificates directories
    // Get everything that isn't a directory (e.g. files, symlinks)
    // Read it (assume it is a certificate)
    // Add it to the agentOptions list of CAs
    fs.readdirSync(certsPath)
      .map(certPath => path.join(certsPath, certPath))
      .filter(fullCertPath => !fs.lstatSync(fullCertPath).isDirectory())
      .map(fullCertPath => fs.readFileSync(fullCertPath))
      .forEach(caCont => ca.push(caCont))

    return ca
  }
}
