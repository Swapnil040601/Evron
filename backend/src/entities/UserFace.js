import { EntitySchema, Unique } from "typeorm";

export default new EntitySchema({
  name: "UserFace",
  tableName: "user_faces",

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: "increment",
    },

    user_id: {
      type: Number,
    },

    pose: {
      type: String,
      length: 50,
      nullable: true,
    },

    embedding: {
      type: "jsonb",
    },
    image_path: {
      type: String,
    },

    created_at: {
      type: "timestamp",
      createDate: true,
    },

    updated_at: {
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
      onDelete: "CASCADE",
    },
  },
});
