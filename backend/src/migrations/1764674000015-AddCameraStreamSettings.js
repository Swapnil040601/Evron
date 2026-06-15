export class AddCameraStreamSettings1764674000015 {
    name = "AddCameraStreamSettings1764674000015";

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS ai_detection BOOLEAN DEFAULT true`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS ai_stream VARCHAR(10) DEFAULT 'main'`);
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS live_view_stream VARCHAR(10) DEFAULT 'sub'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS live_view_stream`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS ai_stream`);
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS ai_detection`);
    }
}
