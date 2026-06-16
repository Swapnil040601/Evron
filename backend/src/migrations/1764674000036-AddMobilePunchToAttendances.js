export class AddMobilePunchToAttendances1764674000036 {
  name = "AddMobilePunchToAttendances1764674000036";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE attendances
        ADD COLUMN IF NOT EXISTS mobile_punch_in   TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS mobile_punch_out  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS punch_in_lat      DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS punch_in_lng      DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS punch_out_lat     DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS punch_out_lng     DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS punch_in_wifi     VARCHAR(100)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE attendances
        DROP COLUMN IF EXISTS mobile_punch_in,
        DROP COLUMN IF EXISTS mobile_punch_out,
        DROP COLUMN IF EXISTS punch_in_lat,
        DROP COLUMN IF EXISTS punch_in_lng,
        DROP COLUMN IF EXISTS punch_out_lat,
        DROP COLUMN IF EXISTS punch_out_lng,
        DROP COLUMN IF EXISTS punch_in_wifi
    `);
  }
}
