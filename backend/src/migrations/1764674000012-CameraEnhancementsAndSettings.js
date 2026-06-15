export class CameraEnhancementsAndSettings1764674000012 {
    name = "CameraEnhancementsAndSettings1764674000012";

    async up(queryRunner) {
        // ── Camera extra fields ──────────────────────────────────────────────
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS description TEXT`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS location VARCHAR(200)`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS enable_attendance  BOOLEAN NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS enable_phone_detection BOOLEAN NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS enable_fire_detection  BOOLEAN NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS is_secured BOOLEAN NOT NULL DEFAULT false`);

        // ── Secured area: allowed users per camera ───────────────────────────
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS camera_allowed_users (
                id         SERIAL PRIMARY KEY,
                camera_id  INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
                user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT camera_allowed_users_unique UNIQUE (camera_id, user_id)
            )
        `);

        // ── Secured area violation log ───────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS secured_area_violations (
                id                  SERIAL PRIMARY KEY,
                camera_id           INTEGER NOT NULL REFERENCES cameras(id),
                user_id             INTEGER REFERENCES users(id),
                unknown_face_id     INTEGER,
                camera_session_id   INTEGER,
                detected_at         TIMESTAMP NOT NULL DEFAULT NOW(),
                image_path          TEXT,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT secured_violations_session_unique UNIQUE (camera_session_id)
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_secured_violations_camera ON secured_area_violations (camera_id, detected_at DESC)`);

        // ── Company & AI settings ────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id          SERIAL PRIMARY KEY,
                key         VARCHAR(100) NOT NULL UNIQUE,
                value       TEXT,
                label       VARCHAR(200) NOT NULL,
                type        VARCHAR(50)  NOT NULL DEFAULT 'text',
                group_name  VARCHAR(100) NOT NULL DEFAULT 'General',
                description TEXT,
                options     JSONB,
                updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await queryRunner.query(`
            INSERT INTO settings (key, label, type, group_name, value, description, options) VALUES
            ('company_name',           'Company Name',                    'text',    'Company',    '',              'Name shown in reports', NULL),
            ('company_address',        'Address',                         'text',    'Company',    '',              'Company address', NULL),
            ('timezone',               'Timezone',                        'text',    'Company',    'Asia/Kolkata',  'e.g. Asia/Kolkata, UTC', NULL),
            ('enable_attendance',      'Attendance Tracking',             'boolean', 'Features',   'true',          'Track login/logout from camera detections', NULL),
            ('enable_phone_detection', 'Mobile Usage Detection',          'boolean', 'Features',   'true',          'Detect employees using phones', NULL),
            ('enable_fire_detection',  'Fire Detection',                  'boolean', 'Features',   'false',         'Detect fire or smoke in camera feeds', NULL),
            ('enable_secured_area',    'Secured Area Entry Tracking',     'boolean', 'Features',   'false',         'Log unauthorized access to secured cameras', NULL),
            ('ai_run_mode',            'AI Run Mode',                     'select',  'AI Config',  'cpu',           'cpu = fastest, balanced, quality = most accurate',
             '[{"value":"cpu","label":"CPU"},{"value":"balanced","label":"Balanced"},{"value":"quality","label":"Quality"}]'::jsonb),
            ('ai_yolo_model',          'YOLO Detection Model',            'select',  'AI Config',  'yolov8n.pt',    'Smaller = faster, larger = more accurate',
             '[{"value":"yolov8n.pt","label":"YOLOv8n (fastest)"},{"value":"yolov8s.pt","label":"YOLOv8s (balanced)"},{"value":"yolov8m.pt","label":"YOLOv8m (accurate)"},{"value":"yolov8l.pt","label":"YOLOv8l (high accuracy)"}]'::jsonb)
            ON CONFLICT (key) DO NOTHING
        `);

        await queryRunner.query(`
            UPDATE settings
            SET options = '[{"value":"cpu","label":"CPU"},{"value":"balanced","label":"Balanced"},{"value":"quality","label":"Quality"}]'::jsonb
            WHERE key = 'ai_run_mode' AND options IS NULL
        `);

        await queryRunner.query(`
            UPDATE settings
            SET options = '[{"value":"yolov8n.pt","label":"YOLOv8n (fastest)"},{"value":"yolov8s.pt","label":"YOLOv8s (balanced)"},{"value":"yolov8m.pt","label":"YOLOv8m (accurate)"},{"value":"yolov8l.pt","label":"YOLOv8l (high accuracy)"}]'::jsonb
            WHERE key = 'ai_yolo_model' AND options IS NULL
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS settings`);
        await queryRunner.query(`DROP TABLE IF EXISTS secured_area_violations`);
        await queryRunner.query(`DROP TABLE IF EXISTS camera_allowed_users`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS is_secured`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS enable_fire_detection`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS enable_phone_detection`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS enable_attendance`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS location`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS description`);
    }
}
