import { Table } from "typeorm";

export class CreateUserFacesTable1764672000000 {
    name = "CreateUserFacesTable1764672000000";

    async up(queryRunner) {
        await queryRunner.createTable(
            new Table({
                name: "user_faces",
                columns: [
                    {
                        name: "id",
                        type: "bigint",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "user_id",
                        type: "bigint",
                    },
                    {
                        name: "embedding",
                        type: "vector",
                        length: 512
                    },
                    {
                        name: "pose",
                        type: "varchar",
                        length: "50",
                    },
                    {
                        name: "image_path",
                        type: "text",
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
                uniques: [
                    {
                        name: "UQ_user_face_user_pose_id",
                        columnNames: ["user_id", "pose"],
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
            }),
            true
        );
    }

    async down(queryRunner) {
        await queryRunner.dropTable("user_faces");
    }
}
