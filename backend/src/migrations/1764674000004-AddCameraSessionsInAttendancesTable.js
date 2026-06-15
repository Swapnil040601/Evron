import { TableColumn, TableForeignKey } from "typeorm";

export class AddCameraSessionsInAttendancesTable1764674000004 {
    name = "AddCameraSessionsInAttendancesTable1764674000004";

    async up(queryRunner) {
        const hasInColumn = await queryRunner.hasColumn("attendances", "in_camera_session_id");
        const hasOutColumn = await queryRunner.hasColumn("attendances", "out_camera_session_id");

        const columns = [];
        if (!hasInColumn) {
            columns.push(new TableColumn({
                name: "in_camera_session_id",
                type: "bigint",
                isNullable: true,
            }));
        }
        if (!hasOutColumn) {
            columns.push(new TableColumn({
                name: "out_camera_session_id",
                type: "bigint",
                isNullable: true,
            }));
        }

        if (columns.length) {
            await queryRunner.addColumns("attendances", columns);
        }

        const table = await queryRunner.getTable("attendances");
        const hasInFk = table.foreignKeys.some((fk) => fk.name === "FK_att_in_camera_session");
        const hasOutFk = table.foreignKeys.some((fk) => fk.name === "FK_att_out_camera_session");

        const foreignKeys = [];
        if (!hasInFk) {
            foreignKeys.push(new TableForeignKey({
                name: "FK_att_in_camera_session",
                columnNames: ["in_camera_session_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "camera_sessions",
                onDelete: "SET NULL",
            }));
        }
        if (!hasOutFk) {
            foreignKeys.push(new TableForeignKey({
                name: "FK_att_out_camera_session",
                columnNames: ["out_camera_session_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "camera_sessions",
                onDelete: "SET NULL",
            }));
        }

        if (foreignKeys.length) {
            await queryRunner.createForeignKeys("attendances", foreignKeys);
        }

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_attendances_in_session
            ON attendances(in_camera_session_id)
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_attendances_out_session
            ON attendances(out_camera_session_id)
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_attendances_in_session
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_attendances_out_session
        `);

        await queryRunner.dropForeignKey(
            "attendances",
            "FK_att_in_camera_session"
        );

        await queryRunner.dropForeignKey(
            "attendances",
            "FK_att_out_camera_session"
        );

        await queryRunner.dropColumns("attendances", [
            "in_camera_session_id",
            "out_camera_session_id",
        ]);
    }
}
