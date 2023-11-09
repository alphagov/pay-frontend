module.exports = (lookUpStrings, targetString) => {
  return lookUpStrings.some(str => targetString.toLowerCase().includes(str.toLowerCase()))
}
