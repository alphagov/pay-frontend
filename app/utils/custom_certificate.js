var path = require('path')
var fs = require('fs')

var logger = require('pino')()

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
    fs.readdirSync(certsPath).forEach(
      certPath => ca.push(
        fs.readFileSync(path.join(certsPath, certPath))
      )
    )

    return ca
  }
}
