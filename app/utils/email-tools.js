'use strict'

const mailcheck = require('mailcheck')

mailcheck.defaultDomains = ['live.com', 'live.co.uk', 'live.com.au', 'gmail.com', 'gmail.co.uk', 'ymail.com', 'mail.com', 'hotmail.com']
mailcheck.defaultSecondLevelDomains = ['yahoo', 'outlook', 'hotmail']
mailcheck.defaultTopLevelDomains = [
  'com', 'ca', 'co.nz', 'co.uk', 'de', 'fr', 'it', 'ru', 'net', 'org', 'edu', 'gov', 'jp', 'nl', 'kr', 'se', 'eu', 'ie', 'im', 'co.il', 'us', 'at', 'be', 'dk', 'hk', 'es', 'gr', 'ch', 'no', 'cz', 'in', 'net', 'net.au', 'info', 'biz', 'mil', 'co.jp', 'sg', 'hu', 'uk', 'ac.uk', 'co.uk', 'gov.uk', 'judiciary.uk', 'ltd.uk', 'me.uk', 'mod.uk', 'net.uk', 'nhs.uk', 'nic.uk', 'org.uk', 'plc.uk', 'police.uk', 'sch.uk', 'ae', 'net.ae', 'pl', 'kw', 'co', 'aero', 'co.in', 'io', 'bz', 'bg', 'sk', 'sx', 'dm', 'bm', 'om', 'me', 'qa', 'coop', 'fm', 'cc', 'mc', 'my', 'vc'
]
mailcheck.domainThreshold = 2
mailcheck.secondLevelThreshold = 2
mailcheck.topLevelThreshold = 1

function commonTypos (email) {
  return mailcheck.run({ email })
}

module.exports = {
  commonTypos
}
