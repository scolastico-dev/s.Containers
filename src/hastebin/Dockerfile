# Original from https://github.com/jacklei/hastebin/blob/master/Dockerfile
MAINTAINER Joschua Becker EDV <support@scolasti.co>

FROM node:18-alpine AS build
WORKDIR /app
RUN apk add --no-cache git && \
    git clone https://github.com/toptal/haste-server.git /app && \
    npm install && \
    npm install aws-sdk

FROM node:18-alpine
WORKDIR  /app
COPY --from=build /app .
COPY ./entrypoint.sh .
RUN chmod 755 entrypoint.sh

EXPOSE 7777
ENV STORAGE_TYPE file
CMD [ "./entrypoint.sh" ]
