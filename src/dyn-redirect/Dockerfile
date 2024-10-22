FROM node:20-alpine
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"

WORKDIR  /app
RUN npm install -g pnpm

COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm i --prod

COPY index.js .

ENV NODE_ENV=production
ENV DATA_DIR=/data
CMD ["node", "index.js"]
STOPSIGNAL SIGKILL
