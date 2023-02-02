FROM node:18-alpine
MAINTAINER Joschua Becker EDV <support@scolasti.co>

RUN apk add --no-cache zip
RUN apk add --no-cache curl

WORKDIR  /app
COPY . /app
RUN npm install -g pnpm && \
    pnpm i && \
    mkdir -p /from

ENV NODE_ENV=production
ENV UPLOAD_DIR=/from
CMD ["node", "index.mjs"]
