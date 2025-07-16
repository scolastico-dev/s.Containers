FROM node:24-alpine AS build
WORKDIR /app

RUN npm install -g pnpm
COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install

COPY . .
RUN pnpm build
RUN pnpm prune --prod



FROM node:24-alpine AS production
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
WORKDIR /app

COPY --from=build /app/dist .
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "main.js"]
