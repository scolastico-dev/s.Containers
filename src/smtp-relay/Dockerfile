FROM node:20-alpine
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

WORKDIR  /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml /app/
RUN pnpm i
COPY index.mjs /app/

ENV NODE_ENV=production
ENTRYPOINT [ "node", "index.mjs" ]
