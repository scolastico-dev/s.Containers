FROM node:24-bookworm AS build
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    xdg-utils \
    wget \
    chromium \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm install -g pnpm
COPY package.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
RUN pnpm install

COPY . .
RUN pnpm build
RUN pnpm prune --prod

EXPOSE 3000
ENV NODE_ENV=production
STOPSIGNAL SIGKILL
CMD ["node", "dist/src/main.js"]
