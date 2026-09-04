const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

// Update imports
content = content.replace(
  /overlapsLocalDay, localTimeOnly, isoDateOnly/,
  `overlapsLocalDay, localTimeOnly, isoDateOnly, getIsoWeekNumber`
);

// Update Header row
content = content.replace(
  /<div style=\{\{ display: "grid", gridTemplateColumns: "repeat\(7, 1fr\)", gap: 4, marginBottom: 4 \}\}>/,
  `<div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textAlign: "center", padding: "4px 0", textTransform: "uppercase" }} aria-hidden="true">
          {t("portal.availability.weekNumber" as any)}
        </div>`
);

// Update Main grid
content = content.replace(
  /<div style=\{\{ display: "grid", gridTemplateColumns: "repeat\(7, 1fr\)", gridTemplateRows: viewMode === "month" \? \`repeat\(\\\$\{Math\.ceil\(cells\.length \/ 7\)\}, minmax\(60px, 1fr\)\)\` : "minmax\(120px, 1fr\)", gap: 4, flex: 1, minHeight: 0 \}\}>/,
  `<div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gridTemplateRows: viewMode === "month" ? \`repeat(\${Math.ceil(cells.length / 7)}, minmax(60px, 1fr))\` : "minmax(120px, 1fr)", gap: 4, flex: 1, minHeight: 0 }}>`
);

// Update cell mapping
content = content.replace(
  /\{cells\.map\(\(cell, i\) => \{\n\s*if \(!cell\.iso\) return <div key=\{i\} \/>;/,
  `{cells.map((cell, i) => {
          const isFirstOfWeek = i % 7 === 0;
          let weekNumberNode = null;
          if (isFirstOfWeek) {
            let refDate = cell.date;
            if (!refDate) {
               for (let j = i; j < i + 7; j++) {
                 if (cells[j]?.date) { refDate = cells[j].date; break; }
               }
            }
            const weekNumber = refDate ? getIsoWeekNumber(refDate) : "";
            weekNumberNode = (
              <div 
                key={\`week-\${i}\`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", color: c.muted, fontSize: 11, fontWeight: 700 }}
                aria-label={t("portal.availability.weekNumberAria" as any).replace("{week}", String(weekNumber))}
              >
                W{weekNumber}
              </div>
            );
          }

          if (!cell.iso) {
            return (
              <React.Fragment key={i}>
                {weekNumberNode}
                <div />
              </React.Fragment>
            );
          }`
);

// Close React.Fragment at the end of map
content = content.replace(
  /<\/div>\n\s*\);\n\s*\}\)\}\n\s*<\/div>/,
  `</div>
            </React.Fragment>
          );
        })}
      </div>`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
