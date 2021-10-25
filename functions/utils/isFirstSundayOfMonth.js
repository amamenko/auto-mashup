const { format, eachWeekendOfMonth } = require("date-fns");

const isFirstSundayOfMonth = () => {
  const currentDate = new Date();
  const currentFormattedDate = format(currentDate, "MM/dd/yyyy");

  const firstWeekend = eachWeekendOfMonth(currentDate)
    .map((item) => format(item, "MM/dd/yyyy"))
    .slice(0, 2);

  return firstWeekend.includes(currentFormattedDate);
};

module.exports = isFirstSundayOfMonth;
