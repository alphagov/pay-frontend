FROM          node:0.10.40

ADD           . /app
WORKDIR       /app

ENV PORT      9000
EXPOSE        9000

RUN           npm install

CMD           npm rebuild node-sass && npm start
