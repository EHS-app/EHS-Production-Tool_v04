import React from "react";
import { 
  Bell, Search, LayoutDashboard, Wrench, Lightbulb, MonitorPlay, Volume2, 
  Box, Users, BedDouble, Utensils, Calendar, MapPin, Share2, Download, 
  Printer, ArrowUpRight, CheckCircle2, Clock, XCircle, FileText, 
  MessageSquare, MoreVertical, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');

  .editorial-theme {
    --bg-base: #0E0A1A;
    --text-primary: #FFFFFF;
    --text-secondary: rgba(255, 255, 255, 0.6);
    --text-tertiary: rgba(255, 255, 255, 0.4);
    
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-base);
    color: var(--text-primary);
    position: relative;
    overflow-x: hidden;
  }

  .font-display {
    font-family: 'Instrument Serif', serif;
  }

  /* Noise Overlay */
  .noise-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
    opacity: 0.03;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  /* Radial Gradients */
  .bg-gradient-top-left {
    position: fixed;
    top: -20%;
    left: -10%;
    width: 70vw;
    height: 70vw;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%);
    pointer-events: none;
    z-index: 0;
  }
  
  .bg-gradient-bottom-right {
    position: fixed;
    bottom: -20%;
    right: -10%;
    width: 60vw;
    height: 60vw;
    background: radial-gradient(circle, rgba(244,114,182,0.08) 0%, rgba(244,114,182,0) 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Glass Surfaces */
  .glass-surface {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 40px 80px -20px rgba(139, 92, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border-radius: 1rem;
    position: relative;
    overflow: hidden;
  }

  .glass-surface::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
    opacity: 0.5;
  }

  .glass-surface-hover:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* Sidebar */
  .narrow-sidebar {
    width: 64px;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(14, 10, 26, 0.5);
    backdrop-filter: blur(12px);
    z-index: 40;
  }
  
  .sidebar-item {
    position: relative;
    color: var(--text-tertiary);
    transition: all 0.3s ease;
  }
  
  .sidebar-item:hover, .sidebar-item.active {
    color: #FFF;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .sidebar-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 25%;
    bottom: 25%;
    width: 2px;
    background: #6366F1;
    border-radius: 0 2px 2px 0;
  }

  .sidebar-tooltip {
    position: absolute;
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%) translateX(-10px);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #FFF;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
    z-index: 50;
  }

  .sidebar-item:hover .sidebar-tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  /* Status Pills */
  .status-pill {
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    backdrop-filter: blur(4px);
  }

  .status-active {
    background: rgba(16, 185, 129, 0.1);
    color: #34D399;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  /* Animations */
  @keyframes draw-arc {
    from { stroke-dashoffset: 283; }
    to { stroke-dashoffset: var(--target-offset); }
  }

  .arc-path {
    stroke-dasharray: 283;
    animation: draw-arc 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .avatar-stack-item {
    border: 2px solid var(--bg-base);
    transition: transform 0.2s;
  }
  .avatar-stack-item:hover {
    transform: translateY(-4px);
    z-index: 10;
  }
`;

export function Stripe() {
  return (
    <div className="dark">
      <style>{styles}</style>
      <div className="editorial-theme min-h-screen flex">
        <div className="noise-overlay" />
        <div className="bg-gradient-top-left" />
        <div className="bg-gradient-bottom-right" />

        {/* Narrow Sidebar */}
        <aside className="narrow-sidebar flex flex-col items-center py-6 sticky top-0 h-screen shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-400 flex items-center justify-center text-white font-display text-xl mb-8 shadow-lg shadow-indigo-500/20">
            E
          </div>
          
          <nav className="flex-1 flex flex-col gap-2 w-full px-2">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Oversikt" active />
            <SidebarItem icon={<Wrench size={20} />} label="Rigg" />
            <SidebarItem icon={<Lightbulb size={20} />} label="Lys" />
            <SidebarItem icon={<MonitorPlay size={20} />} label="LED" />
            <SidebarItem icon={<Volume2 size={20} />} label="Lyd" />
            <SidebarItem icon={<Box size={20} />} label="Scene" />
            <div className="h-px bg-white/5 my-2 mx-2" />
            <SidebarItem icon={<Users size={20} />} label="Crew" />
            <SidebarItem icon={<BedDouble size={20} />} label="Hotell" />
            <SidebarItem icon={<Utensils size={20} />} label="Catering" />
          </nav>

          <div className="mt-auto">
            <SidebarItem icon={<img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-8 h-8 rounded-full" />} label="Profil" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative z-10">
          
          {/* Header */}
          <header className="px-16 pt-24 pb-16 max-w-[1200px] w-full mx-auto flex justify-between items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <span className="status-pill status-active">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aktiv Produksjon
                </span>
                <span className="text-sm tracking-widest text-[rgba(255,255,255,0.4)] uppercase">Prosjekt #2026-442</span>
              </div>
              <h1 className="font-display italic text-[84px] leading-[0.9] tracking-tight mb-8">
                Stavanger Konserthus<br/>
                <span className="text-[rgba(255,255,255,0.8)]">Vårfest 2026</span>
              </h1>
              
              <div className="flex items-center gap-8 text-[rgba(255,255,255,0.6)] font-medium">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  12.–14. mai 2026
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-rose-400" />
                  Zetlitz-salen
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button className="glass-surface glass-surface-hover px-6 py-3 rounded-full flex items-center gap-3 text-sm font-medium transition-all">
                <Download className="w-4 h-4 text-indigo-400" />
                Client Pack
              </button>
              <button className="bg-white text-black px-6 py-3 rounded-full flex items-center justify-center gap-3 text-sm font-semibold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                <Share2 className="w-4 h-4" />
                Del brief
              </button>
            </div>
          </header>

          <div className="px-16 pb-24 max-w-[1200px] w-full mx-auto space-y-24">
            
            {/* HERO KPI SECTION: Asymmetric Editorial Layout */}
            <section className="grid grid-cols-12 gap-12 items-center">
              {/* Massive Hero Number */}
              <div className="col-span-5 flex flex-col justify-center">
                <p className="text-sm font-semibold tracking-widest uppercase text-indigo-400 mb-2">Bemanning</p>
                <div className="font-display text-[140px] leading-[0.8] tracking-tighter flex items-baseline gap-2">
                  18<span className="text-[60px] text-[rgba(255,255,255,0.3)]">/22</span>
                </div>
                <p className="text-xl text-[rgba(255,255,255,0.6)] mt-6 max-w-sm">
                  Crew er nesten komplett. Mangler 4 posisjoner for opprigg.
                </p>
                <div className="flex -space-x-3 mt-8">
                  {[1,2,3,4,5].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/150?u=${i}`} className="w-12 h-12 rounded-full avatar-stack-item grayscale hover:grayscale-0" alt="avatar" />
                  ))}
                  <div className="w-12 h-12 rounded-full avatar-stack-item bg-indigo-900/50 flex items-center justify-center text-sm font-medium text-indigo-200 border-indigo-500/30">
                    +13
                  </div>
                </div>
              </div>

              {/* Supporting Metrics */}
              <div className="col-span-7 grid grid-cols-2 gap-6">
                <div className="glass-surface p-8 flex flex-col justify-between aspect-square">
                  <div>
                    <p className="text-sm font-medium text-[rgba(255,255,255,0.5)] mb-1">Rigg-belastning</p>
                    <p className="font-display text-5xl">4.2<span className="text-2xl text-[rgba(255,255,255,0.5)]">t</span></p>
                  </div>
                  <div>
                    <div className="w-full h-1 bg-white/10 rounded-full mb-3">
                      <div className="h-full bg-rose-400 rounded-full" style={{width: '70%'}} />
                    </div>
                    <p className="text-sm text-rose-400 flex justify-between">
                      <span>70% av maks (6.0t)</span>
                      <span>Trygt</span>
                    </p>
                  </div>
                </div>

                <div className="glass-surface p-8 flex flex-col justify-between aspect-square">
                  <div>
                    <p className="text-sm font-medium text-[rgba(255,255,255,0.5)] mb-1">Budsjett (Eks. mva)</p>
                    <p className="font-display text-4xl">487k</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-emerald-400 flex items-center gap-1 mb-2">
                      <ArrowUpRight className="w-4 h-4 rotate-90" />
                      På budsjett
                    </p>
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => <div key={i} className="h-8 flex-1 bg-white/5 rounded-sm" />)}
                      <div className="h-8 flex-1 bg-white/20 rounded-sm" />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 glass-surface p-8 flex items-center gap-8">
                  {/* Custom Radial Gauge for Show Readiness */}
                  <div className="relative w-32 h-32 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* Background Arcs */}
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      
                      {/* Foreground Arcs */}
                      {/* Crew 80% */}
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#6366F1" strokeWidth="6" className="arc-path" strokeLinecap="round" style={{'--target-offset': 283 * (1 - 0.82)} as any} />
                      {/* Rigg 100% */}
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#10B981" strokeWidth="6" className="arc-path" strokeLinecap="round" style={{'--target-offset': 0} as any} />
                      {/* Tek 90% */}
                      <circle cx="50" cy="50" r="25" fill="none" stroke="#F472B6" strokeWidth="6" className="arc-path" strokeLinecap="round" style={{'--target-offset': 283 * (1 - 0.9)} as any} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-display text-3xl">
                      91<span className="text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl mb-4">Produksjons-status</h3>
                    <div className="flex gap-6">
                      <div>
                        <div className="flex items-center gap-2 text-sm mb-1"><div className="w-2 h-2 rounded-full bg-indigo-500" />Crew</div>
                        <p className="text-xl font-medium">82%</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm mb-1"><div className="w-2 h-2 rounded-full bg-emerald-500" />Rigg</div>
                        <p className="text-xl font-medium">100%</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm mb-1"><div className="w-2 h-2 rounded-full bg-rose-400" />Teknisk</div>
                        <p className="text-xl font-medium">90%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* TIMELINE RIBBON */}
            <section>
              <div className="flex items-end justify-between mb-8">
                <h2 className="font-display text-5xl">Crew Timeline</h2>
                <button className="text-sm text-indigo-400 font-medium hover:text-white transition-colors flex items-center gap-2">
                  Full tidsplan <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="glass-surface p-8 overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Timeline Header */}
                  <div className="flex text-sm font-medium text-[rgba(255,255,255,0.4)] mb-8 border-b border-white/5 pb-4">
                    <div className="w-48 shrink-0">Rolle</div>
                    <div className="flex-1 flex justify-between relative px-4">
                      <span>12. mai (Opprigg)</span>
                      <span>13. mai (Show)</span>
                      <span>14. mai (Nedrigg)</span>
                      {/* Vertical day dividers */}
                      <div className="absolute left-1/3 top-0 bottom-[-300px] w-px bg-white/5" />
                      <div className="absolute left-2/3 top-0 bottom-[-300px] w-px bg-white/5" />
                    </div>
                  </div>

                  {/* Timeline Rows */}
                  <div className="space-y-6">
                    <TimelineRow 
                      role="Rigger" name="Marius Johansen" img="1"
                      bars={[{start: '5%', width: '25%', color: 'from-emerald-500 to-emerald-400'}, {start: '35%', width: '25%', color: 'from-emerald-500 to-emerald-400'}, {start: '68%', width: '15%', color: 'from-emerald-500 to-emerald-400'}]}
                    />
                    <TimelineRow 
                      role="Lystekniker" name="Sara Henriksen" img="2"
                      bars={[{start: '10%', width: '25%', color: 'from-indigo-500 to-violet-400'}, {start: '40%', width: '20%', color: 'from-indigo-500 to-violet-400'}, {start: '70%', width: '15%', color: 'from-indigo-500 to-violet-400'}]}
                    />
                    <TimelineRow 
                      role="LED-tekniker" name="Henrik Olsen" img="3"
                      bars={[{start: '8%', width: '25%', color: 'from-amber-500 to-amber-400', pending: true}, {start: '70%', width: '15%', color: 'from-amber-500 to-amber-400', pending: true}]}
                    />
                    <TimelineRow 
                      role="Lydtekniker" name="Ingrid Tønnesen" img="4"
                      bars={[{start: '15%', width: '20%', color: 'from-rose-500 to-rose-400'}, {start: '38%', width: '25%', color: 'from-rose-500 to-rose-400'}, {start: '70%', width: '10%', color: 'from-rose-500 to-rose-400'}]}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* TECHNICAL & LOGISTICS */}
            <section className="grid grid-cols-2 gap-12">
              <div>
                <h2 className="font-display text-4xl mb-8">Teknisk</h2>
                <div className="space-y-4">
                  <TechCard title="Lys" spec="48x Robe MegaPointe, GrandMA3" weight="1.8t" pts="12" />
                  <TechCard title="LED" spec="96x ROE Carbon CB5, NovaStar MX40" weight="1.2t" pts="6" />
                  <TechCard title="Lyd" spec="24x d&b KSL, J-SUB, DiGiCo Q338" weight="1.0t" pts="4" />
                </div>
              </div>

              <div>
                <h2 className="font-display text-4xl mb-8">Logistikk</h2>
                <div className="grid gap-4">
                  <div className="glass-surface p-6 flex items-start gap-5">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <BedDouble className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-display text-2xl mb-1">Clarion Hotel Energy</h4>
                      <p className="text-[rgba(255,255,255,0.6)]">8 enkeltrom bekreftet</p>
                      <p className="text-sm text-[rgba(255,255,255,0.4)] mt-2">Innsjekk 12.05 kl 15:00</p>
                    </div>
                  </div>
                  <div className="glass-surface p-6 flex items-start gap-5">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <Utensils className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-display text-2xl mb-1">Catering</h4>
                      <p className="text-[rgba(255,255,255,0.6)]">22 personer, 3 måltider/dag</p>
                      <div className="flex gap-2 mt-3">
                        <span className="px-2 py-1 bg-white/5 rounded text-xs text-[rgba(255,255,255,0.5)]">2 Vegan</span>
                        <span className="px-2 py-1 bg-white/5 rounded text-xs text-[rgba(255,255,255,0.5)]">1 Glutenfri</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: any) {
  return (
    <div className={cn(
      "sidebar-item w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer mx-auto",
      active ? "active" : ""
    )}>
      {icon}
      <div className="sidebar-tooltip">{label}</div>
    </div>
  );
}

function TimelineRow({ role, name, img, bars }: any) {
  return (
    <div className="flex items-center relative z-10 group">
      <div className="w-48 shrink-0 flex items-center gap-3">
        <img src={`https://i.pravatar.cc/150?u=${img}`} alt={name} className="w-8 h-8 rounded-full border border-white/10 grayscale group-hover:grayscale-0 transition-all" />
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-[rgba(255,255,255,0.4)]">{role}</div>
        </div>
      </div>
      <div className="flex-1 relative h-10 px-4">
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-px bg-white/5" />
        {bars.map((bar: any, i: number) => (
          <div 
            key={i}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-6 rounded-full bg-gradient-to-r shadow-lg transition-transform hover:scale-y-110 cursor-pointer",
              bar.color,
              bar.pending ? "opacity-50 border border-white/20 border-dashed" : "opacity-90"
            )}
            style={{ left: `calc(1rem + ${bar.start})`, width: bar.width }}
          />
        ))}
      </div>
    </div>
  );
}

function TechCard({ title, spec, weight, pts }: any) {
  return (
    <div className="glass-surface glass-surface-hover p-6 flex items-center justify-between group cursor-pointer">
      <div>
        <h4 className="font-display text-2xl mb-1">{title}</h4>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">{spec}</p>
      </div>
      <div className="flex gap-6 text-right">
        <div>
          <div className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-1">Punkter</div>
          <div className="font-medium">{pts}</div>
        </div>
        <div>
          <div className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-1">Last</div>
          <div className="font-medium text-rose-300">{weight}</div>
        </div>
      </div>
    </div>
  );
}
