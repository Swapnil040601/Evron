export class AddAvatarToUsers1764674000014 {
    name = "AddAvatarToUsers1764674000014";

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS avatar`);
    }
}
