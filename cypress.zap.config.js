const { defineConfig } = require('cypress');

module.exports = defineConfig({
  viewportHeight: 800,
  viewportWidth: 1280,
  env: {
    TEST_SESSION_ENCRYPTION_KEY: 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk',
    MOUNTEBANK_URL: 'http://host.docker.internal:2525',
    MOUNTEBANK_IMPOSTERS_PORT: 8000,
    zapProxy: 'http://localhost:8080', // Your ZAP proxy URL
    HTTP_PROXY: 'http://localhost:8080',
    HTTPS_PROXY: 'http://localhost:8080',
    NO_PROXY: '', 
  },
  proxy: {
    "proxy": {
      "host": "localhost",
      "port": 8080
    }
  },
  fileServerFolder: './test/cypress',
  screenshotsFolder: './test/cypress/screenshots',
  videosFolder: './test/cypress/videos',
  video: false,
  e2e: {
    setupNodeEvents(on, config) {
      return require('./test/cypress/plugins')(on, config);
    },
    chromeWebSecurity: false,
    baseUrl: 'http://127.0.0.1:3000', // Ensure this points to your app
    specPattern: './test/cypress/integration/security/*',
    supportFile: './test/cypress/support',
    // Proxy settings for Cypress
    env: {
      HTTP_PROXY: 'http://localhost:8080',
      HTTPS_PROXY: 'http://localhost:8080',
      NO_PROXY: '', 
    },
    browser: 'chrome',
  },
});
