const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

// 1. Clock action
content = content.replace(
  /onClick=\{\(e\) => \{\n\s*e\.stopPropagation\(\);\n\s*openEditor\(cell\.iso!, effectiveEntry\);\n\s*\}\}\n\s*title=\{t\("portal\.availability\.openEditor"\)\}/,
  `onClick={(e) => {
                  e.stopPropagation();
                  openEditor(cell.iso!); // no existing entry, creates a new one
                }}
                title={t("portal.availability.addTimeBlock") as string}`
);

// 2. Stop propagation and make manual badges buttons
content = content.replace(
  /\{visibleDayEntries\.map\(\(entry\) =>[\s\S]*?\}\)/,
  `{visibleDayEntries.map((entry) => {
                  const key = entry.ruleId ? \`\${entry.ruleId}-\${entry.startAt}\` : entry.id;
                  const title = \`\${entryTimeLabel(entry)}\${entry.note ? \` · \${entry.note}\` : ""}\`;
                  const statusLabel = entry.status === "available" ? (t("portal.availability.legend.available") as string) : (t("portal.availability.legend.unavailable") as string);
                  const ariaLabel = \`\${statusLabel}, \${entryTimeLabel(entry)}\`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={\`availability-time-badge availability-time-badge--\${entry.status}\`}
                      title={title}
                      aria-label={ariaLabel}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(cell.iso!, entry);
                      }}
                      style={{ cursor: "pointer", fontFamily: "inherit", textAlign: "left", margin: 0 }}
                    >
                      <span className="availability-time-badge__dot" />
                      <span className="availability-time-badge__label">
                        {entryTimeLabel(entry)}
                      </span>
                    </button>
                  );
                })}`
);

// 3. Holds
content = content.replace(
  /\{dayHolds\.map\(\(hold\) => \(\n\s*<span\n\s*key=\{hold\.id\}\n\s*className="availability-time-badge availability-time-badge--tentative"\n\s*title=\{/,
  `{dayHolds.map((hold) => (
                  <span
                    key={hold.id}
                    className="availability-time-badge availability-time-badge--tentative"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    title={`
);

// 4. Busy
content = content.replace(
  /\{dayBusy\.map\(\(busy\) => \(\n\s*<span\n\s*key=\{busy\.id\}\n\s*className="availability-time-badge availability-time-badge--unavailable"\n\s*title=\{/,
  `{dayBusy.map((busy) => (
                  <span
                    key={busy.id}
                    className="availability-time-badge availability-time-badge--unavailable"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    title={`
);

// 5. Gig
content = content.replace(
  /\{hasGig \? \(\n\s*<span className="availability-time-badge availability-time-badge--gig">/,
  `{hasGig ? (
                  <span className="availability-time-badge availability-time-badge--gig" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
