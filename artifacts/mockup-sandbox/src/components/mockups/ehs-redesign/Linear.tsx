import React from "react";
import { 
  Search, Bell, Plus, Settings, ChevronDown, Calendar, 
  MapPin, Share, Download, Printer, Users, Zap, Speaker, 
  MonitorPlay, Briefcase, Activity, CheckCircle2, Clock, 
  XCircle, ArrowUpRight, Bed, Coffee, AlignLeft, 
  Command, MessageSquare, AlertTriangle, ArrowRight,
  MoreHorizontal
} from "lucide-react";

// Reusable Utility
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Custom Linear-style Card
const LinearCard = ({ children, className, noPadding = false }: { children: React.ReactNode, className?: string, noPadding?: boolean }) => (
  <div className={cn(
    "bg-[#1D1D28] rounded-lg border border-white/5 relative overflow-hidden",
    "before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#8B5CFF]/30 before:to-transparent",
    className
  )}>
    <div className={cn("h-full", !noPadding && "p-4")}>
      {children}
    </div>
  </div>
);

const Kbd = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <kbd className={cn("inline-flex items-center justify-center rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 font-medium shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]", className)}>
    {children}
  </kbd>
);

const Avatar = ({ initials, src, className }: { initials: string, src?: string, className?: string }) => (
  <div className={cn("relative flex items-center justify-center rounded-full bg-[#2A2A35] border border-white/10 overflow-hidden shrink-0", className)}>
    {src ? (
      <img src={src} alt="Avatar" className="w-full h-full object-cover" />
    ) : (
      <span className="text-[10px] font-bold text-gray-300">{initials}</span>
    )}
  </div>
);

const Badge = ({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "success" | "warning" | "error" | "outline" }) => {
  const variants = {
    default: "bg-[#25252F] text-gray-300 border border-white/10",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    error: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    outline: "bg-transparent text-gray-400 border border-white/10"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-mono font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

export function Linear() {
  return (
    <div className="dark bg-[#15151E] text-gray-300 min-h-screen font-sans selection:bg-[#8B5CFF]/30 flex flex-col overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .linear-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .linear-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .linear-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .linear-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .timeline-grid {
          background-size: 40px 100%;
          background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px);
        }
      `}</style>

      {/* Top Command Hint Bar */}
      <div className="h-8 border-b border-white/5 bg-[#15151E] flex items-center justify-center shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
          <div className="flex items-center gap-0.5">
            <Kbd>⌘</Kbd><Kbd>K</Kbd>
          </div>
          <span>Søk eller hopp til...</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-[#15151E] flex flex-col shrink-0 z-20 relative">
          {/* Workspace Switcher */}
          <div className="h-12 flex items-center px-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="h-5 w-5 rounded bg-[#8B5CFF] flex items-center justify-center text-white font-bold text-[10px] shadow-[0_0_10px_rgba(139,92,255,0.3)]">
              E
            </div>
            <span className="ml-3 font-medium text-sm text-gray-200">EHS Production</span>
            <ChevronDown className="w-3.5 h-3.5 ml-auto text-gray-500 group-hover:text-gray-300" />
          </div>

          {/* Primary Nav */}
          <div className="flex-1 overflow-y-auto linear-scrollbar py-3 px-2 space-y-0.5">
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 text-gray-200 text-sm font-medium group">
              <Activity className="w-4 h-4 text-[#8B5CFF]" />
              <span>Oversikt</span>
              <div className="ml-auto opacity-100 flex items-center gap-1">
                <Kbd>⌘1</Kbd>
              </div>
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors group">
              <Briefcase className="w-4 h-4" />
              <span>Rigg</span>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Kbd>⌘2</Kbd>
              </div>
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors group">
              <Zap className="w-4 h-4" />
              <span>Lys</span>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Kbd>⌘3</Kbd>
              </div>
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors group">
              <MonitorPlay className="w-4 h-4" />
              <span>LED</span>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Kbd>⌘4</Kbd>
              </div>
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors group">
              <Speaker className="w-4 h-4" />
              <span>Lyd</span>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Kbd>⌘5</Kbd>
              </div>
            </a>
            
            <div className="pt-4 pb-1 px-2">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider font-mono">Logistikk</div>
            </div>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Users className="w-4 h-4" /> Crew
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Bed className="w-4 h-4" /> Hotell
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Coffee className="w-4 h-4" /> Catering
            </a>
          </div>

          {/* Quick Capture & User */}
          <div className="p-3 border-t border-white/5">
            <div className="relative mb-4">
              <Plus className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Loggfør hendelse..." 
                className="w-full bg-[#1D1D28] border border-white/5 rounded pl-7 pr-2 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#8B5CFF]/50 transition-colors"
              />
              <Kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 border-none bg-transparent">C</Kbd>
            </div>
            
            <div className="flex items-center gap-3 px-1">
              <div className="relative">
                <Avatar initials="MJ" className="w-7 h-7 bg-gradient-to-br from-gray-700 to-gray-800 text-white" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#15151E] animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">Marius Johansen</div>
                <div className="text-[10px] text-gray-500 truncate font-mono">Produsent</div>
              </div>
              <Settings className="w-3.5 h-3.5 text-gray-600 hover:text-gray-300 cursor-pointer" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto linear-scrollbar relative">
          
          <div className="p-8 md:p-12 space-y-12 lg:pr-[360px] max-w-[1400px]">
            {/* Header Area */}
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 mb-4">
                  <span>PROSJEKT-ID: VÅR-26</span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span className="text-emerald-400">AKTIVT PROSJEKT</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-5" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.03em' }}>
                  Stavanger Konserthus<br/>
                  <span className="text-gray-500">Vårfest 2026</span>
                </h1>
                <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>12.–14. mai 2026</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>Zetlitz-salen</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3 hidden md:flex">
                <div className="flex items-center mr-2 -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#15151E] bg-[#8B5CFF] z-30 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">SH</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#15151E] bg-[#EC4899] z-20 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">HO</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#15151E] bg-[#06B6D4] z-10 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">IT</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#15151E] bg-gray-700 z-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">+5</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium transition-colors text-gray-300">
                    <Share className="w-3.5 h-3.5" /> Del brief
                  </button>
                  <button className="flex items-center justify-center w-8 h-8 rounded bg-[#8B5CFF] hover:bg-[#7a4ce6] text-white shadow-[0_0_12px_rgba(139,92,255,0.4)] transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <LinearCard className="p-5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-500 mb-3 uppercase tracking-wider">Crew Bekreftet</div>
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-white tracking-tight">18</span>
                    <span className="text-sm font-medium text-gray-500">/ 22</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#8B5CFF] rounded-full shadow-[0_0_8px_rgba(139,92,255,0.8)]" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </LinearCard>
              
              <LinearCard className="p-5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-500 mb-3 uppercase tracking-wider">Rigg Belastning</div>
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-white tracking-tight">4.2t</span>
                    <span className="text-sm font-medium text-gray-500">/ 6.0t</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </LinearCard>

              <LinearCard className="p-5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-500 mb-3 uppercase tracking-wider">LED Paneler</div>
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-white tracking-tight">96</span>
                    <span className="text-sm font-medium text-gray-500">ROE CB5</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#06B6D4] bg-[#06B6D4]/10 w-fit px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" /> ALLE KLAR
                  </div>
                </div>
              </LinearCard>

              <LinearCard className="p-5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-500 mb-3 uppercase tracking-wider">System Status</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-10 rounded bg-[#8B5CFF]/10 border border-[#8B5CFF]/30 flex items-center justify-center text-[#8B5CFF] font-mono text-xs shadow-[inset_0_0_10px_rgba(139,92,255,0.1)]" title="Rigging">R</div>
                  <div className="flex-1 h-10 rounded bg-[#EC4899]/10 border border-[#EC4899]/30 flex items-center justify-center text-[#EC4899] font-mono text-xs shadow-[inset_0_0_10px_rgba(236,72,153,0.1)]" title="Lys">L</div>
                  <div className="flex-1 h-10 rounded bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] font-mono text-xs shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]" title="LED">V</div>
                  <div className="flex-1 h-10 rounded border border-white/10 text-gray-500 flex items-center justify-center font-mono text-xs" title="Lyd">S</div>
                </div>
              </LinearCard>
            </div>

            {/* Signature Moment: Bespoke Crew Gantt Timeline */}
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  <div className="w-2 h-4 bg-[#8B5CFF] rounded-sm"></div>
                  Crew Timeline
                </h2>
                <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#8B5CFF]"></div> Rigg</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#EC4899]"></div> Lys</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#06B6D4]"></div> LED</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#F59E0B]"></div> Lyd</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#10B981]"></div> Scene</span>
                </div>
              </div>
              
              <LinearCard noPadding className="overflow-hidden">
                <div className="h-[280px] w-full relative flex flex-col">
                  {/* Timeline Header */}
                  <div className="h-9 border-b border-white/5 flex bg-[#1A1A24]">
                    <div className="w-40 shrink-0 border-r border-white/5 px-4 flex items-center text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      Crew Member
                    </div>
                    <div className="flex-1 flex relative">
                      {/* Day Markers */}
                      <div className="flex-1 border-r border-[#8B5CFF]/20 flex items-center justify-center text-[10px] font-mono text-[#8B5CFF] relative bg-[#8B5CFF]/[0.02]">
                        12. MAI (OPPRIGG)
                      </div>
                      <div className="flex-1 border-r border-white/5 flex items-center justify-center text-[10px] font-mono text-gray-400">
                        13. MAI (SHOW)
                      </div>
                      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-gray-400">
                        14. MAI (NEDRIGG)
                      </div>
                    </div>
                  </div>

                  {/* Timeline Grid & Rows */}
                  <div className="flex-1 flex overflow-hidden relative">
                    {/* Left Column: Names */}
                    <div className="w-40 shrink-0 border-r border-white/5 flex flex-col bg-[#1D1D28] z-10">
                      <div className="flex-1 flex items-center px-4 border-b border-white/5 gap-3 group hover:bg-white/5 cursor-pointer">
                        <Avatar initials="SH" className="w-6 h-6 text-[9px] bg-gradient-to-br from-[#8B5CFF]/80 to-[#8B5CFF]/40 text-white" />
                        <div>
                          <div className="text-xs font-medium text-gray-300">Sara H.</div>
                          <div className="text-[10px] text-gray-500 font-mono">Rigger</div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center px-4 border-b border-white/5 gap-3 group hover:bg-white/5 cursor-pointer">
                        <Avatar initials="HO" className="w-6 h-6 text-[9px] bg-gradient-to-br from-[#EC4899]/80 to-[#EC4899]/40 text-white" />
                        <div>
                          <div className="text-xs font-medium text-gray-300">Henrik O.</div>
                          <div className="text-[10px] text-gray-500 font-mono">Lys</div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center px-4 border-b border-white/5 gap-3 group hover:bg-white/5 cursor-pointer">
                        <Avatar initials="IT" className="w-6 h-6 text-[9px] bg-gradient-to-br from-[#06B6D4]/80 to-[#06B6D4]/40 text-white" />
                        <div>
                          <div className="text-xs font-medium text-gray-300">Ingrid T.</div>
                          <div className="text-[10px] text-gray-500 font-mono">LED</div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center px-4 border-b border-white/5 gap-3 group hover:bg-white/5 cursor-pointer">
                        <Avatar initials="AK" className="w-6 h-6 text-[9px] bg-gradient-to-br from-gray-700 to-gray-600 text-gray-400" />
                        <div>
                          <div className="text-xs font-medium text-gray-500 line-through">Andreas K.</div>
                          <div className="text-[10px] text-rose-500/70 font-mono">Avlyst</div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center px-4 border-b border-white/5 gap-3 group hover:bg-white/5 cursor-pointer">
                        <Avatar initials="KM" className="w-6 h-6 text-[9px] bg-gradient-to-br from-[#10B981]/80 to-[#10B981]/40 text-white" />
                        <div>
                          <div className="text-xs font-medium text-gray-300">Kari M.</div>
                          <div className="text-[10px] text-gray-500 font-mono">Stage</div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Area */}
                    <div className="flex-1 relative timeline-grid bg-[#1A1A24]">
                      {/* Day Dividers */}
                      <div className="absolute inset-y-0 left-[33.33%] w-px bg-dashed border-l-2 border-dashed border-[#8B5CFF]/20 z-0"></div>
                      <div className="absolute inset-y-0 left-[66.66%] w-px bg-dashed border-l border-dashed border-white/10 z-0"></div>

                      {/* Blocks Layer */}
                      <div className="absolute inset-0 z-10">
                        {/* Row 1: Rigger */}
                        <div className="absolute top-0 h-[20%] left-[5%] right-[70%] py-2 group">
                          <div className="h-full bg-[#8B5CFF]/20 border border-[#8B5CFF]/50 rounded text-[10px] font-mono text-[#8B5CFF] flex items-center px-2.5 font-medium transition-all hover:bg-[#8B5CFF]/30 hover:border-[#8B5CFF] relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B5CFF]"></div>
                            08-18
                          </div>
                        </div>
                        <div className="absolute top-0 h-[20%] left-[85%] right-[5%] py-2 group">
                          <div className="h-full bg-[#8B5CFF]/20 border border-[#8B5CFF]/50 rounded text-[10px] font-mono text-[#8B5CFF] flex items-center px-2.5 font-medium transition-all hover:bg-[#8B5CFF]/30 hover:border-[#8B5CFF] relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B5CFF]"></div>
                            22-02
                          </div>
                        </div>

                        {/* Row 2: Lystekniker */}
                        <div className="absolute top-[20%] h-[20%] left-[10%] right-[60%] py-2">
                          <div className="h-full bg-[#EC4899]/20 border border-[#EC4899]/50 rounded text-[10px] font-mono text-[#EC4899] flex items-center px-2.5 font-medium relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EC4899]"></div>
                            10-20
                          </div>
                        </div>
                        <div className="absolute top-[20%] h-[20%] left-[45%] right-[40%] py-2">
                          <div className="h-full bg-[#EC4899]/20 border border-[#EC4899]/50 rounded text-[10px] font-mono text-[#EC4899] flex items-center px-2.5 font-medium relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EC4899]"></div>
                            16-24
                          </div>
                        </div>
                        <div className="absolute top-[20%] h-[20%] left-[85%] right-[5%] py-2">
                          <div className="h-full bg-[#EC4899]/20 border border-[#EC4899]/50 rounded text-[10px] font-mono text-[#EC4899] flex items-center px-2.5 font-medium relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EC4899]"></div>
                            22-04
                          </div>
                        </div>

                        {/* Row 3: LED */}
                        <div className="absolute top-[40%] h-[20%] left-[15%] right-[55%] py-2">
                          <div className="h-full bg-[#06B6D4]/20 border border-[#06B6D4]/50 rounded text-[10px] font-mono text-[#06B6D4] flex items-center px-2.5 font-medium relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06B6D4]"></div>
                            12-22
                          </div>
                        </div>
                        <div className="absolute top-[40%] h-[20%] left-[50%] right-[35%] py-2">
                          <div className="h-full bg-[#06B6D4]/20 border border-[#06B6D4]/50 rounded text-[10px] font-mono text-[#06B6D4] flex items-center px-2.5 font-medium relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06B6D4]"></div>
                            18-24
                          </div>
                        </div>

                        {/* Row 4: Lyd (Cancelled) */}
                        <div className="absolute top-[60%] h-[20%] left-[10%] right-[10%] py-2 flex items-center justify-center pointer-events-none">
                          <div className="h-px bg-rose-500/30 w-full relative border-t border-dashed border-rose-500/50">
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-rose-400 bg-[#1A1A24] px-2 border border-rose-500/20 rounded">AVLYST</span>
                          </div>
                        </div>

                        {/* Row 5: Stage */}
                        <div className="absolute top-[80%] h-[20%] left-[20%] right-[50%] py-2">
                          <div className="h-full bg-[#10B981]/20 border border-[#10B981]/50 rounded text-[10px] font-mono text-[#10B981] flex items-center px-2.5 font-medium relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981]"></div>
                            14-20
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </LinearCard>
            </div>

            {/* Sub-sections: Truss Diagram & Systems */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-12">
              
              {/* Bespoke Domain Illustration: Truss */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <div className="w-2 h-4 bg-gray-500 rounded-sm"></div>
                    Load Distribution
                  </h2>
                  <Badge variant="outline" className="text-[#8B5CFF] border-[#8B5CFF]/30">Front Truss A</Badge>
                </div>
                
                <LinearCard className="p-8 flex flex-col justify-center">
                  <div className="w-full relative py-8">
                    <svg viewBox="0 0 400 120" className="w-full h-auto overflow-visible">
                      <defs>
                        <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <pattern id="truss-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 0 0 L 20 20 M 20 0 L 0 20" stroke="#333340" strokeWidth="1" />
                          <path d="M 0 0 L 0 20" stroke="#333340" strokeWidth="1.5" />
                        </pattern>
                      </defs>
                      
                      {/* Truss Body */}
                      <rect x="20" y="40" width="360" height="20" fill="url(#truss-pattern)" stroke="#4A4A5A" strokeWidth="2" />
                      <path d="M 20 40 L 380 40 M 20 60 L 380 60" stroke="#6B7280" strokeWidth="2" strokeLinecap="square" />
                      <path d="M 380 40 L 380 60" stroke="#4A4A5A" strokeWidth="2" />

                      {/* Hoist Points & Loads */}
                      <g transform="translate(0, 50)">
                        {/* Point 1 */}
                        <circle cx="60" cy="0" r="3" fill="#6B7280" />
                        <line x1="60" y1="0" x2="60" y2="-20" stroke="#6B7280" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="60" y="-25" fill="#6B7280" fontSize="8" fontFamily="monospace" textAnchor="middle">120kg</text>
                        
                        {/* Point 2 */}
                        <circle cx="100" cy="0" r="5" fill="#8B5CFF" opacity="0.7" />
                        <line x1="100" y1="0" x2="100" y2="-25" stroke="#8B5CFF" strokeWidth="1" opacity="0.5" />
                        <text x="100" y="-30" fill="#8B5CFF" fontSize="8" fontFamily="monospace" textAnchor="middle">350kg</text>
                        
                        {/* Point 3 - Heavy */}
                        <circle cx="140" cy="0" r="7" fill="#8B5CFF" filter="url(#glow-violet)" />
                        <line x1="140" y1="0" x2="140" y2="-35" stroke="#8B5CFF" strokeWidth="1.5" />
                        <text x="140" y="-40" fill="#8B5CFF" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">620kg</text>
                        
                        {/* Point 4 */}
                        <circle cx="180" cy="0" r="3" fill="#6B7280" />
                        
                        {/* Point 5 - CRITICAL WARNING */}
                        <circle cx="220" cy="0" r="9" fill="#EF4444" filter="url(#glow-red)" />
                        <circle cx="220" cy="0" r="4" fill="#FFFFFF" />
                        <line x1="220" y1="0" x2="220" y2="-45" stroke="#EF4444" strokeWidth="2" />
                        <rect x="195" y="-62" width="50" height="14" rx="2" fill="#EF4444" filter="url(#glow-red)" />
                        <text x="220" y="-52" fill="#FFFFFF" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">850kg!</text>
                        
                        {/* Point 6 */}
                        <circle cx="260" cy="0" r="4" fill="#8B5CFF" opacity="0.5" />
                        
                        {/* Point 7 */}
                        <circle cx="300" cy="0" r="3" fill="#6B7280" />
                        
                        {/* Point 8 */}
                        <circle cx="340" cy="0" r="6" fill="#8B5CFF" />
                        <line x1="340" y1="0" x2="340" y2="-30" stroke="#8B5CFF" strokeWidth="1.5" />
                        <text x="340" y="-35" fill="#8B5CFF" fontSize="8" fontFamily="monospace" textAnchor="middle">410kg</text>
                      </g>
                    </svg>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8B5CFF]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CFF]"></div> Nominell
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]"></div> Overlast
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-gray-500">CM Lodestar 1t (12 pts)</div>
                  </div>
                </LinearCard>
              </div>

              {/* Technical Inventory List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <div className="w-2 h-4 bg-[#EC4899] rounded-sm"></div>
                    Systems Inventory
                  </h2>
                  <div className="text-[10px] font-mono text-gray-500">LYS & LED</div>
                </div>

                <div className="space-y-3">
                  <div className="group flex items-center justify-between p-3 rounded-lg bg-[#1D1D28] border border-white/5 hover:border-[#EC4899]/30 transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EC4899] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 pl-2">
                      <div className="w-10 h-10 rounded bg-[#15151E] border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">MA3</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-200">GrandMA3 Full-size</div>
                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">KONTROLL</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-gray-400 bg-[#15151E] px-2 py-1 rounded border border-white/5">1 STK</div>
                  </div>
                  
                  <div className="group flex items-center justify-between p-3 rounded-lg bg-[#1D1D28] border border-white/5 hover:border-[#EC4899]/30 transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EC4899] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 pl-2">
                      <div className="w-10 h-10 rounded bg-[#15151E] border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">ROBE</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-200">Robe MegaPointe</div>
                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">ARMATUR • LYS</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-gray-400 bg-[#15151E] px-2 py-1 rounded border border-white/5">24 STK</div>
                  </div>

                  <div className="group flex items-center justify-between p-3 rounded-lg bg-[#1D1D28] border border-[#06B6D4]/20 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06B6D4] shadow-[0_0_10px_#06B6D4]"></div>
                    <div className="flex items-center gap-4 pl-2">
                      <div className="w-10 h-10 rounded bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center text-[10px] font-mono text-[#06B6D4]">CB5</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-200">ROE Carbon CB5</div>
                        <div className="text-[10px] font-mono text-[#06B6D4] mt-0.5">LED-PANEL • KLAR</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-1 rounded border border-[#06B6D4]/20">96 STK</div>
                  </div>
                  
                  <div className="group flex items-center justify-between p-3 rounded-lg bg-[#1D1D28] border border-white/5 hover:border-[#06B6D4]/30 transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06B6D4] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 pl-2">
                      <div className="w-10 h-10 rounded bg-[#15151E] border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">MX40</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-200">NovaStar MX40 Pro</div>
                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">PROSESSOR</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-gray-400 bg-[#15151E] px-2 py-1 rounded border border-white/5">2 STK</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Logistics (Hotels & Catering) - Kept compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pb-12 border-t border-white/5 pt-8">
               <LinearCard className="p-5 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2"><Bed className="w-3 h-3" /> HOTELL</div>
                  <Badge variant="success">BEKREFTET</Badge>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-200">Clarion Hotel Energy</div>
                  <div className="text-sm text-gray-500 mt-1">8 enkeltrom, innsjekk 12.05 kl 15:00</div>
                </div>
              </LinearCard>
              
              <LinearCard className="p-5 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2"><Coffee className="w-3 h-3" /> CATERING</div>
                  <Badge variant="outline">AKTIV</Badge>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-200">22 personer</div>
                  <div className="text-sm text-gray-500 mt-1">3 måltider/dag, 2 vegetar</div>
                </div>
              </LinearCard>
            </div>

          </div>
          
          {/* Right Rail: Activity Feed - Fixed right sidebar style */}
          <aside className="hidden lg:flex w-[340px] border-l border-white/5 bg-[#171720] absolute right-0 top-0 bottom-0 flex-col z-30">
            <div className="h-12 border-b border-white/5 flex items-center px-5 shrink-0 justify-between">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">Activity</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CFF] animate-pulse"></div>
                <span className="text-[10px] font-mono text-gray-500">LIVE</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto linear-scrollbar p-5 space-y-6">
              
              {/* Activity Item 1 */}
              <div className="relative pl-6">
                <div className="absolute left-1.5 top-2 w-px h-full bg-white/5 last:bg-transparent"></div>
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[#171720] border-2 border-[#8B5CFF] z-10 shadow-[0_0_5px_rgba(139,92,255,0.5)]"></div>
                
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">Marius Johansen</span>
                  <span className="text-[10px] font-mono text-gray-500">4m</span>
                </div>
                <div className="text-xs text-gray-400 mb-2 leading-relaxed">Oppdaterte rigg-plan for front truss. Last endret til <span className="text-white font-mono">4.2t</span>.</div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5 text-[10px] font-mono text-gray-300 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <Printer className="w-3 h-3 text-[#8B5CFF]" /> v2_rigg_plan.pdf
                </div>
              </div>

              {/* Activity Item 2 */}
              <div className="relative pl-6">
                <div className="absolute left-1.5 top-2 w-px h-full bg-white/5 last:bg-transparent"></div>
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[#171720] border-2 border-emerald-500 z-10"></div>
                
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">System</span>
                  <span className="text-[10px] font-mono text-gray-500">1t</span>
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">Hotell bekreftet: Clarion Hotel Energy (8 rom)</div>
              </div>

              {/* Activity Item 3 */}
              <div className="relative pl-6">
                <div className="absolute left-1.5 top-2 w-px h-full bg-white/5 last:bg-transparent"></div>
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[#171720] border-2 border-rose-500 z-10"></div>
                
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">Andreas Karlsen</span>
                  <span className="text-[10px] font-mono text-gray-500">12t</span>
                </div>
                <div className="text-xs text-gray-400 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 leading-relaxed">
                  <div className="font-semibold mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Frafall: Sykdom</div>
                  Må dessverre melde forfall til dette oppdraget.
                </div>
              </div>

              {/* Activity Item 4 */}
              <div className="relative pl-6">
                <div className="absolute left-1.5 top-2 w-px h-full bg-transparent"></div>
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[#171720] border-2 border-gray-600 z-10"></div>
                
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">Marius Johansen</span>
                  <span className="text-[10px] font-mono text-gray-500">i går</span>
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">Opprettet prosjektet.</div>
              </div>
              
            </div>
            
            {/* Comment Input */}
            <div className="p-4 border-t border-white/5 bg-[#1A1A24]">
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Skriv kommentar..." 
                  className="w-full bg-[#15151E] border border-white/10 rounded-md pl-9 pr-8 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#8B5CFF]/50 transition-colors shadow-inner"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#8B5CFF] transition-colors p-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
}
