FROM node:24-alpine AS build
RUN npm install -g pnpm

WORKDIR  /app
COPY . /app
RUN pnpm install
RUN pnpm build

FROM node:24-alpine AS production
LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
RUN apk add --no-cache unzip tar

WORKDIR /app
COPY --from=build /app/dist /app/dist

ENV NODE_ENV=production
ENV SLEEP_AFTER=10000
CMD ["node", "dist/main.js"]
# CMD ["ls", "-la", "src"]
