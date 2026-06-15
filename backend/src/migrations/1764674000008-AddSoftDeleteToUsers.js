export class AddSoftDeleteToUsers1764674000008 {
    name = "AddSoftDeleteToUsers1764674000008";

    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS deleted_at`);
    }
}
