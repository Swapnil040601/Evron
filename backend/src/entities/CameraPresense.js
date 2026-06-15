import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "CameraPresence",
  tableName: "camera_presences",

  columns: {
    id: {
      type: "bigint",
      primary: true,
      generated: "increment",
    },

    camera_id: {
      type: "bigint",
    },

    user_id: {
      type: "bigint",
      nullable: true,
    },

    unknown_face_id: {
      type: "bigint",
      nullable: true,
    },

    start_time: {
      type: "timestamp",
    },

    end_time: {
      type: "timestamp",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 20,
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

  uniques: [
    {
      name: "UQ_user_id_start_time",
      columns: ["user_id", "start_time"],
    },
  ],

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
      },
      onDelete: "CASCADE",
    },
  },
});