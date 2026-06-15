import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: "increment",
    },
    name: {
      type: String,
      length: 100,
    },
    code: {
      type: String,
      length: 20,
    },
    gender: {
      type: String,
      length: 20,
      nullable: true,
    },
    email: {
      type: String,
      length: 150,
      unique: true,
    },
    phone: {
      type: String,
      length: 20,
    },
    type: {
      type: String,
      length: 100,
      nullable: true,
    },
    department: {
      type: String,
      length: 100,
      nullable: true,
    },
    role: {
      type: String,
      length: 50,
      default: "User", // Database level default
    },
    status: {
      type: String,
      length: 20,
      default: "Active",
    },
    password: {
      type: String,
      length: 255,
      select: false, // Hides password from default queries
      nullable: true,
    },
    avatar: {
      type: String,
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
  },
});