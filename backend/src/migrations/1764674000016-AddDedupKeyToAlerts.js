export class AddDedupKeyToAlerts1764674000016 {
  name = "AddDedupKeyToAlerts1764674000016";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE platform_alerts
        ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(100)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedup
        ON platform_alerts (dedup_key)
        WHERE dedup_key IS NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
        ('alert_on_late_arrival', 'Alert on Late Arrival',   'boolean', 'Alerts', 'true', 'Notify when an employee checks in after their shift start + grace period'),
        ('alert_on_absent',       'Alert on Absent Staff',   'boolean', 'Alerts', 'true', 'Notify when an employee has not checked in 2 hours after shift start'),
        ('alert_on_early_exit',   'Alert on Early Exit',     'boolean', 'Alerts', 'true', 'Notify when an employee leaves more than 5 min before shift end'),
        ('alert_on_overtime',     'Alert on Overtime',       'boolean', 'Alerts', 'true', 'Notify when an employee is still present 30+ min after shift end')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE platform_alerts DROP COLUMN IF EXISTS dedup_key`);
  }
}
