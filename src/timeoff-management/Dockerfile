FROM node:13-alpine AS build

WORKDIR /app
RUN apk add --no-cache git
RUN git clone https://github.com/timeoff-management/application.git src

WORKDIR /app/src
RUN npm install

WORKDIR /app
COPY entrypoint.mjs .

EXPOSE 3000
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
CMD ["node", "entrypoint.mjs"]
STOPSIGNAL SIGKILL
