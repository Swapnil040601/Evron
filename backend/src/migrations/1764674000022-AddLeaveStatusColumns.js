export class AddLeaveStatusColumns1764674000022 {
  name = "AddLeaveStatusColumns1764674000022";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE leave_applications
        ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'Approved',
        ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE leave_applications
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS approved_by,
        DROP COLUMN IF EXISTS approved_at
    `);
  }
}
