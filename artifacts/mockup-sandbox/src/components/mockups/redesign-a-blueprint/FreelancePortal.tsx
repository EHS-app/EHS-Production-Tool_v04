import React from "react";
import {
  Activity,
  Inbox,
  Calendar,
  Clock,
  Wallet,
  User,
  HelpCircle,
  Moon,
  Check,
  X,
  MapPin,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

import ehsLogo from "../ehs-redesign/ehs-logo.png";

// --- Theme Tokens ---
const T = {
  bg: "#0f151e",
  panel: "#161e2b",
  border: "#223043",
  grid: "#1a2536",
  textPrimary: "#e0e6ed",
  textSecondary: "#859bb3",
  accent: "#f88000",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  rowHover: "#1b2535",
};

const NAV = [
  { id: "hub", label: "Hub", icon: Activity, active: true },
  { id: "briefs", label: "Forespørsler", icon: Inbox, badge: "2" },
  { id: "gigs", label: "Oppdrag", icon: Calendar },
  { id: "availability", label: "Tilgjengelighet", icon: Clock },
  { id: "earnings", label: "Inntekter", icon: Wallet },
  { id: "profile", label: "Profil", icon: User },
  { id: "help", label: "Hjelp", icon: HelpCircle },
];

export default function FreelancePortal() {
  return (
    <div className="min-h-screen text-[13px] font-sans relative overflow-hidden flex" style={{ backgroundColor: T.bg, color: T.textPrimary }}>
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

      <aside className="relative z-10 w-[240px] flex-none border-r border-[#223043] bg-[#0f151e]/90 flex flex-col backdrop-blur-sm">
        <div className="h-16 flex items-center justify-center border-b border-[#223043] px-4">
          <div className="w-20 flex items-center justify-center p-1 bg-white/5 border border-white/10">
            <img src={ehsLogo} alt="EHS" className="w-full object-contain filter brightness-0 invert opacity-80" />
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          <div className="text-[10px] uppercase tracking-widest text-[#859bb3] font-mono px-3 mb-2">Portal.Menu</div>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-[12px] uppercase font-mono tracking-wider transition-colors border",
                  item.active 
                    ? "text-[#f88000] border-[#f88000]/30 bg-[#f88000]/10" 
                    : "text-[#859bb3] border-transparent hover:bg-[#1b2535] hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={14} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-[#f88000] text-[#0f151e] px-1.5 py-0.5 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#223043] flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono">
            <div className="w-8 h-8 bg-[#223043] flex items-center justify-center text-[#e0e6ed] text-[11px] font-bold border border-[#4e647d]">
              MB
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] uppercase text-white font-medium">Magnus Berg</span>
              <span className="text-[10px] uppercase text-[#859bb3]">Rigger / ID-014</span>
            </div>
          </div>
          <button className="text-[#859bb3] hover:text-white">
            <Moon size={14} />
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="max-w-[900px] w-full mx-auto p-8 flex flex-col gap-6">
          
          <header className="font-mono">
            <div className="text-[10px] uppercase tracking-widest text-[#f88000] mb-1">
              {new Date('2026-05-04T08:00:00').toLocaleDateString('nb-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">God morgen, Magnus</h1>
          </header>

          {/* Pending Briefs */}
          <section className="bg-[#161e2b] border border-[#f88000]/50 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-[#f88000]/20 flex items-center justify-center transform translate-x-4 -translate-y-4 rotate-45">
              <AlertTriangle size={10} className="text-[#f88000] -rotate-45" />
            </div>
            
            <div className="text-[11px] uppercase tracking-widest font-mono text-[#f88000] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#f88000] inline-block animate-pulse" />
              Action Required: Pending Briefs (2)
            </div>

            <div className="flex flex-col gap-3">
              {[
                { prj: "Sentrum Scene — Hovedakt", role: "Rigger", dates: "09. - 10. mai", rate: "4500", venue: "Sentrum Scene", deadline: "04:23:00" },
                { prj: "Oslo Konserthus — Gala", role: "Rigger", dates: "14. mai", rate: "4800", venue: "Oslo Konserthus", deadline: "12:15:30" }
              ].map((brief, i) => (
                <div key={i} className="flex items-center justify-between border border-[#223043] bg-[#0f151e] p-3 font-mono">
                  <div>
                    <div className="text-[13px] text-white font-medium uppercase">{brief.prj}</div>
                    <div className="text-[11px] text-[#859bb3] uppercase mt-1 flex items-center gap-3">
                      <span>ROLE: {brief.role}</span>
                      <span className="text-[#4e647d]">|</span>
                      <span>DATES: {brief.dates}</span>
                      <span className="text-[#4e647d]">|</span>
                      <span>RATE: {brief.rate} NOK</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[9px] uppercase text-[#f87171] tracking-widest">Expires in</div>
                      <div className="text-[13px] text-white font-bold">{brief.deadline}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="h-8 px-3 border border-[#f87171]/50 text-[#f87171] hover:bg-[#f87171]/10 flex items-center gap-1 text-[11px] uppercase transition-colors">
                        <X size={12} /> Decline
                      </button>
                      <button className="h-8 px-3 bg-[#34d399]/20 border border-[#34d399]/50 text-[#34d399] hover:bg-[#34d399]/30 flex items-center gap-1 text-[11px] uppercase transition-colors">
                        <Check size={12} /> Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-3 gap-6">
            
            <div className="col-span-2 flex flex-col gap-6">
              {/* Confirmed Gigs */}
              <section className="bg-[#161e2b] border border-[#223043] p-4 flex flex-col gap-4">
                <div className="text-[11px] uppercase tracking-widest font-mono text-[#859bb3] border-b border-[#223043] pb-2">
                  Schedule.Upcoming
                </div>
                
                <div className="flex flex-col gap-0 border border-[#223043] bg-[#0f151e] font-mono text-[12px] uppercase">
                  {[
                    { prj: "Operaen — Sommerfest", venue: "Den Norske Opera", date: "05. mai", call: "07:00", role: "Rigger" },
                    { prj: "Spektrum — Aurora Fest", venue: "Oslo Spektrum", date: "16. - 17. mai", call: "06:30", role: "Rigger" },
                    { prj: "Telenor Arena — Corporate", venue: "Telenor Arena", date: "22. mai", call: "08:00", role: "Stagehand" },
                  ].map((gig, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 p-3 border-b border-[#223043] last:border-0 hover:bg-[#1b2535] transition-colors items-center text-[#e0e6ed]">
                      <div className="col-span-3 text-[#f88000]">{gig.date}</div>
                      <div className="col-span-5">
                        <div className="font-medium">{gig.prj}</div>
                        <div className="text-[10px] text-[#4e647d] mt-0.5">{gig.venue}</div>
                      </div>
                      <div className="col-span-2 text-[#859bb3]">CALL: {gig.call}</div>
                      <div className="col-span-2 text-right text-[#859bb3]">{gig.role}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Availability Snapshot */}
              <section className="bg-[#161e2b] border border-[#223043] p-4">
                <div className="text-[11px] uppercase tracking-widest font-mono text-[#859bb3] border-b border-[#223043] pb-2 mb-4 flex justify-between">
                  <span>Availability.Snapshot (14 Days)</span>
                  <span className="text-[#f88000]">Manage &gt;</span>
                </div>
                
                <div className="flex gap-1 h-12 font-mono text-[9px] uppercase tracking-wider text-center">
                  {Array.from({length: 14}).map((_, i) => {
                    const date = new Date(2026, 4, 4 + i);
                    const dayName = date.toLocaleDateString('nb-NO', { weekday: 'short' });
                    const dayNum = date.getDate();
                    
                    // Mock some statuses
                    let status = "avail";
                    let bg = "bg-[#0f151e] border-[#223043]";
                    let fg = "text-[#859bb3]";
                    
                    if (i === 1 || i === 12 || i === 13) {
                      status = "busy";
                      bg = "bg-[#34d399]/20 border-[#34d399]/40";
                      fg = "text-[#34d399]";
                    } else if (i === 5 || i === 6) {
                      status = "tent";
                      bg = "bg-[#fbbf24]/20 border-[#fbbf24]/40";
                      fg = "text-[#fbbf24]";
                    }
                    
                    return (
                      <div key={i} className={cn("flex-1 flex flex-col items-center justify-center border", bg)}>
                        <span className={fg}>{dayName}</span>
                        <span className={cn("font-bold text-[11px]", fg)}>{dayNum}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 font-mono text-[9px] uppercase text-[#859bb3] justify-end">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#0f151e] border border-[#223043]"></div>Available</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#fbbf24]/20 border border-[#fbbf24]/40"></div>Tentative</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#34d399]/20 border border-[#34d399]/40"></div>Booked</div>
                </div>
              </section>

            </div>

            {/* Earnings Sidebar */}
            <div className="col-span-1">
              <section className="bg-[#161e2b] border border-[#223043] p-4 flex flex-col gap-4 font-mono">
                <div className="text-[11px] uppercase tracking-widest text-[#859bb3] border-b border-[#223043] pb-2">
                  Finance.Summary
                </div>
                
                <div className="bg-[#0f151e] border border-[#223043] p-4">
                  <div className="text-[10px] text-[#859bb3] uppercase mb-1">YTD Earnings</div>
                  <div className="text-2xl text-white font-medium">124 500 NOK</div>
                  <div className="mt-3 h-px bg-[#223043] w-full" />
                  
                  <div className="mt-3 flex flex-col gap-2 text-[11px] uppercase">
                    <div className="flex justify-between items-center text-[#859bb3]">
                      <span>May (Current)</span>
                      <span className="text-white">8 200 NOK</span>
                    </div>
                    <div className="flex justify-between items-center text-[#859bb3]">
                      <span>April</span>
                      <span className="text-white">32 400 NOK</span>
                    </div>
                    <div className="flex justify-between items-center text-[#859bb3]">
                      <span>March</span>
                      <span className="text-white">28 900 NOK</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] uppercase text-[#4e647d] text-center border-t border-[#223043] pt-4">
                  Data updated 2026-05-04 06:14
                </div>
              </section>
            </div>
            
          </div>

        </div>
      </main>
    </div>
  );
}