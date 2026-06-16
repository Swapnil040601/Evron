export class AddAppOpensToLocations1764674000034 {
  name = 'AddAppOpensToLocations1764674000034';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE employee_locations
        ADD COLUMN IF NOT EXISTS other_app_opens INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS app_opens_detail JSONB DEFAULT '{}'::jsonb
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE employee_locations
        DROP COLUMN IF EXISTS other_app_opens,
        DROP COLUMN IF EXISTS app_opens_detail
    `);
  }
}
