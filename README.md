# pay-frontend
GOV.UK Pay Frontend application (Node.js)

## Key environment variables

| variable                    | required | default value | Description                               |
| --------------------------- |:--------:|:-------------:| ----------------------------------------- |
| PORT                        | X | 9200 | The port number for the express server to be bound at runtime |
| SESSION_ENCRYPTION_KEY      | X |      | key to be used by the cookie encryption algorithm. Should be a large unguessable string ([More Info](https://www.npmjs.com/package/client-sessions)).  |
| CONNECTOR_TOKEN_URL         | X |      | The connector endpoint to use when validating the one time token. |
| ANALYTICS_TRACKING_ID       | X |      | Tracking ID to be used by 'Google-Analytics'. |
| SECURE_COOKIE_OFF           |   | false/undefined | To switch off generating secure cookies. Set this to `true` only if you are running self service in a `non HTTPS` environment. |
| NODE_WORKER_COUNT           |   | 1 | The number of worker threads started by node cluster when run in production mode |

## Other environment variables

**This list is very incomplete:**

| variable                                 | required | default value | Description                                                                                             |
| ---------------------------------------- |:--------:|:-------------:| ------------------------------------------------------------------------------------------------------- |
| APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION |          |               | The domain validation text to serve at `/.well-known/apple-developer-merchantid-domain-association.txt` |

## Licence

[MIT License](LICENSE)

## Responsible Disclosure

GOV.UK Pay aims to stay secure for everyone. If you are a security researcher and have discovered a security vulnerability in this code, we appreciate your help in disclosing it to us in a responsible manner. We will give appropriate credit to those reporting confirmed issues. Please e-mail gds-team-pay-security@digital.cabinet-office.gov.uk with details of any issue you find, we aim to reply quickly.
