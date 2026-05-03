import React from "react";
import {
  Search,
  Bell,
  MapPin,
  Calendar,
  Zap,
  MoreHorizontal,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Vercel() {
  return (
    <div className="dark min-h-screen bg-[#09090B] text-zinc-50 selection:bg-zinc-800 relative overflow-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        .font-sans {
          font-family: 'Inter', sans-serif;
        }
        
        .hero-number {
          font-size: 3.5rem;
          line-height: 1;
          letter-spacing: -0.05em;
          text-shadow: 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .vercel-card {
          background: rgba(24, 24, 27, 0.4);
          border: 1px solid #27272a;
          border-radius: 6px;
        }
        
        .radial-glow {
          position: absolute;
          top: -300px;
          left: 50%;
          transform: translateX(-50%);
          width: 1200px;
          height: 600px;
          background: radial-gradient(ellipse at bottom, rgba(244, 244, 245, 0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        
        .status-confirmed { color: #34d399; }
        .status-pending { color: #fbbf24; }
        .status-cancelled { color: #fb7185; text-decoration: line-through; }
      `}</style>

      <div className="radial-glow"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Nav */}
        <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-sm tracking-tight">
              <span className="text-zinc-400">ehs-prod</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">projects</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-50 font-medium">vaarfest-2026</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden md:flex items-center gap-1.5 text-zinc-500">
              <kbd className="h-5 px-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">⌘K</kbd> search
              <span className="mx-2 text-zinc-800">|</span>
              <kbd className="h-5 px-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">G</kbd> then <kbd className="h-5 px-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">C</kbd> crew
            </div>
            
            <div className="flex items-center gap-2 text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span>API healthy</span>
              <span className="text-zinc-700">•</span>
              <span>DB 12ms</span>
              <span className="text-zinc-700">•</span>
              <span>Last sync 4m ago</span>
            </div>
            
            <div className="w-6 h-6 rounded-full bg-zinc-800 ml-2"></div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-[1400px] mx-auto w-full flex flex-col gap-10">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
              <h1 className="text-2xl font-medium tracking-tight text-zinc-50">Stavanger Konserthus — Vårfest 2026</h1>
              <div className="flex gap-6 font-mono text-sm text-zinc-400">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-zinc-600" /> 12.–14. mai 2026</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-zinc-600" /> Zetlitz-salen</div>
              </div>
            </div>
          </div>

          {/* Signature Moment: Area Chart + KPI Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 vercel-card p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-medium text-zinc-400">Rigg-belastning over tid (tonn)</h2>
                <div className="font-mono text-sm text-zinc-500">maks cap: 6.0t</div>
              </div>
              <div className="flex-1 relative mt-4 h-[200px]">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f4f4f5" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#f4f4f5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Gridlines */}
                  {[0, 50, 100, 150].map((y, i) => (
                    <g key={i}>
                      <line x1="0" y1={y} x2="600" y2={y} stroke="#f4f4f5" strokeOpacity="0.04" strokeDasharray="4 4" />
                      <text x="-10" y={y + 4} className="font-mono text-[10px]" fill="#52525b" textAnchor="end">{6 - i * 1.5}t</text>
                    </g>
                  ))}
                  
                  {/* The Path */}
                  <path d="M0,200 L0,150 C50,150 80,100 120,90 C160,80 200,85 240,60 C280,35 320,40 360,50 C400,60 450,100 500,120 C550,140 580,145 600,145 L600,200 Z" fill="url(#chartGradient)" />
                  <path d="M0,150 C50,150 80,100 120,90 C160,80 200,85 240,60 C280,35 320,40 360,50 C400,60 450,100 500,120 C550,140 580,145 600,145" fill="none" stroke="#f4f4f5" strokeWidth="1.5" />
                  
                  {/* Current point */}
                  <circle cx="240" cy="60" r="4" fill="#09090b" stroke="#f4f4f5" strokeWidth="2" />
                  <circle cx="240" cy="60" r="12" fill="#f4f4f5" fillOpacity="0.1" />
                  
                  {/* X-axis labels */}
                  <g className="font-mono text-[10px]" fill="#52525b">
                    <text x="0" y="220" textAnchor="start">08:00</text>
                    <text x="120" y="220" textAnchor="middle">12:00</text>
                    <text x="240" y="220" textAnchor="middle">16:00</text>
                    <text x="360" y="220" textAnchor="middle">20:00</text>
                    <text x="480" y="220" textAnchor="middle">00:00</text>
                    <text x="600" y="220" textAnchor="end">04:00</text>
                  </g>
                </svg>
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="vercel-card p-6 flex-1 flex flex-col justify-between">
                <div className="text-sm font-medium text-zinc-400">Peak Load</div>
                <div className="hero-number font-mono mt-4">4.2<span className="text-3xl text-zinc-600">t</span></div>
                <div className="text-xs font-mono text-zinc-500 mt-2">@ 16:00 / CM Lodestar 1t</div>
              </div>
              <div className="vercel-card p-6 flex-1 flex flex-col justify-between">
                <div className="text-sm font-medium text-zinc-400">Crew Confirmation</div>
                <div className="hero-number font-mono mt-4">18<span className="text-3xl text-zinc-600">/22</span></div>
                <div className="text-xs font-mono text-zinc-500 mt-2">4 pending · 0 cancelled</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Crew Schedule */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-sm font-medium text-zinc-50 border-b border-zinc-800 pb-2">crew_schedule.log</h3>
              <div className="font-mono text-xs text-zinc-400 whitespace-pre overflow-x-auto leading-relaxed">
<table className="w-full text-left border-collapse">
  <thead>
    <tr className="border-b border-zinc-800 text-zinc-600">
      <th className="font-normal py-2 font-mono">resource_id</th>
      <th className="font-normal py-2 font-mono">role</th>
      <th className="font-normal py-2 font-mono">tir_12.05</th>
      <th className="font-normal py-2 font-mono">ons_13.05</th>
      <th className="font-normal py-2 font-mono">tor_14.05</th>
      <th className="font-normal py-2 font-mono">status</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-zinc-800/50">
    <tr>
      <td className="py-2.5 text-zinc-300">marius_johansen</td>
      <td className="py-2.5">lystekniker</td>
      <td className="py-2.5">08:00 → 20:00</td>
      <td className="py-2.5">14:00 → 23:00</td>
      <td className="py-2.5">10:00 → 02:00</td>
      <td className="py-2.5"><span className="status-confirmed">█</span> bekreftet</td>
    </tr>
    <tr>
      <td className="py-2.5 text-zinc-300">sara_henriksen</td>
      <td className="py-2.5">rigger</td>
      <td className="py-2.5">07:00 → 16:00</td>
      <td className="py-2.5 text-zinc-600">-------------</td>
      <td className="py-2.5">22:00 → 04:00</td>
      <td className="py-2.5"><span className="status-confirmed">█</span> bekreftet</td>
    </tr>
    <tr>
      <td className="py-2.5 text-zinc-300">henrik_olsen</td>
      <td className="py-2.5">led_tekniker</td>
      <td className="py-2.5">10:00 → 20:00</td>
      <td className="py-2.5">14:00 → 23:00</td>
      <td className="py-2.5">10:00 → 02:00</td>
      <td className="py-2.5"><span className="status-pending">▢</span> venter_svar</td>
    </tr>
    <tr>
      <td className="py-2.5 text-zinc-300">ingrid_tonnesen</td>
      <td className="py-2.5">lydtegniker</td>
      <td className="py-2.5">09:00 → 18:00</td>
      <td className="py-2.5">14:00 → 23:00</td>
      <td className="py-2.5">10:00 → 02:00</td>
      <td className="py-2.5"><span className="status-confirmed">█</span> bekreftet</td>
    </tr>
    <tr className="opacity-50">
      <td className="py-2.5 text-zinc-300">andreas_karlsen</td>
      <td className="py-2.5">stagehand</td>
      <td className="py-2.5 text-zinc-600">-------------</td>
      <td className="py-2.5 text-zinc-600">-------------</td>
      <td className="py-2.5 text-zinc-600">-------------</td>
      <td className="py-2.5"><span className="status-cancelled">avlyst</span></td>
    </tr>
    <tr>
      <td className="py-2.5 text-zinc-300">kari_mikkelsen</td>
      <td className="py-2.5">produsent</td>
      <td className="py-2.5">08:00 → 22:00</td>
      <td className="py-2.5">10:00 → 24:00</td>
      <td className="py-2.5">10:00 → 04:00</td>
      <td className="py-2.5"><span className="status-confirmed">█</span> bekreftet</td>
    </tr>
    <tr>
      <td className="py-2.5 text-zinc-300">lars_berg</td>
      <td className="py-2.5">driver</td>
      <td className="py-2.5 text-zinc-600">-------------</td>
      <td className="py-2.5 text-zinc-600">-------------</td>
      <td className="py-2.5">22:00 → 06:00</td>
      <td className="py-2.5"><span className="status-confirmed">█</span> bekreftet</td>
    </tr>
  </tbody>
</table>
              </div>
            </div>

            {/* Sidebar Data */}
            <div className="lg:col-span-4 space-y-10">
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-50 border-b border-zinc-800 pb-2">systems_config.yaml</h3>
                <div className="font-mono text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800 p-4 rounded-md">
                  <div><span className="text-zinc-500">lys:</span></div>
                  <div className="pl-4"><span className="text-zinc-500">ansvarlig:</span> marius_johansen</div>
                  <div className="pl-4"><span className="text-zinc-500">utstyr:</span></div>
                  <div className="pl-8">- 12x CM Lodestar 1t</div>
                  <div className="pl-8">- 24x Robe MegaPointe</div>
                  <div className="pl-8">- 1x GrandMA3</div>
                  
                  <div className="mt-3"><span className="text-zinc-500">led:</span></div>
                  <div className="pl-4"><span className="text-zinc-500">ansvarlig:</span> henrik_olsen</div>
                  <div className="pl-4"><span className="text-zinc-500">utstyr:</span></div>
                  <div className="pl-8">- 96x ROE Carbon CB5</div>
                  <div className="pl-8">- 2x NovaStar MX40 Pro</div>
                  
                  <div className="mt-3"><span className="text-zinc-500">lyd:</span></div>
                  <div className="pl-4"><span className="text-zinc-500">ansvarlig:</span> ingrid_tonnesen</div>
                  <div className="pl-4"><span className="text-zinc-500">utstyr:</span></div>
                  <div className="pl-8">- 24x d&b KSL</div>
                  <div className="pl-8">- 12x d&b J-SUB</div>
                  <div className="pl-8">- 1x DiGiCo Quantum 338</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-50 border-b border-zinc-800 pb-2">logistics_status</h3>
                <div className="vercel-card p-4 flex flex-col gap-3 font-mono text-xs">
                  <div className="flex justify-between items-start">
                    <div className="text-zinc-300">hotel_allocation</div>
                    <div className="text-emerald-400 text-right">OK</div>
                  </div>
                  <div className="text-zinc-500">
                    Clarion Hotel Energy<br/>
                    8 enkeltrom<br/>
                    innsjekk: 12.05 @ 15:00
                  </div>
                </div>
                <div className="vercel-card p-4 flex flex-col gap-3 font-mono text-xs">
                  <div className="flex justify-between items-start">
                    <div className="text-zinc-300">catering_headcount</div>
                    <div className="text-emerald-400 text-right">OK</div>
                  </div>
                  <div className="text-zinc-500">
                    22 personer<br/>
                    3 måltider/dag
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
