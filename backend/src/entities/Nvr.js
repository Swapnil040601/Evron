import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Nvr",
  tableName: "nvrs",
  columns: {
    id:         { type: Number,  primary: true, generated: "increment" },
    name:       { type: String,  length: 150 },
    brand:      { type: String,  length: 20, default: "cpplus" },
    ip:         { type: String,  length: 100 },
    port:       { type: Number,  default: 554 },
    username:   { type: String,  length: 100, default: "" },
    password:   { type: String,  length: 255, default: "" },
    created_at: { type: "timestamp", createDate: true },
  },
});
