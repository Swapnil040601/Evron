export class AddCameraSubStreamUrl1764674000014 {
    name = "AddCameraSubStreamUrl1764674000014";

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE cameras ADD COLUMN IF NOT EXISTS url2 VARCHAR(255)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE cameras DROP COLUMN IF EXISTS url2`);
    }
}
