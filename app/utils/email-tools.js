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

mailcheck.defaultDomains = ['live.com', 'live.co.uk', 'live.com.au', 'gmail.com', 'gmail.co.uk', 'ymail.com', 'mail.com', 'hotmail.com']
mailcheck.defaultSecondLevelDomains = ['yahoo', 'outlook', 'hotmail']
mailcheck.defaultTopLevelDomains = [
  'com', 'ca', 'co.nz', 'co.uk', 'de', 'fr', 'it', 'ru', 'net', 'org', 'edu', 'gov', 'jp', 'nl', 'kr', 'se', 'eu', 'ie', 'im', 'co.il', 'us', 'at', 'be', 'dk', 'hk', 'es', 'gr', 'ch', 'no', 'cz', 'in', 'net', 'net.au', 'info', 'biz', 'mil', 'co.jp', 'sg', 'hu', 'uk', 'ac.uk', 'co.uk', 'gov.uk', 'judiciary.uk', 'ltd.uk', 'me.uk', 'mod.uk', 'net.uk', 'nhs.uk', 'nic.uk', 'org.uk', 'plc.uk', 'police.uk', 'sch.uk', 'ae', 'net.ae', 'pl', 'kw', 'co', 'aero', 'co.in', 'io', 'bz', 'bg', 'sk', 'sx', 'dm', 'bm', 'om', 'me', 'qa', 'coop', 'fm', 'cc', 'mc', 'my', 'vc'
]
mailcheck.domainThreshold = 2
mailcheck.secondLevelThreshold = 2
mailcheck.topLevelThreshold = 1

module.exports = {
  validEmail,
  commonTypos: email => mailcheck.run({ email })
}
