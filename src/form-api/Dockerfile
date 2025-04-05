FROM node:20-bookworm AS build

RUN npm install -g pnpm

WORKDIR  /app
COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm i

COPY . .
RUN pnpm build

FROM node:20-bookworm AS production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-liberation \
    ttf-wqy-zenhei \
    ttf-wqy-microhei

RUN npm install -g pnpm

COPY --from=build /app/dist .
COPY --from=build /app/package.json .
COPY --from=build /app/pnpm-lock.yaml .

RUN pnpm i --production

EXPOSE 3000
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
CMD ["node", "main.js"]
STOPSIGNAL SIGKILL
