FROM php:7.4-apache

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
