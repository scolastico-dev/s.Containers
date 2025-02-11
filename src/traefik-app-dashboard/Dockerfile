FROM node:20-alpine as pnpm

RUN npm install -g pnpm


###

FROM pnpm as build

COPY ui /app/
WORKDIR  /app
RUN pnpm install
RUN pnpm build


###

FROM pnpm as production
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

COPY package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install
COPY --from=build /app/dist /app/ui/dist

ENV NODE_ENV=production
ENTRYPOINT [ "node", "index.mjs" ]
