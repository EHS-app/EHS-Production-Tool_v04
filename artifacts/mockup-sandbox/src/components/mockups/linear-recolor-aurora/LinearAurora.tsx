import React from "react";
import { 
  Search, Bell, Plus, Settings, ChevronDown, Calendar, 
  MapPin, Share, Download, Printer, Users, Zap, Speaker, 
  MonitorPlay, Briefcase, Activity, CheckCircle2, Clock, 
  XCircle, ArrowUpRight, Bed, Coffee, AlignLeft, 
  Command, MoreHorizontal, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

// Reusable components within the file
const Badge = ({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "success" | "warning" | "error" | "outline" }) => {
  const variants = {
    default: "bg-[#25252F] text-gray-300 border border-white/10",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    error: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    outline: "bg-transparent text-gray-400 border border-white/10"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-[#25252F] border border-white/5 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ children, className, variant = "primary", size = "default" }: { children: React.ReactNode, className?: string, variant?: "primary" | "secondary" | "ghost", size?: "default" | "sm" | "icon" }) => {
  const variants = {
    primary: "bg-[#2EE8A5] hover:bg-[#21C58A] text-white shadow-[0_0_15px_rgba(46,232,165,0.3)] border border-transparent",
    secondary: "bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10",
    ghost: "hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent"
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-7 px-3 py-1 text-xs",
    icon: "h-8 w-8 p-0 flex items-center justify-center"
  };
  return (
    <button className={cn("inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200", variants[variant], sizes[size], className)}>
      {children}
    </button>
  );
};

const ProgressBar = ({ value, max, colorClass }: { value: number, max: number, colorClass: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
      <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center rounded bg-white/10 border border-white/10 px-1.5 text-[10px] font-mono text-gray-400 font-medium">
    {children}
  </kbd>
);

export function LinearAurora() {
  return (
    <div className="dark bg-[#1C1C24] text-gray-300 min-h-screen font-sans selection:bg-[#2EE8A5]/30 flex flex-col md:flex-row overflow-hidden">
      <style>{`
        .linear-glow {
          background: radial-gradient(circle at 50% 0%, rgba(46, 232, 165, 0.15) 0%, rgba(28, 28, 36, 0) 60%);
        }
        .linear-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .linear-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .linear-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .linear-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Sidebar - Linear Style */}
      <aside className="w-full md:w-64 border-r border-white/5 bg-[#1C1C24] flex flex-col shrink-0 relative z-20">
        {/* Workspace Switcher */}
        <div className="h-14 flex items-center px-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors group">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-[#2EE8A5] to-[#1A6B4D] flex items-center justify-center text-white font-bold text-xs shadow-inner">
            E
          </div>
          <span className="ml-3 font-medium text-sm text-gray-200">EHS Production</span>
          <ChevronDown className="w-4 h-4 ml-auto text-gray-500 group-hover:text-gray-300" />
        </div>

        {/* Sidebar Actions */}
        <div className="p-3">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-sm group">
            <Search className="w-4 h-4" />
            <span>Search</span>
            <div className="ml-auto flex items-center gap-1 opacity-60">
              <Kbd><Command className="w-3 h-3" /></Kbd><Kbd>K</Kbd>
            </div>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-sm mt-1">
            <Plus className="w-4 h-4" />
            <span>New Issue</span>
            <div className="ml-auto flex items-center gap-1 opacity-60">
              <Kbd>C</Kbd>
            </div>
          </button>
        </div>

        {/* Primary Nav */}
        <div className="flex-1 overflow-y-auto linear-scrollbar py-2 px-3">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 mt-2">Prosjekt</div>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#2EE8A5]/10 text-[#2EE8A5] text-sm font-medium">
              <Activity className="w-4 h-4" /> Oversikt
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Briefcase className="w-4 h-4" /> Rigg
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Zap className="w-4 h-4" /> Lys
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <MonitorPlay className="w-4 h-4" /> LED
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Speaker className="w-4 h-4" /> Lyd
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <AlignLeft className="w-4 h-4" /> Scene
            </a>
            
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 mt-6">Logistikk</div>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Users className="w-4 h-4" /> Crew
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Bed className="w-4 h-4" /> Hotell
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors">
              <Coffee className="w-4 h-4" /> Catering
            </a>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">Marius Jensen</div>
              <div className="text-xs text-gray-500 truncate">Produsent</div>
            </div>
            <button className="text-gray-500 hover:text-gray-300">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto linear-scrollbar relative">
        <div className="absolute inset-0 pointer-events-none linear-glow z-0" />
        
        {/* Header */}
        <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 sticky top-0 bg-[#1C1C24]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <span>Prosjekter</span>
              <span>/</span>
              <span className="text-gray-200 font-medium">Vårfest 2026</span>
            </div>
            <Badge variant="success" className="ml-2">Aktiv</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center mr-4 -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-[#1C1C24] bg-indigo-500 z-30" />
              <div className="w-6 h-6 rounded-full border-2 border-[#1C1C24] bg-pink-500 z-20" />
              <div className="w-6 h-6 rounded-full border-2 border-[#1C1C24] bg-teal-500 z-10" />
            </div>
            
            <Button variant="ghost" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" className="hidden sm:flex gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Client Pack
            </Button>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Share className="w-3.5 h-3.5" />
              Del brief
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full z-10 space-y-8">
          
          {/* Title Area */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">
              Stavanger Konserthus — Vårfest 2026
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>12.–14. mai 2026</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>Zetlitz, Stavanger Konserthus</span>
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-b from-[#25252F] to-[#1F1F28] hover:border-white/10 transition-colors">
              <div className="text-xs font-medium text-gray-400 mb-1 flex items-center justify-between">
                Crew booket
                <Users className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-semibold text-white">18</span>
                <span className="text-sm text-gray-500">/ 22</span>
              </div>
              <ProgressBar value={18} max={22} colorClass="bg-[#2EE8A5]" />
            </Card>
            
            <Card className="p-4 bg-gradient-to-b from-[#25252F] to-[#1F1F28] hover:border-white/10 transition-colors">
              <div className="text-xs font-medium text-gray-400 mb-1 flex items-center justify-between">
                Rigg-belastning
                <Briefcase className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-semibold text-white">4.2<span className="text-lg">t</span></span>
                <span className="text-sm text-gray-500">/ 6.0t maks</span>
              </div>
              <ProgressBar value={4.2} max={6.0} colorClass="bg-emerald-500" />
            </Card>

            <Card className="p-4 bg-gradient-to-b from-[#25252F] to-[#1F1F28] hover:border-white/10 transition-colors">
              <div className="text-xs font-medium text-gray-400 mb-1 flex items-center justify-between">
                LED-paneler
                <MonitorPlay className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-semibold text-white">96</span>
                <span className="text-sm text-gray-500">stk</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2 flex">
                <div className="h-full bg-blue-500 w-[60%]" />
                <div className="h-full bg-blue-400/50 w-[40%]" />
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-b from-[#25252F] to-[#1F1F28] hover:border-white/10 transition-colors">
              <div className="text-xs font-medium text-gray-400 mb-1 flex items-center justify-between">
                Estimert kostnad
                <Activity className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-semibold text-white">487k</span>
                <span className="text-sm text-gray-500">NOK</span>
              </div>
              <ProgressBar value={80} max={100} colorClass="bg-amber-500" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Crew & Schedule */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Crew Timeline Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2EE8A5]" /> Crew Schedule
                  </h2>
                  <Button variant="secondary" size="sm">Se full tidsplan</Button>
                </div>
                
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto linear-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#1C1C24]/50 border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium w-[30%]">Navn & Rolle</th>
                          <th className="px-4 py-3 font-medium text-center border-l border-white/5">12. mai<br/><span className="text-[10px] font-normal text-gray-500">Opprigg</span></th>
                          <th className="px-4 py-3 font-medium text-center border-l border-white/5">13. mai<br/><span className="text-[10px] font-normal text-gray-500">Show</span></th>
                          <th className="px-4 py-3 font-medium text-center border-l border-white/5">14. mai<br/><span className="text-[10px] font-normal text-gray-500">Nedrigg</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        <tr className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-200">Sara H.</div>
                                <div className="text-xs text-gray-500">Rigger</div>
                              </div>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-[#2EE8A5]/20 border border-[#2EE8A5]/30 text-[#2EE8A5] text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">08:00 - 18:00</span>
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5"></td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-[#2EE8A5]/20 border border-[#2EE8A5]/30 text-[#2EE8A5] text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">22:00 - 02:00</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-200">Henrik L.</div>
                                <div className="text-xs text-gray-500">Lystekniker</div>
                              </div>
                              <Clock className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full border-dashed">
                              <span className="font-semibold">10:00 - 20:00</span>
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full border-dashed">
                              <span className="font-semibold">16:00 - 24:00</span>
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full border-dashed">
                              <span className="font-semibold">22:00 - 04:00</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-200">Ingrid B.</div>
                                <div className="text-xs text-gray-500">LED-tekniker</div>
                              </div>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-[#2EE8A5]/20 border border-[#2EE8A5]/30 text-[#2EE8A5] text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">12:00 - 22:00</span>
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-[#2EE8A5]/20 border border-[#2EE8A5]/30 text-[#2EE8A5] text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">18:00 - 24:00</span>
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-[#2EE8A5]/20 border border-[#2EE8A5]/30 text-[#2EE8A5] text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">22:00 - 04:00</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-200">Andreas K.</div>
                                <div className="text-xs text-gray-500">Lydtekniker</div>
                              </div>
                              <XCircle className="w-3.5 h-3.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td colSpan={3} className="p-2 border-l border-white/5 text-center text-rose-400 text-xs font-medium">
                            Avlyst
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-200">Kari M.</div>
                                <div className="text-xs text-gray-500">Stagehand</div>
                              </div>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-white/5 border border-white/10 text-gray-300 text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">14:00 - 20:00</span>
                            </div>
                          </td>
                          <td className="p-1 border-l border-white/5"></td>
                          <td className="p-1 border-l border-white/5">
                            <div className="bg-white/5 border border-white/10 text-gray-300 text-xs py-1.5 px-2 rounded flex flex-col items-center justify-center h-full">
                              <span className="font-semibold">22:00 - 04:00</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-[#1C1C24]/80 p-2.5 border-t border-white/5 text-xs flex justify-between text-gray-500 items-center">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#2EE8A5]"></div> Bekreftet</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Venter svar</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Avlyst</span>
                    </div>
                    <span>18 av 22 bekreftet</span>
                  </div>
                </Card>
              </div>

              {/* Technical Systems */}
              <div className="space-y-3 pt-4">
                <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-blue-400" /> Technical Systems
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Sys Card 1 */}
                  <Card className="p-4 hover:border-white/10 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 rounded-bl-full -z-10 group-hover:bg-yellow-500/10 transition-colors" />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-200">Lys Hovedrigg</h3>
                        <p className="text-xs text-gray-500">Robe MegaPointe, GrandMA3</p>
                      </div>
                      <Badge variant="outline"><Zap className="w-3 h-3 text-yellow-400" /></Badge>
                    </div>
                    <div className="space-y-2 mt-4 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Punkter</span>
                        <span className="text-gray-200">12 stk</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Belastning</span>
                        <span className="text-gray-200">1.8 t / <span className="text-gray-500">2.0 t</span></span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tekniker</span>
                        <span className="text-gray-200">Henrik L.</span>
                      </div>
                    </div>
                  </Card>

                  {/* Sys Card 2 */}
                  <Card className="p-4 hover:border-white/10 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full -z-10 group-hover:bg-blue-500/10 transition-colors" />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-200">LED Bakvegg</h3>
                        <p className="text-xs text-gray-500">ROE Carbon CB5, 12x4m</p>
                      </div>
                      <Badge variant="outline"><MonitorPlay className="w-3 h-3 text-blue-400" /></Badge>
                    </div>
                    <div className="space-y-2 mt-4 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Paneler</span>
                        <span className="text-gray-200">96 stk</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Belastning</span>
                        <span className="text-gray-200">1.2 t / <span className="text-gray-500">1.5 t</span></span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tekniker</span>
                        <span className="text-gray-200">Ingrid B.</span>
                      </div>
                    </div>
                  </Card>

                  {/* Sys Card 3 */}
                  <Card className="p-4 hover:border-white/10 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full -z-10 group-hover:bg-rose-500/10 transition-colors" />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-200">PA L/R Hang</h3>
                        <p className="text-xs text-gray-500">d&b KSL, J-SUBs</p>
                      </div>
                      <Badge variant="outline"><Speaker className="w-3 h-3 text-rose-400" /></Badge>
                    </div>
                    <div className="space-y-2 mt-4 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Høyttalere</span>
                        <span className="text-gray-200">24 stk</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Belastning</span>
                        <span className="text-gray-200">1.2 t / <span className="text-gray-500">2.5 t</span></span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tekniker</span>
                        <span className="text-rose-400">Mangler</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

            </div>

            {/* Right Column: Logistics & Feed */}
            <div className="space-y-6">
              
              {/* Logistics Row */}
              <div className="space-y-3">
                <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Logistics
                </h2>
                
                <div className="flex flex-col gap-3">
                  <Card className="p-3.5 flex items-start gap-4">
                    <div className="bg-white/5 p-2.5 rounded-lg text-gray-300">
                      <Bed className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-200">Clarion Energy</h4>
                      <div className="text-xs text-gray-500 mt-0.5">8 rom reservert</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-gray-400">Innsjekk 12.05</span>
                        <a href="#" className="text-xs text-[#2EE8A5] hover:underline flex items-center">Detaljer <ArrowUpRight className="w-3 h-3 ml-0.5"/></a>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3.5 flex items-start gap-4">
                    <div className="bg-white/5 p-2.5 rounded-lg text-gray-300">
                      <Coffee className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-200">Catering</h4>
                      <div className="text-xs text-gray-500 mt-0.5">3 måltider/dag</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-gray-400">22 personer</span>
                        <a href="#" className="text-xs text-[#2EE8A5] hover:underline flex items-center">Meny <ArrowUpRight className="w-3 h-3 ml-0.5"/></a>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" /> Activity
                  </h2>
                </div>
                
                <Card className="p-4">
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    
                    {/* Item 1 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute left-0 h-full w-0.5 bg-white/10 ml-[11px] -z-10" />
                      <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="text-gray-300"><span className="font-medium text-gray-200">Marius J.</span> bekreftet 12.–14. mai</p>
                        <p className="text-xs text-gray-500 mt-0.5">2 timer siden</p>
                      </div>
                    </div>
                    
                    {/* Item 2 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute left-0 h-full w-0.5 bg-white/10 ml-[11px] -z-10" />
                      <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Share className="w-3 h-3 text-[#2EE8A5]" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="text-gray-300">Brief delt med <span className="font-medium text-gray-200">6 freelancere</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">5 timer siden</p>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute left-0 h-full w-0.5 bg-white/10 ml-[11px] -z-10" />
                      <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Download className="w-3 h-3 text-blue-400" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="text-gray-300"><span className="font-medium text-gray-200">Sara H.</span> lastet opp førerkort</p>
                        <p className="text-xs text-gray-500 mt-0.5">I går, 14:30</p>
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute left-0 h-full w-0.5 bg-white/10 ml-[11px] -z-10" />
                      <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-[#2EE8A5]/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(46,232,165,0.4)]">
                        <Plus className="w-3 h-3 text-[#2EE8A5]" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="text-gray-300">Prosjekt opprettet</p>
                        <p className="text-xs text-gray-500 mt-0.5">2 dager siden</p>
                      </div>
                    </div>

                  </div>
                </Card>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
