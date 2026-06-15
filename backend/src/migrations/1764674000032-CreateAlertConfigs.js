export class CreateAlertConfigs1764674000032 {
  name = "CreateAlertConfigs1764674000032";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alert_configs (
        id                    SERIAL PRIMARY KEY,
        name                  VARCHAR(100) NOT NULL,
        is_default            BOOLEAN      NOT NULL DEFAULT false,
        disk_warning_pct      INTEGER      NOT NULL DEFAULT 85,
        disk_critical_pct     INTEGER      NOT NULL DEFAULT 95,
        nvr_offline_delay_sec INTEGER      NOT NULL DEFAULT 60,
        cam_offline_delay_sec INTEGER      NOT NULL DEFAULT 120,
        email_enabled         BOOLEAN      NOT NULL DEFAULT false,
        email_nvr_offline     BOOLEAN      NOT NULL DEFAULT true,
        email_nvr_back_online BOOLEAN      NOT NULL DEFAULT false,
        email_disk_warning    BOOLEAN      NOT NULL DEFAULT true,
        email_disk_critical   BOOLEAN      NOT NULL DEFAULT true,
        email_disk_error      BOOLEAN      NOT NULL DEFAULT true,
        email_cam_offline     BOOLEAN      NOT NULL DEFAULT true,
        email_cam_online      BOOLEAN      NOT NULL DEFAULT false,
        created_at            TIMESTAMP    DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      INSERT INTO alert_configs (name, is_default)
      VALUES ('Default Configuration', true)
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS alert_configs`);
  }
}
