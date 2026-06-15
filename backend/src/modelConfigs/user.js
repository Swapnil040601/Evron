export default {
  model: "User",

  label: {
    single: { en: "User" },
    plural: { en: "Users" },
  },

  description: {
    en: "Manage system users and their roles",
  },
  icon: 'IconUsers',

  dashboard: [
    {
      label: { en: "Total Users" },
      count: "sum",
      color: "blue",
      icon: "users",
    },
    {
      label: { en: "Active Users" },
      count: "status.Active",
      color: "green",
      icon: "check",
    },
    {
      label: { en: "Inactive Users" },
      count: "status.Inactive",
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
      name: "name",
      label: { en: "Full Name" },
      type: "text",
      rules: ["required", "max:100"],
    },
    {
      name: "gender",
      label: { en: "Gender" },
      type: "select",
      options: [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" },
        { label: "Other", value: "Other" },
      ],
      rules: [],
    },
    {
      name: "email",
      label: { en: "Email Address" },
      type: "email",
      rules: ["required", "email", "max:150"],
    },
    {
      name: "mobile_number",
      label: { en: "Mobile Number" },
      type: "text",
      rules: ["required", "max:20"],
    },
    {
      name: "role",
      label: { en: "Role" },
      type: "select",
      options: [
        { label: "Admin", value: "Admin" },
        { label: "User", value: "User" },
      ],
      default: "User",
      rules: ["required"],
    },
    {
      name: "status",
      label: { en: "Status" },
      type: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ],
      default: "Active",
      rules: ["required"],
    },
    {
      name: "password",
      label: { en: "Password" },
      type: "password",
      rules: ["required"],
      hiddenOnList: true,
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
    {
      name: "face_enrollment",
      label: { en: "Face Registration" },
      type: "component",
      component: "CustomFaceRegistration",
      required: false,
      hiddenOnList: true,
    }
  ],

  forms: {
    list: {
      type: "index",
      fields: ["name", "email", "mobile_number", "role", "status"],
    },

    create: {
      type: "sections",
      isModal: true,
      autosave: false,
      groups: [
        {
          label: { en: "User Information" },
          cols: 2,
          fields: [
            "name",
            "gender",
            "email",
            "mobile_number",
            "role",
            "status",
            "password",
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
          label: { en: "User Information" },
          cols: 2,
          fields: [
            "name",
            "gender",
            "email",
            "mobile_number",
            "role",
            "status",
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
          label: { en: "User Information" },
          cols: 2,
          fields: [
            "name",
            "face_enrollment",
            "gender",
            "email",
            "mobile_number",
            "role",
            "status"
          ],
        },
      ],
    },
  },
};
