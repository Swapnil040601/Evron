export class CreateNVRsTable1764674000024 {
  name = "CreateNVRsTable1764674000024";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE nvrs (
        id       SERIAL PRIMARY KEY,
        name     VARCHAR(150) NOT NULL,
        brand    VARCHAR(20)  NOT NULL DEFAULT 'cpplus',
        ip       VARCHAR(100) NOT NULL,
        port     INTEGER      NOT NULL DEFAULT 554,
        username VARCHAR(100) NOT NULL DEFAULT '',
        password VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate existing single-NVR settings into the first row
    await queryRunner.query(`
      DO $$
      DECLARE
        v_endpoint TEXT;
        v_username TEXT;
        v_password TEXT;
        v_stripped TEXT;
        v_ip       TEXT;
        v_port     TEXT;
      BEGIN
        SELECT value INTO v_endpoint FROM settings WHERE key = 'nvr_endpoint'  AND value IS NOT NULL AND value != '';
        SELECT value INTO v_username FROM settings WHERE key = 'nvr_username'  AND value IS NOT NULL AND value != '';
        SELECT value INTO v_password FROM settings WHERE key = 'nvr_password';

        IF v_endpoint IS NOT NULL AND v_username IS NOT NULL THEN
          -- Strip protocol prefix (rtsp://, http://, etc.)
          v_stripped := regexp_replace(v_endpoint, '^[a-zA-Z]+://', '');
          -- Drop any path after the host:port
          v_stripped := split_part(v_stripped, '/', 1);
          v_ip       := split_part(v_stripped, ':', 1);
          v_port     := NULLIF(split_part(v_stripped, ':', 2), '');

          INSERT INTO nvrs (name, brand, ip, port, username, password)
          VALUES (
            'Main NVR',
            'cpplus',
            COALESCE(NULLIF(v_ip, ''), 'unconfigured'),
            COALESCE(v_port::INTEGER, 554),
            v_username,
            COALESCE(v_password, '')
          );
        END IF;
      END
      $$
    `);

    // Add nvr_id + channel to cameras; make url nullable
    await queryRunner.query(`
      ALTER TABLE cameras
        ADD COLUMN nvr_id  INTEGER REFERENCES nvrs(id) ON DELETE SET NULL,
        ADD COLUMN channel INTEGER
    `);

    await queryRunner.query(`ALTER TABLE cameras ALTER COLUMN url DROP NOT NULL`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE cameras ALTER COLUMN url SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS channel`);
    await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS nvr_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS nvrs`);
  }
}
