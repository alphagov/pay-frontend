'use strict'

exports.key = length => {
  const buf = []
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; ++i) {
    buf.push(chars[exports.randomInt(0, chars.length - 1)])
  }

  return buf.join('')
}
exports.randomUuid = () => {
  // See:
  // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
exports.randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
