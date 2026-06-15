export class AddLeaveSystem1764674000018 {
  name = "AddLeaveSystem1764674000018";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_paid     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id              SERIAL PRIMARY KEY,
        user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type_id   INT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        year            INT NOT NULL,
        allocated       INT NOT NULL DEFAULT 0,
        used            INT NOT NULL DEFAULT 0,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, leave_type_id, year)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id              SERIAL PRIMARY KEY,
        user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type_id   INT REFERENCES leave_types(id) ON DELETE SET NULL,
        from_date       DATE NOT NULL,
        to_date         DATE NOT NULL,
        no_of_days      INT NOT NULL DEFAULT 1,
        reason          TEXT,
        is_lop          BOOLEAN NOT NULL DEFAULT FALSE,
        applied_by      INT REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leave_apps_user  ON leave_applications(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leave_apps_dates ON leave_applications(from_date, to_date)`);

    // Default leave types
    await queryRunner.query(`
      INSERT INTO leave_types (name, description, is_paid) VALUES
        ('Casual Leave',  'Short personal leave for unforeseen circumstances', TRUE),
        ('Sick Leave',    'Medical or health-related absence',                 TRUE),
        ('Earned Leave',  'Leave earned through service tenure',               TRUE),
        ('Loss of Pay',   'Unpaid leave deducted from salary',                 FALSE),
        ('Optional Leave','Festival or optional holiday leave',                TRUE)
      ON CONFLICT (name) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS leave_applications`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_balances`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_types`);
  }
}
