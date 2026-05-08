import React from "react";
import {
  Search,
  Settings,
  Printer,
  Mail,
  UserPlus,
  ChevronDown,
  Moon,
  Globe,
  MoreVertical,
  Filter,
  ArrowUpDown,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

import ehsLogo from "../ehs-redesign/ehs-logo.png";

// --- Theme Tokens ---
// Background: #0f151e
// Panels: #161e2b
// Borders/Grid: #223043
// Text Primary: #e0e6ed
// Text Secondary: #859bb3
// Accent: #f88000 (EHS Orange)
// Monospace data: Space Mono

const T = {
  bg: "#0f151e",
  panel: "#161e2b",
  border: "#223043",
  grid: "#1a2536",
  textPrimary: "#e0e6ed",
  textSecondary: "#859bb3",
  accent: "#f88000",
  rowHover: "#1b2535",
};

const DATA = [
  { id: "M-01", name: "Magnus Berg", role: "Rigger", status: "Confirmed", d1: "✓", d2: "✓", d3: "✓", d4: "✓", hotel: "Yes - 302", mate: "L. Johansen", food: "Kjøtt", phone: "+47 912 34 567", rate: "4500", note: "Climbing gear req" },
  { id: "M-02", name: "Ingrid Solheim", role: "Crew Chief", status: "Confirmed", d1: "✓", d2: "✓", d3: "✓", d4: "✓", hotel: "Yes - 304", mate: "-", food: "Vegetar", phone: "+47 456 78 901", rate: "6000", note: "On site 06:00" },
  { id: "M-03", name: "Kari Hansen", role: "Lighting Tech", status: "Pending", d1: "-", d2: "✓", d3: "✓", d4: "-", hotel: "No", mate: "-", food: "Fisk", phone: "+47 998 87 766", rate: "4200", note: "Waiting for contract" },
  { id: "M-04", name: "Ola Nordmann", role: "LED Tech", status: "Confirmed", d1: "✓", d2: "✓", d3: "✓", d4: "-", hotel: "Yes - 305", mate: "P. Nilsen", food: "Kjøtt", phone: "+47 987 65 432", rate: "4800", note: "" },
  { id: "M-05", name: "Per Nilsen", role: "LED Tech", status: "Confirmed", d1: "✓", d2: "✓", d3: "✓", d4: "-", hotel: "Yes - 305", mate: "O. Nordmann", food: "Allergi (Nøtter)", phone: "+47 901 23 456", rate: "4800", note: "" },
  { id: "M-06", name: "Line Johansen", role: "Rigger", status: "Standby", d1: "✓", d2: "✓", d3: "-", d4: "-", hotel: "Yes - 302", mate: "M. Berg", food: "Kjøtt", phone: "+47 412 34 567", rate: "4500", note: "" },
  { id: "M-07", name: "Espen Lie", role: "Sound Engineer", status: "Declined", d1: "-", d2: "-", d3: "-", d4: "-", hotel: "-", mate: "-", food: "-", phone: "+47 923 45 678", rate: "5000", note: "Double booked" },
  { id: "M-08", name: "Trond Aas", role: "FOH", status: "Confirmed", d1: "-", d2: "-", d3: "✓", d4: "✓", hotel: "Yes - 310", mate: "-", food: "Kjøtt", phone: "+47 934 56 789", rate: "6500", note: "Console setup day 3" },
  { id: "M-09", name: "Siri Moen", role: "Stagehand", status: "Confirmed", d1: "✓", d2: "✓", d3: "✓", d4: "✓", hotel: "No", mate: "-", food: "Vegetar", phone: "+47 945 67 890", rate: "3500", note: "" },
  { id: "M-10", name: "Bjørn Kjos", role: "Stagehand", status: "Pending", d1: "✓", d2: "✓", d3: "-", d4: "-", hotel: "No", mate: "-", food: "Kjøtt", phone: "+47 956 78 901", rate: "3500", note: "" },
  { id: "M-11", name: "Anita Lund", role: "Stagehand", status: "Confirmed", d1: "✓", d2: "✓", d3: "✓", d4: "✓", hotel: "No", mate: "-", food: "Kjøtt", phone: "+47 967 89 012", rate: "3500", note: "" },
];

const StatusPill = ({ status }: { status: string }) => {
  const isConf = status === "Confirmed";
  const isPend = status === "Pending";
  const isDec = status === "Declined";
  const isStd = status === "Standby";

  return (
    <div className={cn(
      "inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono border",
      isConf ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" :
      isPend ? "text-amber-400 border-amber-400/30 bg-amber-400/10" :
      isDec ? "text-rose-400 border-rose-400/30 bg-rose-400/10" :
      "text-blue-400 border-blue-400/30 bg-blue-400/10"
    )}>
      {status}
    </div>
  );
};

export default function ProductionTool() {
  return (
    <div className="min-h-screen text-[13px] font-sans relative overflow-hidden" style={{ backgroundColor: T.bg, color: T.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');
        * {
          font-family: 'Inter', sans-serif;
        }
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        .blueprint-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, ${T.grid} 1px, transparent 1px),
            linear-gradient(to bottom, ${T.grid} 1px, transparent 1px);
        }
        .blueprint-grid::before {
          content: '';
          position: absolute;
          inset: 0;
          background-size: 200px 200px;
          background-image: 
            linear-gradient(to right, ${T.border} 1px, transparent 1px),
            linear-gradient(to bottom, ${T.border} 1px, transparent 1px);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* Grid Background */}
      <div className="absolute inset-0 blueprint-grid opacity-50 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Top Nav Chrome */}
        <header className="flex-none border-b border-[#223043] bg-[#0f151e]/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-4">
              <div className="w-16 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 p-1">
                <img src={ehsLogo} alt="EHS" className="h-full object-contain filter brightness-0 invert opacity-80" />
              </div>
              <div className="h-4 w-px bg-[#223043]" />
              <button className="flex items-center gap-2 text-[#859bb3] hover:text-white transition-colors text-[11px] uppercase tracking-widest font-mono">
                <Search size={14} />
                <span>Search_REF</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 border border-[#223043] rounded bg-[#161e2b] p-0.5">
                <button className="px-2 py-1 text-[10px] uppercase font-mono text-[#859bb3] hover:text-white">EN</button>
                <div className="w-px h-3 bg-[#223043]" />
                <button className="px-2 py-1 text-[10px] uppercase font-mono text-white bg-[#223043] rounded-sm">NO</button>
              </div>
              <button className="p-1.5 text-[#859bb3] hover:text-white border border-transparent hover:border-[#223043] rounded transition-all">
                <Moon size={16} />
              </button>
              <button className="p-1.5 text-[#859bb3] hover:text-white border border-transparent hover:border-[#223043] rounded transition-all">
                <Settings size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center px-4 h-10 gap-6 text-[12px] font-medium border-t border-[#223043] overflow-x-auto">
            {["Inspection", "Rigging", "Lighting", "LED Screens", "Stage", "Sound", "Rigg Plan", "Crew & Logistics", "Catering", "Hotel"].map((tab) => (
              <button 
                key={tab} 
                className={cn(
                  "relative h-full flex items-center whitespace-nowrap transition-colors",
                  tab === "Crew & Logistics" ? "text-white" : "text-[#859bb3] hover:text-white"
                )}
              >
                {tab}
                {tab === "Crew & Logistics" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f88000]" />
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col p-4">
          
          {/* Project Header Spec Sheet */}
          <div className="flex-none bg-[#161e2b] border border-[#223043] p-4 mb-4 font-mono">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#f88000] mb-1">PRJ-2026-042 // Active Phase: Build Day 2 of 4</div>
                <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Oslo Spektrum — Aurora Festival 2026</h1>
                <div className="flex items-center gap-6 mt-2 text-[#859bb3] text-[11px] uppercase">
                  <div><span className="text-[#4e647d]">CLIENT:</span> NRK</div>
                  <div><span className="text-[#4e647d]">VENUE:</span> OSLO SPEKTRUM</div>
                  <div><span className="text-[#4e647d]">DATES:</span> 14–17 MAY 2026</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 flex items-center gap-2 border border-[#223043] bg-[#0f151e] hover:bg-[#1b2535] text-white text-[11px] uppercase tracking-wider transition-colors">
                    <Printer size={14} /> Print Handoff
                  </button>
                  <button className="px-3 py-1.5 flex items-center gap-2 border border-[#223043] bg-[#0f151e] hover:bg-[#1b2535] text-white text-[11px] uppercase tracking-wider transition-colors">
                    <Mail size={14} /> Send Brief
                  </button>
                  <button className="px-3 py-1.5 flex items-center gap-2 border border-[#f88000] bg-[#f88000]/10 hover:bg-[#f88000]/20 text-[#f88000] text-[11px] uppercase tracking-wider transition-colors">
                    <UserPlus size={14} /> Add Crew
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-4 min-h-0">
            {/* Master Crew Table */}
            <div className="flex-1 flex flex-col bg-[#161e2b] border border-[#223043] overflow-hidden">
              <div className="flex-none px-4 py-2 border-b border-[#223043] flex items-center justify-between bg-[#0f151e]/50">
                <div className="text-[11px] uppercase tracking-widest font-mono text-[#859bb3] flex items-center gap-2">
                  <AlertCircle size={14} className="text-[#f88000]" />
                  Logistics.Master_Table
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-[#859bb3] hover:text-white flex items-center gap-1 text-[11px] uppercase font-mono">
                    <Filter size={12} /> Filter
                  </button>
                  <button className="text-[#859bb3] hover:text-white flex items-center gap-1 text-[11px] uppercase font-mono">
                    <ArrowUpDown size={12} /> Sort
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#161e2b] z-10 text-[10px] uppercase font-mono text-[#4e647d] tracking-wider border-b border-[#223043]">
                    <tr>
                      <th className="px-3 py-2 font-normal border-r border-[#223043] w-12">ID</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Name</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Role</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Status</th>
                      <th className="px-2 py-2 font-normal border-r border-[#223043] text-center" title="14 May">D1</th>
                      <th className="px-2 py-2 font-normal border-r border-[#223043] text-center" title="15 May">D2</th>
                      <th className="px-2 py-2 font-normal border-r border-[#223043] text-center" title="16 May">D3</th>
                      <th className="px-2 py-2 font-normal border-r border-[#223043] text-center" title="17 May">D4</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Hotel</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Roommate</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Food</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043]">Phone</th>
                      <th className="px-3 py-2 font-normal border-r border-[#223043] text-right">Rate(NOK)</th>
                      <th className="px-3 py-2 font-normal">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] font-mono text-[#e0e6ed]">
                    {DATA.map((row, i) => (
                      <tr key={row.id} className="border-b border-[#223043]/50 hover:bg-[#1b2535] transition-colors">
                        <td className="px-3 py-2 border-r border-[#223043]/50 text-[#859bb3]">{row.id}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50 font-sans font-medium">{row.name}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50 text-[#859bb3]">{row.role}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50">
                          <StatusPill status={row.status} />
                        </td>
                        <td className={cn("px-2 py-2 border-r border-[#223043]/50 text-center", row.d1 === "✓" ? "text-white" : "text-[#4e647d]")}>{row.d1}</td>
                        <td className={cn("px-2 py-2 border-r border-[#223043]/50 text-center", row.d2 === "✓" ? "text-white" : "text-[#4e647d]")}>{row.d2}</td>
                        <td className={cn("px-2 py-2 border-r border-[#223043]/50 text-center", row.d3 === "✓" ? "text-white" : "text-[#4e647d]")}>{row.d3}</td>
                        <td className={cn("px-2 py-2 border-r border-[#223043]/50 text-center", row.d4 === "✓" ? "text-white" : "text-[#4e647d]")}>{row.d4}</td>
                        <td className={cn("px-3 py-2 border-r border-[#223043]/50", row.hotel.startsWith("Yes") ? "text-white" : "text-[#4e647d]")}>{row.hotel}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50 text-[#859bb3]">{row.mate}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50 text-[#859bb3]">{row.food}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50 text-[#859bb3]">{row.phone}</td>
                        <td className="px-3 py-2 border-r border-[#223043]/50 text-right tabular-nums">{row.rate}</td>
                        <td className="px-3 py-2 text-[#4e647d] text-[11px] truncate max-w-[120px]" title={row.note}>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Summary Panel */}
            <div className="w-64 flex-none flex flex-col gap-4 font-mono">
              <div className="bg-[#161e2b] border border-[#223043] p-4 flex flex-col gap-4">
                <div className="text-[10px] uppercase tracking-widest text-[#f88000] border-b border-[#223043] pb-2">
                  Sys.Summary
                </div>
                
                <div>
                  <div className="text-[10px] text-[#859bb3] uppercase mb-1">Head Count</div>
                  <div className="text-3xl text-white">11</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="border border-[#223043] bg-[#0f151e] p-2 flex flex-col items-center">
                    <span className="text-[#859bb3] uppercase mb-1">Conf</span>
                    <span className="text-emerald-400 text-lg">7</span>
                  </div>
                  <div className="border border-[#223043] bg-[#0f151e] p-2 flex flex-col items-center">
                    <span className="text-[#859bb3] uppercase mb-1">Pend</span>
                    <span className="text-amber-400 text-lg">2</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#223043]">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#859bb3] uppercase">Day-Rate Total</span>
                    <span className="text-white">50 600 NOK</span>
                  </div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#859bb3] uppercase">Hotel Rooms</span>
                    <span className="text-white">4</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#161e2b] border border-[#223043] p-4 flex flex-col gap-4">
                <div className="text-[10px] uppercase tracking-widest text-[#f88000] border-b border-[#223043] pb-2">
                  Dietary.Tally
                </div>
                
                <div className="space-y-2 text-[11px] uppercase">
                  <div className="flex justify-between items-center">
                    <span className="text-[#859bb3]">Kjøtt</span>
                    <span className="text-white bg-[#223043] px-2 py-0.5 rounded-sm">6</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#859bb3]">Vegetar</span>
                    <span className="text-white bg-[#223043] px-2 py-0.5 rounded-sm">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#859bb3]">Fisk</span>
                    <span className="text-white bg-[#223043] px-2 py-0.5 rounded-sm">1</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400 border border-rose-400/20 bg-rose-400/5 p-1">
                    <span>Allergi</span>
                    <span className="font-bold">1</span>
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