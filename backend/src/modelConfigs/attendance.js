export default {
  model: "Attendance",

  label: {
    single: { en: "Attendance" },
    plural: { en: "Attendances" },
  },

  description: {
    en: "Manage employee attendance records",
  },

  icon: "IconCalendarTime",

  fields: [
    {
      name: "id",
      label: { en: "ID" },
      type: "key",
      rules: ["required"],
    },
    {
      name: "user_id",
      label: { en: "Employee" },
      type: "relation",
      relation: {
        model: "User",
        valueField: "id",
        labelField: "name",
      },
      rules: [],
    },
    {
      name: "date",
      label: { en: "Date" },
      type: "date",
      rules: ["required"],
    },
    {
      name: "login_time",
      label: { en: "Login Time" },
      type: "datetime",
      rules: [],
    },
    {
      name: "logout_time",
      label: { en: "Logout Time" },
      type: "datetime",
      rules: [],
    },
    {
      name: "in_camera_track_id",
      label: { en: "In Camera Track" },
      type: "relation",
      relation: {
        model: "CameraTrack",
        valueField: "id",
        labelField: "id",
      },
      rules: [],
    },
    {
      name: "out_camera_track_id",
      label: { en: "Out Camera Track" },
      type: "relation",
      relation: {
        model: "CameraTrack",
        valueField: "id",
        labelField: "id",
      },
      rules: [],
    },
    {
      name: "working_hours",
      label: { en: "Working Hours" },
      type: "text",
      readonly: true,
    },
    {
      name: "productive_hours",
      label: { en: "Productive Hours" },
      type: "text",
      readonly: true,
    },
    {
      name: "late_minutes",
      label: { en: "Late Minutes" },
      type: "number",
      readonly: true,
    },
    {
      name: "early_exit_minutes",
      label: { en: "Early Exit Minutes" },
      type: "number",
      readonly: true,
    },
    {
      name: "overtime_minutes",
      label: { en: "Overtime Minutes" },
      type: "number",
      readonly: true,
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
        { label: "Late", value: "Late" },
        { label: "Missed Punch", value: "Missed Punch" },
      ],
      rules: ["required"],
    },
    {
      name: "remarks",
      label: { en: "Remarks" },
      type: "textarea",
      rules: [],
    },
    {
      name: "created_at",
      label: { en: "Created At" },
      type: "datetime",
      readonly: true,
    },
    {
      name: "created_by",
      label: { en: "Created By" },
      type: "relation",
      relation: {
        model: "User",
        valueField: "id",
        labelField: "name",
      },
      readonly: true,
    },
    {
      name: "updated_at",
      label: { en: "Updated At" },
      type: "datetime",
      readonly: true,
    },
    {
      name: "updated_by",
      label: { en: "Updated By" },
      type: "relation",
      relation: {
        model: "User",
        valueField: "id",
        labelField: "name",
      },
      readonly: true,
    },
  ],

  forms: {
    list: {
      type: "index",
      fields: [
        "user_id",
        "date",
        "login_time",
        "logout_time",
        "working_hours",
        "status",
      ],
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
            "user_id",
            "date",
            "login_time",
            "logout_time",
            "status",
            "remarks",
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
            "user_id",
            "date",
            "login_time",
            "logout_time",
            "status",
            "remarks",
          ],
        },
        {
          label: { en: "Tracking Summary" },
          cols: 2,
          fields: [
            "in_camera_track_id",
            "out_camera_track_id",
            "working_hours",
            "productive_hours",
            "late_minutes",
            "early_exit_minutes",
            "overtime_minutes",
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
            "date",
            "login_time",
            "logout_time",
            "status",
            "remarks",
          ],
        },
        {
          label: { en: "Tracking Summary" },
          cols: 2,
          fields: [
            "in_camera_track_id",
            "out_camera_track_id",
            "working_hours",
            "productive_hours",
            "late_minutes",
            "early_exit_minutes",
            "overtime_minutes",
          ],
        },
        {
          label: { en: "Audit Info" },
          cols: 2,
          fields: [
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
          ],
        },
      ],
    },
  },
};