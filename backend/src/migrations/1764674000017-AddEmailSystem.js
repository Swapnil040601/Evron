export class AddEmailSystem1764674000017 {
  name = "AddEmailSystem1764674000017";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id              SERIAL PRIMARY KEY,
        type            VARCHAR(50)  NOT NULL DEFAULT 'person_report',
        recipient_email VARCHAR(255),
        recipient_name  VARCHAR(255),
        subject         VARCHAR(500),
        user_id         INT REFERENCES users(id) ON DELETE SET NULL,
        status          VARCHAR(20)  NOT NULL DEFAULT 'sent',
        error_message   TEXT,
        report_from     DATE,
        report_to       DATE,
        sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
        ('smtp_host',       'SMTP Host',           'text',     'Email', '',          'Mail server hostname (e.g. smtp.gmail.com)'),
        ('smtp_port',       'SMTP Port',           'text',     'Email', '587',       'Use 587 for TLS (recommended), 465 for SSL, 25 for plain'),
        ('smtp_user',       'Username',            'text',     'Email', '',          'Login email or username for the mail account'),
        ('smtp_pass',       'Password',            'password', 'Email', '',          'Account password or app-specific password'),
        ('smtp_from_name',  'From Name',           'text',     'Email', 'AI Vision', 'Sender name shown in the recipient''s email client'),
        ('smtp_from_email', 'From Email',          'text',     'Email', '',          'From address (leave blank to use username)'),
        ('smtp_secure',     'Use SSL (port 465)',  'boolean',  'Email', 'false',     'Enable for port 465 SSL. Leave off for port 587 TLS')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS email_logs`);
    await queryRunner.query(`DELETE FROM settings WHERE group_name = 'Email'`);
  }
}
