import React from "react";
import {
  Activity,
  Inbox,
  Calendar,
  Clock,
  Wallet,
  User,
  HelpCircle,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MapPin,
  TrendingUp,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import ehsLogo from "../ehs-redesign/ehs-logo.png";

export default function FreelancePortal() {
  return (
    <div className="min-h-screen flex font-sans text-[#E8E3DD] bg-[#161514] overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        
        .font-industrial { font-family: 'Barlow', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
        .font-mono-num { font-family: 'JetBrains Mono', monospace; }
        .font-ui { font-family: 'Inter', sans-serif; }
        
        .bg-texture {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
        }
        
        .tactile-btn {
          background: linear-gradient(180deg, #33302C 0%, #24221F 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.4);
          border: 1px solid #141312;
        }
        .tactile-btn:active {
          background: #1C1A18;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        
        .tactile-card {
          background: #1E1C1A;
          border: 1px solid #2C2A27;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .brass-accent { color: #C59B6D; }
        .copper-accent { color: #B87333; }
        .ehs-orange { color: #F88000; }
      `}} />
      
      <div className="fixed inset-0 pointer-events-none bg-texture z-0 mix-blend-overlay"></div>

      {/* Sidebar */}
      <aside className="w-[240px] border-r border-[#2C2A27] bg-[#1A1918] flex flex-col relative z-10">
        <div className="h-20 flex items-center px-6 border-b border-[#2C2A27]">
          <img src={ehsLogo} alt="EHS" className="h-7 opacity-90 sepia-[0.2]" />
        </div>
        
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          {[
            { id: "hub", label: "Hub", icon: Activity, active: true },
            { id: "briefs", label: "Forespørsler", icon: Inbox, badge: 2 },
            { id: "gigs", label: "Oppdrag", icon: Calendar },
            { id: "availability", label: "Tilgjengelighet", icon: Clock },
            { id: "earnings", label: "Inntekter", icon: Wallet },
            { id: "profile", label: "Profil", icon: User },
          ].map(item => (
            <button key={item.id} className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all",
              item.active 
                ? "bg-[#2C2A27] shadow-inner text-[#C59B6D] border border-[#3A3530]" 
                : "text-[#8C8780] hover:text-[#E8E3DD] hover:bg-[#24221F]"
            )}>
              <item.icon size={16} />
              <span className="font-ui font-medium text-[13px] flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-[#C59B6D] text-[#121110] font-mono-num text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          
          <div className="mt-auto pt-6 border-t border-[#2C2A27]">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[#8C8780] hover:text-[#E8E3DD] hover:bg-[#24221F] transition-all">
              <HelpCircle size={16} />
              <span className="font-ui font-medium text-[13px]">Hjelp</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-[#2C2A27] bg-[#161514]">
          <div>
            <div className="font-mono-num text-[11px] text-[#6B665F] mb-1">10. MAI 2026</div>
            <h1 className="font-industrial text-2xl text-[#E8E3DD] tracking-wide">
              GOD MORGEN, MAGNUS
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="tactile-btn w-10 h-10 rounded flex items-center justify-center text-[#8C8780] relative">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#F88000] rounded-full border-2 border-[#24221F]"></span>
            </button>
            <button className="tactile-btn w-10 h-10 rounded flex items-center justify-center text-[#8C8780]">
              <Moon size={16} />
            </button>
            <div className="w-10 h-10 rounded bg-[#2C2A27] border border-[#3A3530] flex items-center justify-center font-industrial text-[14px] text-[#C59B6D] shadow-inner cursor-pointer">
              MB
            </div>
          </div>
        </header>

        {/* Dashboard grid */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="max-w-[1000px] mx-auto flex flex-col gap-6">
            
            {/* Pending Briefs */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-industrial text-[12px] text-[#8C8780]">PENDING FORESPØRSLER (2)</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    project: "Sentrum Scene — Kvelertak",
                    dates: "14–15 Mai 2026",
                    role: "Rigger",
                    rate: "5000",
                    expires: "2 timer"
                  },
                  {
                    project: "Oslo Spektrum — Aurora",
                    dates: "18–20 Mai 2026",
                    role: "Rigger",
                    rate: "5000",
                    expires: "1 dag"
                  }
                ].map((brief, i) => (
                  <div key={i} className="tactile-card rounded-md p-5 border-l-2 border-l-amber-accent">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-ui font-semibold text-[15px] text-[#E8E3DD]">{brief.project}</h3>
                        <div className="text-[#8C8780] text-[12px] font-ui mt-1">{brief.dates} • {brief.role}</div>
                      </div>
                      <div className="font-mono-num text-[14px] text-brass-accent bg-[#C59B6D]/10 px-2 py-1 rounded border border-[#C59B6D]/20">
                        {brief.rate} kr/dag
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex-1 h-9 rounded flex items-center justify-center gap-2 font-industrial text-[11px] text-[#121110] bg-[#C59B6D] hover:bg-[#D4AC80] shadow-[0_2px_10px_rgba(197,155,109,0.2)] font-bold">
                        <CheckCircle2 size={14} /> AKSEPTER
                      </button>
                      <button className="tactile-btn flex-1 h-9 rounded flex items-center justify-center gap-2 font-industrial text-[11px] text-[#8C8780] hover:text-[#D9534F]">
                        <XCircle size={14} /> AVSLÅ
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono-num text-[#6B665F]">
                      <Clock size={12} /> Svarfrist: {brief.expires}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-3 gap-6 mt-2">
              {/* Upcoming Gigs */}
              <section className="col-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-industrial text-[12px] text-[#8C8780]">KOMMENDE OPPDRAG</h2>
                </div>
                <div className="tactile-card rounded-md flex-1">
                  <div className="divide-y divide-[#2C2A27]">
                    {[
                      {
                        project: "Telenor Arena — Corporate",
                        venue: "Telenor Arena",
                        date: "12 Mai",
                        call: "06:00",
                        role: "Rigger"
                      },
                      {
                        project: "Operaen — Ballett Galla",
                        venue: "Operaen",
                        date: "16 Mai",
                        call: "08:00",
                        role: "Rigger"
                      },
                      {
                        project: "Vulkan Arena — Klubb",
                        venue: "Vulkan Arena",
                        date: "22 Mai",
                        call: "12:00",
                        role: "Stagehand"
                      }
                    ].map((gig, i) => (
                      <div key={i} className="p-4 flex items-center hover:bg-[#24221F] transition-colors cursor-pointer group">
                        <div className="w-14 text-center border-r border-[#3A3530] mr-4 pr-4">
                          <div className="font-industrial text-[10px] text-[#8C8780]">{gig.date.split(" ")[1]}</div>
                          <div className="font-mono-num text-lg text-[#E8E3DD]">{gig.date.split(" ")[0]}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-ui font-semibold text-[14px] text-[#D4CFC7] mb-1">{gig.project}</div>
                          <div className="flex items-center gap-4 text-[12px] text-[#6B665F] font-ui">
                            <span className="flex items-center gap-1.5"><MapPin size={12}/> {gig.venue}</span>
                            <span className="flex items-center gap-1.5"><Clock size={12}/> Call: <span className="font-mono-num text-[#8C8780]">{gig.call}</span></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-industrial text-[11px] text-[#C59B6D] mb-1">{gig.role}</div>
                          <FileText size={14} className="text-[#6B665F] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Sidebar content */}
              <div className="flex flex-col gap-6">
                {/* Availability */}
                <section>
                  <h2 className="font-industrial text-[12px] text-[#8C8780] mb-3">TILGJENGELIGHET</h2>
                  <div className="tactile-card rounded-md p-4">
                    <div className="grid grid-cols-7 gap-1">
                      {[
                        {d:"11", s:"busy"},{d:"12", s:"busy"},{d:"13", s:"avail"},{d:"14", s:"tent"},{d:"15", s:"tent"},{d:"16", s:"busy"},{d:"17", s:"avail"},
                        {d:"18", s:"tent"},{d:"19", s:"tent"},{d:"20", s:"tent"},{d:"21", s:"avail"},{d:"22", s:"busy"},{d:"23", s:"avail"},{d:"24", s:"avail"}
                      ].map((day, i) => (
                        <div key={i} className={cn(
                          "aspect-square rounded-[3px] flex flex-col items-center justify-center font-mono-num text-[10px]",
                          day.s === "busy" ? "bg-[#C59B6D] text-[#121110] font-bold" :
                          day.s === "tent" ? "bg-amber-accent/20 text-amber-accent border border-amber-accent/30" :
                          "bg-[#1A1918] text-[#6B665F] border border-[#2C2A27] hover:border-[#4A4641] cursor-pointer"
                        )}>
                          {day.d}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-ui text-[#6B665F]">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#C59B6D]"></div> Opptatt</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-accent/20 border border-amber-accent/30"></div> Opsjon</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#1A1918] border border-[#2C2A27]"></div> Ledig</div>
                    </div>
                  </div>
                </section>

                {/* Earnings */}
                <section>
                  <h2 className="font-industrial text-[12px] text-[#8C8780] mb-3">INNTEKTER</h2>
                  <div className="tactile-card rounded-md p-5">
                    <div className="mb-4">
                      <div className="text-[11px] font-ui text-[#6B665F] mb-1">Denne måneden (Mai)</div>
                      <div className="font-mono-num text-2xl text-[#E8E3DD]">kr 35 000</div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-[#2C2A27]">
                      <div className="flex justify-between items-center font-ui text-[12px]">
                        <span className="text-[#8C8780]">Forrige måned (Apr)</span>
                        <span className="font-mono-num text-[#D4CFC7]">kr 42 500</span>
                      </div>
                      <div className="flex justify-between items-center font-ui text-[12px]">
                        <span className="text-[#8C8780]">Hittil i år (YTD)</span>
                        <span className="font-mono-num text-[#C59B6D]">kr 124 500</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #33302C; border-radius: 4px; border: 2px solid #161514; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4A4641; }
      `}} />
    </div>
  );
}