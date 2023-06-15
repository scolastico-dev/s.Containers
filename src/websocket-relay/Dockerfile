FROM node:18-alpine AS build
MAINTAINER Joschua Becker EDV <support@scolasti.co>

RUN npm install -g pnpm

WORKDIR  /app
COPY . .
RUN pnpm i
WORKDIR /app/src

ENTRYPOINT ["node"]
CMD ["client.js"]
STOPSIGNAL SIGKILL
