export class AddShiftOtCutoff1764674000026 {
  name = "AddShiftOtCutoff1764674000026";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE shifts
        ADD COLUMN IF NOT EXISTS ot_cutoff_time TIME NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE shifts DROP COLUMN IF EXISTS ot_cutoff_time`);
  }
}
