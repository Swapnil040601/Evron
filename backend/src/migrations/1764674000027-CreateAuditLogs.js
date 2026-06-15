export class CreateAuditLogs1764674000027 {
  name = "CreateAuditLogs1764674000027";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id           SERIAL PRIMARY KEY,
        actor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        actor_name   VARCHAR(255),
        action       VARCHAR(100) NOT NULL,
        entity_type  VARCHAR(50),
        entity_id    VARCHAR(100),
        entity_name  VARCHAR(255),
        changes      JSONB,
        ip_address   VARCHAR(45),
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_logs (created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_actor      ON audit_logs (actor_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs (action)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs (entity_type, entity_id)`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
