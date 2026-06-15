// src/helpers/app-helper.js
export const AppHelper = {
  getStatus: async (user, includePending, leaveId) => {
    // Later: replace this with DB logic
    return {
      Casual: 5,
      Sick: 7,
      Earned: 10,
    };
  },

  isExisting: async (begin, end, userId, type, leaveId) => {
    // Later: add database overlap checking query
    return false;
  },
};