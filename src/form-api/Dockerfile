FROM node:20-bookworm AS base

RUN npm install -g pnpm

RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-liberation \
    ttf-wqy-zenhei \
    ttf-wqy-microhei \
    libsdl-pango-dev

FROM base AS build

WORKDIR  /app
COPY package.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm i

COPY . .
RUN pnpm build

FROM base AS production
WORKDIR /app

COPY --from=build /app/dist .
COPY --from=build /app/package.json .
COPY --from=build /app/pnpm-workspace.yaml .
COPY --from=build /app/pnpm-lock.yaml .

RUN pnpm i --production

EXPOSE 3000
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
CMD ["node", "main.js"]
STOPSIGNAL SIGKILL
