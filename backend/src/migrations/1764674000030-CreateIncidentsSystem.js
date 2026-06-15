export class CreateIncidentsSystem1764674000030 {
  name = "CreateIncidentsSystem1764674000030";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incident_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(20) DEFAULT 'blue',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      INSERT INTO incident_categories (name, color) VALUES
        ('Motion Detection','blue'),('Video Loss','red'),('Tampering','orange'),
        ('Unauthorized Access','red'),('Equipment Failure','amber'),
        ('Network Issue','purple'),('Recording Failure','orange'),('Other','gray')
      ON CONFLICT (name) DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        incident_number VARCHAR(30) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        camera_ids JSONB DEFAULT '[]',
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        tagged_user_ids JSONB DEFAULT '[]',
        initial_comment TEXT,
        evidence_paths JSONB DEFAULT '[]',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_incidents_created  ON incidents(created_at DESC)`);
    await queryRunner.query(`
      INSERT INTO settings (key, value, type, group_name, label, description)
      VALUES
        ('alert_disk_warning_pct',      '85',  'number', 'Alerts', 'Disk Warning (%)',           'Generate warning alert when disk usage exceeds this percentage'),
        ('alert_disk_critical_pct',     '95',  'number', 'Alerts', 'Disk Critical (%)',          'Generate critical alert when disk usage exceeds this percentage'),
        ('alert_nvr_offline_delay_sec', '60',  'number', 'Alerts', 'NVR Offline Delay (sec)',    'Seconds after NVR goes offline before alert fires'),
        ('alert_cam_offline_delay_sec', '120', 'number', 'Alerts', 'Camera Offline Delay (sec)', 'Seconds after camera goes offline before alert fires')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS incidents`);
    await queryRunner.query(`DROP TABLE IF EXISTS incident_categories`);
    await queryRunner.query(`
      DELETE FROM settings WHERE key IN (
        'alert_disk_warning_pct','alert_disk_critical_pct',
        'alert_nvr_offline_delay_sec','alert_cam_offline_delay_sec'
      )
    `);
  }
}
