const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const tatkalOpenTimings = {
  '2A': '10:00',
  '3A': '10:00',
  '3E': '10:00',
  '1A': '10:00',
  CC: '10:00',
  EC: '10:00',
  '2S': '11:00',
  SL: '11:00',
};

function formatDate(inputDate) {
  return dayjs(inputDate, 'DD/MM/YYYY').format('ddd, DD MMM');
}

function hasTatkalAlreadyOpened(coach) {
  const openTime = tatkalOpenTimings[coach];
  if (!openTime) return true;

  const [hour, minute] = openTime.split(':').map(Number);
  const targetTime = dayjs().set('hour', hour).set('minute', minute).set('second', 0);
  return dayjs().isAfter(targetTime);
}

module.exports = {
  formatDate,
  hasTatkalAlreadyOpened,
  tatkalOpenTimings,
};
