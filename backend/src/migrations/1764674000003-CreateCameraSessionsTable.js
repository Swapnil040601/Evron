import { Table } from "typeorm";

export class CreateCameraSessionsTable1764674000003 {
    name = "CreateCameraSessionsTable1764674000003";

    async up(queryRunner) {
        await queryRunner.createTable(
            new Table({
                name: "camera_sessions",
                columns: [
                    {
                        name: "id",
                        type: "bigint",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "session_uid",
                        type: "varchar",
                        length: "36",
                        isNullable: false,
                    },
                    {
                        name: "camera_id",
                        type: "bigint",
                        isNullable: false,
                    },
                    {
                        name: "user_id",
                        type: "bigint",
                        isNullable: true,
                    },
                    {
                        name: "unknown_face_id",
                        type: "bigint",
                        isNullable: true,
                    },
                    {
                        name: "confidence",
                        type: "decimal",
                        precision: 5,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: "start_time",
                        type: "timestamp",
                        isNullable: false,
                    },
                    {
                        name: "end_time",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                        isNullable: true,
                    },
                    {
                        name: "image_path",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "created_on",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_on",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
                uniques: [
                    {
                        name: "UQ_camera_sessions_session_uid",
                        columnNames: ["session_uid"],
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["camera_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "cameras",
                        onDelete: "CASCADE",
                    },
                    {
                        columnNames: ["user_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "users",
                        onDelete: "CASCADE",
                    },
                    // add this later only if unknown_faces table exists
                    // {
                    //     columnNames: ["unknown_face_id"],
                    //     referencedColumnNames: ["id"],
                    //     referencedTableName: "unknown_faces",
                    //     onDelete: "SET NULL",
                    // },
                ],
            }),
            true
        );
    }

    async down(queryRunner) {
        await queryRunner.dropTable("camera_sessions");
    }
}
