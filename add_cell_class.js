const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

content = content.replace(
  /transition: "background 100ms ease, border-color 100ms ease"\n\s*\}\}/,
  `$&
              className="availability-cell"`
);

content = content.replace(
  /key=\{i\}\n\s*onPointerDown/,
  `key={i}
              role="button"
              tabIndex={0}
              aria-label={\`\${cell.iso}: \${isAvailable ? t("portal.availability.legend.available") : isUnavailable ? t("portal.availability.legend.unavailable") : "Neutral"}\`}
              aria-pressed={selected}
              aria-selected={selected}
              onPointerDown`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
