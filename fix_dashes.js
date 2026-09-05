const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

content = content.replace(
  /\{localTimeOnly\(busy\.startAt\)\} - \{localTimeOnly\(busy\.endAt\)\}/g,
  `{localTimeOnly(busy.startAt)}–{localTimeOnly(busy.endAt)}`
);

content = content.replace(
  /\{localTimeOnly\(hold\.startAt\)\}-\{localTimeOnly\(hold\.endAt\)\}/g,
  `{localTimeOnly(hold.startAt)}–{localTimeOnly(hold.endAt)}`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
