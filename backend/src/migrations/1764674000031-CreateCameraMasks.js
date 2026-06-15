export class CreateCameraMasks1764674000031 {
  name = "CreateCameraMasks1764674000031";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS camera_masks (
        id          SERIAL PRIMARY KEY,
        camera_id   INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
        name        VARCHAR(100) NOT NULL,
        type        VARCHAR(50)  NOT NULL DEFAULT 'LIVE STREAMING',
        tool        VARCHAR(20)  NOT NULL DEFAULT 'rectangle',
        coordinates JSONB        NOT NULL,
        created_at  TIMESTAMP    DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_camera_masks_camera ON camera_masks(camera_id)`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS camera_masks`);
  }
}
