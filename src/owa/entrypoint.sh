#!/bin/sh
cp /var/www/html/cfg/owa-config.php /var/www/html/owa-config.php
exec apache2-foreground
