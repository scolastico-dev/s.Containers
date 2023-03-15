FROM node:18-alpine
MAINTAINER Joschua Becker EDV <support@scolasti.co>

WORKDIR  /app
COPY . /app
RUN npm install -g pnpm && \
    pnpm i

ENV NODE_ENV=production
CMD ["node", "index.js"]
