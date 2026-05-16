import {
  projectMeta,
  features,
  userFlow,
  inputs,
  outputs,
  keyFiles,
  businessLogic,
  gaps,
  knownIssues,
} from "../data/overview";

export function buildMarkdown(): string {
  const lines: string[] = [];

  lines.push(`# ${projectMeta.name} — Project Overview`);
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString().slice(0, 10)}_`);
  lines.push("");
  lines.push(projectMeta.tagline);
  lines.push("");

  lines.push("## Audience");
  lines.push(projectMeta.audience);
  lines.push("");

  lines.push("## Tech stack");
  for (const item of projectMeta.stack) lines.push(`- ${item}`);
  lines.push("");

  lines.push(`## Main features (${features.length})`);
  const grouped = new Map<string, typeof features>();
  for (const f of features) {
    const arr = grouped.get(f.category) ?? [];
    arr.push(f);
    grouped.set(f.category, arr);
  }
  for (const [cat, arr] of grouped) {
    lines.push(`### ${cat}`);
    for (const f of arr) lines.push(`- **${f.title}** — ${f.description}`);
    lines.push("");
  }

  lines.push("## User flow");
  for (let i = 0; i < userFlow.length; i++) {
    const s = userFlow[i]!;
    lines.push(`${i + 1}. **${s.actor}** — ${s.action} → _${s.result}_`);
  }
  lines.push("");

  lines.push("## Inputs");
  for (const i of inputs) lines.push(`- ${i}`);
  lines.push("");

  lines.push("## Outputs");
  for (const o of outputs) lines.push(`- ${o}`);
  lines.push("");

  lines.push("## Key files");
  for (const f of keyFiles) lines.push(`- \`${f.path}\` — ${f.role}`);
  lines.push("");

  lines.push("## Business logic");
  for (const l of businessLogic) {
    lines.push(`### ${l.title}`);
    lines.push(l.description);
    lines.push(`_Where:_ \`${l.where}\``);
    lines.push("");
  }

  lines.push("## Missing / unfinished");
  for (const g of gaps) lines.push(`- **${g.title}** (${g.status}) — ${g.detail}`);
  lines.push("");

  lines.push("## Known issues");
  for (const k of knownIssues) lines.push(`- **${k.title}** (${k.severity}) — ${k.detail}`);
  lines.push("");

  return lines.join("\n");
}

export function buildPlainText(): string {
  return buildMarkdown()
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
