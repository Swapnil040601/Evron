export class AddPhoneTrackingToCameraSessions1764674000007 {
    name = "AddPhoneTrackingToCameraSessions1764674000007";

    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE camera_sessions
            ADD COLUMN IF NOT EXISTS phone_seen_count INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_frame_count INT NOT NULL DEFAULT 0
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE camera_sessions
            DROP COLUMN IF EXISTS phone_seen_count,
            DROP COLUMN IF EXISTS total_frame_count
        `);
    }
}
