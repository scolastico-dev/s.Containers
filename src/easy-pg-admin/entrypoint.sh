#!/bin/sh

set -e

if [ -z "$SERVER_JSON" ]; then
  echo "SERVER_JSON is not set, using PG_HOST, PG_PORT, PG_USER..."
  if [ -z "$PG_HOST" ]; then
    echo "Error: PG_HOST is not set"
    exit 1
  fi
  if [ -z "$PG_PORT" ]; then
    echo "Error: PG_PORT is not set"
    exit 1
  fi
  if [ -z "$PG_USER" ]; then
    echo "Error: PG_USER is not set"
    exit 1
  fi
  if [ -z "$PG_PASSWORD" ]; then
    echo "Error: PG_PASSWORD is not set"
    exit 1
  fi
fi

if [ -n "$SERVER_JSON" ]; then
  echo "SERVER_JSON is set, using it..."
  echo "$SERVER_JSON" > /data/servers.json
else
  echo "Generating servers.json..."
  cat > /data/servers.json <<EOF
{
  "Servers": {
    "1": {
      "Name": "PostgreSQL",
      "Group": "Servers",
      "MaintenanceDB": "postgres",
      "Host": "$PG_HOST",
      "Port": $PG_PORT,
      "Username": "$PG_USER",
      "PasswordExecCommand": "echo '$PG_PASSWORD'",
      "Passfile": "/data/pgpass",
      "SSLMode": "prefer",
      "Shared": true,
      "SharedUsername": "admin@example.com"
    }
  }
}
EOF
fi

export PGADMIN_DEFAULT_EMAIL="admin@example.com"
export PGADMIN_DEFAULT_PASSWORD="admin"
export PGADMIN_DISABLE_POSTFIX="True"
export PGADMIN_CONFIG_SERVER_MODE="False"
export PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED="False"
export PGADMIN_SERVER_JSON_FILE="/data/servers.json"
export PGADMIN_REPLACE_SERVERS_ON_STARTUP="True"

exec /entrypoint.sh "$@"
