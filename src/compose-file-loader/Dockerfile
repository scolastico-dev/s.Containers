FROM node:18-alpine
MAINTAINER Joschua Becker EDV <support@scolasti.co>

WORKDIR  /app
COPY . /app

RUN apk add --no-cache unzip tar

ENV NODE_ENV=production
ENV SLEEP_AFTER=10000
CMD ["node", "index.js"]
