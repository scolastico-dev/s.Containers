# `s.containers/owa`

### [Back to index](../../README.md)

## Why?

Open Web Analytics is a free and open source web analytics software written in PHP and distributed
under the GNU General Public License version 2. It is designed to be a low resource footprint web
analytics solution that provides detailed statistics about website visitors.

## Example

```yml
version: "3"

x-restart: &restart
    restart: unless-stopped

services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/owa:latest
    <<: *restart
    depends_on:
      - db
      - cfg
    volumes:
      - cfg:/var/www/html/cfg/
    ports:
      - 8080:80
  db:
    image: mariadb:latest
    <<: *restart
    volumes:
      - db:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: owa
      MYSQL_USER: owa
      MYSQL_PASSWORD: owa
  cfg:
    image: ghcr.io/scolastico-dev/s.containers/compose-file-loader:latest
    restart: 'no'
    volumes:
      - cfg:/tmp/cfg
    environment:
      ORDER: DELETE
      FILE_DELETE_PATH: /tmp/cfg/owa-config.php
      FILE_DELETE_MODE: delete
      FILE_CONFIG_PATH: /tmp/cfg/owa-config.php
      FILE_CONFIG_CONTENT: |
        <?php
        define('OWA_DB_TYPE', 'mysql');
        define('OWA_DB_NAME', 'owa');
        define('OWA_DB_HOST', 'db');
        define('OWA_DB_USER', 'owa');
        define('OWA_DB_PORT', '3306');
        define('OWA_DB_PASSWORD', 'owa');
        define('OWA_NONCE_KEY', 'yournoncekeygoeshere');
        define('OWA_NONCE_SALT', 'yournoncesaltgoeshere');
        define('OWA_AUTH_KEY', 'yourauthkeygoeshere');
        define('OWA_AUTH_SALT', 'yourauthsaltgoeshere');
        define('OWA_PUBLIC_URL', 'http://domain/path/to/owa/');
        define('OWA_MAILER_HOST', 'your_smtp_host');
        define('OWA_MAILER_PORT', 465);
        define('OWA_MAILER_SMTP_SECURE', 'ssl');
        define('OWA_MAILER_USE_SMTP', true);
        define('OWA_MAILER_SMTP_AUTH', true);
        define('OWA_MAILER_USERNAME', 'your_smtp_username');
        define('OWA_MAILER_PASSWORD', 'your_smtp_password');
        define('OWA_MAILER_FROM_ADDRESS', 'owa@yourdomain.com');
        define('OWA_MAILER_FROM_NAME', 'OWA Server');
        //define('OWA_MAILER_OPTIONS', array(
        //    'ssl' => [
        //        'verify_peer' => true,
        //        'verify_depth' => 3,
        //        'allow_self_signed' => false,
        //    ],
        //));
        ?>

volumes:
  cfg:
  db:
```
