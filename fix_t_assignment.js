const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', 'utf-8');

content = content.replace(/const c = PALETTE\[theme\];\n  const fee = assignment\.dayRate;/g, 'const c = PALETTE[theme];\n  const t = useT();\n  const fee = assignment.dayRate;');

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', content, 'utf-8');
console.log('AssignmentCard updated.');
