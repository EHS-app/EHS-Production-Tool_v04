const fs = require('fs');

function addTranslations(file, adds) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('"portal.availability.addTimeBlock"')) {
    content = content.replace(/"portal\.availability\.editor\.invalidTime": ".*",/, '$&\n' + adds);
    fs.writeFileSync(file, content);
  }
}

addTranslations('artifacts/rigging-load-report/src/lib/i18n/translations/en.ts', 
`  "portal.availability.addTimeBlock": "Add time block",`);

addTranslations('artifacts/rigging-load-report/src/lib/i18n/translations/no.ts', 
`  "portal.availability.addTimeBlock": "Legg til tidsblokk",`);

