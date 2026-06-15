export default {
  model: "Camera",

  label: {
    single: { en: "Camera" },
    plural: { en: "Cameras" },
  },

  description: { en: "Manage and monitor camera devices" },
  icon: "IconCamera",

  dashboard: [
    { label: { en: "Total Cameras" }, count: "sum",           color: "blue",  icon: "camera" },
    { label: { en: "Active" },         count: "status.Active", color: "green", icon: "check"  },
    { label: { en: "Inactive" },       count: "status.Inactive", color: "red", icon: "close"  },
  ],

  fields: [
    { name: "id",       label: { en: "ID" },                  type: "key",    rules: ["required"] },
    { name: "name",     label: { en: "Camera Name" },         type: "text",   rules: ["required", "max:150"] },
    {
      name: "nvr_id",
      label: { en: "NVR" },
      type: "select",
      options: "nvrs",
      hint: "Select an NVR to auto-generate stream URLs. Leave empty for direct-URL cameras.",
    },
    { name: "channel", label: { en: "NVR Channel" }, type: "text", rules: ["max:10"],
      hint: "Channel number on the NVR (e.g. 1, 2, 3). Required when NVR is selected." },
    { name: "url",      label: { en: "Main Stream URL (RTSP)" },  type: "text", rules: ["max:255"],
      hint: "Direct RTSP URL. Leave empty when camera is linked to an NVR." },
    { name: "url2",     label: { en: "Sub Stream URL (RTSP)" },   type: "text", rules: ["max:255"],
      hint: "Sub-stream URL for direct cameras. Falls back to main stream if empty." },
    {
      name: "camera_type",
      label: { en: "Camera Type" },
      type: "select",
      rules: ["required"],
      options: [
        { label: "Work Area",    value: "work_area"    },
        { label: "Corridor",     value: "corridor"     },
        { label: "Canteen",      value: "canteen"      },
        { label: "Server Room",  value: "server_room"  },
        { label: "Vehicle Entry", value: "vehicle_entry" },
        { label: "Vehicle Exit",  value: "vehicle_exit"  },
        { label: "Outside",      value: "outside"      },
        { label: "Reception",    value: "reception"    },
        { label: "Meeting Room", value: "meeting_room" },
        { label: "Other",        value: "other"        },
      ],
    },
    {
      name: "status",
      label: { en: "Status" },
      type: "select",
      rules: ["required"],
      options: [
        { label: "Active",   value: "Active"   },
        { label: "Inactive", value: "Inactive" },
      ],
    },
    { name: "enable_attendance",      label: { en: "Track Attendance" },     type: "boolean" },
    { name: "enable_phone_detection", label: { en: "Mobile Usage Detection"}, type: "boolean" },
    { name: "enable_fire_detection",  label: { en: "Fire Detection" },        type: "boolean" },
    { name: "enable_vehicle_access",  label: { en: "Vehicle Access Control" }, type: "boolean",
      hint: "Detect license plates for vehicle entry/exit cameras." },
    { name: "is_secured",             label: { en: "Restricted Area" },       type: "boolean",
      hint: "Only allowed users may enter. Others will be logged as violations." },
    { name: "allowed_user_ids",       label: { en: "Allowed Users" },         type: "allowed_users",
      showWhen: { field: "is_secured", value: true },
      hint: "Applies only when Restricted Area is enabled." },
    { name: "ai_detection",      label: { en: "AI Detection" },          type: "boolean",
      hint: "Enable or disable AI processing for this camera." },
    {
      name: "ai_stream",
      label: { en: "AI Uses Stream" },
      type: "select",
      options: [
        { label: "Main Stream (url)",  value: "main" },
        { label: "Sub Stream 1 (url2)", value: "sub" },
        { label: "Sub Stream 2 (NVR subtype 2)", value: "sub2" },
      ],
      hint: "Which stream the AI reads for detection and face recognition.",
    },
    {
      name: "live_view_stream",
      label: { en: "Live View Uses Stream" },
      type: "select",
      options: [
        { label: "Sub Stream 1 (url2)", value: "sub" },
        { label: "Sub Stream 2 (NVR subtype 2)", value: "sub2" },
        { label: "Main Stream (url)",  value: "main" },
      ],
      hint: "Which stream is shown in the Live View page.",
    },
    { name: "created_on", label: { en: "Created On" }, type: "datetime", readonly: true },
  ],

  forms: {
    list: {
      type: "index",
      fields: ["name", "camera_type", "status", "ai_detection"],
    },

    create: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "Camera Details" },
          cols: 2,
          fields: ["name", "camera_type", "status"],
        },
        {
          label: { en: "Connection" },
          cols: 2,
          fields: ["nvr_id", "channel", "url", "url2", "ai_stream", "live_view_stream"],
        },
        {
          label: { en: "AI & Monitoring" },
          cols: 2,
          fields: ["ai_detection", "enable_phone_detection", "enable_fire_detection", "enable_vehicle_access", "is_secured", "allowed_user_ids"],
        },
      ],
    },

    edit: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "Camera Details" },
          cols: 2,
          fields: ["name", "camera_type", "status"],
        },
        {
          label: { en: "Connection" },
          cols: 2,
          fields: ["nvr_id", "channel", "url", "url2", "ai_stream", "live_view_stream"],
        },
        {
          label: { en: "AI & Monitoring" },
          cols: 2,
          fields: ["ai_detection", "enable_phone_detection", "enable_fire_detection", "enable_vehicle_access", "is_secured", "allowed_user_ids"],
        },
      ],
    },

    view: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "Camera Details" },
          cols: 2,
          fields: ["name", "camera_type", "status"],
        },
        {
          label: { en: "Connection" },
          cols: 2,
          fields: ["nvr_id", "channel", "url", "url2", "ai_stream", "live_view_stream"],
        },
        {
          label: { en: "AI & Monitoring" },
          cols: 2,
          fields: ["ai_detection", "enable_phone_detection", "enable_fire_detection", "enable_vehicle_access", "is_secured", "allowed_user_ids"],
        },
      ],
    },
  },
};
