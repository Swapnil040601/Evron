export const Camera = {
  viewActions(record) {
    if (record.is_secured) {
      return [
        {
          label: "Manage Allowed Users",
          type: "page",
          url: `secured-area?camera_id=${record.id}`,
          icon: "IconShieldLock",
        },
      ];
    }
    return [];
  },
};
