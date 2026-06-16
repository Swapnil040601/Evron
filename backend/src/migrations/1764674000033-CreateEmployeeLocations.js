export class CreateEmployeeLocations1764674000033 {
  name = 'CreateEmployeeLocations1764674000033';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        latitude DECIMAL(10,8) NOT NULL DEFAULT 0,
        longitude DECIMAL(11,8) NOT NULL DEFAULT 0,
        accuracy FLOAT,
        wifi_ssid VARCHAR(255),
        network_type VARCHAR(50),
        is_developer_mode BOOLEAN DEFAULT FALSE,
        walk_distance_m FLOAT DEFAULT 0,
        last_app VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT employee_locations_user_id_unique UNIQUE (user_id),
        CONSTRAINT employee_locations_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_locations_user_id ON employee_locations(user_id);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS employee_locations`);
  }
}
