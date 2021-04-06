'use strict'

const outputOrRedact = (property, redact) => {
  if (property === null) {
    return '(null)'
  }

  if (typeof property === 'string') {
    if (property.length === 0) {
      return '(empty string)'
    }

    if (!property.trim()) {
      return '(blank string)'
    }

    return redact ? '(redacted non-blank string)' : property
  }

  if (Array.isArray(property)) {
    return '(array)'
  }

  return '(' + typeof property + ')'
}

const output = property => outputOrRedact(property, false)

const redact = property => outputOrRedact(property, true)

module.exports = {
  output,
  redact
}
