const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/index.tsx', 'utf8');

// remove pointer-events: none from availability-cell-badges
content = content.replace(
  /overflow-y: auto;\n\s*pointer-events: none;/,
  `overflow-y: auto;\n          pointer-events: auto;`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/index.tsx', content);
