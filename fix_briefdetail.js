const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', 'utf-8');

content = content.replace(/"Production schedule"/g, '{t("portal.brief.prodSchedule")}');
content = content.replace(/"Crew on the call sheet"/g, '{t("portal.brief.crewCallSheet")}');
content = content.replace(/"Rigging"/g, '{t("portal.brief.rigging")}');
content = content.replace(/"Lighting"/g, '{t("portal.brief.lighting")}');
content = content.replace(/"LED screens"/g, '{t("portal.brief.ledScreens")}');
content = content.replace(/"Stage"/g, '{t("portal.brief.stage")}');
content = content.replace(/"Sound"/g, '{t("portal.brief.sound")}');
content = content.replace(/"No LED screens on this project."/g, '{t("portal.brief.noLed")}');
content = content.replace(/"No stage on this project."/g, '{t("portal.brief.noStage")}');
content = content.replace(/"No sound inventory on this project."/g, '{t("portal.brief.noSound")}');
content = content.replace(/"Rigg plan \(top-down\)"/g, '{t("portal.brief.riggPlan")}');
content = content.replace(/"Drawings & attachments"/g, '{t("portal.brief.drawingsAttachments")}');

fs.writeFileSync('artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx', content, 'utf-8');
console.log('BriefDetail translations updated.');
