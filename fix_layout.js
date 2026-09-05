const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/index.tsx', 'utf8');

// 1. Remove forced 100% height
content = content.replace(
  /<div style=\{\{ display: "flex", flexDirection: "column", gap: 16, minHeight: "100%", height: "100%" \}\}>/,
  `<div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>`
);
// Actually, let's just make it flex without height:100% if we don't want it to stretch.
// Wait, the parent of this component might have constraints. Let's just remove height and minHeight.
content = content.replace(
  /<div style=\{\{ display: "flex", flexDirection: "column", gap: 16, height: "100%" \}\}>/,
  `<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>`
);
content = content.replace(
  /<div style=\{\{ display: "flex", flexDirection: "column", gap: 16, minHeight: "100%", height: "100%" \}\}>/,
  `<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>`
);

// Remove `flex: 1, overflow: "hidden"` on calendar card so it fits content.
content = content.replace(
  /flex: 1,\n\s*overflow: "hidden" \/\/ Help contain inner content in flex if needed/,
  `// flex: 1 removed so it can fit content\n          overflow: "visible"`
);

// In calendar view, remove flex: 1 from internal wrappers to avoid stretching
content = content.replace(
  /<div style=\{\{ flex: 1, overflowY: "auto", minHeight: 0 \}\}>/,
  `<div style={{ overflowY: "visible", minHeight: 0 }}>`
);

// Update mobile toolbar styles
content = content.replace(
  /\.availability-toggle-bar \{\n\s*margin-top: 8px;\n\s*padding: 6px 12px;\n\s*display: grid;\n\s*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\);\n\s*align-items: center;\n\s*gap: 12px;/,
  `.availability-toggle-bar {
          margin-top: 8px;
          padding: 8px 12px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;`
);

content = content.replace(
  /\.availability-toggle-bar__buttons \{ display: flex; gap: 8px; \}/,
  `.availability-toggle-bar__buttons { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 600px) {
          .availability-toggle-bar { flex-direction: column; align-items: stretch; }
          .availability-toggle-bar__label { text-align: center; }
          .availability-toggle-bar__buttons { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
          .availability-toggle-bar__buttons > button:last-child { grid-column: 1 / -1; }
        }`
);

content = content.replace(
  /min-width: 116px;\n\s*padding: 8px 16px;/,
  `min-width: 116px;
          min-height: 44px;
          padding: 8px 16px;`
);

// Also remove marginTop: 14 if redundant padding below legend:
content = content.replace(
  /marginTop: 14, display: "flex"/,
  `marginTop: 10, marginBottom: 8, display: "flex"`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/index.tsx', content);
