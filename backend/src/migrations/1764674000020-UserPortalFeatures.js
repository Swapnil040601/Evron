export class UserPortalFeatures1764674000020 {
  name = "UserPortalFeatures1764674000020";

  async up(queryRunner) {
    // ── Reporting manager on users ────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager_id INT REFERENCES users(id) ON DELETE SET NULL
    `);

    // ── Leave application status + approval tracking ──────────────────────────
    await queryRunner.query(`
      ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Approved'
    `);
    await queryRunner.query(`
      ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);
    // Existing admin-created leaves are already approved
    await queryRunner.query(`
      UPDATE leave_applications SET status = 'Approved' WHERE status IS NULL OR status = ''
    `);

    // ── Password reset tokens ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at    TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token)
    `);

    // ── New settings rows ─────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
        ('app_name',             'App Name',              'text',    'Company',  'AI Vision',      'Application name shown on login and sidebar'),
        ('app_tagline',          'App Tagline',           'text',    'Company',  'Business Suite', 'Tagline shown below the app name on login'),
        ('app_logo_url',         'App Logo URL',          'text',    'Company',  '',               'Full URL to the app logo image (leave blank to use letter icon)'),
        ('recaptcha_site_key',   'reCAPTCHA Site Key',    'text',    'Company',  '',               'Google reCAPTCHA v2 site key — leave blank to disable'),
        ('recaptcha_secret_key', 'reCAPTCHA Secret Key',  'text',    'Company',  '',               'Google reCAPTCHA v2 secret key used for server-side verification')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
    await queryRunner.query(`ALTER TABLE leave_applications DROP COLUMN IF EXISTS approved_at`);
    await queryRunner.query(`ALTER TABLE leave_applications DROP COLUMN IF EXISTS approved_by`);
    await queryRunner.query(`ALTER TABLE leave_applications DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS reporting_manager_id`);
  }
}
