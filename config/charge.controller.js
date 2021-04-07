const cardDataFields = require('./card_data_fields')

const nonCardDataFields = [
  'cardholderName',
  'addressLine1',
  'addressLine2',
  'addressCity',
  'addressPostcode',
  'addressCountry',
  'email'
]

module.exports = {
  views: {
    CHARGE_VIEW: 'charge',
    CONFIRM_VIEW: 'confirm',
    AUTH_WAITING_VIEW: 'auth_waiting',
    AUTH_3DS_REQUIRED_VIEW: 'auth_3ds_required',
    AUTH_3DS_REQUIRED_OUT_VIEW: 'auth_3ds_required_out',
    AUTH_3DS_REQUIRED_HTML_OUT_VIEW: 'auth_3ds_required_html_out',
    AUTH_3DS_REQUIRED_IN_VIEW: 'auth_3ds_required_in',
    CAPTURE_WAITING_VIEW: 'capture_waiting'
  },
  threeDsEPDQResults: {
    success: 'AUTHORISED',
    declined: 'DECLINED',
    error: 'ERROR'
  },
  preserveProperties: (flags) => flags.decryptAndOmitCardData ? [...nonCardDataFields] : [...cardDataFields, ...nonCardDataFields]
}
