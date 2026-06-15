import { Table } from "typeorm";

export class CreateCamerasTable1764670000000 {
    name = 'CreateCamerasTable1764670000000'

    async up(queryRunner) {
        // 1. Create Table
        await queryRunner.createTable(
            new Table({
                name: "cameras",
                columns: [
                    {
                        name: "id",
                        type: "bigint",
                        unsigned: true,
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "150",
                    },
                    {
                        name: "url",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "is_restricted",
                        type: "varchar",
                        length: "10",
                        isNullable: true,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "created_by",
                        type: "bigint",
                        unsigned: true,
                        isNullable: true,
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_by",
                        type: "bigint",
                        unsigned: true,
                        isNullable: true,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["created_by"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "users",
                        onDelete: "SET NULL",
                    },
                    {
                        columnNames: ["updated_by"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "users",
                        onDelete: "SET NULL",
                    },
                ],
            }),
            true
        );
    }

    async down(queryRunner) {
        await queryRunner.dropTable("cameras");
    }
}