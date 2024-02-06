FROM node:20-alpine AS build
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

RUN npm install -g pnpm

WORKDIR  /app
COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i

COPY index.js .

EXPOSE 3000
CMD ["node", "index.js"]
STOPSIGNAL SIGKILL
