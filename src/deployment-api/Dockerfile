FROM node:18-alpine AS build

WORKDIR /app
COPY . /app
RUN npm install -g pnpm && \
    pnpm i && \
    NODE_ENV=production pnpm build && \
    pnpm prune --prod

FROM node:18-bullseye
MAINTAINER Joschua Becker EDV <support@scolasti.co>

WORKDIR  /app
COPY --from=build /app/dist /app/
COPY --from=build /app/node_modules /app/node_modules

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", "main.js"]
