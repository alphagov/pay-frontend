'use strict'

module.exports = str => {
  return !isNaN(str) && !isNaN(parseInt(str))
}
