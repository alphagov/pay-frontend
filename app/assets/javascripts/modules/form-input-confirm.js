'use strict'

module.exports = () => {
  const inputs = document.querySelectorAll('[data-confirmation]')

  inputs.forEach(input => {
    input.addEventListener('input', confirmInput, false)
  })

  function confirmInput (e) {
    const input = e.target
    const value = input.value
    const confirmationId = `${input.id}-confirmation`
    const confirmationPrepend = input.dataset.confirmationPrepend || ''
    let confirmation = document.getElementById(confirmationId)

    if (!confirmation) {
      confirmation = document.createElement('div')
      confirmation.innerHTML = `
      <div id="${confirmationId}" class="form-group panel panel-border-wide input-confirm">
        <p class="form-hint">
          ${input.dataset.confirmationLabel}<span class="input-confirmation"></span>
        </p>
      </div>`
      input.closest('.form-group').after(confirmation)
    }

    if (value === '') {
      confirmation.remove()
    } else {
      document
        .querySelector(`#${confirmationId} .input-confirmation`)
        .innerText = confirmationPrepend + value
    }
  }
}
