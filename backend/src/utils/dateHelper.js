export const DateHelper = {
  daysDiffExcludeWeekend: (start, end) => {
    const s = new Date(start);
    const e = new Date(end);

    let count = 0;

    while (s <= e) {
      const day = s.getDay();
      if (day !== 0 && day !== 6) {
        count++; // Exclude Saturday & Sunday
      }
      s.setDate(s.getDate() + 1);
    }

    return count - 1;
  },
};