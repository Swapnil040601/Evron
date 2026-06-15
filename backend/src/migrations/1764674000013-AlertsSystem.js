export class AlertsSystem1764674000013 {
    name = "AlertsSystem1764674000013";

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS platform_alerts (
                id          SERIAL PRIMARY KEY,
                type        VARCHAR(50)  NOT NULL,
                severity    VARCHAR(20)  NOT NULL DEFAULT 'warning',
                message     TEXT         NOT NULL,
                camera_id   INTEGER REFERENCES cameras(id) ON DELETE SET NULL,
                user_id     INTEGER REFERENCES users(id)   ON DELETE SET NULL,
                data        JSONB,
                image_path  TEXT,
                is_read     BOOLEAN      NOT NULL DEFAULT false,
                created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_alerts_created ON platform_alerts (created_at DESC)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_alerts_unread  ON platform_alerts (is_read, created_at DESC)`);

        await queryRunner.query(`
            INSERT INTO settings (key, label, type, group_name, value, description) VALUES
            ('alert_webhook_url',   'Webhook URL',                     'text',    'Alerts', '', 'HTTP POST on critical events (Slack, Teams, custom)'),
            ('alert_on_violation',  'Alert on Secured Area Violation', 'boolean', 'Alerts', 'true',  'Send webhook + log unauthorized access'),
            ('alert_on_fire',       'Alert on Fire Detection',         'boolean', 'Alerts', 'true',  'Send webhook + log fire/smoke detection')
            ON CONFLICT (key) DO NOTHING
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS platform_alerts`);
    }
}
