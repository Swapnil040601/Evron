import { Table } from "typeorm";

export class CreateUsersTable1764584989078 {
    name = 'CreateUsersTable1764584989078'

    async up(queryRunner) {
        await queryRunner.createTable(
            new Table({
                name: "users",
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
                        length: "100",
                    },
                    {
                        name: "code",
                        type: "varchar",
                        length: "30",
                    },
                    {
                        name: "gender",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "email",
                        type: "varchar",
                        length: "150",
                        isUnique: true,
                    },
                    {
                        name: "phone",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "type",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "department",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "role",
                        type: "varchar",
                        length: "50",
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "password",
                        type: "varchar",
                        length: "255",
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
        await queryRunner.dropTable("users");
    }
}