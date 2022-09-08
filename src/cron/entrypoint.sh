#!/bin/bash

if [ -n "$CRON_TZ" ]; then
  echo "Changing timezone to $CRON_TZ"
  export TZ=$CRON_TZ
fi

if [ -n "$CRON_STARTUP" ]; then
  echo "$CRON_STARTUP" | while read -r line; do
    echo "Running: $line"
    eval "$line"
  done
fi

# load every env var beginning with "JOB_" and register it as a cron job
echo "Preparing cron..."
crontab -r > /dev/null 2>&1
rm /tmp/*.sh > /dev/null 2>&1
CRON_REGEX="^([^\r\n\t\f\v ]+ [^\r\n\t\f\v ]+ [^\r\n\t\f\v ]+ [^\r\n\t\f\v ]+ [^\r\n\t\f\v ]+) (([^ ]| )+)$"
for env_var in "${!JOB_@}"; do
  # validate and split the var with this regex: (?'cron'(?:.+? ){5})(?'command'[\s\S]+)
  # because bash doesn't support PCRE regex the $CRON_REGEX equivalent is used
  if [[ "${!env_var}" =~ $CRON_REGEX ]]; then
    CRON_STRING="${BASH_REMATCH[1]}"
    COMMAND="${BASH_REMATCH[2]}"
    echo "Creating stdout and stderr reroute script for: ${env_var}"
    cat << EOF > /tmp/${env_var}.sh
#!/bin/bash
echo "Starting job..."
${COMMAND}
echo "Finished job..."
EOF
    chmod +x /tmp/${env_var}.sh
    echo "Registering cron job for: ${env_var}"
    crontab -l | { cat; echo "${CRON_STRING} /bin/bash -c \"/tmp/${env_var}.sh > >(sed 's/^/[${env_var}] [stdout] /' > /proc/1/fd/1) 2> >(sed 's/^/[${env_var}] [stderr] /' > /proc/1/fd/2)\""; } | crontab -
  else
    echo "Invalid job: ${!env_var}"
  fi
done

echo "Starting cron..."
cron -f
