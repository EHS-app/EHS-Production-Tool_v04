const fs = require('fs');
let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

content = content.replace(
  /return \(\n\s*<div\n\s*key=\{i\}\n\s*role="button"/,
  `return (
            <React.Fragment key={i}>
              {weekNumberNode}
            <div
              role="button"`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
