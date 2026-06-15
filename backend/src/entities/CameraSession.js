import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "CameraSession",
  tableName: "camera_sessions",

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: "increment",
    },

    session_uid: {
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
      length: 255,
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

    // add later if you have unknown face table
    // unknownFace: {
    //   type: "many-to-one",
    //   target: "UnknownFace",
    //   joinColumn: {
    //     name: "unknown_face_id",
    //   },
    //   nullable: true,
    //   onDelete: "SET NULL",
    // },
  },

  uniques: [
    {
      name: "UQ_session_uid",
      columns: ["session_uid"],
    },
    {
      name: "UQ_camera_id_session_uid",
      columns: ["camera_id", "session_uid"],
    },
  ],
});