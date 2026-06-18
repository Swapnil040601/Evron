export class CreateExpenses1764674000035 {
  name = 'CreateExpenses1764674000035';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category        VARCHAR(100) NOT NULL,
        amount          DECIMAL(12,2) NOT NULL,
        currency        VARCHAR(10) DEFAULT 'INR',
        expense_date    DATE NOT NULL,
        description     TEXT,
        receipt_path    VARCHAR(500),
        status          VARCHAR(20) DEFAULT 'Pending',
        admin_note      TEXT,
        reviewed_by     INTEGER REFERENCES users(id),
        reviewed_at     TIMESTAMP,
        gps_walk_km     DECIMAL(10,3),
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS expenses`);
  }
}
