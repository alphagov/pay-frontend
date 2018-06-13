'use strict'

module.exports = [
  {
    valid: {
      address: 'your.name',
      domain: 'hotmail.com',
      full: 'your.name@hotmail.com'
    },
    invalid: [
      'your.name@hotmaiol.com',
      'your.name@hotmail.con',
      'your.name@hotmai.com',
      'your.name@homtail.com',
      'your.name@hitmail.com'
    ]
  },
  {
    valid: {
      address: 'your.name',
      domain: 'yahoo.com',
      full: 'your.name@yahoo.com'
    },
    invalid: [
      'your.name@yahoo.comb',
      'your.name@yhaoo.com',
      'your.name@hahoo.com'
    ]
  },
  {
    valid: {
      address: 'your.name',
      domain: 'outlook.com',
      full: 'your.name@outlook.com'
    },
    invalid: [
      'your.name@outloo.com',
      'your.name@outlokk.com'
    ]
  },
  {
    valid: {
      address: 'your.name',
      domain: 'gmail.com',
      full: 'your.name@gmail.com'
    },
    invalid: [
      'your.name@gmil.com',
      'your.name@gmail.om',
      'your.name@gmail.con',
      'your.name@gamil.com'
    ]
  }
]
