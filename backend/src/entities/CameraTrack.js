import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "CameraTrack",
  tableName: "camera_tracks",

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: "increment",
    },

    track_uid: {
      type: String,
      length: 36,
      unique: true,
    },

    camera_id: {
      type: Number,
    },

    user_id: {
      type: Number,
      nullable: true,
    },

    unknown_face_id: {
      type: Number,
      nullable: true,
    },

    confidence: {
      type: "decimal",
      precision: 5,
      scale: 2,
      default: 0,
    },

    start_time: {
      type: "timestamp",
    },

    end_time: {
      type: "timestamp",
      nullable: true,
    },

    status: {
      type: String,
      length: 20,
      nullable: true,
    },

    image_path: {
      type: String,
      length: 100,
      nullable: true,
    },

    created_on: {
      type: "timestamp",
      createDate: true,
    },

    updated_on: {
      type: "timestamp",
      updateDate: true,
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
      onDelete: "CASCADE",
    },

    camera: {
      type: "many-to-one",
      target: "Camera",
      joinColumn: {
        name: "camera_id",
      },
      onDelete: "CASCADE",
    },

    inAttendances: {
      type: "one-to-many",
      target: "Attendance",
      inverseSide: "inCameraTrack",
    },

    outAttendances: {
      type: "one-to-many",
      target: "Attendance",
      inverseSide: "outCameraTrack",
    },
  },

  uniques: [
    {
      name: "UQ_track_uid",
      columns: ["track_uid"],
    },
    {
      name: "UQ_camera_id_track_uid",
      columns: ["camera_id", "track_uid"],
    },
  ],
});