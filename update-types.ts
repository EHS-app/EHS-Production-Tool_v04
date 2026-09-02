import fs from 'fs';
const path = 'artifacts/rigging-load-report/src/components/global/GlobalShell.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const allItems = NAV_GROUPS.flatMap(g => g.items);',
  'const allItems = NAV_GROUPS.map(g => g.items).flat();'
);

fs.writeFileSync(path, code);
