FROM node:18-alpine
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

RUN npm install -g pnpm

WORKDIR  /app
COPY package.json /app
COPY pnpm-lock.yaml /app
RUN pnpm i
COPY proxy.mjs /app

ENTRYPOINT ["node", "/app/proxy.mjs"]
STOPSIGNAL SIGKILL
EXPOSE 3000
