FROM ghcr.io/scolastico-dev/s.containers/web-term-wrapper:latest

RUN apk add --no-cache curl ncurses
COPY ./install.sh /install.sh
RUN chmod +x /install.sh

WORKDIR /app/cli
RUN /install.sh

ENV COMMAND="/app/cli/otel-tui"
