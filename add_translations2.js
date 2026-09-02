const fs = require("fs");

function addTranslations(filePath, translations) {
  let content = fs.readFileSync(filePath, "utf-8");
  const lastBraceIndex = content.lastIndexOf("}");
  let newEntries = "";
  for (const [key, value] of Object.entries(translations)) {
    if (!content.includes(`"${key}":`)) {
      newEntries += `  "${key}": ${JSON.stringify(value)},\n`;
    }
  }
  if (newEntries) {
    content = content.substring(0, lastBraceIndex) + ",\n" + newEntries + "};";
    content = content.replace(/,(\s*),\n/, ",\n"); 
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

const en = {
  "portal.brief.prodSchedule": "Production schedule",
  "portal.brief.crewCallSheet": "Crew on the call sheet",
  "portal.brief.rigging": "Rigging",
  "portal.brief.lighting": "Lighting",
  "portal.brief.ledScreens": "LED screens",
  "portal.brief.stage": "Stage",
  "portal.brief.sound": "Sound",
  "portal.brief.riggPlan": "Rigg plan (top-down)",
  "portal.brief.drawingsAttachments": "Drawings & attachments",
  "portal.brief.noLed": "No LED screens on this project.",
  "portal.brief.noStage": "No stage on this project.",
  "portal.brief.noSound": "No sound inventory on this project.",
  "portal.brief.actions.acceptGig": "Accept gig"
};

const no = {
  "portal.brief.prodSchedule": "Produksjonsplan",
  "portal.brief.crewCallSheet": "Crew på call sheet",
  "portal.brief.rigging": "Rigging",
  "portal.brief.lighting": "Lys",
  "portal.brief.ledScreens": "LED-skjermer",
  "portal.brief.stage": "Scene",
  "portal.brief.sound": "Lyd",
  "portal.brief.riggPlan": "Riggplan (top-down)",
  "portal.brief.drawingsAttachments": "Tegninger og vedlegg",
  "portal.brief.noLed": "Ingen LED-skjermer på dette prosjektet.",
  "portal.brief.noStage": "Ingen scene på dette prosjektet.",
  "portal.brief.noSound": "Ingen lyd på dette prosjektet.",
  "portal.brief.actions.acceptGig": "Aksepter gig"
};

addTranslations("artifacts/rigging-load-report/src/lib/i18n/translations/en.ts", en);
addTranslations("artifacts/rigging-load-report/src/lib/i18n/translations/no.ts", no);
