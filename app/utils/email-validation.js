'use strict'

// require "punycode/" to avoid warning about using the deprecated core 'punycode' module
const punycode = require('punycode/')

// Regexes and validation taken from Notify's internal validation
// https://github.com/alphagov/notifications-utils
const hostnamePartRegex = /^(xn|[a-z0-9]+)(-?-[a-z0-9]+)*$/i
const tldPartRegex = /^([a-z]{2,63}|xn--([a-z0-9]+-)*[a-z0-9]+)$/i
const validLocalChars = 'a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~\\-'
const emailRegex = new RegExp(`^[${validLocalChars}]+@([^.@][^@\\s]+)$`)

function validateEmail (email) {
  if (!email || !(typeof email === 'string' || email instanceof String)) {
    return { valid: false }
  }
  email = email.trim()
  const match = emailRegex.exec(email)

  if (!match) {
    return { valid: false }
  }

  if (email.length > 320) {
    return { valid: false }
  }

  // don't allow consecutive periods in either part
  if (email.indexOf('..') !== -1) {
    return { valid: false }
  }

  const hostname = match[1]

  // Convert non-ASCII parts of a Unicode domain name to ASCII using punycode
  // e.g. punycode.toASCII('例え.テスト') == b'xn--r8jz45g.xn--zckzah'
  const asciiHostname = punycode.toASCII(hostname)

  const parts = asciiHostname.split('.')

  if (asciiHostname.length > 253 || parts.length < 2) {
    return { valid: false }
  }

  if (parts.some(part => !(part && part.length < 63 && hostnamePartRegex.exec(part)))) {
    return { valid: false }
  }

  // if the part after the last . is not a valid TLD then bail out
  if (!tldPartRegex.exec(parts[parts.length - 1])) {
    return { valid: false }
  }

  return {
    domain: hostname,
    valid: true
  }
}

module.exports = {
  validateEmail
}
