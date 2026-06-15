import { EntitySchema, Unique } from "typeorm";

export default new EntitySchema({
  name: "UnknownFace",
  tableName: "unknown_faces",

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: "increment",
    },

    camera_id: {
      type: Number,
    },

    embedding: {
      type: "jsonb",
    },
    image_path: {
      type: "text",
    },
    first_seen: {
      type: "timestamp",
      createDate: true,
    },
    last_seen: {
      type: "timestamp",
      createDate: true,
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
