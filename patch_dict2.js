const fs = require('fs');

const enNewKeys = `
  "economy.title": "Economy & Finance",
  "economy.subtitle": "Master ledger, cost tracking, and payroll reconciliation.",
  "economy.action.refresh": "Refresh",
  "economy.action.addExpense": "Add Expense",
  "economy.tab.overview": "Overview",
  "economy.tab.timecards": "Timecards",
  "economy.tab.expenses": "Expenses",
  "economy.tab.recon": "Recon",
`;

const noNewKeys = `
  "economy.title": "Økonomi & Finans",
  "economy.subtitle": "Hovedbok, kostnadssporing og lønnsavstemming.",
  "economy.action.refresh": "Oppdater",
  "economy.action.addExpense": "Legg til Utgift",
  "economy.tab.overview": "Oversikt",
  "economy.tab.timecards": "Timelister",
  "economy.tab.expenses": "Utgifter",
  "economy.tab.recon": "Avstemming",
`;

function inject(filePath, newKeys) {
  let content = fs.readFileSync(filePath, 'utf8');
  let parts = content.split('// ---------- Settings ----------');
  content = parts[0] + '// ---------- Settings ----------\n' + newKeys + '\n' + parts[1];
  fs.writeFileSync(filePath, content);
}

inject('artifacts/rigging-load-report/src/lib/i18n/translations/en.ts', enNewKeys);
inject('artifacts/rigging-load-report/src/lib/i18n/translations/no.ts', noNewKeys);
