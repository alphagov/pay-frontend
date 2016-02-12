# pay-frontend
GOV.UK Pay Frontend application (Node.js)

## Running in Development Mode

Steps are as follows:

1. Use a docker-compose environment to run everything (such as database) that you don't want to develop on right now.
2. Stop `pay-frontend` in the docker (`docker stop pay-frontend`), to get ready to run from your checked out copy instead.
3. Because our journeys expect frontend to be accessible to the browser on dockerhost (not localhost), run the redirect script to send these requests to localhost.
4. Use `env.sh` to pick up the same environment variables from `pay-scripts`, so configuration is set correctly, including telling the service here how to communicate with other services that may be running in docker or on your local machine. (This assumes `$WORKSPACE/pay-scripts` exists)

For example:

```
$ ./redirect.sh start
$ ./env.sh npm start
...
(pay-frontend log output)
...
(press CTRL+C to stop service)
...
$ ./redirect.sh stop
```

## Key environment variables

| variable                    | required | default value | Description                               |
| --------------------------- |:--------:|:-------------:| ----------------------------------------- |
| PORT                        | X | 9200 | The port number for the express server to be bound at runtime |
| SESSION_ENCRYPTION_KEY      | X |      | key to be used by the cookie encryption algorithm. Should be a large unguessable string ([More Info](https://www.npmjs.com/package/client-sessions)).  |
| CONNECTOR_TOKEN_URL         | X |      | The connector endpoint to use when validating the one time token. |
| ANALYTICS_TRACKING_ID       | X |      | Tracking ID to be used by 'Google-Analytics'. |
| SECURE_COOKIE_OFF           |   | false/undefined | To switch off generating secure cookies. Set this to `true` only if you are running self service in a `non HTTPS` environment. |