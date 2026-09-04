const fs = require('fs');

// Add ISO week number utility to utils.ts
let utilsContent = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/utils.ts', 'utf8');

if (!utilsContent.includes('getIsoWeekNumber')) {
  utilsContent += `\nexport function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}\n`;
  fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/utils.ts', utilsContent);
}

// Add translations
function addTranslations(file, adds) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('"portal.availability.weekNumber"')) {
    content = content.replace(/"portal\.availability\.view\.weekOf": ".*",/, '$&\n' + adds);
    fs.writeFileSync(file, content);
  }
}

addTranslations('artifacts/rigging-load-report/src/lib/i18n/translations/en.ts', 
`  "portal.availability.weekNumber": "Week",
  "portal.availability.weekNumberAria": "Week {week}",`);

addTranslations('artifacts/rigging-load-report/src/lib/i18n/translations/no.ts', 
`  "portal.availability.weekNumber": "Uke",
  "portal.availability.weekNumberAria": "Uke {week}",`);

