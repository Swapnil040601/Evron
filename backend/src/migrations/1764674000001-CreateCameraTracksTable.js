import { Table } from "typeorm";

export class CreateCameraTracksTable1764674000001 {
    name = "CreateCameraTracksTable1764674000001";

    async up(queryRunner) {
        await queryRunner.createTable(
            new Table({
                name: "camera_tracks",
                columns: [
                    {
                        name: "id",
                        type: "bigint",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "track_uid",
                        type: "varchar",
                        length: "36",
                        isNullable: true,
                    },
                    {
                        name: "camera_id",
                        type: "bigint",
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
                        length: "100",
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
                        name: "UQ_track_uid",
                        columnNames: ["track_uid"],
                    },
                    {
                        name: "UQ_camera_id_track_uid",
                        columnNames: ["camera_id", "track_uid"],
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["user_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "users",
                        onDelete: "CASCADE",
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["camera_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "cameras",
                        onDelete: "CASCADE",
                    },
                ],
            }),
            true
        );
    }

    async down(queryRunner) {
        await queryRunner.dropTable("camera_tracks");
    }
}
