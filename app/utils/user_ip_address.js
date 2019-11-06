'use strict'

module.exports = req => {
  const xHeaderIpAddress = req.headers['x-forwarded-for']
  let ipAddress
  if (xHeaderIpAddress !== undefined) {
    ipAddress = xHeaderIpAddress.split(',')[0]
  } else {
    ipAddress = (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      (req.connection && req.connection.socket && req.connection.socket.remoteAddress)
  }
  return ipAddress !== undefined ? ipAddress.toString().trim() : null
}
