FROM dpage/pgadmin4:9

USER root

COPY entrypoint.sh /entrypoint-overwrite.sh
RUN chmod +x /entrypoint-overwrite.sh
RUN mkdir /data
RUN chown pgadmin:root /data

USER pgadmin

ENV PG_PORT=5432
ENV PG_USER=postgres
ENV PG_PASSWORD=postgres

LABEL maintainer="Joschua Becker EDV <support@scolasti.co>"
ENTRYPOINT ["/entrypoint-overwrite.sh"]
