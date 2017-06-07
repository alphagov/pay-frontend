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
