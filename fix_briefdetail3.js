const fs = require('fs');
let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', 'utf-8');

content = content.replace(/Acknowledge changes/g, '{t("portal.brief.actions.diffAcknowledge")}');

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', content, 'utf-8');
console.log('BriefDetail translations updated 3.');
