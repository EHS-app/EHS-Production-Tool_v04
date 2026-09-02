const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', 'utf-8');

// The error says t is not found around line 1758. This is inside `AssignmentCard`
content = content.replace(/function AssignmentCard\(\{[^}]+\} : \{/g, `function AssignmentCard(props: any) { const t = useT(); `);
// Wait, I should just grep for the component functions.
