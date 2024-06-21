        if (defined('OWA_MAILER_HOST')) {
            $this->set('base', 'mailer-host', OWA_MAILER_HOST);
        }
        if (defined('OWA_MAILER_PORT')) {
            $this->set('base', 'mailer-port', OWA_MAILER_PORT);
        }
        if (defined('OWA_MAILER_USE_SMTP')) {
            $this->set('base', 'mailer-use-smtp', OWA_MAILER_USE_SMTP);
        }
        if (defined('OWA_MAILER_SMTP_AUTH')) {
            $this->set('base', 'mailer-smtpAuth', OWA_MAILER_SMTP_AUTH);
        }
        if (defined('OWA_MAILER_USERNAME')) {
            $this->set('base', 'mailer-username', OWA_MAILER_USERNAME);
        }
        if (defined('OWA_MAILER_PASSWORD')) {
            $this->set('base', 'mailer-password', OWA_MAILER_PASSWORD);
        }
        if (defined('OWA_MAILER_FROM_ADDRESS')) {
            $this->set('base', 'mailer-from', OWA_MAILER_FROM_ADDRESS);
        }
        if (defined('OWA_MAILER_FROM_NAME')) {
            $this->set('base', 'mailer-fromName', OWA_MAILER_FROM_NAME);
        }
        if (defined('OWA_MAILER_OPTIONS')) {
            $this->set('base', 'mailer-options', OWA_MAILER_OPTIONS);
        }
