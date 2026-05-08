import React from "react";
import {
  Menu,
  Search,
  Globe,
  Sun,
  Moon,
  ArrowRight,
  Check,
  X,
  Calendar,
  Clock,
  MapPin,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import ehsLogo from "../ehs-redesign/ehs-logo.png";

const THEME = {
  bg: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0C0D10",
  inkMuted: "#5C5D61",
  border: "#DCDCD9",
  orange: "#F88000",
  blue: "#0038FF",
};

const NAV = [
  "Hub",
  "Forespørsler",
  "Oppdrag",
  "Tilgjengelighet",
  "Inntekter",
  "Profil",
  "Hjelp",
];

export default function FreelancePortal() {
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2026, 4, 14 + i); // May 14, 2026
    const day = d.getDate();
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    // Mock availability: 0 = busy, 1 = available, 2 = tentative
    const status = [0, 0, 0, 0, 1, 1, 1, 2, 2, 1, 0, 0, 1, 1][i];
    return { day, isWeekend, status };
  });

  return (
    <div
      className="min-h-screen w-full flex flex-col antialiased"
      style={{
        backgroundColor: THEME.bg,
        color: THEME.ink,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-sans-swiss { font-family: 'Bricolage Grotesque', sans-serif; }
        .font-mono-swiss { font-family: 'IBM Plex Mono', monospace; }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DCDCD9; }
        ::-webkit-scrollbar-thumb:hover { background: #0C0D10; }
      `}} />

      {/* TOP NAVIGATION */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-black/10">
        <div className="flex items-center gap-8">
          <img src={ehsLogo} alt="EHS" className="h-6 object-contain" style={{ filter: 'grayscale(100%) contrast(200%)' }} />
          <div className="flex items-center gap-3 font-mono-swiss text-[11px] uppercase tracking-wider text-black/60">
            <span className="text-black font-medium">Freelance Portal</span>
            <span>/</span>
            <span>Magnus Berg</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-black/60">
          <div className="flex items-center gap-4 font-mono-swiss text-[10px] uppercase tracking-widest">
            <button className="flex items-center gap-1.5 hover:text-black transition-colors"><Globe size={14} /> NO/EN</button>
            <button className="flex items-center gap-1.5 hover:text-black transition-colors"><Moon size={14} /> Theme</button>
          </div>
        </div>
      </header>

      {/* SUB-NAV */}
      <nav className="flex items-center px-8 border-b border-black/10 overflow-x-auto hide-scrollbar">
        <div className="flex gap-8 font-sans-swiss text-[13px] font-medium tracking-wide">
          {NAV.map((tab) => (
            <button
              key={tab}
              className={cn(
                "py-4 border-b-[3px] transition-colors whitespace-nowrap",
                tab === "Hub" ? "border-black text-black" : "border-transparent text-black/40 hover:text-black"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* MAIN EDITORIAL COLUMN */}
        <div className="flex-1 overflow-auto p-12 lg:p-16 border-r border-black/10 flex flex-col gap-16 max-w-4xl">
          
          {/* Greeting */}
          <section>
            <p className="font-mono-swiss text-[11px] uppercase tracking-widest text-black/50 mb-4">
              14. Mai 2026
            </p>
            <h1 className="font-sans-swiss text-[64px] font-medium leading-none tracking-tight text-black max-w-2xl mb-8">
              God morgen, Magnus.
            </h1>
            <p className="font-sans-swiss text-[20px] text-black/60 max-w-xl leading-relaxed">
              Du har 2 nye forespørsler som venter på svar. Ditt neste oppdrag starter om 2 dager.
            </p>
          </section>

          {/* Pending Briefs */}
          <section>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-sans-swiss text-[28px] font-medium tracking-tight">Forespørsler</h2>
              <p className="font-mono-swiss text-[11px] uppercase tracking-widest text-[#F88000] font-medium">Krever handling</p>
            </div>
            
            <div className="grid grid-cols-1 gap-px bg-black/10 border border-black/10">
              {/* Brief 1 */}
              <div className="bg-white p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono-swiss text-[10px] uppercase tracking-widest bg-black text-white px-2 py-1">Ny forespørsel</span>
                    <span className="font-mono-swiss text-[10px] uppercase tracking-widest text-[#F88000]">Svar innen 14:00 i dag</span>
                  </div>
                  <h3 className="font-sans-swiss text-[22px] font-medium tracking-tight mb-2">Sentrum Scene — Hovedakt</h3>
                  <div className="flex items-center gap-4 font-mono-swiss text-[11px] uppercase tracking-widest text-black/60">
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> 20-21 Mai</span>
                    <span className="flex items-center gap-1.5"><Briefcase size={12} /> Rigger</span>
                    <span className="flex items-center gap-1.5 text-black font-medium">kr 5 500 / dag</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-6 py-3 border border-black/20 hover:border-black font-mono-swiss text-[11px] uppercase tracking-widest transition-colors">
                    <X size={14} /> Avslå
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 text-white font-mono-swiss text-[11px] uppercase tracking-widest transition-colors" style={{ backgroundColor: THEME.blue }}>
                    <Check size={14} /> Godta
                  </button>
                </div>
              </div>

              {/* Brief 2 */}
              <div className="bg-white p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono-swiss text-[10px] uppercase tracking-widest bg-black text-white px-2 py-1">Ny forespørsel</span>
                    <span className="font-mono-swiss text-[10px] uppercase tracking-widest text-black/60">Svar innen 16. Mai</span>
                  </div>
                  <h3 className="font-sans-swiss text-[22px] font-medium tracking-tight mb-2">Oslo Konserthus — Gala</h3>
                  <div className="flex items-center gap-4 font-mono-swiss text-[11px] uppercase tracking-widest text-black/60">
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> 28-29 Mai</span>
                    <span className="flex items-center gap-1.5"><Briefcase size={12} /> Rigger</span>
                    <span className="flex items-center gap-1.5 text-black font-medium">kr 6 000 / dag</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-6 py-3 border border-black/20 hover:border-black font-mono-swiss text-[11px] uppercase tracking-widest transition-colors">
                    <X size={14} /> Avslå
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 text-white font-mono-swiss text-[11px] uppercase tracking-widest transition-colors" style={{ backgroundColor: THEME.blue }}>
                    <Check size={14} /> Godta
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Upcoming Gigs */}
          <section>
            <h2 className="font-sans-swiss text-[28px] font-medium tracking-tight mb-8">Kommende Oppdrag</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal">Dato</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal">Prosjekt</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal">Sted</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal">Rolle</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal text-right">Oppmøte</th>
                </tr>
              </thead>
              <tbody className="font-sans-swiss text-[15px]">
                <tr className="border-b border-black/10 hover:bg-black/[0.02]">
                  <td className="py-4 pr-4 font-mono-swiss text-[12px] whitespace-nowrap">16-18 Mai</td>
                  <td className="py-4 pr-4 font-medium">Aurora Festival 2026</td>
                  <td className="py-4 pr-4 text-black/60">Oslo Spektrum</td>
                  <td className="py-4 pr-4 text-black/60">Crew Chief</td>
                  <td className="py-4 pr-4 text-right font-mono-swiss text-[13px] font-medium">06:00</td>
                </tr>
                <tr className="border-b border-black/10 hover:bg-black/[0.02]">
                  <td className="py-4 pr-4 font-mono-swiss text-[12px] whitespace-nowrap">23 Mai</td>
                  <td className="py-4 pr-4 font-medium">Klubb Natt</td>
                  <td className="py-4 pr-4 text-black/60">Røverstaden</td>
                  <td className="py-4 pr-4 text-black/60">Rigger</td>
                  <td className="py-4 pr-4 text-right font-mono-swiss text-[13px] font-medium">14:00</td>
                </tr>
                <tr className="border-b border-black/10 hover:bg-black/[0.02]">
                  <td className="py-4 pr-4 font-mono-swiss text-[12px] whitespace-nowrap">02-04 Jun</td>
                  <td className="py-4 pr-4 font-medium">Sommerfest</td>
                  <td className="py-4 pr-4 text-black/60">Telenor Arena</td>
                  <td className="py-4 pr-4 text-black/60">Crew Chief</td>
                  <td className="py-4 pr-4 text-right font-mono-swiss text-[13px] font-medium">08:00</td>
                </tr>
              </tbody>
            </table>
          </section>

        </div>

        {/* RIGHT SIDEBAR: STATS & SNAPSHOT */}
        <div className="w-[380px] bg-white p-12 flex flex-col gap-12 overflow-auto">
          
          {/* Earnings */}
          <section>
            <p className="font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 mb-6">Inntekter</p>
            <div className="space-y-8">
              <div>
                <p className="font-sans-swiss text-[40px] font-medium leading-none mb-2 tracking-tight">kr 38 500</p>
                <p className="font-sans-swiss text-[14px] text-black/60">Denne måneden (Mai)</p>
              </div>
              <div className="w-full h-px bg-black/10" />
              <div>
                <p className="font-sans-swiss text-[24px] font-medium leading-none mb-1 tracking-tight">kr 42 000</p>
                <p className="font-sans-swiss text-[12px] text-black/60">Forrige måned (April)</p>
              </div>
              <div className="w-full h-px bg-black/10" />
              <div>
                <p className="font-sans-swiss text-[24px] font-medium leading-none mb-1 tracking-tight">kr 184 200</p>
                <p className="font-sans-swiss text-[12px] text-black/60">Hittil i år (2026)</p>
              </div>
            </div>
            <button className="mt-8 flex items-center gap-2 font-mono-swiss text-[11px] uppercase tracking-widest hover:text-[#0038FF] transition-colors group">
              Se detaljer <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </section>

          {/* Availability */}
          <section className="mt-8">
            <div className="flex items-baseline justify-between mb-6">
              <p className="font-mono-swiss text-[10px] uppercase tracking-widest text-black/50">Tilgjengelighet (14 dager)</p>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-black/10 border border-black/10">
              {next14Days.map((d, i) => (
                <div key={i} className="bg-white aspect-square flex flex-col items-center justify-center relative group cursor-pointer">
                  <span className={cn(
                    "font-mono-swiss text-[11px] z-10",
                    d.isWeekend ? "text-black/30" : "text-black/60"
                  )}>
                    {d.day}
                  </span>
                  
                  {/* Status Indicator */}
                  {d.status === 0 && (
                    <div className="absolute inset-1 border-[1.5px] border-black" />
                  )}
                  {d.status === 1 && (
                    <div className="absolute inset-1 border border-black/10 bg-[#F2F2F0] group-hover:border-black/30 transition-colors" />
                  )}
                  {d.status === 2 && (
                    <div className="absolute inset-1 border-[1.5px] border-[#F88000]" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 font-mono-swiss text-[10px] uppercase tracking-widest text-black/60">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 border-[1.5px] border-black" /> Opptatt
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 border-[1.5px] border-[#F88000]" /> Tentativ
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 border border-black/10 bg-[#F2F2F0]" /> Ledig
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
