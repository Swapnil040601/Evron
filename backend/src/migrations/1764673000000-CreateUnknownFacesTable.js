import { Table } from "typeorm";

export class CreateUnknownFacesTable1764673000000 {
    name = "CreateUnknownFacesTable1764673000000";

    async up(queryRunner) {
        await queryRunner.createTable(
            new Table({
                name: "unknown_faces",
                columns: [
                    {
                        name: "id",
                        type: "bigint",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "camera_id",
                        type: "bigint",
                    },
                    {
                        name: "embedding",
                        type: "vector",
                        length: 512
                    },
                    {
                        name: "image_path",
                        type: "text",
                    },
                    {
                        name: "first_seen",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "last_seen",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
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
        await queryRunner.dropTable("unknown_faces");
    }
}
