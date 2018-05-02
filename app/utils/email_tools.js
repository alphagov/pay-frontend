'use strict'

// NPM dependencies
const mailcheck = require('mailcheck')

/* Uses Regexes from the rfc822-validate library.
   We use rfc822-validate in our email validation
   so this follows that standard. */

const sQtext = '[^\\x0d\\x22\\x5c\\x80-\\xff]'
const sDtext = '[^\\x0d\\x5b-\\x5d\\x80-\\xff]'
const sAtom = '[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+'
const sQuotedPair = '\\x5c[\\x00-\\x7f]'
const sDomainLiteral = '\\x5b(' + sDtext + '|' + sQuotedPair + ')*\\x5d'
const sQuotedString = '\\x22(' + sQtext + '|' + sQuotedPair + ')*\\x22'
const sSubDomain = '(' + sAtom + '|' + sDomainLiteral + ')'
const sWord = '(' + sAtom + '|' + sQuotedString + ')'
const sDomain = sSubDomain + '(\\x2e' + sSubDomain + ')*'
const sLocalPart = sWord + '(\\x2e' + sWord + ')*'
const sAddrSpec = '(' + sLocalPart + ')' + '\\x40' + '(' + sDomain + ')' // complete RFC822 email address spec
const sValidEmail = '^' + sAddrSpec + '$' // as whole string
const reValidEmail = new RegExp(sValidEmail)

const validEmail = email => {
  const match = reValidEmail.exec(email)
  return {
    'local-part': match !== null ? match[1] : false,
    'domain': match !== null ? match[7] : false
  }
}

const commonTypos = email => {
  return mailcheck.run({
    email
  })
}

module.exports = {
  validEmail,
  commonTypos
}
