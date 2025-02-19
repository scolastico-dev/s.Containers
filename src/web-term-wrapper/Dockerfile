FROM node:20-alpine AS build

RUN npm install -g pnpm

COPY ui /app/
WORKDIR /app
RUN pnpm install
RUN pnpm build

###

FROM node:20-alpine AS production
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm install
COPY --from=build /app/dist /app/ui/dist/
COPY server.mjs /app/

ENV NODE_ENV=production
ENTRYPOINT [ "node", "/app/server.mjs" ]
STOPSIGNAL SIGKILL
