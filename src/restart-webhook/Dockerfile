FROM node:18-alpine AS build
MAINTAINER Joschua Becker EDV <support@scolasti.co>

RUN npm install -g pnpm
RUN apk add --no-cache docker

WORKDIR  /app
COPY index.js .
COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i

ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
STOPSIGNAL SIGKILL
