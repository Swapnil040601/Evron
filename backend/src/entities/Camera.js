import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Camera",
  tableName: "cameras",
  columns: {
    id: { type: Number, primary: true, generated: "increment" },
    name: { type: String, length: 150 },
    url: { type: String, length: 255, nullable: true },
    url2: { type: String, length: 255, nullable: true },
    nvr_id: { type: Number, nullable: true },
    channel: { type: Number, nullable: true },
    camera_type: { type: String, length: 50, nullable: true, default: "work_area" },
    description: { type: "text", nullable: true },
    location: { type: String, length: 200, nullable: true },
    is_restricted: { type: String, length: 10, nullable: true },
    enable_attendance: { type: Boolean, default: true },
    enable_phone_detection: { type: Boolean, default: true },
    enable_fire_detection: { type: Boolean, default: false },
    enable_vehicle_access: { type: Boolean, default: false },
    is_secured: { type: Boolean, default: false },
    ai_detection: { type: Boolean, default: true },
    ai_stream: { type: String, length: 10, default: "main", nullable: true },
    live_view_stream: { type: String, length: 10, default: "sub", nullable: true },
    status: { type: String, length: 20 },
    created_at: { type: "timestamp", createDate: true },
    created_by: { type: Number, nullable: true },
  },
});
