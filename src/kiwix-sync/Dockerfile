FROM node:20-alpine
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

RUN apk add --no-cache docker-cli curl

WORKDIR  /app
RUN npm install -g pnpm

COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm i --prod

COPY index.js .

ENV NODE_ENV=production
ENV CFG_ORDER=desc
ENV CFG_EXPIRES=8760
ENV CFG_OUTPUT=/out/wiki.zim
CMD ["node", "index.js"]
