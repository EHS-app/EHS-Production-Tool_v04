import fs from 'fs';
const path = 'artifacts/rigging-load-report/src/components/global/GlobalShell.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'sideOffset={6}',
  'sideOffset={6}\n              collisionPadding={16}'
);

fs.writeFileSync(path, code);
