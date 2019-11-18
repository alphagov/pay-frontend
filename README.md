# pay-frontend
GOV.UK Pay Frontend application (Node.js)

## Key environment variables

| variable                               | required |                         default value                         | Description                                                                                                                                           |
|:---------------------------------------|:--------:|:-------------------------------------------------------------:|:------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PORT`                                 |    X     |                             9200                              | The port number for the express server to be bound at runtime                                                                                         |
| `SESSION_ENCRYPTION_KEY`               |    X     |                                                               | key to be used by the cookie encryption algorithm. Should be a large unguessable string ([More Info](https://www.npmjs.com/package/client-sessions)). |
| `CONNECTOR_TOKEN_URL`                  |    X     |                                                               | The connector endpoint to use when validating the one time token.                                                                                     |
| `ANALYTICS_TRACKING_ID`                |    X     |                                                               | Tracking ID to be used by 'Google-Analytics'.                                                                                                         |
| `SECURE_COOKIE_OFF`                    |          |                        false/undefined                        | To switch off generating secure cookies. Set this to `true` only if you are running self service in a `non HTTPS` environment.                        |
| `NODE_WORKER_COUNT`                    |          |                               1                               | The number of worker threads started by node cluster when run in production mode                                                                      |
| `WORLDPAY_3DS_FLEX_DDC_TEST_URL`       |    X     |    `https://secure-test.worldpay.com/shopper/3ds/ddc.html`    | URL for Device Data Collection (DDC) initiation in TEST                                                                                               |
| `WORLDPAY_3DS_FLEX_DDC_LIVE_URL`       |    X     |                                                               | URL for Device Data Collection (DDC) initiation in LIVE                                                                                               |
| `WORLDPAY_3DS_FLEX_CHALLENGE_TEST_URL` |    X     | `https://secure-test.worldpay.com/shopper/3ds/challenge.html` | Pointing to Worldpay's TEST 3ds flex challenge URL.                                                                                                   |
| `WORLDPAY_3DS_FLEX_CHALLENGE_LIVE_URL` |    X     |  `https://centinelapi.cardinalcommerce.com/V2/Cruise/StepUp`  | Pointing to Worldpay's LIVE 3ds flex challenge URL.                                                                                                   |
| `CSP_SEND_HEADER`                     |          | false/undefined                                               | Apply card payment contest security policy headers.                                                                                                   |
| `CSP_ENFORCE`               |          | false/undefined                                               | Browser will block content security policy violations if set to true, default is to only report on violations.                                        |
| `CSP_REPORT_URI`                       |          |                                                               | URI to receive CSP violation reports.                                                                                                                 |

## Licence

[MIT License](LICENSE)

## Responsible Disclosure

GOV.UK Pay aims to stay secure for everyone. If you are a security researcher and have discovered a security vulnerability in this code, we appreciate your help in disclosing it to us in a responsible manner. We will give appropriate credit to those reporting confirmed issues. Please e-mail gds-team-pay-security@digital.cabinet-office.gov.uk with details of any issue you find, we aim to reply quickly.
