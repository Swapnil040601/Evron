export class AddShifts1764674000010 {
    name = "AddShifts1764674000010";

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS shifts (
                id           SERIAL PRIMARY KEY,
                name         VARCHAR(100) NOT NULL,
                start_time   TIME NOT NULL,
                end_time     TIME NOT NULL,
                break_start  TIME,
                break_end    TIME,
                grace_minutes INT NOT NULL DEFAULT 10,
                status       VARCHAR(20) NOT NULL DEFAULT 'Active',
                created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS user_shifts (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                shift_id   INTEGER NOT NULL REFERENCES shifts(id),
                from_date  DATE NOT NULL,
                to_date    DATE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT user_shifts_active_unique UNIQUE (user_id, from_date)
            )
        `);

        // Insert a default shift
        await queryRunner.query(`
            INSERT INTO shifts (name, start_time, end_time, break_start, break_end, grace_minutes)
            VALUES ('General Shift', '09:00', '18:00', '13:00', '14:00', 10)
            ON CONFLICT DO NOTHING
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS user_shifts`);
        await queryRunner.query(`DROP TABLE IF EXISTS shifts`);
    }
}
