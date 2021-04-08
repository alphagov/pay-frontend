'use strict'

const { stubBuilder } = require('./stub-builder')

function worldpay3dsFlexDdcIframePost (sessionId, status) {
  const path = '/shopper/3ds/ddc.html'
  const response = `<!DOCTYPE html>
  <html>
  <head>
      <title>Cardinal DDC Sim</title>
  </head>
  <body>
  <script>
      sendNotification(${status}, "${sessionId}");
      function sendNotification(status, sessionId){
          try{
              var message = {
                  MessageType: 'profile.completed',
                  SessionId: sessionId,
                  Status: status
              };
              window.parent.postMessage(JSON.stringify(message), '*');
          } catch(error){
              console.error('Failed to notify parent', error)
          }
      }
  </script>
  </body>
  </html>`

  return stubBuilder('POST', path, 200, {
    response,
    responseHeaders: { 'Content-Type': 'text/html;charset=ISO-8859-1' }
  })
}

module.exports = {
  worldpay3dsFlexDdcIframePost
}
