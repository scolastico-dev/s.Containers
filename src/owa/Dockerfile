FROM php:7.4-apache
MAINTAINER Joschua Becker EDV <support@scolasti.co>

RUN apt-get update && \
    apt-get install -y wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

ARG OWA_VERSION
ENV OWA_VERSION ${OWA_VERSION}

RUN wget https://github.com/Open-Web-Analytics/Open-Web-Analytics/releases/download/${OWA_VERSION}/owa_${OWA_VERSION}_packaged.tar && \
    tar -xvf owa_${OWA_VERSION}_packaged.tar && \
    rm owa_${OWA_VERSION}_packaged.tar && \
    chown -R www-data:www-data ./* && \
    chmod -R 755 ./*

RUN a2enmod rewrite
RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

RUN sed -i 's/ErrorLog .*/ErrorLog \/proc\/self\/fd\/2/' /etc/apache2/apache2.conf && \
    sed -i 's/LogLevel .*/LogLevel info/' /etc/apache2/apache2.conf && \
    echo 'ServerSignature Off\nServerTokens Prod' >> /etc/apache2/apache2.conf && \
    a2enmod headers && \
    { \
      echo 'log_errors = On'; \
      echo 'error_log = /proc/self/fd/2'; \
      echo 'error_reporting = E_ERROR | E_PARSE'; \
      echo 'display_errors = Off'; \
    } > /usr/local/etc/php/conf.d/docker-php-errors.ini

COPY mail.php /mail.php
RUN sed -i '/function applyConfigConstants() {/r /mail.php' /var/www/html/modules/base/classes/settings.php
RUN rm /mail.php

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

LABEL OWA_VERSION=${OWA_VERSION}
CMD ["/entrypoint.sh"]
