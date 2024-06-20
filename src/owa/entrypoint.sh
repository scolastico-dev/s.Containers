#!/bin/sh
sleep 5

if [ -f /var/www/html/cfg/owa-config.php ]; then
    cp /var/www/html/cfg/owa-config.php /var/www/html/owa-config.php
fi

exec apache2-foreground
