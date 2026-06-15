export class AddWorkDaysAndHolidays1764674000011 {
    name = "AddWorkDaysAndHolidays1764674000011";

    async up(queryRunner) {
        // work_days: array of ISO weekday numbers (1=Mon...7=Sun, matching ISODOW)
        await queryRunner.query(`
            ALTER TABLE shifts
            ADD COLUMN IF NOT EXISTS work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}'
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS holidays (
                id          SERIAL PRIMARY KEY,
                date        DATE NOT NULL,
                name        VARCHAR(200) NOT NULL,
                description TEXT,
                type        VARCHAR(50) NOT NULL DEFAULT 'National',
                created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT holidays_date_name_unique UNIQUE (date, name)
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays (date)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS holidays`);
        await queryRunner.query(`ALTER TABLE shifts DROP COLUMN IF EXISTS work_days`);
    }
}
