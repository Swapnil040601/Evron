export class UpdateCameraStreamDefaults1764674000030 {
    name = "UpdateCameraStreamDefaults1764674000030";

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE cameras ALTER COLUMN ai_stream SET DEFAULT 'main'`);
        await queryRunner.query(`ALTER TABLE cameras ALTER COLUMN live_view_stream SET DEFAULT 'sub'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE cameras ALTER COLUMN ai_stream SET DEFAULT 'sub'`);
        await queryRunner.query(`ALTER TABLE cameras ALTER COLUMN live_view_stream SET DEFAULT 'main'`);
    }
}
