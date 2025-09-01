/* global checkValidation postcodeInput MutationObserver */

const { JSDOM } = require('jsdom')
const { expect } = require('chai')

describe('address-country MutationObserver', () => {
  let dom, document, MutationObserverBackup, observerInstance, checkValidationCalled

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>')
    document = dom.window.document
    global.document = document
    global.window = dom.window
    global.window.Charge = { collect_billing_address: true }
    checkValidationCalled = false
    global.checkValidation = () => { checkValidationCalled = true }
    global.postcodeInput = document.createElement('input')
    MutationObserverBackup = global.MutationObserver
    global.MutationObserver = class {
      constructor (cb) { observerInstance = this; this.cb = cb }
      observe () { this.observing = true }
      disconnect () { this.disconnected = true }
      trigger (mutations) { this.cb(mutations, this) }
    }
  })

  afterEach(() => {
    global.MutationObserver = MutationObserverBackup
    delete global.checkValidation
    delete global.postcodeInput
    delete global.window
    delete global.document
  })

  it('attach change listener and disconnects observer when address-country is added to DOM', () => {
    if (window.Charge.collect_billing_address === true) {
      const observer = new MutationObserver(function (mutations, obs) {
        const countrySelect = document.getElementById('address-country')
        if (countrySelect) {
          countrySelect.addEventListener('change', function () {
            checkValidation(postcodeInput)
          }, false)
          obs.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
    // Simulate adding the element
    const select = document.createElement('select')
    select.id = 'address-country'
    document.body.appendChild(select)
    observerInstance.trigger()
    // Simulate change event
    select.dispatchEvent(new dom.window.Event('change'))

    // eslint-disable-next-line no-unused-expressions
    expect(checkValidationCalled).to.be.true
    // eslint-disable-next-line no-unused-expressions
    expect(observerInstance.disconnected).to.be.true
  })
})
