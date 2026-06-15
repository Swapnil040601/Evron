import { Table } from "typeorm";

export class CreateAttendancesTable1764674000002 {
    name = "CreateAttendancesTable1764674000002";

    async up(queryRunner) {
        await queryRunner.createTable(
            new Table({
                name: "attendances",
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
                        isNullable: true,
                    },
                    {
                        name: "date",
                        type: "date",
                    },
                    {
                        name: "login_time",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "logout_time",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "in_camera_track_id",
                        type: "bigint",
                        isNullable: true,
                    },
                    {
                        name: "out_camera_track_id",
                        type: "bigint",
                        isNullable: true,
                    },
                    {
                        name: "working_hours",
                        type: "interval",
                        isNullable: true,
                    },
                    {
                        name: "productive_hours",
                        type: "interval",
                        isNullable: true,
                    },
                    {
                        name: "late_minutes",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "early_exit_minutes",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "overtime_minutes",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "remarks",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "created_by",
                        type: "bigint",
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
                        isNullable: true,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["user_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "users",
                        onDelete: "SET NULL",
                    },
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
                    {
                        columnNames: ["in_camera_track_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "camera_tracks",
                        onDelete: "SET NULL",
                    },
                    {
                        columnNames: ["out_camera_track_id"],
                        referencedColumnNames: ["id"],
                        referencedTableName: "camera_tracks",
                        onDelete: "SET NULL",
                    },
                ],
                uniques: [
                    {
                        name: "UQ_attendance_user_date",
                        columnNames: ["user_id", "date"],
                    },
                ],
                indices: [
                    {
                        name: "IDX_attendances_user_id",
                        columnNames: ["user_id"],
                    },
                    {
                        name: "IDX_attendances_date",
                        columnNames: ["date"],
                    },
                    {
                        name: "IDX_attendances_status",
                        columnNames: ["status"],
                    },
                ],
            }),
            true
        );
    }

    async down(queryRunner) {
        await queryRunner.dropTable("attendances");
    }
}