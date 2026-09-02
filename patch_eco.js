const fs = require('fs');

let content = fs.readFileSync('artifacts/rigging-load-report/src/components/global/EconomyDashboard.tsx', 'utf8');

// The file was reverted to its initial state.
// We will apply exact string replacements.

function rep(search, replace) {
  content = content.split(search).join(replace);
}

rep('import { format, parseISO } from "date-fns";', 'import { format, parseISO } from "date-fns";\nimport { useT } from "../../lib/i18n/I18nContext";');
rep('export function EconomyDashboard({ getToken, onOpenProject }: Props) {', 'export function EconomyDashboard({ getToken, onOpenProject }: Props) {\n  const tContext = useT();');
// We use tContext so it doesn't shadow t

rep('<h2 className="eco-title">Economy & Finance</h2>', '<h2 className="eco-title">{tContext("economy.title")}</h2>');
rep('<p className="eco-subtitle">Master ledger, cost tracking, and payroll reconciliation.</p>', '<p className="eco-subtitle">{tContext("economy.subtitle")}</p>');
rep('RefreshCw size={16} className={loading ? "spin" : ""} style={{ marginRight: 6 }} /> Refresh', 'RefreshCw size={16} className={loading ? "spin" : ""} style={{ marginRight: 6 }} /> {tContext("economy.action.refresh")}');
rep('Plus size={16} style={{ marginRight: 6 }} /> Add Expense', 'Plus size={16} style={{ marginRight: 6 }} /> {tContext("economy.action.addExpense")}');

rep('<h3>Project Portfolio Breakdown</h3>', '<h3>{tContext("economy.overview.title")}</h3>');
rep('<th>Project</th>', '<th>{tContext("economy.overview.table.project")}</th>');
rep('<th style={{ textAlign: "right" }}>Revenue</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.overview.table.revenue")}</th>');
rep('<th style={{ textAlign: "right" }}>Expenses</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.overview.table.expenses")}</th>');
rep('<th style={{ textAlign: "right" }}>Net Profit</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.overview.table.profit")}</th>');
rep('<th style={{ textAlign: "right" }}>Margin</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.overview.table.margin")}</th>');

rep('Client: {p.client || "None"}', '{tContext("economy.projects.client", { client: p.client || tContext("economy.projects.clientNone") })}');
rep('Settings size={14} style={{ marginRight: 6 }} /> Settings', 'Settings size={14} style={{ marginRight: 6 }} /> {tContext("economy.projects.settings")}');
rep('<span>Revenue</span>', '<span>{tContext("economy.projects.revenue")}</span>');
rep('<span>Expenses</span>', '<span>{tContext("economy.projects.expenses")}</span>');
rep('<span>Margin</span>', '<span>{tContext("economy.projects.margin")}</span>');
rep('<span className="bd-name">{cat.category}</span>', '<span className="bd-name">{tContext(`economy.categories.${cat.category}` as any) || cat.category}</span>');

rep('Timecards & Hours Master Queue', '{tContext("economy.timecards.title")}');
rep('<th>Freelancer</th>', '<th>{tContext("economy.timecards.table.freelancer")}</th>');
rep('<th>Date</th>', '<th>{tContext("economy.timecards.table.date")}</th>');
rep('<th>Hours (Net)</th>', '<th>{tContext("economy.timecards.table.hours")}</th>');
rep('<th>Cost</th>', '<th>{tContext("economy.timecards.table.cost")}</th>');
rep('<th>Status</th>', '<th>{tContext("economy.timecards.table.status")}</th>');
rep('<th>Actions</th>', '<th>{tContext("economy.timecards.table.actions")}</th>');
rep('<td colSpan={7} className="eco-empty">No timecards found.</td>', '<td colSpan={7} className="eco-empty">{tContext("economy.timecards.empty")}</td>');

rep('<CheckCircle size={14} /> Approve', '<CheckCircle size={14} /> {tContext("economy.timecards.action.approve")}');
rep('<XCircle size={14} /> Reject', '<XCircle size={14} /> {tContext("economy.timecards.action.reject")}');
rep('<Flag size={14} /> Flag', '<Flag size={14} /> {tContext("economy.timecards.action.flag")}');
rep('<Edit2 size={14} /> Adjust', '<Edit2 size={14} /> {tContext("economy.timecards.action.adjust")}');
rep('<Lock size={14} /> Lock', '<Lock size={14} /> {tContext("economy.timecards.action.lock")}');
rep('<span className="eco-muted">Read only</span>', '<span className="eco-muted">{tContext("economy.timecards.readonly")}</span>');

rep('<h3>Direct Expenses</h3>', '<h3>{tContext("economy.expenses.title")}</h3>');
rep('<th>Category</th>', '<th>{tContext("economy.expenses.table.category")}</th>');
rep('<th>Description</th>', '<th>{tContext("economy.expenses.table.description")}</th>');
rep('<th>Vendor / Ref</th>', '<th>{tContext("economy.expenses.table.vendor")}</th>');
rep('<th style={{ textAlign: "right" }}>Amount</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.expenses.table.amount")}</th>');
rep('<span className="eco-tag">{e.category}</span>', '<span className="eco-tag">{tContext(`economy.categories.${e.category}` as any) || e.category}</span>');
rep('<td colSpan={6} className="eco-empty">No expenses recorded.</td>', '<td colSpan={6} className="eco-empty">{tContext("economy.expenses.empty")}</td>');

rep('Easyjob Reconciliation', '{tContext("economy.recon.title")}');
rep('<th>Easyjob Number</th>', '<th>{tContext("economy.recon.table.easyjobId")}</th>');
rep('<th style={{ textAlign: "right" }}>Contract Revenue</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.recon.table.internalRev")}</th>');
rep('<th style={{ textAlign: "right" }}>Recorded Revenue</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.recon.table.easyjobRev")}</th>');
rep('<th style={{ textAlign: "right" }}>Difference</th>', '<th style={{ textAlign: "right" }}>{tContext("economy.recon.table.difference")}</th>');
rep('<span className={`eco-status-pill status-${p.easyjob.status}`}>{p.easyjob.status}</span>', '<span className={`eco-status-pill status-${p.easyjob.status}`}>{tContext(`economy.recon.${p.easyjob.status}` as any) || p.easyjob.status}</span>');
rep('<td colSpan={6} className="eco-empty">No reconciliation data available.</td>', '<td colSpan={6} className="eco-empty">{tContext("economy.recon.empty")}</td>');

// Tabs mapping
content = content.replace(/\{tab\}\n(.*?)span/g, '{tContext(`economy.tab.${tab.toLowerCase()}` as any) || tab}\n$1span');
content = content.replace(/\{tab\}\n(.*?)<\/button>/g, '{tContext(`economy.tab.${tab.toLowerCase()}` as any) || tab}\n$1</button>');

fs.writeFileSync('artifacts/rigging-load-report/src/components/global/EconomyDashboard.tsx', content);
