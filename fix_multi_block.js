const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

content = content.replace(
  /function entryTimeLabel\(entry: CalendarEntry\): string \{\n\s*return entry\.allDay\n\s*\? "All day"\n\s*: \`\\\$\{localTimeOnly\(entry\.startAt\)\} - \\\$\{localTimeOnly\(entry\.endAt\)\}\`;\n\s*\}/,
  `function entryTimeLabel(entry: CalendarEntry): string {
    return entry.allDay
      ? t("portal.availability.editor.allDay") || "All day"
      : \`\${localTimeOnly(entry.startAt)}–\${localTimeOnly(entry.endAt)}\`;
  }`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
