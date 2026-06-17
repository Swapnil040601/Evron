export class CreateLocationLogs1764674000033 {
  name = "CreateLocationLogs1764674000033";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS location_logs (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        latitude     DOUBLE PRECISION NOT NULL,
        longitude    DOUBLE PRECISION NOT NULL,
        accuracy     DOUBLE PRECISION,
        walk_dist_m  DOUBLE PRECISION DEFAULT 0,
        wifi_ssid    VARCHAR(100),
        network_type VARCHAR(50),
        last_app     VARCHAR(200),
        is_dev_mode  BOOLEAN DEFAULT false,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_user
      ON location_logs(user_id, created_at DESC)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS location_logs`);
  }
}