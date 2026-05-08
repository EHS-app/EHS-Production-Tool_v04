import React from "react";
import { 
  Search, Plus, Settings, ChevronDown, Calendar, 
  MapPin, Share, Download, Printer, Users, Zap, Speaker, 
  MonitorPlay, Briefcase, Activity, CheckCircle2, Clock, 
  XCircle, ArrowUpRight, Bed, Coffee, AlignLeft, 
  Command, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

// Palette
// Base: #0A1628
// Card: #122036
// Border: #1F2D45
// Accent 1 (Aurora): #2EE8A5
// Accent 2 (Cream): #F2EDE0
// Success: #2EE8A5
// Pending: #E8B25A
// Standby: #F2EDE0
// Declined: #BA2026

const StatusIndicator = ({ status, className }: { status: "confirmed" | "pending" | "standby" | "declined" | "active" | "cancelled", className?: string }) => {
  const colors = {
    confirmed: "bg-[#2EE8A5]",
    active: "bg-[#2EE8A5]",
    pending: "bg-[#E8B25A]",
    standby: "bg-[#F2EDE0]",
    declined: "bg-[#BA2026]",
    cancelled: "bg-[#BA2026]"
  };
  
  const labels = {
    confirmed: "Bekreftet",
    active: "Aktiv",
    pending: "Avventer",
    standby: "Standby",
    declined: "Avslått",
    cancelled: "Avlyst"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-0.5 h-3.5", colors[status])} />
      <span className="text-xs text-gray-400 font-inter font-medium">{labels[status]}</span>
    </div>
  );
};

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-[#122036] border border-[#1F2D45] rounded-none", className)}>
    {children}
  </div>
);

const Button = ({ children, className, variant = "primary", size = "default" }: { children: React.ReactNode, className?: string, variant?: "primary" | "secondary" | "ghost", size?: "default" | "sm" | "icon" }) => {
  const variants = {
    primary: "bg-[#2EE8A5] hover:bg-[#25C48A] text-[#0A1628] border border-transparent",
    secondary: "bg-transparent hover:bg-white/5 text-[#F2EDE0] border border-[#1F2D45]",
    ghost: "hover:bg-white/5 text-gray-400 hover:text-[#F2EDE0] border border-transparent"
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-7 px-3 py-1 text-xs",
    icon: "h-8 w-8 p-0 flex items-center justify-center"
  };
  return (
    <button className={cn("inline-flex items-center justify-center font-inter font-medium transition-all duration-200 rounded-none", variants[variant], sizes[size], className)}>
      {children}
    </button>
  );
};

const ProgressBar = ({ value, max, colorClass }: { value: number, max: number, colorClass: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-1 w-full bg-[#1F2D45] overflow-hidden mt-2">
      <div className={cn("h-full", colorClass)} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center bg-transparent border border-[#1F2D45] px-1.5 py-0.5 text-[10px] font-jetbrains text-gray-500">
    {children}
  </kbd>
);

export default function LinearV3() {
  return (
    <div className="bg-[#0A1628] text-gray-300 min-h-screen font-inter selection:bg-[#2EE8A5]/30 flex flex-col md:flex-row overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..900&family=Inter+Tight:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
        
        .font-fraunces { font-family: 'Fraunces', serif; }
        .font-inter { font-family: 'Inter Tight', sans-serif; }
        .font-jetbrains { font-family: 'JetBrains Mono', monospace; }
        
        .linear-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .linear-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .linear-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        .linear-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-[#1F2D45] bg-[#0A1628] flex flex-col shrink-0 relative z-20">
        {/* Workspace Switcher */}
        <div className="h-14 flex items-center px-4 border-b border-[#1F2D45] cursor-pointer hover:bg-white/5 transition-colors group">
          <div className="h-6 w-6 bg-[#122036] border border-[#1F2D45] flex items-center justify-center text-[#F2EDE0] font-fraunces font-bold text-xs">
            E
          </div>
          <span className="ml-3 font-inter font-medium text-sm text-[#F2EDE0]">EHS Production</span>
          <ChevronDown className="w-4 h-4 ml-auto text-gray-500 group-hover:text-[#F2EDE0]" />
        </div>

        {/* Sidebar Actions */}
        <div className="p-3">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] transition-colors text-sm group">
            <Search className="w-4 h-4" />
            <span className="font-inter">Search</span>
            <div className="ml-auto flex items-center gap-1 opacity-60">
              <Kbd><Command className="w-3 h-3" /></Kbd><Kbd>K</Kbd>
            </div>
          </button>
        </div>

        {/* Primary Nav */}
        <div className="flex-1 overflow-y-auto linear-scrollbar py-2 px-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-fraunces font-semibold text-gray-500 uppercase tracking-widest mb-2 px-2 mt-2">Projects</div>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 bg-[#122036] text-[#2EE8A5] border-l-2 border-[#2EE8A5] text-sm font-medium font-inter">
              <Activity className="w-4 h-4" /> Overview
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <Briefcase className="w-4 h-4" /> Rigging
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <Zap className="w-4 h-4" /> Lighting
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <MonitorPlay className="w-4 h-4" /> LED
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <Speaker className="w-4 h-4" /> Audio
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <AlignLeft className="w-4 h-4" /> Stage
            </a>
            
            <div className="text-[10px] font-fraunces font-semibold text-gray-500 uppercase tracking-widest mb-2 px-2 mt-6">Logistics</div>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <Users className="w-4 h-4" /> Crew
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <Bed className="w-4 h-4" /> Hotels
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#122036] text-gray-400 hover:text-[#F2EDE0] text-sm font-medium font-inter border-l-2 border-transparent transition-colors">
              <Coffee className="w-4 h-4" /> Catering
            </a>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-[#1F2D45]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#122036] border border-[#1F2D45] flex items-center justify-center text-xs font-fraunces font-bold text-[#F2EDE0]">
              MJ
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-inter font-medium text-[#F2EDE0] truncate">Marius Jensen</div>
              <div className="text-xs font-inter text-gray-500 truncate">Produsent</div>
            </div>
            <button className="text-gray-500 hover:text-[#F2EDE0]">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto linear-scrollbar relative bg-[#0A1628]">
        {/* Header */}
        <header className="h-16 border-b border-[#1F2D45] px-6 flex items-center justify-between shrink-0 sticky top-0 bg-[#0A1628]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-lg font-fraunces font-semibold text-[#F2EDE0]">Mannskap & Logistikk</h1>
              <span className="text-xs font-inter text-gray-500">Crew & Logistics</span>
            </div>
            <div className="h-6 w-px bg-[#1F2D45] mx-2" />
            <StatusIndicator status="active" />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="hidden sm:flex gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Skriv ut handoff
            </Button>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Share className="w-3.5 h-3.5" />
              Send brief
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full z-10 space-y-8">
          
          {/* Title Area */}
          <div>
            <h2 className="text-2xl font-fraunces font-semibold text-[#F2EDE0] mb-3">
              Aurora Festival 2026
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 font-inter">
              <div className="flex items-center gap-1.5">
                <span className="font-jetbrains">14.–17. mai 2026</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#1F2D45]" />
              <div className="flex items-center gap-1.5">
                <span>Oslo Spektrum</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#1F2D45]" />
              <div className="flex items-center gap-1.5">
                <span>Klient: NRK</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main Column: Crew & Schedule */}
            <div className="lg:col-span-3 space-y-6">
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-fraunces tracking-widest text-[#F2EDE0] uppercase">Mannskapsoversikt</h3>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Legg til mannskap
                </Button>
              </div>
                
              <div className="border border-[#1F2D45] bg-[#122036]">
                <div className="overflow-x-auto linear-scrollbar">
                  <table className="w-full text-sm text-left font-inter">
                    <thead className="bg-[#0A1628] border-b border-[#1F2D45] text-[10px] text-gray-400 uppercase tracking-widest font-fraunces">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Navn & Rolle</th>
                        <th className="px-4 py-3 font-semibold text-center border-l border-[#1F2D45]">14. mai<br/><span className="text-[9px] font-normal text-gray-500 font-inter capitalize">Opprigg</span></th>
                        <th className="px-4 py-3 font-semibold text-center border-l border-[#1F2D45]">15. mai<br/><span className="text-[9px] font-normal text-gray-500 font-inter capitalize">Prøver</span></th>
                        <th className="px-4 py-3 font-semibold text-center border-l border-[#1F2D45]">16. mai<br/><span className="text-[9px] font-normal text-gray-500 font-inter capitalize">Show</span></th>
                        <th className="px-4 py-3 font-semibold text-center border-l border-[#1F2D45]">17. mai<br/><span className="text-[9px] font-normal text-gray-500 font-inter capitalize">Nedrigg</span></th>
                        <th className="px-4 py-3 font-semibold border-l border-[#1F2D45]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2D45] text-gray-300">
                      {/* Crew 1 */}
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#F2EDE0]">Anders Vik</div>
                          <div className="text-xs text-gray-500">Rigg Ansvarlig</div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">08:00 - 20:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]"></td>
                        <td className="p-1 border-l border-[#1F2D45]"></td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">23:00 - 05:00</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-l border-[#1F2D45]">
                          <StatusIndicator status="confirmed" />
                        </td>
                      </tr>
                      {/* Crew 2 */}
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#F2EDE0]">Lars Monsen</div>
                          <div className="text-xs text-gray-500">Lystekniker</div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="border border-dashed border-gray-600 text-gray-400 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">10:00 - 22:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="border border-dashed border-gray-600 text-gray-400 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">12:00 - 20:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="border border-dashed border-gray-600 text-gray-400 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">16:00 - 01:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="border border-dashed border-gray-600 text-gray-400 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">23:00 - 05:00</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-l border-[#1F2D45]">
                          <StatusIndicator status="pending" />
                        </td>
                      </tr>
                      {/* Crew 3 */}
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#F2EDE0]">Silje Berg</div>
                          <div className="text-xs text-gray-500">Lydtekniker</div>
                        </td>
                        <td colSpan={4} className="p-2 border-l border-[#1F2D45] text-center text-[#BA2026] text-xs font-inter">
                          Ikke tilgjengelig
                        </td>
                        <td className="px-4 py-3 border-l border-[#1F2D45]">
                          <StatusIndicator status="declined" />
                        </td>
                      </tr>
                      {/* Crew 4 */}
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#F2EDE0]">Ole Einar</div>
                          <div className="text-xs text-gray-500">LED Tekniker</div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">12:00 - 22:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">14:00 - 18:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">18:00 - 02:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">23:00 - 04:00</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-l border-[#1F2D45]">
                          <StatusIndicator status="confirmed" />
                        </td>
                      </tr>
                      {/* Crew 5 */}
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#F2EDE0]">Kari Nordmann</div>
                          <div className="text-xs text-gray-500">Stagehand</div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">08:00 - 16:00</span>
                          </div>
                        </td>
                        <td className="p-1 border-l border-[#1F2D45]"></td>
                        <td className="p-1 border-l border-[#1F2D45]"></td>
                        <td className="p-1 border-l border-[#1F2D45]">
                          <div className="bg-[#1F2D45] text-gray-300 text-xs py-1.5 px-1 flex flex-col items-center justify-center h-full">
                            <span className="font-jetbrains text-[11px]">23:00 - 04:00</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-l border-[#1F2D45]">
                          <StatusIndicator status="confirmed" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column: Logistics & Summary */}
            <div className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-sm font-fraunces tracking-widest text-[#F2EDE0] uppercase">Oversikt</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 font-inter mb-1">Mannskap totalt</div>
                    <div className="font-jetbrains text-xl text-[#F2EDE0]">10</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-inter mb-1">Bekreftet</div>
                    <div className="font-jetbrains text-xl text-[#2EE8A5]">7</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#1F2D45]">
                    <div className="text-xs text-gray-500 font-inter mb-1">Dagrater totalt</div>
                    <div className="font-jetbrains text-xl text-[#F2EDE0]">kr 53 700</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-[#1F2D45]">
                <h3 className="text-sm font-fraunces tracking-widest text-[#F2EDE0] uppercase">Logistikk</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-inter text-[#F2EDE0]">Hotellrom</h4>
                      <span className="font-jetbrains text-sm text-[#F2EDE0]">4</span>
                    </div>
                    <div className="text-xs text-gray-500 font-inter">Clarion Hotel The Hub</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-inter text-[#F2EDE0]">Catering (Allergier)</h4>
                      <span className="font-jetbrains text-sm text-[#F2EDE0]">10</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-inter text-gray-400 mt-2">
                      <span>Kjøtt: <span className="font-jetbrains text-gray-300">6</span></span>
                      <span>Vegetar: <span className="font-jetbrains text-gray-300">2</span></span>
                      <span>Fisk: <span className="font-jetbrains text-gray-300">2</span></span>
                      <span className="text-[#E8B25A]">Allergi: <span className="font-jetbrains">1</span></span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
