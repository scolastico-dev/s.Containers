FROM debian:bookworm
MAINTAINER Joschua Becker EDV <support@scolasti.co>

RUN apt-get update
RUN apt-get install -y cron
RUN apt-get clean

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/bin/bash"]
CMD ["/entrypoint.sh"]
