export class AddCanteenSettings1764674000019 {
  name = "AddCanteenSettings1764674000019";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS canteen_settings (
        id          SERIAL PRIMARY KEY,
        meal_type   VARCHAR(20) NOT NULL DEFAULT 'any',
        start_time  TIME NOT NULL,
        end_time    TIME NOT NULL,
        camera_id   INT REFERENCES cameras(id) ON DELETE SET NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS canteen_settings`);
  }
}
