import React from "react";
import { 
  Bell, 
  Search, 
  LayoutDashboard, 
  Wrench, 
  Lightbulb, 
  MonitorPlay, 
  Volume2, 
  Box, 
  Users, 
  BedDouble, 
  Utensils, 
  ChevronDown,
  Calendar,
  MapPin,
  Share2,
  Download,
  Printer,
  ArrowUpRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

// Custom styles for the Stripe variant
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,600&display=swap');

  .stripe-theme {
    --bg-base: #0A0A0F;
    --bg-surface: #11111A;
    --bg-surface-hover: #1A1A24;
    --border-subtle: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.15);
    
    --text-primary: #FFFFFF;
    --text-secondary: #A1A1AA;
    --text-tertiary: #71717A;
    
    --accent-indigo: #6366F1;
    --accent-violet: #8B5CF6;
    
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-base);
    color: var(--text-primary);
  }

  .font-display {
    font-family: 'Playfair Display', serif;
  }

  .surface-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
  }

  .kpi-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%), var(--bg-surface);
    border: 1px solid var(--border-subtle);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
  }
  
  .kpi-card:hover {
    border-color: var(--border-strong);
    background: linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(255,255,255,0) 100%), var(--bg-surface);
  }

  .sparkline {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: draw 2s ease-out forwards;
  }

  @keyframes draw {
    to { stroke-dashoffset: 0; }
  }

  .status-pill-emerald {
    background-color: rgba(16, 185, 129, 0.15);
    color: #34D399;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  
  .status-pill-amber {
    background-color: rgba(245, 158, 11, 0.15);
    color: #FCD34D;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .status-pill-rose {
    background-color: rgba(244, 63, 94, 0.15);
    color: #FB7185;
    border: 1px solid rgba(244, 63, 94, 0.2);
  }

  .nav-item {
    transition: all 0.2s ease;
  }
  .nav-item:hover, .nav-item.active {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }
  .nav-item.active {
    background: rgba(99, 102, 241, 0.1);
    color: #818CF8;
  }

  /* Custom scrollbar for dark mode */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export function Stripe() {
  return (
    <div className="dark">
      <style>{styles}</style>
      <div className="stripe-theme min-h-screen flex w-full">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 flex flex-col bg-[#0A0A0F] shrink-0 sticky top-0 h-screen">
          <div className="p-4 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white leading-tight">EHS Production</span>
                <span className="text-xs text-zinc-500 leading-tight">Producer Workspace</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </div>

          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Søk i prosjekt..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Prosjekt</div>
            <NavItem icon={<LayoutDashboard size={16} />} label="Oversikt" active />
            <NavItem icon={<Wrench size={16} />} label="Rigg" />
            <NavItem icon={<Lightbulb size={16} />} label="Lys" />
            <NavItem icon={<MonitorPlay size={16} />} label="LED" />
            <NavItem icon={<Volume2 size={16} />} label="Lyd" />
            <NavItem icon={<Box size={16} />} label="Scene" />
            
            <div className="px-3 mt-6 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Personell & Logistikk</div>
            <NavItem icon={<Users size={16} />} label="Crew" />
            <NavItem icon={<BedDouble size={16} />} label="Hotell" />
            <NavItem icon={<Utensils size={16} />} label="Catering" />
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User Avatar" className="w-8 h-8 rounded-full border border-white/10" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white leading-tight">Henrik E.</span>
                <span className="text-xs text-zinc-500 leading-tight">Produsent</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0A0A0F]">
          {/* Header */}
          <header className="border-b border-white/10 px-8 py-6 sticky top-0 bg-[#0A0A0F]/80 backdrop-blur-md z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="status-pill-emerald px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Aktiv
                  </span>
                  <span className="text-zinc-500 text-sm">Prosjekt #2026-442</span>
                </div>
                <h1 className="font-display text-3xl text-white mb-3">Stavanger Konserthus — Vårfest 2026</h1>
                <div className="flex items-center gap-6 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>12.–14. mai 2026</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Stavanger Konserthus, Zetlitz</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-sm font-medium text-zinc-300 transition-colors">
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-sm font-medium text-zinc-300 transition-colors">
                  <Download className="w-4 h-4" />
                  Eksporter Client Pack
                </button>
                <button className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-500">
                  <Share2 className="w-4 h-4" />
                  Del brief
                </button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            
            {/* KPI Strip */}
            <div className="grid grid-cols-4 gap-4">
              <KPICard 
                title="Crew booket" 
                value="18 / 22" 
                subtext="4 mangler"
                trend="+2 i dag"
                trendUp
              >
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-indigo-500 w-[81%] rounded-full"></div>
                </div>
              </KPICard>
              <KPICard 
                title="Rigg-belastning" 
                value="4.2 t" 
                subtext="av 6.0 t maks"
                trend="70%"
                trendNeutral
              >
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-emerald-400 w-[70%] rounded-full"></div>
                </div>
              </KPICard>
              <KPICard 
                title="LED-paneler" 
                value="96 stk" 
                subtext="ROE Carbon CB5"
                trend="Klar"
                trendNeutral
              >
                <svg className="w-full h-8 mt-2" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,15 Q25,15 50,5 T100,5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <path d="M0,15 Q25,15 50,5 T100,5" fill="none" stroke="#6366F1" strokeWidth="2" className="sparkline" />
                </svg>
              </KPICard>
              <KPICard 
                title="Estimert kostnad" 
                value="kr 487 200" 
                subtext="Eks. mva"
                trend="+12k"
                trendDown // In costs, up is bad (red)
              >
                 <svg className="w-full h-8 mt-2" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,10 Q25,15 50,8 T100,2" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <path d="M0,10 Q25,15 50,8 T100,2" fill="none" stroke="#F43F5E" strokeWidth="2" className="sparkline" />
                </svg>
              </KPICard>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Left Column (Span 2) */}
              <div className="col-span-2 space-y-6">
                
                {/* Crew & Schedule Matrix */}
                <div className="surface-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#11111A]">
                    <h3 className="font-semibold text-white">Crew & Tidsplan</h3>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Se full kalender &rarr;</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-zinc-400 bg-white/[0.02] border-b border-white/5">
                        <tr>
                          <th className="px-5 py-3 font-medium">Navn & Rolle</th>
                          <th className="px-5 py-3 font-medium">12. mai (Opprigg)</th>
                          <th className="px-5 py-3 font-medium">13. mai (Show)</th>
                          <th className="px-5 py-3 font-medium">14. mai (Nedrigg)</th>
                          <th className="px-5 py-3 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <CrewRow 
                          name="Marius J." role="Rigger" 
                          d1="08:00 - 18:00" d2="16:00 - 23:30" d3="23:30 - 04:00"
                          status="Bekreftet" statusType="success"
                        />
                        <CrewRow 
                          name="Sara H." role="Lystekniker" 
                          d1="10:00 - 20:00" d2="15:00 - 23:30" d3="23:30 - 03:00"
                          status="Bekreftet" statusType="success"
                        />
                        <CrewRow 
                          name="Henrik O." role="LED-tekniker" 
                          d1="09:00 - 19:00" d2="-" d3="23:30 - 03:00"
                          status="Venter svar" statusType="warning"
                        />
                        <CrewRow 
                          name="Ingrid T." role="Lydtekniker" 
                          d1="12:00 - 20:00" d2="14:00 - 23:30" d3="23:30 - 02:00"
                          status="Bekreftet" statusType="success"
                        />
                        <CrewRow 
                          name="Andreas K." role="Stagehand" 
                          d1="08:00 - 16:00" d2="-" d3="-"
                          status="Avlyst" statusType="error"
                        />
                        <CrewRow 
                          name="Kari M." role="Stagehand" 
                          d1="08:00 - 16:00" d2="-" d3="-"
                          status="Bekreftet" statusType="success"
                        />
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Technical Systems */}
                <div>
                  <h3 className="font-semibold text-white mb-4 px-1">Tekniske Systemer</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <SystemCard 
                      icon={<Lightbulb className="w-5 h-5 text-amber-400" />}
                      title="Lys Hovedrigg"
                      metrics={[
                        { label: "Punkter", value: "12 stk" },
                        { label: "Last", value: "1.8 t" },
                        { label: "Fixtures", value: "48 (Robe MegaPointe)" }
                      ]}
                      owner="Sara H."
                    />
                    <SystemCard 
                      icon={<MonitorPlay className="w-5 h-5 text-indigo-400" />}
                      title="LED Bakvegg"
                      metrics={[
                        { label: "Punkter", value: "6 stk" },
                        { label: "Last", value: "1.2 t" },
                        { label: "Paneler", value: "96 (ROE CB5)" }
                      ]}
                      owner="Henrik O."
                    />
                    <SystemCard 
                      icon={<Volume2 className="w-5 h-5 text-emerald-400" />}
                      title="PA L/R Hang"
                      metrics={[
                        { label: "Punkter", value: "4 stk" },
                        { label: "Last", value: "1.0 t" },
                        { label: "Speakers", value: "24 (d&b KSL)" }
                      ]}
                      owner="Ingrid T."
                    />
                  </div>
                </div>

                {/* Logistics Row */}
                <div>
                  <h3 className="font-semibold text-white mb-4 px-1">Logistikk</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="surface-card p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <BedDouble className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white mb-1">Hotell (Clarion Energy)</h4>
                        <div className="text-sm text-zinc-400 space-y-1">
                          <p>8 rom booket (6 enkelt, 2 dobbel)</p>
                          <p>Innsjekk: 12.05 / Utsjekk: 15.05</p>
                        </div>
                      </div>
                    </div>
                    <div className="surface-card p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                        <Utensils className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white mb-1">Catering (Lokalt)</h4>
                        <div className="text-sm text-zinc-400 space-y-1">
                          <p>22 personer totalt</p>
                          <p>3 måltider pr. dag (2 vegan, 1 glutenfri)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (Span 1) */}
              <div className="col-span-1">
                {/* Activity Feed */}
                <div className="surface-card h-full flex flex-col">
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Aktivitet</h3>
                    <MoreVertical className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white" />
                  </div>
                  <div className="p-5 flex-1 relative">
                    {/* Vertical line */}
                    <div className="absolute left-[33px] top-6 bottom-6 w-px bg-white/5"></div>
                    
                    <div className="space-y-6">
                      <ActivityItem 
                        icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        iconBg="bg-emerald-400/10 border-emerald-400/20"
                        title="Marius J. bekreftet"
                        time="10 min siden"
                        desc="Har akseptert forespørsel for 12.–14. mai."
                      />
                      <ActivityItem 
                        icon={<Share2 className="w-4 h-4 text-indigo-400" />}
                        iconBg="bg-indigo-400/10 border-indigo-400/20"
                        title="Brief delt"
                        time="2 timer siden"
                        desc="Brief delt med 6 freelancere via portalen."
                      />
                      <ActivityItem 
                        icon={<FileText className="w-4 h-4 text-amber-400" />}
                        iconBg="bg-amber-400/10 border-amber-400/20"
                        title="Sara H. lastet opp førerkort"
                        time="I går, 14:30"
                        desc="Klasse BE bekreftet for kjøring 12. mai."
                      />
                      <ActivityItem 
                        icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
                        iconBg="bg-blue-400/10 border-blue-400/20"
                        title="Kommentar på Lys-rigg"
                        time="I går, 11:15"
                        desc="Henrik E.: 'Husk å sjekke punkt 4 på tegningen.'"
                      />
                      <ActivityItem 
                        icon={<FileText className="w-4 h-4 text-zinc-400" />}
                        iconBg="bg-zinc-400/10 border-zinc-400/20"
                        title="Oppdatert Scene-tegning"
                        time="Mandag, 09:00"
                        desc="v2.1 lastet opp av Produsent."
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/10 text-center">
                    <button className="text-xs text-zinc-400 hover:text-white font-medium transition-colors">Vis all aktivitet</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer mx-1",
      active ? "active" : "text-zinc-400"
    )}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function KPICard({ title, value, subtext, trend, trendUp, trendDown, trendNeutral, children }: any) {
  return (
    <div className="kpi-card p-5 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-zinc-400">{title}</span>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
          trendUp && "bg-emerald-500/10 text-emerald-400",
          trendDown && "bg-rose-500/10 text-rose-400",
          trendNeutral && "bg-white/5 text-zinc-300"
        )}>
          {trendUp && <ArrowUpRight className="w-3 h-3" />}
          {trendDown && <ArrowUpRight className="w-3 h-3 rotate-90" />}
          {trend}
        </span>
      </div>
      <div className="text-2xl font-semibold text-white mb-1 tracking-tight">{value}</div>
      <div className="text-xs text-zinc-500 mb-2">{subtext}</div>
      <div className="mt-auto">
        {children}
      </div>
    </div>
  );
}

function CrewRow({ name, role, d1, d2, d3, status, statusType }: any) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
      <td className="px-5 py-3">
        <div className="font-medium text-zinc-200">{name}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{role}</div>
      </td>
      <td className="px-5 py-3 text-zinc-400 font-mono text-xs">{d1}</td>
      <td className="px-5 py-3 text-zinc-400 font-mono text-xs">{d2}</td>
      <td className="px-5 py-3 text-zinc-400 font-mono text-xs">{d3}</td>
      <td className="px-5 py-3 text-right">
        <span className={cn(
          "inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border",
          statusType === "success" && "status-pill-emerald",
          statusType === "warning" && "status-pill-amber",
          statusType === "error" && "status-pill-rose",
        )}>
          {statusType === "success" && <CheckCircle2 className="w-3 h-3 mr-1" />}
          {statusType === "warning" && <Clock className="w-3 h-3 mr-1" />}
          {statusType === "error" && <XCircle className="w-3 h-3 mr-1" />}
          {status}
        </span>
      </td>
    </tr>
  );
}

function SystemCard({ icon, title, metrics, owner }: any) {
  return (
    <div className="surface-card p-4 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h4 className="font-medium text-white text-sm">{title}</h4>
      </div>
      <div className="space-y-2 mb-4">
        {metrics.map((m: any, i: number) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-zinc-500">{m.label}</span>
            <span className="text-zinc-300 font-medium">{m.value}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Ansvarlig:</span>
        <span className="text-xs font-medium text-white">{owner}</span>
      </div>
    </div>
  );
}

function ActivityItem({ icon, iconBg, title, time, desc }: any) {
  return (
    <div className="relative pl-10">
      <div className={cn("absolute left-0 w-7 h-7 rounded-full flex items-center justify-center border z-10", iconBg)}>
        {icon}
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-0.5">
          <h4 className="text-sm font-medium text-white">{title}</h4>
          <span className="text-[10px] text-zinc-500 shrink-0 ml-2">{time}</span>
        </div>
        <p className="text-xs text-zinc-400">{desc}</p>
      </div>
    </div>
  );
}
