FROM node:18-alpine AS build
MAINTAINER Joschua Becker EDV <support@scolasti.co>

RUN npm install -g pnpm

WORKDIR  /app
COPY index.js .
COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i

EXPOSE 3000
CMD ["node", "index.js"]
STOPSIGNAL SIGKILL
