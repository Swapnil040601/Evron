export default {
  model: "CameraPresence",

  label: {
    single: { en: "Camera Presence" },
    plural: { en: "Camera Presence" },
  },

  description: {
    en: "Manage employee attendance records",
  },
  icon: 'IconCalendarTime',
  dashboard: [
    {
      label: { en: "Total Records" },
      count: "sum",
      color: "blue",
      icon: "calendar",
    },
    {
      label: { en: "Present" },
      count: "status.Present",
      color: "green",
      icon: "check",
    },
    {
      label: { en: "Absent" },
      count: "status.Absent",
      color: "red",
      icon: "close",
    },
  ],

  fields: [
    {
      name: "id",
      label: { en: "ID" },
      type: "key",
      rules: ["required"],
    },
    {
      name: "user_id",
      label: { en: "User ID" },
      type: "text",
      rules: ["required"],
    },
    {
      name: "start_time",
      label: { en: "Login Time" },
      type: "datetime",
      rules: [],
    },
    {
      name: "end_time",
      label: { en: "End Time" },
      type: "datetime",
      rules: [],
    },
    {
      name: "status",
      label: { en: "Status" },
      type: "select",
      options: [
        { label: "Present", value: "Present" },
        { label: "Absent", value: "Absent" },
        { label: "Half Day", value: "Half Day" },
        { label: "On Leave", value: "On Leave" },
      ],
      rules: ["required"],
    },
    {
      name: "created_on",
      label: { en: "Created On" },
      type: "datetime",
      readonly: true,
    },
    {
      name: "created_by",
      label: { en: "Created By" },
      type: "number",
      readonly: true,
    },
  ],

  forms: {
    list: {
      type: "index",
      fields: ["user_id", "unknown_id", "start_time", "end_time", "status"],
    },

    create: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "Attendance Details" },
          cols: 2,
          fields: [
          ],
        },
      ],
    },

    edit: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "Attendance Details" },
          cols: 2,
          fields: [
          ],
        },
      ],
    },

    view: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "Attendance Details" },
          cols: 2,
          fields: [
            "user_id",
            "unknown_id",
            "start_time",
            "end_time",
            "status",
          ],
        },
      ],
    },
  },
};
