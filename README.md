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
