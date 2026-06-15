import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Attendance",
  tableName: "attendances",

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: "increment",
    },

    user_id: {
      type: Number,
      nullable: true,
    },

    date: {
      type: "date",
    },

    login_time: {
      type: "timestamp",
      nullable: true,
    },

    logout_time: {
      type: "timestamp",
      nullable: true,
    },

    in_camera_track_id: {
      type: Number,
      nullable: true,
    },

    out_camera_track_id: {
      type: Number,
      nullable: true,
    },

    working_hours: {
      type: "interval",
      nullable: true,
    },

    productive_hours: {
      type: "interval",
      nullable: true,
    },

    late_minutes: {
      type: Number,
      default: 0,
    },

    early_exit_minutes: {
      type: Number,
      default: 0,
    },

    overtime_minutes: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      length: 20,
    },

    remarks: {
      type: "text",
      nullable: true,
    },

    created_at: {
      type: "timestamp",
      createDate: true,
    },

    created_by: {
      type: Number,
      nullable: true,
    },

    updated_at: {
      type: "timestamp",
      updateDate: true,
    },

    updated_by: {
      type: Number,
      nullable: true,
    },
  },

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
      },
      nullable: true,
      onDelete: "SET NULL",
    },

    createdUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "created_by",
      },
      nullable: true,
      onDelete: "SET NULL",
    },

    updatedUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "updated_by",
      },
      nullable: true,
      onDelete: "SET NULL",
    },

    inCameraTrack: {
      type: "many-to-one",
      target: "CameraTrack",
      joinColumn: {
        name: "in_camera_track_id",
      },
      nullable: true,
      onDelete: "SET NULL",
    },

    outCameraTrack: {
      type: "many-to-one",
      target: "CameraTrack",
      joinColumn: {
        name: "out_camera_track_id",
      },
      nullable: true,
      onDelete: "SET NULL",
    },
  },
});