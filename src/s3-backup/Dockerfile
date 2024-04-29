FROM node:20-alpine AS build
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

RUN npm install -g pnpm
RUN apk add --no-cache tar docker-cli

WORKDIR  /app
COPY index.js .
COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i --prod

EXPOSE 3000
CMD ["node", "index.js"]
STOPSIGNAL SIGKILL
