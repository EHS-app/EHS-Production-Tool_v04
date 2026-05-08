import React from "react";
import {
  Printer,
  Send,
  UserPlus,
  Search,
  Moon,
  Sun,
  ChevronDown,
  MoreVertical,
  Check,
  Clock,
  AlertCircle,
  Phone,
  Hotel,
  Utensils
} from "lucide-react";
import { cn } from "@/lib/utils";
import ehsLogo from "../ehs-redesign/ehs-logo.png";

export default function ProductionTool() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-[#E8E3DD] bg-[#161514] overflow-hidden">
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
        .amber-accent { color: #FFBF00; }
        .ehs-orange { color: #F88000; }
        
        .brass-border { border-color: #5A4A3A; }
      `}} />
      
      <div className="fixed inset-0 pointer-events-none bg-texture z-0 mix-blend-overlay"></div>

      {/* Top Nav */}
      <header className="h-14 flex items-center justify-between px-6 border-b brass-border bg-[#1A1918] relative z-10">
        <div className="flex items-center gap-6">
          <img src={ehsLogo} alt="EHS" className="h-6 opacity-90 sepia-[0.2]" />
          <div className="h-6 w-px bg-[#33302C]"></div>
          <nav className="flex items-center gap-1 font-industrial text-[11px] font-semibold text-[#8C8780]">
            {["Inspection", "Rigging", "Lighting", "LED Screens", "Stage", "Sound", "Rigg Plan", "Crew & Logistics", "Catering", "Hotel"].map(t => (
              <button key={t} className={cn("px-3 py-1.5 rounded transition-colors", t === "Crew & Logistics" ? "bg-[#2C2A27] text-[#D4CFC7] shadow-inner" : "hover:text-[#C59B6D]")}>
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B665F]" size={14} />
            <input type="text" placeholder="Search..." className="bg-[#121110] border border-[#2C2A27] rounded text-[12px] pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#C59B6D] text-[#E8E3DD] w-48 font-ui placeholder:text-[#6B665F]" />
          </div>
          <button className="tactile-btn w-8 h-8 flex items-center justify-center rounded text-[#8C8780] hover:text-[#C59B6D]">
            <Moon size={14} />
          </button>
          <button className="tactile-btn px-2 h-8 flex items-center justify-center rounded text-[#8C8780] font-industrial text-[10px]">
            EN
          </button>
        </div>
      </header>

      {/* Project Header */}
      <div className="px-8 py-6 border-b brass-border bg-[#161514] relative z-10 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-industrial text-[11px] text-amber-accent bg-[#FFBF00]/10 px-2 py-0.5 rounded border border-[#FFBF00]/20">BUILD DAY 2 OF 4</span>
            <span className="font-mono-num text-[12px] text-[#8C8780]">14–17 MAY 2026</span>
            <span className="font-ui text-[12px] text-[#8C8780]">CLIENT: NRK</span>
          </div>
          <h1 className="font-industrial text-3xl text-[#E8E3DD] tracking-wide">
            OSLO SPEKTRUM <span className="text-[#6B665F] font-normal">—</span> AURORA FESTIVAL 2026
          </h1>
        </div>
        <div className="flex gap-3">
          <button className="tactile-btn h-9 px-4 rounded flex items-center gap-2 font-industrial text-[11px] text-[#D4CFC7] hover:text-white">
            <Printer size={14} /> PRINT HANDOFF
          </button>
          <button className="tactile-btn h-9 px-4 rounded flex items-center gap-2 font-industrial text-[11px] text-[#D4CFC7] hover:text-white">
            <Send size={14} /> SEND BRIEF
          </button>
          <button className="h-9 px-4 rounded flex items-center gap-2 font-industrial text-[11px] text-[#121110] bg-[#C59B6D] hover:bg-[#D4AC80] shadow-[0_2px_10px_rgba(197,155,109,0.2)] font-bold">
            <UserPlus size={14} /> ADD CREW
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10 p-6 gap-6">
        
        {/* Table Area */}
        <div className="flex-1 flex flex-col tactile-card rounded-md overflow-hidden">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1A1918] sticky top-0 z-10 shadow-[0_1px_0_#2C2A27]">
                <tr>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Name</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Role</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Status</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Working Days (14-17)</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Hotel</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Food</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Phone</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780] text-right">Day Rate</th>
                  <th className="py-3 px-4 font-industrial text-[10px] text-[#8C8780]">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2A27] font-ui text-[13px] text-[#D4CFC7]">
                {[
                  { name: "Magnus Berg", role: "Crew Chief", status: "Confirmed", days: [1,1,1,1], hotel: "Yes 402", room: "Solo", food: "Kjøtt", phone: "+47 912 34 567", rate: "6500", note: "Keys" },
                  { name: "Ingrid Solheim", role: "Lighting Tech", status: "Confirmed", days: [1,1,1,1], hotel: "Yes 403", room: "Kari H.", food: "Vegetar", phone: "+47 923 45 678", rate: "4800", note: "" },
                  { name: "Kari Hansen", role: "Lighting Tech", status: "Confirmed", days: [1,1,1,1], hotel: "Yes 403", room: "Ingrid S.", food: "Fisk", phone: "+47 934 56 789", rate: "4800", note: "" },
                  { name: "Ola Nordmann", role: "Rigger", status: "Pending", days: [1,1,0,0], hotel: "No", room: "-", food: "Kjøtt", phone: "+47 945 67 890", rate: "5000", note: "Local" },
                  { name: "Per Gynt", role: "Rigger", status: "Confirmed", days: [1,1,0,0], hotel: "No", room: "-", food: "Kjøtt", phone: "+47 956 78 901", rate: "5000", note: "Local" },
                  { name: "Anne Lise", role: "LED Tech", status: "Confirmed", days: [1,1,1,1], hotel: "Yes 405", room: "Solo", food: "Allergi (Nøtter)", phone: "+47 967 89 012", rate: "5200", note: "" },
                  { name: "Jens Stoltenberg", role: "Stagehand", status: "Declined", days: [0,0,0,0], hotel: "-", room: "-", food: "-", phone: "+47 978 90 123", rate: "3500", note: "Sick" },
                  { name: "Erna Solberg", role: "Stagehand", status: "Standby", days: [1,1,1,1], hotel: "TBD", room: "-", food: "Kjøtt", phone: "+47 989 01 234", rate: "3500", note: "" },
                  { name: "Harald Hårfagre", role: "Sound Engineer", status: "Confirmed", days: [0,1,1,1], hotel: "Yes 406", room: "Olav T.", food: "Kjøtt", phone: "+47 990 12 345", rate: "6000", note: "Late arr." },
                  { name: "Olav Tryggvason", role: "FOH", status: "Confirmed", days: [0,1,1,1], hotel: "Yes 406", room: "Harald H.", food: "Fisk", phone: "+47 901 23 456", rate: "6500", note: "" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-[#24221F] transition-colors group">
                    <td className="py-3 px-4 font-medium text-[#E8E3DD]">{row.name}</td>
                    <td className="py-3 px-4 text-[#8C8780]">{row.role}</td>
                    <td className="py-3 px-4">
                      {row.status === "Confirmed" && <span className="inline-flex items-center gap-1.5 text-[#5CB85C] bg-[#5CB85C]/10 px-2 py-0.5 rounded text-[11px] font-industrial border border-[#5CB85C]/20"><Check size={10}/> {row.status}</span>}
                      {row.status === "Pending" && <span className="inline-flex items-center gap-1.5 text-amber-accent bg-[#FFBF00]/10 px-2 py-0.5 rounded text-[11px] font-industrial border border-[#FFBF00]/20"><Clock size={10}/> {row.status}</span>}
                      {row.status === "Declined" && <span className="inline-flex items-center gap-1.5 text-[#D9534F] bg-[#D9534F]/10 px-2 py-0.5 rounded text-[11px] font-industrial border border-[#D9534F]/20"><AlertCircle size={10}/> {row.status}</span>}
                      {row.status === "Standby" && <span className="inline-flex items-center gap-1.5 text-[#8C8780] bg-[#8C8780]/10 px-2 py-0.5 rounded text-[11px] font-industrial border border-[#8C8780]/20"><AlertCircle size={10}/> {row.status}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {row.days.map((d, j) => (
                          <div key={j} className={cn("w-6 h-6 rounded-sm flex items-center justify-center font-mono-num text-[10px]", d ? "bg-[#C59B6D] text-[#121110] font-bold shadow-sm" : "bg-[#1A1918] text-[#4A4641] border border-[#2C2A27]")}>
                            {["14","15","16","17"][j]}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[12px]">{row.hotel}</div>
                      <div className="text-[10px] text-[#6B665F]">{row.room}</div>
                    </td>
                    <td className="py-3 px-4 text-[12px]">{row.food}</td>
                    <td className="py-3 px-4 font-mono-num text-[11px] text-[#8C8780]">{row.phone}</td>
                    <td className="py-3 px-4 font-mono-num text-[12px] text-right">{row.rate}</td>
                    <td className="py-3 px-4 text-[#8C8780] text-[12px] relative">
                      {row.note}
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#6B665F] hover:text-[#C59B6D]">
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-72 flex flex-col gap-4">
          <div className="tactile-card p-5 rounded-md">
            <h3 className="font-industrial text-[11px] text-[#8C8780] mb-4">PRODUCTION SUMMARY</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end pb-3 border-b border-[#2C2A27]">
                <div className="text-[#6B665F] text-[12px] font-ui">Total Crew</div>
                <div className="font-mono-num text-xl text-[#E8E3DD]">10</div>
              </div>
              <div className="flex justify-between items-end pb-3 border-b border-[#2C2A27]">
                <div className="text-[#6B665F] text-[12px] font-ui">Confirmed</div>
                <div className="font-mono-num text-xl text-[#5CB85C]">7</div>
              </div>
              <div className="flex justify-between items-end pb-3 border-b border-[#2C2A27]">
                <div className="text-[#6B665F] text-[12px] font-ui">Pending</div>
                <div className="font-mono-num text-xl text-amber-accent">1</div>
              </div>
              <div className="flex justify-between items-end pt-2">
                <div className="text-[#6B665F] text-[12px] font-ui">Est. Day Rates</div>
                <div className="font-mono-num text-xl text-brass-accent">NOK 50.8k</div>
              </div>
            </div>
          </div>

          <div className="tactile-card p-5 rounded-md flex-1">
            <h3 className="font-industrial text-[11px] text-[#8C8780] mb-4">LOGISTICS TALLY</h3>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-[#E8E3DD]">
                <Hotel size={14} className="text-[#8C8780]" />
                <span className="font-industrial text-[12px]">HOTEL ROOMS</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1A1918] border border-[#2C2A27] rounded p-2 text-center">
                  <div className="font-mono-num text-lg text-[#D4CFC7]">2</div>
                  <div className="font-ui text-[10px] text-[#6B665F] mt-1">SINGLES</div>
                </div>
                <div className="bg-[#1A1918] border border-[#2C2A27] rounded p-2 text-center">
                  <div className="font-mono-num text-lg text-[#D4CFC7]">2</div>
                  <div className="font-ui text-[10px] text-[#6B665F] mt-1">DOUBLES</div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 text-[#E8E3DD]">
                <Utensils size={14} className="text-[#8C8780]" />
                <span className="font-industrial text-[12px]">CATERING (PER DAY)</span>
              </div>
              <div className="space-y-2 font-ui text-[12px]">
                <div className="flex justify-between items-center bg-[#1A1918] border border-[#2C2A27] px-3 py-1.5 rounded">
                  <span className="text-[#8C8780]">Kjøtt</span>
                  <span className="font-mono-num text-[#D4CFC7]">5</span>
                </div>
                <div className="flex justify-between items-center bg-[#1A1918] border border-[#2C2A27] px-3 py-1.5 rounded">
                  <span className="text-[#8C8780]">Fisk</span>
                  <span className="font-mono-num text-[#D4CFC7]">2</span>
                </div>
                <div className="flex justify-between items-center bg-[#1A1918] border border-[#2C2A27] px-3 py-1.5 rounded">
                  <span className="text-[#8C8780]">Vegetar</span>
                  <span className="font-mono-num text-[#D4CFC7]">1</span>
                </div>
                <div className="flex justify-between items-center bg-[#2C1F1F] border border-[#5C3A3A] px-3 py-1.5 rounded mt-2">
                  <span className="text-[#D9534F]">Allergi (Nøtter)</span>
                  <span className="font-mono-num text-[#D9534F]">1</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #161514; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #33302C; border-radius: 4px; border: 2px solid #161514; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4A4641; }
      `}} />
    </div>
  );
}