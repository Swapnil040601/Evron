export class AddNVRSettings1764674000023 {
  name = "AddNVRSettings1764674000023";

  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description)
      VALUES
        ('nvr_endpoint',          'NVR Endpoint',          'text',     'NVR', '', 'Base URL of the NVR device, e.g. http://192.168.1.100:8080'),
        ('nvr_username',          'NVR Username',          'text',     'NVR', '', 'Login username for the NVR'),
        ('nvr_password',          'NVR Password',          'password', 'NVR', '', 'Login password for the NVR'),
        ('nvr_playback_endpoint', 'Playback Endpoint',     'text',     'NVR', '', 'URL used to retrieve playback streams from the NVR'),
        ('nvr_health_endpoint',   'Health Endpoint',       'text',     'NVR', '', 'URL used to check if the NVR is reachable, e.g. http://192.168.1.100:8080/health')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM settings
      WHERE key IN ('nvr_endpoint','nvr_username','nvr_password','nvr_playback_endpoint','nvr_health_endpoint')
    `);
  }
}
