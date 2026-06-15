export const User = {
  viewActions(record) {
    return [
      {
        label: "Face Registration",
        type: "page",
        url: "custom/faceRegistration/" + record.id,
        icon: "IconUserScreen"
      }
    ];
  }
};