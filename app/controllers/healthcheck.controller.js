const healthyPingResponse = { ping: { healthy: true } }

const respond = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

module.exports.healthcheck = async (req, res) => {
  respond(res, 200, healthyPingResponse)
}
