FROM node:8.5.0

ENV PORT 9000
EXPOSE 9000

WORKDIR /app
ADD . /app

CMD npm start
