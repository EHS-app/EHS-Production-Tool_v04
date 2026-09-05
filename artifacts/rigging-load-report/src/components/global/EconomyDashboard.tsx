import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, CreditCard, 
  FileSpreadsheet, Download, Plus, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Search, Filter, ChevronRight, Settings, Flag, Edit2, Lock
} from "lucide-react";
import { format, parseISO } from "date-fns";

// --- API Types ---

export type EconomyCategory = "labor" | "hotel" | "catering" | "transport" | "subRentals";

export type ProjectCategory = {
  category: EconomyCategory;
  budgetMinor: number;
  actualMinor: number;
  varianceMinor: number;
};

export type EasyjobData = {
  number: string | null;
  recordedRevenueMinor: number | null;
  differenceMinor: number | null;
  status: "unlinked" | "pending" | "matched" | "mismatch";
};

export type EconomyProject = {
  projectId: string;
  projectName: string;
  client: string | null;
  accessRole: "owner" | "editor" | "viewer";
  revenueMinor: number;
  totalExpensesMinor: number;
  netProfitMinor: number;
  netMarginBasisPoints: number;
  categories: ProjectCategory[];
  easyjob: EasyjobData;
};

export type EconomyTotals = {
  revenueMinor: number;
  expensesMinor: number;
  netProfitMinor: number;
};

export type EconomyExpense = {
  id: string;
  projectId: string;
  projectName: string;
  category: EconomyCategory;
  amountMinor: number;
  incurredOn: string;
  description: string;
  vendor: string | null;
  reference: string | null;
  accessRole: "owner" | "editor" | "viewer";
};

export type EconomyTimecard = {
  id: string;
  gigId: string;
  projectId: string;
  projectName: string;
  accessRole: "owner" | "editor" | "viewer";
  freelancerUserId: string;
  freelancerName: string;
  workDate: string;
  startMinute: number | null;
  endMinute: number | null;
  breakMinutes: number;
  producerBreakMinutes: number | null;
  producerAdjustmentMinutes: number | null;
  overtimeMinutes: number;
  workedMinutes: number;
  payableMinutes: number;
  rateMinor: number;
  flatFeeMinor: number | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "flagged" | "locked";
  notes: string;
  rejectionReason: string | null;
  adjustmentReason: string | null;
  flagReason: string | null;
};

export type EconomyData = {
  ok: boolean;
  projects: EconomyProject[];
  totals: EconomyTotals;
  expenses: EconomyExpense[];
  timecards: EconomyTimecard[];
  laborMethod: string;
};

interface Props {
  getToken: () => Promise<string | null>;
  onOpenProject: (id: string) => void;
}

const TABS = ["Overview", "Projects", "Timecards", "Expenses", "Reconciliation"] as const;
type Tab = typeof TABS[number];

const CATEGORIES: EconomyCategory[] = ["labor", "hotel", "catering", "transport", "subRentals"];

function fmtMinor(minor: number | null | undefined): string {
  if (minor == null) return "—";
  return new Intl.NumberFormat('en-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(minor / 100);
}

function fmtHours(min: number | null | undefined): string {
  if (min == null) return "0h";
  return `${Math.round((min / 60) * 100) / 100}h`;
}

function minToHHMM(m: number | null | undefined): string {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function EconomyDashboard({ getToken, onOpenProject }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<EconomyData | null>(null);

  // Modals state
  const [expenseDraft, setExpenseDraft] = useState<{
    projectId: string;
    category: EconomyCategory;
    date: string;
    description: string;
    vendor: string;
    reference: string;
    amountMajor: string;
  } | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);

  const [settingsDraft, setSettingsDraft] = useState<{
    projectId: string;
    projectName: string;
    contractRevenueMajor: string;
    easyjobRevenueMajor: string;
    laborBudgetMajor: string;
    hotelBudgetMajor: string;
    cateringBudgetMajor: string;
    transportBudgetMajor: string;
    subRentalsBudgetMajor: string;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [timecardAdjustDraft, setTimecardAdjustDraft] = useState<{
    id: string;
    breakMinutes: number;
    adjustmentMinutes: number;
    overtimeMinutes: number;
    reason: string;
  } | null>(null);
  
  const [timecardRejectDraft, setTimecardRejectDraft] = useState<{ id: string, decision: "reject" | "flag", reason: string } | null>(null);
  const [savingTimecard, setSavingTimecard] = useState(false);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

      const res = await fetch(`${baseUrl}/api/economy`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load economy data (Status: ${res.status})`);
      }
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Economy API returned an error");
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load economy data");
      if (!isBackground) setData(null);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCsv = async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      
      const res = await fetch(`${baseUrl}/api/economy/export.csv`, { headers });
      if (!res.ok) throw new Error("Export failed on server");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `economy-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDraft) return;
    setSavingExpense(true);
    try {
      const token = await getToken();
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      
      const amountMinor = Math.round(parseFloat(expenseDraft.amountMajor) * 100);
      
      const res = await fetch(`${baseUrl}/api/economy/projects/${encodeURIComponent(expenseDraft.projectId)}/expenses`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({
          category: expenseDraft.category,
          amountMinor,
          incurredOn: expenseDraft.date,
          description: expenseDraft.description,
          vendor: expenseDraft.vendor || undefined,
          reference: expenseDraft.reference || undefined,
        })
      });
      if (!res.ok) throw new Error("Failed to save expense");
      await fetchData(true);
      setExpenseDraft(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDraft) return;
    setSavingSettings(true);
    try {
      const token = await getToken();
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      
      const payload = {
        contractRevenueMinor: Math.round(parseFloat(settingsDraft.contractRevenueMajor || "0") * 100),
        easyjobRevenueMinor: Math.round(parseFloat(settingsDraft.easyjobRevenueMajor || "0") * 100),
        laborBudgetMinor: Math.round(parseFloat(settingsDraft.laborBudgetMajor || "0") * 100),
        hotelBudgetMinor: Math.round(parseFloat(settingsDraft.hotelBudgetMajor || "0") * 100),
        cateringBudgetMinor: Math.round(parseFloat(settingsDraft.cateringBudgetMajor || "0") * 100),
        transportBudgetMinor: Math.round(parseFloat(settingsDraft.transportBudgetMajor || "0") * 100),
        subRentalsBudgetMinor: Math.round(parseFloat(settingsDraft.subRentalsBudgetMajor || "0") * 100),
      };

      const res = await fetch(`${baseUrl}/api/economy/projects/${encodeURIComponent(settingsDraft.projectId)}/settings`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save project settings");
      await fetchData(true);
      setSettingsDraft(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTimecardDecide = async (id: string, decision: "approve" | "reject" | "flag", reason?: string) => {
    setSavingTimecard(true);
    try {
      const token = await getToken();
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/portal/time-entries/${encodeURIComponent(id)}/decide`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ decision, reason: reason || "" })
      });
      if (!res.ok) throw new Error("Failed to process timecard decision");
      await fetchData(true);
      setTimecardRejectDraft(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTimecard(false);
    }
  };

  const handleTimecardLock = async (id: string) => {
    setSavingTimecard(true);
    try {
      const token = await getToken();
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/portal/time-entries/${encodeURIComponent(id)}/lock`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error("Failed to lock timecard");
      await fetchData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTimecard(false);
    }
  };

  const handleSaveTimecardAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timecardAdjustDraft) return;
    setSavingTimecard(true);
    try {
      const token = await getToken();
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/portal/time-entries/${encodeURIComponent(timecardAdjustDraft.id)}/adjust`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({
          adjustmentMinutes: timecardAdjustDraft.adjustmentMinutes,
          breakMinutes: timecardAdjustDraft.breakMinutes,
          overtimeMinutes: timecardAdjustDraft.overtimeMinutes,
          reason: timecardAdjustDraft.reason
        })
      });
      if (!res.ok) throw new Error("Failed to adjust timecard");
      await fetchData(true);
      setTimecardAdjustDraft(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTimecard(false);
    }
  };

  const openSettingsModal = (p: EconomyProject) => {
    if (p.accessRole !== "owner") return;
    
    // Extract budgets from categories array
    const catMap: Record<EconomyCategory, number> = { labor: 0, hotel: 0, catering: 0, transport: 0, subRentals: 0 };
    p.categories.forEach(c => catMap[c.category] = c.budgetMinor);

    setSettingsDraft({
      projectId: p.projectId,
      projectName: p.projectName,
      contractRevenueMajor: (p.revenueMinor / 100).toFixed(2),
      easyjobRevenueMajor: ((p.easyjob.recordedRevenueMinor || 0) / 100).toFixed(2),
      laborBudgetMajor: (catMap.labor / 100).toFixed(2),
      hotelBudgetMajor: (catMap.hotel / 100).toFixed(2),
      cateringBudgetMajor: (catMap.catering / 100).toFixed(2),
      transportBudgetMajor: (catMap.transport / 100).toFixed(2),
      subRentalsBudgetMajor: (catMap.subRentals / 100).toFixed(2),
    });
  };

  return (
    <div className="eco-container">
      <div className="eco-header">
        <div>
          <h2 className="eco-title">Economy & Finance</h2>
          <p className="eco-subtitle">Master ledger, cost tracking, and payroll reconciliation.</p>
        </div>
        <div className="eco-actions">
          <button className="ehs-ghost-btn" onClick={() => fetchData(false)}>
            <RefreshCw size={16} className={loading ? "spin" : ""} style={{ marginRight: 6 }} /> Refresh
          </button>
          <button className="ehs-primary-btn" onClick={() => {
            if (data?.projects.length) {
              setExpenseDraft({
                projectId: data.projects[0].projectId,
                category: "hotel",
                date: new Date().toISOString().split("T")[0],
                description: "",
                vendor: "",
                reference: "",
                amountMajor: ""
              });
            } else {
              alert("No projects available to assign expenses to.");
            }
          }}>
            <Plus size={16} style={{ marginRight: 6 }} /> Add Expense
          </button>
        </div>
      </div>

      <div className="eco-tabs">
        {TABS.map(tab => (
          <button 
            key={tab} 
            className={`eco-tab ${activeTab === tab ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === "Timecards" && data?.timecards.filter(t => t.status === "submitted").length ? (
              <span className="eco-tab-badge">{data.timecards.filter(t => t.status === "submitted").length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="eco-loading" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Loading financial data from server...
        </div>
      ) : error ? (
        <div className="eco-error" style={{ padding: 40, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>
          <AlertCircle size={18} style={{ verticalAlign: "middle", marginRight: 6 }} /> {error}
        </div>
      ) : data ? (
        <div className="eco-content">
          
          {activeTab === "Overview" && (
            <div className="eco-overview">
              <div className="eco-kpi-grid">
                <div className="eco-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Gross Revenue</span>
                    <TrendingUp size={20} color="var(--success)" />
                  </div>
                  <div className="kpi-value">{fmtMinor(data.totals.revenueMinor)}</div>
                  <div className="kpi-meta">Across {data.projects.length} active projects</div>
                </div>
                <div className="eco-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Total Expenses</span>
                    <TrendingDown size={20} color="var(--danger)" />
                  </div>
                  <div className="kpi-value">{fmtMinor(data.totals.expensesMinor)}</div>
                  <div className="kpi-meta">Direct + Payable Labor</div>
                </div>
                <div className="eco-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Net Profit</span>
                    <DollarSign size={20} color="var(--primary)" />
                  </div>
                  <div className={`kpi-value ${data.totals.netProfitMinor < 0 ? 'text-danger' : 'text-success'}`}>
                    {fmtMinor(data.totals.netProfitMinor)}
                  </div>
                  <div className="kpi-meta">
                    {data.totals.revenueMinor > 0 
                      ? `${((data.totals.netProfitMinor / data.totals.revenueMinor) * 100).toFixed(1)}% global margin`
                      : "0.0% global margin"}
                  </div>
                </div>
              </div>

              <div className="eco-panel">
                <div className="panel-header">
                  <h3>Project Portfolio Breakdown</h3>
                </div>
                <div className="eco-table-wrap">
                  <table className="eco-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th style={{ textAlign: "right" }}>Revenue</th>
                        <th style={{ textAlign: "right" }}>Expenses</th>
                        <th style={{ textAlign: "right" }}>Net Profit</th>
                        <th style={{ textAlign: "right" }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.projects.map(p => (
                        <tr key={p.projectId}>
                          <td>
                            <span className="eco-link" onClick={() => onOpenProject(p.projectId)}>{p.projectName}</span>
                          </td>
                          <td style={{ textAlign: "right" }}>{fmtMinor(p.revenueMinor)}</td>
                          <td style={{ textAlign: "right" }}>{fmtMinor(p.totalExpensesMinor)}</td>
                          <td style={{ textAlign: "right" }} className={p.netProfitMinor < 0 ? "text-danger" : "text-success"}>
                            {fmtMinor(p.netProfitMinor)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className={`eco-tag ${p.netMarginBasisPoints < 0 ? 'is-danger' : p.netMarginBasisPoints > 2000 ? 'is-success' : ''}`}>
                              {(p.netMarginBasisPoints / 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {data.projects.length === 0 && (
                        <tr><td colSpan={5} className="eco-empty">No projects found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Projects" && (
            <div className="eco-project-grid">
              {data.projects.map(p => (
                <div key={p.projectId} className="eco-panel project-card">
                  <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 className="eco-link" style={{ margin: "0 0 4px 0" }} onClick={() => onOpenProject(p.projectId)}>{p.projectName}</h3>
                      <div className="eco-muted" style={{ fontSize: 12 }}>Client: {p.client || "None"}</div>
                    </div>
                    {p.accessRole === "owner" && (
                      <button className="ehs-ghost-btn" onClick={() => openSettingsModal(p)}>
                        <Settings size={14} style={{ marginRight: 6 }} /> Settings
                      </button>
                    )}
                  </div>
                  <div className="project-card-stats">
                    <div className="pc-stat">
                      <span>Revenue</span>
                      <strong>{fmtMinor(p.revenueMinor)}</strong>
                    </div>
                    <div className="pc-stat">
                      <span>Expenses</span>
                      <strong>{fmtMinor(p.totalExpensesMinor)}</strong>
                    </div>
                    <div className="pc-stat">
                      <span>Margin</span>
                      <strong className={p.netMarginBasisPoints < 0 ? 'text-danger' : 'text-success'}>
                        {(p.netMarginBasisPoints / 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                  
                  <div className="breakdown-list">
                    {p.categories.map(cat => {
                      const percent = cat.budgetMinor > 0 ? Math.min((cat.actualMinor / cat.budgetMinor) * 100, 100) : 0;
                      const isOver = cat.varianceMinor < 0; // if actual > budget, variance is negative

                      return (
                        <div key={cat.category} className="breakdown-item">
                          <div className="bd-labels">
                            <span className="bd-name">{cat.category}</span>
                            <div className="bd-values">
                              <strong>{fmtMinor(cat.actualMinor)}</strong>
                              <span className="bd-divider">/</span>
                              <span className="bd-budget">
                                {cat.budgetMinor > 0 ? fmtMinor(cat.budgetMinor) : "No budget"}
                              </span>
                            </div>
                          </div>
                          <div className="bd-bar-bg">
                            <div 
                              className={`bd-bar-fill ${isOver ? 'is-over' : ''}`} 
                              style={{ width: `${percent}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {data.projects.length === 0 && (
                <div className="eco-empty">No projects found.</div>
              )}
            </div>
          )}

          {activeTab === "Timecards" && (
            <div className="eco-panel">
              <div className="panel-header" style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Timecards & Hours Master Queue
                </h3>
              </div>
              <div className="eco-table-wrap">
                <table className="eco-table">
                  <thead>
                    <tr>
                      <th>Freelancer</th>
                      <th>Project</th>
                      <th>Date</th>
                      <th>Hours (Net)</th>
                      <th>Cost</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.timecards.sort((a,b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime()).map(t => {
                      const costMinor = (t.flatFeeMinor ?? 0) > 0 ? t.flatFeeMinor! : Math.ceil((t.payableMinutes * t.rateMinor) / 60);
                      return (
                        <tr key={t.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{t.freelancerName}</div>
                            {t.notes && <div className="eco-muted" style={{ fontSize: 11, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.notes}>{t.notes}</div>}
                          </td>
                          <td>
                            <span className="eco-link" onClick={() => onOpenProject(t.projectId)}>{t.projectName}</span>
                          </td>
                          <td>{format(parseISO(t.workDate), "MMM d, yyyy")}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{fmtHours(t.payableMinutes)} ({minToHHMM(t.payableMinutes)})</div>
                            {(t.producerAdjustmentMinutes || 0) !== 0 && (
                              <div style={{ fontSize: 11, color: "var(--primary)" }}>
                                Adj: {t.producerAdjustmentMinutes! > 0 ? '+' : ''}{t.producerAdjustmentMinutes}m
                              </div>
                            )}
                          </td>
                          <td>{fmtMinor(costMinor)}</td>
                          <td>
                            <span className={`eco-status-pill status-${t.status}`}>{t.status}</span>
                            {t.flagReason && <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 4 }}>Flag: {t.flagReason}</div>}
                          </td>
                          <td>
                            {t.accessRole === "owner" && (
                              <div className="eco-row-actions">
                                {t.status === "submitted" && (
                                  <>
                                    <button className="btn-approve" onClick={() => handleTimecardDecide(t.id, "approve")}><CheckCircle size={14} /> Approve</button>
                                    <button className="btn-reject" onClick={() => setTimecardRejectDraft({ id: t.id, decision: "reject", reason: "" })}><XCircle size={14} /> Reject</button>
                                    <button className="btn-flag" onClick={() => setTimecardRejectDraft({ id: t.id, decision: "flag", reason: "" })}><Flag size={14} /> Flag</button>
                                  </>
                                )}
                                {t.status === "submitted" && (
                                  <button className="btn-adjust" onClick={() => setTimecardAdjustDraft({
                                    id: t.id,
                                    breakMinutes: t.producerBreakMinutes ?? t.breakMinutes,
                                    adjustmentMinutes: t.producerAdjustmentMinutes || 0,
                                    overtimeMinutes: t.overtimeMinutes,
                                    reason: ""
                                  })}><Edit2 size={14} /> Adjust</button>
                                )}
                                {t.status === "approved" && (
                                  <button className="btn-lock" onClick={() => handleTimecardLock(t.id)}><Lock size={14} /> Lock</button>
                                )}
                              </div>
                            )}
                            {t.accessRole !== "owner" && <span className="eco-muted">Read only</span>}
                          </td>
                        </tr>
                      )
                    })}
                    {data.timecards.length === 0 && (
                      <tr><td colSpan={7} className="eco-empty">No timecards found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Expenses" && (
            <div className="eco-panel">
              <div className="panel-header">
                <h3>Direct Expenses</h3>
              </div>
              <div className="eco-table-wrap">
                <table className="eco-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Vendor / Ref</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.sort((a,b) => new Date(b.incurredOn).getTime() - new Date(a.incurredOn).getTime()).map(e => (
                      <tr key={e.id}>
                        <td>{format(parseISO(e.incurredOn), "MMM d, yyyy")}</td>
                        <td>
                          <span className="eco-link" onClick={() => onOpenProject(e.projectId)}>{e.projectName}</span>
                        </td>
                        <td><span className="eco-tag">{e.category}</span></td>
                        <td>{e.description}</td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{e.vendor || "—"}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.reference || "—"}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{fmtMinor(e.amountMinor)}</td>
                      </tr>
                    ))}
                    {data.expenses.length === 0 && (
                      <tr><td colSpan={6} className="eco-empty">No expenses recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Reconciliation" && (
            <div className="eco-panel">
              <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Easyjob Reconciliation</h3>
                <button className="ehs-ghost-btn" style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600 }} onClick={handleExportCsv}>
                  <Download size={14} style={{ marginRight: 6 }} /> Export Master CSV
                </button>
              </div>
              <div className="eco-table-wrap">
                <table className="eco-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Easyjob Number</th>
                      <th style={{ textAlign: "right" }}>Contract Revenue</th>
                      <th style={{ textAlign: "right" }}>Recorded Revenue</th>
                      <th style={{ textAlign: "right" }}>Difference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projects.map(p => (
                      <tr key={p.projectId}>
                        <td><span className="eco-link" onClick={() => onOpenProject(p.projectId)}>{p.projectName}</span></td>
                        <td style={{ fontFamily: "monospace" }}>{p.easyjob.number || "—"}</td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{fmtMinor(p.revenueMinor)}</td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{fmtMinor(p.easyjob.recordedRevenueMinor)}</td>
                        <td style={{ textAlign: "right", color: (p.easyjob.differenceMinor || 0) < 0 ? "var(--danger)" : (p.easyjob.differenceMinor || 0) > 0 ? "var(--success)" : "inherit" }}>
                          {(p.easyjob.differenceMinor || 0) > 0 ? "+" : ""}{fmtMinor(p.easyjob.differenceMinor)}
                        </td>
                        <td>
                          <span className={`eco-status-pill status-${p.easyjob.status}`}>{p.easyjob.status}</span>
                        </td>
                      </tr>
                    ))}
                    {data.projects.length === 0 && (
                      <tr><td colSpan={6} className="eco-empty">No reconciliation data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* Settings Modal */}
      {settingsDraft && (
        <div className="ehs-modal-backdrop" onClick={() => !savingSettings && setSettingsDraft(null)}>
          <div className="ehs-modal" style={{ maxWidth: 500, width: "100%", minWidth: "min(100vw - 32px, 320px)" }} onClick={e => e.stopPropagation()}>
            <div className="ehs-modal-header">
              <h3>Project Settings: {settingsDraft.projectName}</h3>
              <button className="ehs-ghost-btn" style={{ padding: 4 }} onClick={() => setSettingsDraft(null)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="ehs-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div className="ehs-form-group">
                    <label>Contract Revenue (NOK)</label>
                    <input type="number" required min="0" step="0.01" className="ehs-input" value={settingsDraft.contractRevenueMajor} onChange={e => setSettingsDraft({...settingsDraft, contractRevenueMajor: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>Easyjob Revenue (NOK)</label>
                    <input type="number" min="0" step="0.01" className="ehs-input" value={settingsDraft.easyjobRevenueMajor} onChange={e => setSettingsDraft({...settingsDraft, easyjobRevenueMajor: e.target.value})} />
                  </div>
                </div>

                <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--border-color)" }} />
                <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-main)" }}>Category Budgets (NOK)</h4>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div className="ehs-form-group">
                    <label>Labor</label>
                    <input type="number" min="0" step="0.01" className="ehs-input" value={settingsDraft.laborBudgetMajor} onChange={e => setSettingsDraft({...settingsDraft, laborBudgetMajor: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>Hotel</label>
                    <input type="number" min="0" step="0.01" className="ehs-input" value={settingsDraft.hotelBudgetMajor} onChange={e => setSettingsDraft({...settingsDraft, hotelBudgetMajor: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>Catering</label>
                    <input type="number" min="0" step="0.01" className="ehs-input" value={settingsDraft.cateringBudgetMajor} onChange={e => setSettingsDraft({...settingsDraft, cateringBudgetMajor: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>Transport</label>
                    <input type="number" min="0" step="0.01" className="ehs-input" value={settingsDraft.transportBudgetMajor} onChange={e => setSettingsDraft({...settingsDraft, transportBudgetMajor: e.target.value})} />
                  </div>
                  <div className="ehs-form-group">
                    <label>Sub-Rentals</label>
                    <input type="number" min="0" step="0.01" className="ehs-input" value={settingsDraft.subRentalsBudgetMajor} onChange={e => setSettingsDraft({...settingsDraft, subRentalsBudgetMajor: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="ehs-modal-footer">
                <button type="button" className="ehs-ghost-btn" onClick={() => setSettingsDraft(null)}>Cancel</button>
                <button type="submit" className="ehs-primary-btn" disabled={savingSettings}>
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {expenseDraft && (
        <div className="ehs-modal-backdrop" onClick={() => !savingExpense && setExpenseDraft(null)}>
          <div className="ehs-modal" style={{ width: "100%", minWidth: "min(100vw - 32px, 320px)" }} onClick={e => e.stopPropagation()}>
            <div className="ehs-modal-header">
              <h3>Add Direct Expense</h3>
              <button className="ehs-ghost-btn" style={{ padding: 4 }} onClick={() => setExpenseDraft(null)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="ehs-modal-body">
                <div className="ehs-form-group">
                  <label>Project</label>
                  <select 
                    required
                    className="ehs-input" 
                    value={expenseDraft.projectId} 
                    onChange={e => setExpenseDraft({...expenseDraft, projectId: e.target.value})}
                  >
                    {data?.projects.map(p => (
                      <option key={p.projectId} value={p.projectId} disabled={p.accessRole === 'viewer'}>{p.projectName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div className="ehs-form-group">
                    <label>Category</label>
                    <select 
                      required 
                      className="ehs-input" 
                      value={expenseDraft.category} 
                      onChange={e => setExpenseDraft({...expenseDraft, category: e.target.value as EconomyCategory})}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="ehs-form-group">
                    <label>Date</label>
                    <input type="date" required className="ehs-input" value={expenseDraft.date} onChange={e => setExpenseDraft({...expenseDraft, date: e.target.value})} />
                  </div>
                </div>
                <div className="ehs-form-group">
                  <label>Amount (NOK)</label>
                  <input type="number" required min="0" step="0.01" className="ehs-input" value={expenseDraft.amountMajor} onChange={e => setExpenseDraft({...expenseDraft, amountMajor: e.target.value})} placeholder="0.00" />
                </div>
                <div className="ehs-form-group">
                  <label>Description</label>
                  <input required className="ehs-input" value={expenseDraft.description} onChange={e => setExpenseDraft({...expenseDraft, description: e.target.value})} placeholder="e.g. Hotel for local crew" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div className="ehs-form-group">
                    <label>Vendor (Optional)</label>
                    <input className="ehs-input" value={expenseDraft.vendor} onChange={e => setExpenseDraft({...expenseDraft, vendor: e.target.value})} placeholder="e.g. Scandic" />
                  </div>
                  <div className="ehs-form-group">
                    <label>Reference (Optional)</label>
                    <input className="ehs-input" value={expenseDraft.reference} onChange={e => setExpenseDraft({...expenseDraft, reference: e.target.value})} placeholder="e.g. Inv 1042" />
                  </div>
                </div>
              </div>
              <div className="ehs-modal-footer">
                <button type="button" className="ehs-ghost-btn" onClick={() => setExpenseDraft(null)}>Cancel</button>
                <button type="submit" className="ehs-primary-btn" disabled={savingExpense}>
                  {savingExpense ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timecard Adjust Modal */}
      {timecardAdjustDraft && (
        <div className="ehs-modal-backdrop" onClick={() => !savingTimecard && setTimecardAdjustDraft(null)}>
          <div className="ehs-modal" style={{ maxWidth: 400, width: "100%", minWidth: "min(100vw - 32px, 320px)" }} onClick={e => e.stopPropagation()}>
            <div className="ehs-modal-header">
              <h3>Adjust Timecard</h3>
              <button className="ehs-ghost-btn" style={{ padding: 4 }} onClick={() => setTimecardAdjustDraft(null)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={handleSaveTimecardAdjust}>
              <div className="ehs-modal-body">
                <div className="ehs-form-group">
                  <label>Break Minutes</label>
                  <input type="number" required min="0" className="ehs-input" value={timecardAdjustDraft.breakMinutes} onChange={e => setTimecardAdjustDraft({...timecardAdjustDraft, breakMinutes: parseInt(e.target.value) || 0})} />
                </div>
                <div className="ehs-form-group">
                  <label>Adjustment Minutes (+/-)</label>
                  <input type="number" required className="ehs-input" value={timecardAdjustDraft.adjustmentMinutes} onChange={e => setTimecardAdjustDraft({...timecardAdjustDraft, adjustmentMinutes: parseInt(e.target.value) || 0})} />
                </div>
                <div className="ehs-form-group">
                  <label>Overtime Minutes</label>
                  <input type="number" required min="0" className="ehs-input" value={timecardAdjustDraft.overtimeMinutes} onChange={e => setTimecardAdjustDraft({...timecardAdjustDraft, overtimeMinutes: parseInt(e.target.value) || 0})} />
                </div>
                <div className="ehs-form-group">
                  <label>Reason (Required for adjustment)</label>
                  <input required className="ehs-input" value={timecardAdjustDraft.reason} onChange={e => setTimecardAdjustDraft({...timecardAdjustDraft, reason: e.target.value})} placeholder="e.g. Forgot to clock out" />
                </div>
              </div>
              <div className="ehs-modal-footer">
                <button type="button" className="ehs-ghost-btn" onClick={() => setTimecardAdjustDraft(null)}>Cancel</button>
                <button type="submit" className="ehs-primary-btn" disabled={savingTimecard}>
                  {savingTimecard ? "Saving..." : "Save Adjustments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timecard Reject/Flag Modal */}
      {timecardRejectDraft && (
        <div className="ehs-modal-backdrop" onClick={() => !savingTimecard && setTimecardRejectDraft(null)}>
          <div className="ehs-modal" style={{ maxWidth: 400, width: "100%", minWidth: "min(100vw - 32px, 320px)" }} onClick={e => e.stopPropagation()}>
            <div className="ehs-modal-header">
              <h3>{timecardRejectDraft.decision === 'flag' ? 'Flag' : 'Reject'} Timecard</h3>
              <button className="ehs-ghost-btn" style={{ padding: 4 }} onClick={() => setTimecardRejectDraft(null)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleTimecardDecide(timecardRejectDraft.id, timecardRejectDraft.decision, timecardRejectDraft.reason); }}>
              <div className="ehs-modal-body">
                <div className="ehs-form-group">
                  <label>Reason (Visible to freelancer)</label>
                  <textarea required className="ehs-input" rows={3} value={timecardRejectDraft.reason} onChange={e => setTimecardRejectDraft({...timecardRejectDraft, reason: e.target.value})} placeholder="Please explain why..." />
                </div>
              </div>
              <div className="ehs-modal-footer">
                <button type="button" className="ehs-ghost-btn" onClick={() => setTimecardRejectDraft(null)}>Cancel</button>
                <button type="submit" className="ehs-primary-btn" disabled={savingTimecard}>
                  {savingTimecard ? "Submitting..." : `Submit ${timecardRejectDraft.decision}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .eco-container {
          padding: 0 16px 40px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .eco-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }
        .eco-title {
          font-size: 1.5rem;
          font-weight: 300;
          margin: 0 0 8px 0;
          color: var(--text-main);
        }
        .eco-subtitle {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0;
        }
        .eco-actions {
          display: flex;
          gap: 12px;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .eco-tabs {
          display: flex;
          gap: 32px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 24px;
        }
        .eco-tab {
          background: none;
          border: none;
          padding: 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .eco-tab:hover {
          color: var(--text-main);
        }
        .eco-tab.is-active {
          color: var(--primary);
        }
        .eco-tab.is-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
        }
        .eco-tab-badge {
          background: var(--danger);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 99px;
          line-height: 1;
        }

        .eco-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .eco-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .eco-kpi-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
        }
        .kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .kpi-label {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 300;
          color: var(--text-main);
          margin-bottom: 4px;
        }
        .kpi-meta {
          font-size: 12px;
          color: var(--text-muted);
        }
        .text-success { color: var(--success); }
        .text-danger { color: var(--danger); }

        .eco-panel {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .panel-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }

        .eco-project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }
        .project-card-stats {
          display: flex;
          padding: 16px 20px;
          gap: 16px;
          background: var(--surface-soft);
          border-bottom: 1px solid var(--border-color);
        }
        .pc-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pc-stat span {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
        }
        .pc-stat strong {
          font-size: 14px;
          color: var(--text-main);
        }

        .breakdown-list {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bd-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .bd-name {
          font-weight: 600;
          color: var(--text-main);
          text-transform: capitalize;
        }
        .bd-values {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .bd-divider {
          color: var(--text-muted);
        }
        .bd-budget {
          color: var(--text-muted);
        }
        .bd-bar-bg {
          height: 6px;
          background: var(--input-bg);
          border-radius: 99px;
          overflow: hidden;
        }
        .bd-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 99px;
          transition: width 0.3s ease;
        }
        .bd-bar-fill.is-over {
          background: var(--danger);
        }

        .eco-table-wrap {
          overflow-x: auto;
        }
        .eco-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .eco-table th {
          text-align: left;
          padding: 12px 20px;
          color: var(--text-muted);
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
          background: var(--surface-soft);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .eco-table td {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
          vertical-align: middle;
        }
        .eco-table tr:last-child td {
          border-bottom: none;
        }
        .eco-table tbody tr:hover {
          background: rgba(0,0,0,0.02);
        }
        
        .eco-link {
          color: var(--primary);
          cursor: pointer;
          font-weight: 600;
        }
        .eco-link:hover {
          text-decoration: underline;
        }
        .eco-muted {
          color: var(--text-muted);
        }
        .eco-empty {
          text-align: center;
          padding: 32px !important;
          color: var(--text-muted);
        }

        .eco-tag {
          background: var(--input-bg);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .eco-tag.is-success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .eco-tag.is-danger { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

        .eco-status-pill {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-submitted, .status-pending { background: rgba(245, 158, 11, 0.1); color: rgb(245, 158, 11); }
        .status-approved, .status-matched { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .status-rejected, .status-mismatch { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
        .status-locked, .status-unlinked { background: var(--input-bg); color: var(--text-muted); }
        .status-flagged { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
        .status-draft { background: var(--input-bg); color: var(--text-muted); }

        .eco-row-actions {
          display: flex;
          gap: 6px;
        }
        .btn-approve, .btn-reject, .btn-lock, .btn-flag, .btn-adjust {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-approve { background: var(--success); color: white; }
        .btn-reject { background: transparent; border: 1px solid var(--danger); color: var(--danger); }
        .btn-flag { background: var(--danger); color: white; }
        .btn-lock { background: var(--primary); color: white; }
        .btn-adjust { background: var(--input-bg); color: var(--text-main); border: 1px solid var(--border-color); }
      `}} />
    </div>
  );
}
