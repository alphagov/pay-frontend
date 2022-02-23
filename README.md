# pay-frontend
GOV.UK Pay Frontend application (Node.js)

## Running locally

### Prerequisites

* This requires the [Pay CLI](https://github.com/alphagov/pay-infra/tree/master/cli), which is not publicly available at present.
* You have [set up your local development environment](https://pay-team-manual.cloudapps.digital/manual/setup-local-dev-environment.html)
* Clone this repo locally.

### Starting app

Copy `.env.example` and rename to `.env`. This contains the environment variables required to run the app, and contains the URLs for other microservices that frontend makes requests to, which default to the URLs that apps run using pay local are available on.

Start the Pay local environment 

```
pay local launch --cluster card
```

Start frontend

```
npm install && npm run compile
npm run start:dev
```

Make a create payment request to the locally running Public API app, and visit the `next_url` with the host changed to http://localhost:3000.

### Debug using Visual Studio Code

* In VSCode, go to the `Debug` view (on MacOS, use shortcut `CMD + shift + D`).
* From the **Run** toolbar, select tne launch config `Frontend`.
* Add breakpoints to any file you want to debug - click in the left hand column and a red dot will appear.
* Press The `green play` button (`F5` MacOS):
    * This will run the app in debug mode.
    * Uses `nodemon` so it will automatically restart on code changes.

### Watching for changes

You shouldn’t need to restart the app to see changes you make.

We use [nodemon](https://github.com/remy/nodemon) which watches for changes to files and restarts the node process.

If you’re making changes to client-side JS or Sass files (anything within [`/assets/`](app/assets/)) then running `npm run watch-live-reload` will watch for changes and recompile. Nodemon does not do anything here as that’s not necessary. If you install the [livereload browser plugin](http://livereload.com/extensions/) then it will refresh your page once the assets have been compiled to the `/public` folder.

## Running tests

### To run mocha tests
```
npm run compile && npm test
```
### Debug tests using Visual Studio Code

#### IMPORTANT NOTE - some tests do not work in debug mode
* Some integration tests do not work in debug mode.  This is because the tests are dependent on other tests running before hand.
* Nevertheless, it is still useful to debug tests that do work in debug mode.

#### Run tests in debug mode
* In VSCode, go to the `Debug` view (on MacOS, use shortcut `CMD + shift + D`).
* From the **Run** toolbar, select the launch config you want to run:
  * `Mocha All` - runs all tests.
  * `Mocha Current File` - only run currently open test file.
* Add breakpoints to any file you want to debug - click in the left hand column and a red dot will appear.
* Press The `green play` button or `F5`.

### To run cypress tests

Run in two separate terminals:
1. `npm run cypress:server`

    _This runs both the Cypress server and Mountebank which is the virtualisation server used for stubbing out external API calls._

2. Either:
- `npm run cypress:test` to run headless 
- `npm run cypress:test-headed` to run headed

## Key environment variables

| variable                                 | required   | default value                                                   | Description                                                                                                                                           |
| :--------------------------------------- | :--------: | :-------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                   | X          | 9200                                                            | The port number for the express server to be bound at runtime                                                                                         |
| `SESSION_ENCRYPTION_KEY`                 | X          |                                                                 | key to be used by the cookie encryption algorithm. Should be a large unguessable string ([More Info](https://www.npmjs.com/package/client-sessions)). |
| `CONNECTOR_TOKEN_URL`                    | X          |                                                                 | The connector endpoint to use when validating the one time token.                                                                                     |
| `ANALYTICS_TRACKING_ID`                  | X          |                                                                 | Tracking ID to be used by 'Google-Analytics'.                                                                                                         |
| `SECURE_COOKIE_OFF`                      |            | false/undefined                                                 | To switch off generating secure cookies. Set this to `true` only if you are running self service in a `non HTTPS` environment.                        |
| `NODE_WORKER_COUNT`                      |            | 1                                                               | The number of worker threads started by node cluster when run in production mode                                                                      |
| `WORLDPAY_3DS_FLEX_DDC_TEST_URL`         | X          | `https://secure-test.worldpay.com/shopper/3ds/ddc.html`         | URL for Device Data Collection (DDC) initiation in TEST                                                                                               |
| `WORLDPAY_3DS_FLEX_DDC_LIVE_URL`         | X          |                                                                 | URL for Device Data Collection (DDC) initiation in LIVE                                                                                               |
| `WORLDPAY_3DS_FLEX_CHALLENGE_TEST_URL`   | X          | `https://secure-test.worldpay.com/shopper/3ds/challenge.html`   | Pointing to Worldpay's TEST 3ds flex challenge URL.                                                                                                   |
| `WORLDPAY_3DS_FLEX_CHALLENGE_LIVE_URL`   | X          | `https://centinelapi.cardinalcommerce.com/V2/Cruise/StepUp`     | Pointing to Worldpay's LIVE 3ds flex challenge URL.                                                                                                   |
| `CSP_SEND_HEADER`                        |            | false/undefined                                                 | Apply card payment contest security policy headers.                                                                                                   |
| `CSP_ENFORCE`                            |            | false/undefined                                                 | Browser will block content security policy violations if set to true, default is to only report on violations.                                        |
| `CSP_REPORT_URI`                         |            |                                                                 | URI to receive CSP violation reports.                                                                                                                 |
| `GOOGLE_PAY_MERCHANT_ID`                 |            |                                                                 | Merchant ID used to identify GOV.UK Pay to Google when making a payment request. This ID is got from the Google Pay Developer Profile.                |
| `GOOGLE_PAY_MERCHANT_ID_2`               |            |                                                                 | The same as GOOGLE_PAY_MERCHANT_ID, but used to rotate to a new merchant id in a safe way.                                                            |

## Licence

[MIT License](LICENSE)

## Vulnerability Disclosure

GOV.UK Pay aims to stay secure for everyone. If you are a security researcher and have discovered a security vulnerability in this code, we appreciate your help in disclosing it to us in a responsible manner. Please refer to our [vulnerability disclosure policy](https://www.gov.uk/help/report-vulnerability) and our [security.txt](https://vdp.cabinetoffice.gov.uk/.well-known/security.txt) file for details.

