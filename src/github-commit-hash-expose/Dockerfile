FROM node:20-alpine AS build

RUN npm install -g pnpm
COPY package.json /app/
COPY pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install

COPY server.mjs /app/
ENV NODE_ENV=production
ENTRYPOINT [ "node", "/app/server.mjs" ]
STOPSIGNAL SIGKILL
