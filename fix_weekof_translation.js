const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/index.tsx', 'utf8');

content = content.replace(
  /\{viewMode === "month" \? monthName : \`Week of \\\$\{viewWeekStart\.toLocaleDateString\("en-GB", \{ month: "short", day: "numeric" \}\)\}\`\}/,
  `{viewMode === "month" ? monthName : (t("portal.availability.view.weekOf") || "Week {date}").replace("{date}", viewWeekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" }))}`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/index.tsx', content);
