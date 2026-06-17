export class CreateLocationLogsAndDeviceId1764674000037 {
  name = 'CreateLocationLogsAndDeviceId1764674000037';

  async up(queryRunner) {
    // Add device_id to the latest-position table
    await queryRunner.query(`
      ALTER TABLE employee_locations
        ADD COLUMN IF NOT EXISTS device_id VARCHAR(64)
    `);

    // Full-history table — one row per ping (every 30 s from each device)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS location_logs (
        id                BIGSERIAL PRIMARY KEY,
        user_id           INTEGER NOT NULL,
        device_id         VARCHAR(64),
        latitude          DECIMAL(10,8) NOT NULL,
        longitude         DECIMAL(11,8) NOT NULL,
        accuracy          FLOAT,
        wifi_ssid         VARCHAR(255),
        network_type      VARCHAR(50),
        is_developer_mode BOOLEAN DEFAULT FALSE,
        walk_distance_m   FLOAT DEFAULT 0,
        other_app_opens   INTEGER DEFAULT 0,
        app_opens_detail  JSONB DEFAULT '{}'::jsonb,
        logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT location_logs_user_fk
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_user_id
        ON location_logs(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_logged_at
        ON location_logs(logged_at DESC)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS location_logs`);
    await queryRunner.query(`
      ALTER TABLE employee_locations DROP COLUMN IF EXISTS device_id
    `);
  }
}
