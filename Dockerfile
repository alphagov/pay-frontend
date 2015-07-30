FROM          node:0.10.40

ADD           . /app
WORKDIR       /app

RUN           npm install
ENV PORT      9000
EXPOSE        9000

CMD           npm rebuild node-sass && npm start
