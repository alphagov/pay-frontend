'use strict'

// NPM Dependencies
const lodash = require('lodash')

module.exports = apiCards => lodash.reduce(apiCards, (result, value) => {
  const entry = lodash.find(result, card => card.brand === value.brand)
  if (entry) {
    entry[value.type.toLowerCase()] = true
  } else {
    result.push({
      brand: value.brand,
      debit: value.type === 'DEBIT',
      credit: value.type === 'CREDIT'
    })
  }
  return result
}, [])
