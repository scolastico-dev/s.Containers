#!/bin/sh
# Original from https://github.com/jacklei/hastebin/blob/master/app.sh

# get persistent documents
if [[ -d "$DOCUMENTS_PATH" ]]; then
  for file in "$DOCUMENTS_PATH"/*; do
    if [[ -f $file ]]; then
      filename=$(basename $file)
      DOCUMENTS="${DOCUMENTS:+$DOCUMENTS, }\"$filename\": \"$file\""
    fi
  done
fi
# q: command to generate a tmp file and get the name of it as env
# a:

# write config file from environment vars
cat > config.js <<EOF
{
  "host": "${HOST:-0.0.0.0}",
  "port": ${PORT:-7777},
  "keyLength": ${KEY_LENGTH:-10},
  "maxLength": ${MAX_LENGTH:-400000},
  "staticMaxAge": ${STATIC_MAX_AGE:-86400},
  "recompressStaticAssets": ${RECOMPRESS_STATIC_ASSETS:-true},
  "logging": [
    {
      "level": "${LOGGING_LEVEL:-verbose}",
      "type": "${LOGGING_TYPE:-Console}",
      "colorize": ${LOGGING_COLORIZE:-false}
    }
  ],
  "keyGenerator": {
    "type": "${KEY_GENERATOR_TYPE:-phonetic}"
  },
  "storage": {
    "type": "${STORAGE_TYPE:-redis}",
    "path": "${STORAGE_PATH:-./data}",
    "host": "${STORAGE_HOST:-0.0.0.0}",
    "port": ${STORAGE_PORT:-6379},
    "db": ${STORAGE_DB:-2},
    "expire": ${STORAGE_EXPIRE:-2592000}
  },
  "documents": {
    ${DOCUMENTS}
  }
}
EOF

exec /usr/local/bin/node ./server.js
