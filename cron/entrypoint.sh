#!/bin/bash

if [ -n "$CRON_TZ" ]; then
  echo "Changing timezone to $CRON_TZ"
  export TZ=$CRON_TZ
fi

if [ -n "$CRON_STARTUP" ]; then
  echo "Running CRON_STARTUP: $CRON_STARTUP"
  $CRON_STARTUP
fi

# load every env var beginning with "JOB_" and register it as a cron job
echo "Preparing cron..."
crontab -r
for env_var in "${!JOB_@}"; do
  echo "Registering cron job: ${!env_var}"
  crontab -l | { cat; echo "${!env_var}"; } | crontab -
done

echo "Starting cron..."
cron -f
