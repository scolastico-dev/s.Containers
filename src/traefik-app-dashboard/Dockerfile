FROM node:20-alpine AS pnpm

RUN npm install -g pnpm


###

FROM pnpm AS build

COPY ui /app/
WORKDIR /app
RUN pnpm install
RUN pnpm build

###

FROM pnpm AS production
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

COPY package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install
COPY --from=build /app/dist /app/ui/dist/
COPY index.mjs /app/

ENV NODE_ENV=production
ENTRYPOINT [ "node", "index.mjs" ]
STOPSIGNAL SIGKILL
