export class AddVehicleAccessControl1764674000031 {
  name = "AddVehicleAccessControl1764674000031";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE cameras
      ADD COLUMN IF NOT EXISTS enable_vehicle_access BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_access_events (
        id SERIAL PRIMARY KEY,
        camera_id INTEGER REFERENCES cameras(id) ON DELETE SET NULL,
        direction VARCHAR(20) NOT NULL DEFAULT 'unknown',
        plate_text VARCHAR(40),
        confidence NUMERIC(6,2),
        image_path TEXT,
        event_time TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_access_events_time ON vehicle_access_events(event_time DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_access_events_plate ON vehicle_access_events(plate_text)`);

    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
      ('enable_vehicle_access_control', 'Vehicle Access Control Module', 'boolean', 'Features', 'true', 'Enables vehicle entry/exit and license-plate detection workflows')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_access_events`);
    await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS enable_vehicle_access`);
    await queryRunner.query(`DELETE FROM settings WHERE key = 'enable_vehicle_access_control'`);
  }
}
