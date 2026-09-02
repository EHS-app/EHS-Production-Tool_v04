import fs from 'fs';
const path = 'artifacts/rigging-load-report/src/components/global/GlobalShell.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '<div key={group.key} style={{ marginTop: 18 }}>',
  '<div key={group.key} style={{ marginTop: group.key === "global.group.operations" ? 18 : 32 }}>'
);

fs.writeFileSync(path, code);
