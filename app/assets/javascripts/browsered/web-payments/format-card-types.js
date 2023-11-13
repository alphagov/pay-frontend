'use strict'

module.exports = (allowedCardTypes, wallet) => {
  if (!allowedCardTypes) {
    return []
  }

  // eslint-disable-next-line array-callback-return
  const availableNetworks = allowedCardTypes.map(type => {
    if (type.debit || type.credit) {
      return type.brand
    }
  })

  let filteredAvailableNetworks = availableNetworks
    .filter(brand => brand !== 'diners-club')
    .filter(brand => brand !== 'unionpay')

  if (wallet === 'google') {
    filteredAvailableNetworks = filteredAvailableNetworks.filter(brand => brand !== 'maestro')
  }

  if (wallet === 'apple' && filteredAvailableNetworks.includes('visa')) {
    filteredAvailableNetworks.push('electron')
  }

  return filteredAvailableNetworks
    .map(brand => {
      let formattedBrand = brand
      if (brand === 'master-card') formattedBrand = 'masterCard'
      if (brand === 'american-express') formattedBrand = 'amex'
      return wallet === 'google' ? formattedBrand.toUpperCase() : formattedBrand
    })
}
