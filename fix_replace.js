const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

content = content.replace(
  /aria-label=\{t\("portal\.availability\.weekNumberAria" as any\)\.replace\("\{week\}", String\(weekNumber\)\)\}/,
  `aria-label={(t("portal.availability.weekNumberAria" as any) || "").replace("{week}", String(weekNumber))}`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
