const logger = require('../utils/logger')(__filename)

class ChargeState {
  /**
   * @param {Number} [createdAt]
   * @param {Number} [accessedAt]
   * @param {boolean} [isTerminal]
   */
  constructor (createdAt, accessedAt, isTerminal) {
    this.createdAt = createdAt || epochSecondsNow()
    this.accessedAt = accessedAt || epochSecondsNow()
    this.isTerminal = isTerminal || false
  }

  updateAccessedAt () {
    this.accessedAt = epochSecondsNow()
  }

  markTerminal () {
    this.updateAccessedAt()
    this.isTerminal = true
  }

  toString () {
    return `${this.createdAt},${this.accessedAt},${this.isTerminal ? 'T' : 'F'}`
  }
}

const chargeStateFromString = (data) => {
  try {
    const dataParts = data.split(',')
    if (dataParts.length === 3) {
      return new ChargeState(Number(dataParts[0]), Number(dataParts[1]), dataParts[2] === 'T')
    } else {
      logger.error('argument is not a valid ChargeState')
      return null
    }
  } catch (e) {
    logger.warn(`Error de-serialising ChargeState from string: ${e.message}`)
    return null
  }
}

const epochSecondsNow = () => {
  return Math.floor(Date.now() / 1000)
}

module.exports = {
  ChargeState,
  chargeStateFromString,
  epochSecondsNow
}
