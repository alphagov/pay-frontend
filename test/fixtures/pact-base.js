const _ = require('lodash')
let Pact = require('pact')
let matchers = Pact.Matchers

module.exports = function (options = {}) {
  let pactifyArray = (arr) => {
    if (arr.length && arr[0].constructor === Object) {
      return pactifyNestedArray(arr)
    }
    return arr.map(matchers.somethingLike)
  }

  let pactifyNestedArray = (arr) => {
    return matchers.eachLike(pactify(arr[0]), { min: arr.length })
  }

  let pactify = (object) => {
    let pactified = {}
    _.forIn(object, (value, key) => {
      if (value === null) {
        pactified[key] = null
      } else if (options.array && options.array.indexOf(key) !== -1) {
        pactified[key] = matchers.eachLike(matchers.somethingLike(value[0]), { min: value.length })
      } else if (value.constructor === Array) {
        pactified[key] = pactifyArray(value)
      } else if (value.constructor === Object) {
        pactified[key] = pactify(value)
      } else {
        pactified[key] = matchers.somethingLike(value)
      }
    })
    return pactified
  }

  let withPactified = (payload) => {
    return {
      getPlain: () => payload,
      getPactified: () => pactify(payload)
    }
  }

  return {
    pactifyNestedArray: pactifyNestedArray,
    pactify: pactify,
    withPactified: withPactified
  }
}
