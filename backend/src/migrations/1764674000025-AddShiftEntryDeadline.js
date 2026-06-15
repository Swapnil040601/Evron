export class AddShiftEntryDeadline1764674000025 {
  name = "AddShiftEntryDeadline1764674000025";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE shifts
        ADD COLUMN IF NOT EXISTS entry_deadline TIME NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE shifts DROP COLUMN IF EXISTS entry_deadline`);
  }
}
