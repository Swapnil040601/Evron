export class RemoveLegacyNVRSettings1764674000029 {
  name = "RemoveLegacyNVRSettings1764674000029";

  async up(queryRunner) {
    await queryRunner.query(`
      DELETE FROM settings
      WHERE key IN (
        'nvr_endpoint',
        'nvr_username',
        'nvr_password',
        'nvr_playback_endpoint',
        'nvr_health_endpoint',
        'enable_nvr_monitoring'
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
      ('enable_nvr_monitoring', 'NVR Monitoring Module', 'boolean', 'Features', 'true', 'Enables NVR management and NVR camera setup')
      ON CONFLICT (key) DO NOTHING
    `);
  }
}
