import React from "react";
import {
  Menu,
  Search,
  Globe,
  Sun,
  Moon,
  Printer,
  Send,
  Plus,
  ChevronDown,
  Phone,
  AlertCircle,
  Check,
  X
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

const TABS = [
  "Befaring",
  "Rigging",
  "Lighting",
  "LED Screens",
  "Stage",
  "Sound",
  "Rigg Plan",
  "Crew & Logistics",
  "Catering",
  "Hotel",
];

const CREW = [
  { name: "Magnus Berg", role: "Crew Chief", status: "Confirmed", d1: true, d2: true, d3: true, d4: true, hotel: "Yes (204)", room: "-", food: "Kjøtt", phone: "+47 912 34 567", rate: "6500", note: "Arrives early" },
  { name: "Ingrid Solheim", role: "Lighting Tech", status: "Confirmed", d1: true, d2: true, d3: true, d4: true, hotel: "Yes (205)", room: "Kari H.", food: "Vegetar", phone: "+47 432 10 987", rate: "5200", note: "" },
  { name: "Kari Hansen", role: "Lighting Tech", status: "Confirmed", d1: false, d2: true, d3: true, d4: false, hotel: "Yes (205)", room: "Ingrid S.", food: "Kjøtt", phone: "+47 987 65 432", rate: "5200", note: "" },
  { name: "Lars Olsen", role: "Rigger", status: "Pending", d1: true, d2: false, d3: false, d4: true, hotel: "No", room: "-", food: "Fisk", phone: "+47 999 88 777", rate: "5500", note: "Awaiting reply" },
  { name: "Sofia Nilsen", role: "LED Tech", status: "Confirmed", d1: true, d2: true, d3: true, d4: true, hotel: "Yes (208)", room: "-", food: "Allergi (Nøtter)", phone: "+47 444 55 666", rate: "5800", note: "" },
  { name: "Henrik Moen", role: "Stagehand", status: "Declined", d1: false, d2: false, d3: false, d4: false, hotel: "-", room: "-", food: "-", phone: "+47 911 22 333", rate: "3500", note: "Booked elsewhere" },
  { name: "Jonas Lie", role: "Stagehand", status: "Standby", d1: true, d2: true, d3: false, d4: false, hotel: "No", room: "-", food: "Kjøtt", phone: "+47 400 30 200", rate: "3500", note: "" },
  { name: "Emma Bakke", role: "Sound Engineer", status: "Confirmed", d1: true, d2: true, d3: true, d4: true, hotel: "Yes (210)", room: "-", food: "Vegetar", phone: "+47 955 44 333", rate: "6000", note: "" },
  { name: "Ole Karlsen", role: "FOH", status: "Confirmed", d1: false, d2: true, d3: true, d4: false, hotel: "Yes (211)", room: "-", food: "Kjøtt", phone: "+47 488 77 666", rate: "7000", note: "" },
  { name: "Camilla Haugen", role: "Rigger", status: "Pending", d1: true, d2: true, d3: false, d4: false, hotel: "No", room: "-", food: "Fisk", phone: "+47 922 11 000", rate: "5500", note: "" },
];

export default function ProductionTool() {
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
        
        /* Custom Scrollbar for a clean look */
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
            <span className="text-black font-medium">Oslo Spektrum</span>
            <span>/</span>
            <span>NRK</span>
            <span>/</span>
            <span>Aurora Festival 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-black/60">
          <div className="flex items-center gap-4 font-mono-swiss text-[10px] uppercase tracking-widest">
            <button className="flex items-center gap-1.5 hover:text-black transition-colors"><Search size={14} /> Search</button>
            <button className="flex items-center gap-1.5 hover:text-black transition-colors"><Globe size={14} /> EN/NO</button>
            <button className="flex items-center gap-1.5 hover:text-black transition-colors"><Moon size={14} /> Theme</button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <nav className="flex items-center px-8 border-b border-black/10 overflow-x-auto hide-scrollbar">
        <div className="flex gap-8 font-sans-swiss text-[13px] font-medium tracking-wide">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={cn(
                "py-4 border-b-[3px] transition-colors whitespace-nowrap",
                tab === "Crew & Logistics" ? "border-black text-black" : "border-transparent text-black/40 hover:text-black"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 grid grid-cols-12 gap-px border-b border-black/10" style={{ backgroundColor: THEME.border }}>
        
        {/* LEFT COLUMN: HEADER & TABLE */}
        <div className="col-span-9 bg-[#F2F2F0] flex flex-col min-h-0">
          {/* Header Area */}
          <div className="px-10 pt-12 pb-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono-swiss text-[11px] uppercase tracking-widest text-black/50 mb-4">Master Sheet</p>
                <h1 className="font-sans-swiss text-[56px] font-medium leading-none tracking-tight text-black mb-3">
                  Crew & Logistics
                </h1>
                <p className="font-sans-swiss text-[20px] text-black/60">
                  14–17 May 2026 <span className="mx-3 text-black/20">|</span> Build Day 2 of 4
                </p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-5 py-3 border border-black/20 hover:border-black font-mono-swiss text-[11px] uppercase tracking-widest transition-colors bg-white">
                  <Printer size={14} /> Print Handoff
                </button>
                <button className="flex items-center gap-2 px-5 py-3 border border-black/20 hover:border-black font-mono-swiss text-[11px] uppercase tracking-widest transition-colors bg-white">
                  <Send size={14} /> Send Brief
                </button>
                <button className="flex items-center gap-2 px-5 py-3 text-white font-mono-swiss text-[11px] uppercase tracking-widest transition-colors" style={{ backgroundColor: THEME.blue }}>
                  <Plus size={14} /> Add Crew
                </button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 px-10 pb-10 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/20">
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[180px]">Name</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[140px]">Role</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[120px]">Status</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[100px]">Days (14-17)</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[100px]">Hotel</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[100px]">Roommate</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal w-[100px]">Food</th>
                  <th className="py-4 pr-4 font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 font-normal text-right">Day Rate</th>
                </tr>
              </thead>
              <tbody className="font-sans-swiss text-[14px]">
                {CREW.map((c, i) => (
                  <tr key={i} className="border-b border-black/10 hover:bg-black/[0.02] group">
                    <td className="py-4 pr-4 font-medium">{c.name}</td>
                    <td className="py-4 pr-4 text-black/70">{c.role}</td>
                    <td className="py-4 pr-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5",
                        c.status === "Confirmed" && "text-[#0038FF]",
                        c.status === "Pending" && "text-[#F88000]",
                        c.status === "Declined" && "text-black/40",
                        c.status === "Standby" && "text-black/70"
                      )}>
                        {c.status === "Confirmed" && <span className="w-1.5 h-1.5 bg-[#0038FF]" />}
                        {c.status === "Pending" && <span className="w-1.5 h-1.5 bg-[#F88000]" />}
                        {c.status === "Declined" && <span className="w-1.5 h-1.5 bg-black/20" />}
                        {c.status === "Standby" && <span className="w-1.5 h-1.5 border border-black/50" />}
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex gap-1">
                        {[c.d1, c.d2, c.d3, c.d4].map((d, di) => (
                          <div key={di} className={cn("w-4 h-4 border", d ? "bg-black border-black" : "bg-transparent border-black/20")} />
                        ))}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-black/70">{c.hotel}</td>
                    <td className="py-4 pr-4 text-black/70">{c.room}</td>
                    <td className="py-4 pr-4 text-black/70">{c.food}</td>
                    <td className="py-4 pr-4 text-right font-mono-swiss text-[13px]">{c.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="col-span-3 bg-white p-10 flex flex-col gap-12 border-l border-black/10">
          <div>
            <p className="font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 mb-6">Overview</p>
            <div className="space-y-8">
              <div>
                <p className="font-sans-swiss text-[40px] font-medium leading-none mb-2">10</p>
                <p className="font-sans-swiss text-[14px] text-black/60">Total Headcount</p>
              </div>
              <div className="w-full h-px bg-black/10" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-sans-swiss text-[24px] font-medium text-[#0038FF] leading-none mb-1">6</p>
                  <p className="font-sans-swiss text-[12px] text-black/60">Confirmed</p>
                </div>
                <div>
                  <p className="font-sans-swiss text-[24px] font-medium text-[#F88000] leading-none mb-1">2</p>
                  <p className="font-sans-swiss text-[12px] text-black/60">Pending</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 mb-6">Logistics</p>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <p className="font-sans-swiss text-[14px]">Hotel Rooms</p>
                <p className="font-mono-swiss text-[14px] font-medium">5</p>
              </div>
              <div className="w-full h-px bg-black/10" />
              <div className="flex justify-between items-end">
                <p className="font-sans-swiss text-[14px]">Dietary Notes</p>
                <p className="font-mono-swiss text-[14px] font-medium">3</p>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <p className="font-mono-swiss text-[10px] uppercase tracking-widest text-black/50 mb-6">Financials</p>
            <div>
              <p className="font-sans-swiss text-[32px] font-medium leading-none mb-2 tracking-tight">kr 53 700</p>
              <p className="font-sans-swiss text-[14px] text-black/60">Total Day-Rate Cost</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
