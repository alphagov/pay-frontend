'use strict'

module.exports = (allowedCardTypes, provider) => {
  if (!allowedCardTypes) {
    return []
  }

  const availableNetworks = allowedCardTypes.reduce((brands, type) => {
    if (type.debit || type.credit) brands.push(type.brand)
    return brands
  }, [])

  let filteredAvailableNetworks = availableNetworks
    .filter(brand => brand !== 'diners-club')
    .filter(brand => brand !== 'unionpay')

  if (provider === 'google') {
    filteredAvailableNetworks = filteredAvailableNetworks.filter(brand => brand !== 'maestro')
  }

  if (provider === 'apple' && filteredAvailableNetworks.includes('visa')) {
    filteredAvailableNetworks.push('electron')
  }

  return filteredAvailableNetworks
    .map(brand => {
      let formattedBrand = brand
      if (brand === 'master-card') formattedBrand = 'masterCard'
      if (brand === 'american-express') formattedBrand = 'amex'
      return provider === 'google' ? formattedBrand.toUpperCase() : formattedBrand
    })
}
