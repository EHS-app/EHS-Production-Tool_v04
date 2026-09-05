const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', 'utf8');

content = content.replace(
  /const effectiveEntry = \[\.\.\.dayEntries\]\.sort\(\(a, b\) => \{[\s\S]*?const hasGig = gigsOverlap\(cell\.iso\);/m,
  `const concreteRuleIds = new Set(dayEntries.filter(e => !e.virtual && e.ruleId).map(e => e.ruleId));
          let visibleDayEntries = dayEntries.filter(e => {
            if (e.virtual && e.ruleId && concreteRuleIds.has(e.ruleId)) return false;
            return true;
          });
          visibleDayEntries.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

          const effectiveEntry = [...visibleDayEntries].sort((a, b) => {
            if (a.virtual !== b.virtual) return a.virtual ? 1 : -1;
            const aTime = new Date(a.updatedAt || a.createdAt || a.startAt).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || b.startAt).getTime();
            return bTime - aTime;
          })[0];
          
          const hasGig = gigsOverlap(cell.iso);
          
          let isAvailable = false;
          let isUnavailable = false;

          const hasBlocks = visibleDayEntries.length > 0 || dayBusy.length > 0 || dayHolds.length > 0 || hasGig;

          if (hasBlocks) {
            if (visibleDayEntries.length === 1 && visibleDayEntries[0].allDay && dayBusy.length === 0 && dayHolds.length === 0 && !hasGig) {
              isAvailable = visibleDayEntries[0].status === "available";
              isUnavailable = visibleDayEntries[0].status === "unavailable";
            }
          } else {
            const localState = data.availability[cell.iso!];
            if (localState === "available") isAvailable = true;
            if (localState === "busy") isUnavailable = true;
          }`
);

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/availability/CalendarGrid.tsx', content);
