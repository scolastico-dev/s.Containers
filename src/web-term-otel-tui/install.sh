#!/bin/sh

ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  curl -L -o otel-tui.tar.gz https://github.com/ymtdzzz/otel-tui/releases/download/v0.4.1/otel-tui_Linux_x86_64.tar.gz
elif [ "$ARCH" = "aarch64" ]; then
  curl -L -o otel-tui.tar.gz https://github.com/ymtdzzz/otel-tui/releases/download/v0.4.1/otel-tui_Linux_arm64.tar.gz
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

tar -xzf otel-tui.tar.gz
rm otel-tui.tar.gz
