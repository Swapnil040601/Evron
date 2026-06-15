export class AddCameraTypeAndCanteenTokens1764674000009 {
    name = "AddCameraTypeAndCanteenTokens1764674000009";

    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE cameras
            ADD COLUMN IF NOT EXISTS camera_type VARCHAR(50) NOT NULL DEFAULT 'work_area'
        `);

        await queryRunner.query(`
            UPDATE cameras SET camera_type = 'server_room'
            WHERE is_restricted = 'yes' AND camera_type = 'work_area'
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS canteen_tokens (
                id                 SERIAL PRIMARY KEY,
                user_id            INTEGER NOT NULL REFERENCES users(id),
                camera_id          INTEGER REFERENCES cameras(id),
                camera_session_id  INTEGER REFERENCES camera_sessions(id),
                date               DATE NOT NULL,
                punched_at         TIMESTAMP NOT NULL,
                created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT canteen_tokens_user_date UNIQUE (user_id, date)
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_canteen_tokens_date ON canteen_tokens(date)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_canteen_tokens_user ON canteen_tokens(user_id)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS canteen_tokens`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS camera_type`);
    }
}
