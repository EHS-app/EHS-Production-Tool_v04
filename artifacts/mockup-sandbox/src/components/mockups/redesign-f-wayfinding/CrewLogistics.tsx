import React from "react";
import ehsLogo from "../ehs-redesign/ehs-logo.png";

export default function CrewLogistics() {
  return (
    <div className="min-h-[100dvh] flex flex-col text-[#0A1128] font-sans selection:bg-[#004BD6] selection:text-white" style={{ backgroundColor: "#F0F0EA", fontFamily: "'Chivo', sans-serif" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Chivo:ital,wght@0,400;0,700;0,900;1,400&family=Space+Mono:wght@400;700&display=swap');
        
        .font-display {
          font-family: 'Anton', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        
        .font-mono {
          font-family: 'Space Mono', monospace;
        }

        .sign-border {
          border: 4px solid #0A1128;
        }

        .border-b-thick {
          border-bottom: 4px solid #0A1128;
        }
        
        .border-r-thick {
          border-right: 4px solid #0A1128;
        }
          
        .timetable-row {
          border-bottom: 2px solid #0A1128;
        }

        .timetable-row:last-child {
          border-bottom: none;
        }

        .day-box {
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-right: 4px;
          border: 2px solid #0A1128;
        }
        .day-box.filled {
          background-color: #0A1128;
        }
        .day-box.empty {
          background-color: transparent;
        }
          
        .btn-action {
          font-family: 'Anton', sans-serif;
          font-size: 1.25rem;
          padding: 0.5rem 1.5rem;
          border: 3px solid #0A1128;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        
        .btn-action-primary {
          background-color: #004BD6;
          color: white;
          border-color: #004BD6;
        }
        .btn-action-primary:hover {
          background-color: #0A1128;
          border-color: #0A1128;
        }
          
        .btn-action-secondary {
          background-color: transparent;
          color: #0A1128;
        }
        .btn-action-secondary:hover {
          background-color: #0A1128;
          color: white;
        }
      `}} />

      {/* TOP NAVIGATION / WAYFINDING SIGN */}
      <header className="flex-none bg-[#004BD6] text-white border-b-thick">
        <div className="flex items-stretch h-16">
          <div className="flex items-center px-6 border-r-thick bg-[#0A1128] text-white shrink-0">
            <img src={ehsLogo} alt="EHS" className="h-7 invert brightness-0" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <span className="hidden font-display text-3xl tracking-widest leading-none mt-1">EHS</span>
          </div>
          
          <nav className="flex-1 flex overflow-x-auto no-scrollbar">
            {[
              { name: "Befaring", active: false },
              { name: "Rigging", active: false },
              { name: "Lighting", active: false },
              { name: "LED Screens", active: false },
              { name: "Stage", active: false },
              { name: "Sound", active: false },
              { name: "Rigg Plan", active: false },
              { name: "Crew & Log", active: true },
              { name: "Catering", active: false },
              { name: "Hotel", active: false }
            ].map(item => (
              <a 
                key={item.name} 
                href="#"
                className={`flex items-center px-6 font-display text-xl tracking-wide whitespace-nowrap border-r-thick transition-colors ${
                  item.active 
                    ? "bg-[#F0F0EA] text-[#0A1128]" 
                    : "hover:bg-[#0038A8] text-white"
                }`}
              >
                <span className="mt-1">{item.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex flex-col xl:flex-row items-stretch p-6 lg:p-10 gap-8 xl:gap-10 max-w-[1920px] mx-auto w-full">
        
        {/* LEFT COLUMN - CONTENT */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          
          {/* HEADER TICKET */}
          <div className="bg-white sign-border p-8 md:p-10 shadow-[12px_12px_0px_0px_#0A1128] relative">
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#004BD6] border-b-[4px] border-l-[4px] border-[#0A1128]"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div>
                <div className="font-mono text-sm font-bold text-[#004BD6] mb-3 flex items-center gap-3 uppercase tracking-widest">
                  <span className="bg-[#004BD6] text-white px-2 py-0.5">PRD-0492</span>
                  <span>Master Sheet</span>
                </div>
                <h1 className="font-display text-6xl sm:text-7xl md:text-8xl tracking-tight text-[#0A1128] leading-[0.9] mb-4">
                  AURORA FESTIVAL
                  <br />
                  <span className="text-[#004BD6]">2026</span>
                </h1>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 font-bold text-[#0A1128] text-lg uppercase tracking-widest mt-6">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Venue</span>
                    <span>OSLO SPEKTRUM</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-[#0A1128] rounded-full hidden sm:block mt-4"></div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Client</span>
                    <span>NRK</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-[#0A1128] rounded-full hidden sm:block mt-4"></div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Build Phase</span>
                    <span>14–17 MAY 2026</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 pt-6 border-t-thick mt-4">
              <button className="btn-action btn-action-secondary">
                Print Handoff
              </button>
              <button className="btn-action btn-action-secondary">
                Send Brief
              </button>
              <button className="btn-action btn-action-primary ml-auto">
                Add Crew
              </button>
            </div>
          </div>

          {/* MASTER SHEET */}
          <div className="bg-white sign-border flex flex-col flex-1 shadow-[12px_12px_0px_0px_#0A1128] overflow-hidden mt-4">
            <div className="bg-[#0A1128] text-white p-4 px-6 flex justify-between items-center border-b-thick">
              <h2 className="font-display text-3xl tracking-wide mt-1">CREW ROSTER</h2>
              <span className="font-mono text-sm bg-white text-[#0A1128] px-3 py-1 font-bold">10 PERSONNEL</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F0EA] border-b-thick font-bold text-xs uppercase tracking-widest text-[#0A1128]">
                    <th className="p-5 pl-6">Name</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Role</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Status</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Days (14-17)</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Hotel</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Roommate</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Diet</th>
                    <th className="p-5 border-l-2 border-[#0A1128]">Phone</th>
                    <th className="p-5 pr-6 border-l-2 border-[#0A1128] text-right">Rate (NOK)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {[
                    { name: "Magnus Berg", role: "Head Rigger", status: "CONFIRMED", days: [1, 1, 1, 1], hotel: "R201", mate: "-", diet: "Kjøtt", phone: "+47 912 34 567", rate: "6500" },
                    { name: "Ingrid Solheim", role: "Lighting Tech", status: "CONFIRMED", days: [1, 1, 1, 1], hotel: "R202", mate: "Sofia Nilsen", diet: "Vegetar", phone: "+47 482 11 902", rate: "5500" },
                    { name: "Kari Hansen", role: "LED Screen Tech", status: "PENDING", days: [0, 1, 1, 1], hotel: "No", mate: "-", diet: "Fisk", phone: "+47 993 22 144", rate: "5000" },
                    { name: "Lars Olsen", role: "Sound Eng", status: "CONFIRMED", days: [1, 1, 1, 0], hotel: "R203", mate: "Jonas Lie", diet: "Allergi (Nøtter)", phone: "+47 415 66 788", rate: "6000" },
                    { name: "Sofia Nilsen", role: "Lighting Tech", status: "CONFIRMED", days: [1, 1, 1, 1], hotel: "R202", mate: "Ingrid Solheim", diet: "Kjøtt", phone: "+47 908 77 655", rate: "5500" },
                    { name: "Henrik Moen", role: "Rigger", status: "STANDBY", days: [1, 1, 0, 0], hotel: "No", mate: "-", diet: "Kjøtt", phone: "+47 455 33 211", rate: "4800" },
                    { name: "Jonas Lie", role: "Sound Tech", status: "CONFIRMED", days: [1, 1, 1, 1], hotel: "R203", mate: "Lars Olsen", diet: "Fisk", phone: "+47 922 44 555", rate: "5000" },
                    { name: "Emma Bakke", role: "Stage Mgr", status: "CONFIRMED", days: [1, 1, 1, 1], hotel: "R205", mate: "-", diet: "Vegetar", phone: "+47 477 88 999", rate: "6200" },
                    { name: "Ole Karlsen", role: "Rigger", status: "DECLINED", days: [0, 0, 0, 0], hotel: "No", mate: "-", diet: "-", phone: "+47 933 55 777", rate: "-" },
                    { name: "Camilla Haugen", role: "LED Screen Tech", status: "CONFIRMED", days: [0, 0, 1, 1], hotel: "No", mate: "-", diet: "Kjøtt", phone: "+47 400 11 222", rate: "5000" }
                  ].map((crew, i) => (
                    <tr key={i} className="timetable-row hover:bg-[#F0F0EA] transition-colors">
                      <td className="p-4 pl-6 font-sans font-bold text-[#0A1128] text-base">{crew.name}</td>
                      <td className="p-4 border-l-2 border-[#0A1128]">{crew.role}</td>
                      <td className="p-4 border-l-2 border-[#0A1128]">
                        {crew.status === "CONFIRMED" && <span className="bg-[#0A1128] text-white px-2 py-1 text-xs font-bold tracking-widest">{crew.status}</span>}
                        {crew.status === "PENDING" && <span className="bg-[#004BD6] text-white px-2 py-1 text-xs font-bold tracking-widest">{crew.status}</span>}
                        {crew.status === "STANDBY" && <span className="bg-[#EBEBE6] border border-[#0A1128] text-[#0A1128] px-2 py-1 text-xs font-bold tracking-widest">{crew.status}</span>}
                        {crew.status === "DECLINED" && <span className="text-gray-400 line-through text-xs font-bold tracking-widest">{crew.status}</span>}
                      </td>
                      <td className="p-4 border-l-2 border-[#0A1128]">
                        <div className="flex">
                          {crew.days.map((d, di) => (
                            <span key={di} className={`day-box ${d ? 'filled' : 'empty'}`} title={`Day ${di+14}`}></span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 border-l-2 border-[#0A1128]">
                        {crew.hotel !== "No" ? <span className="font-bold bg-[#EBEBE6] px-2 py-1">{crew.hotel}</span> : <span className="text-gray-400">NO</span>}
                      </td>
                      <td className="p-4 border-l-2 border-[#0A1128] text-gray-600">{crew.mate}</td>
                      <td className="p-4 border-l-2 border-[#0A1128] font-sans text-sm font-bold uppercase tracking-wide">
                        {crew.diet === "Vegetar" ? <span className="text-[#008A3C]">{crew.diet}</span> :
                         crew.diet.includes("Allergi") ? <span className="text-[#E02400] bg-[#FFEBE6] px-1">{crew.diet}</span> : 
                         crew.diet === "-" ? <span className="text-gray-400">-</span> : crew.diet}
                      </td>
                      <td className="p-4 border-l-2 border-[#0A1128] text-[#0A1128]">{crew.phone}</td>
                      <td className="p-4 pr-6 border-l-2 border-[#0A1128] text-right font-bold text-[#0A1128] text-base">{crew.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN - SUMMARY */}
        <aside className="w-full xl:w-96 flex flex-col gap-8 shrink-0">
          <div className="bg-[#004BD6] text-white sign-border p-8 shadow-[12px_12px_0px_0px_#0A1128]">
            <h3 className="font-display text-4xl mb-10 tracking-wide border-b-4 border-white pb-4">LOGISTICS<br/>SUMMARY</h3>
            
            <div className="space-y-8">
              <div>
                <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-2">Total Headcount</div>
                <div className="font-display text-6xl leading-none">10</div>
                <div className="flex gap-4 mt-4 font-mono text-sm font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2"><span className="w-4 h-4 bg-[#0A1128] border-2 border-white"></span> 7 CONF</div>
                  <div className="flex items-center gap-2"><span className="w-4 h-4 bg-white border-2 border-[#0A1128]"></span> 1 PEND</div>
                </div>
              </div>

              <div className="border-t-[3px] border-white/20 pt-8">
                <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-2">Hotel Rooms</div>
                <div className="font-display text-5xl leading-none">4</div>
                <div className="mt-4 font-mono text-sm font-bold text-white/90 bg-[#0A1128] p-3 inline-block">
                  THON HOTEL OPERA<br/>
                  IN: 13 MAY
                </div>
              </div>

              <div className="border-t-[3px] border-white/20 pt-8">
                <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-4">Dietary Notes</div>
                <div className="font-mono text-sm font-bold space-y-2 uppercase tracking-wider">
                  <div className="flex justify-between border-b border-white/20 pb-2"><span>Kjøtt</span><span>5</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span>Vegetar</span><span>2</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span>Fisk</span><span>1</span></div>
                  <div className="flex justify-between text-[#0A1128] bg-white px-2 py-1 mt-2"><span>Allergi</span><span>1</span></div>
                </div>
              </div>

              <div className="border-t-[3px] border-white/20 pt-8">
                <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-2">Est. Day Rate Cost</div>
                <div className="font-mono text-3xl font-bold bg-[#0A1128] p-4 text-center">KR 53 700</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white sign-border p-6 shadow-[8px_8px_0px_0px_#0A1128]">
             <h4 className="font-display text-2xl mb-3 text-[#004BD6]">ACTION REQUIRED</h4>
             <ul className="font-mono text-sm font-bold leading-relaxed space-y-2">
               <li className="flex gap-2 items-start"><span className="text-[#004BD6] mt-0.5">■</span> 1 pending confirmation (Kari Hansen)</li>
               <li className="flex gap-2 items-start"><span className="text-[#0A1128] mt-0.5">■</span> 1 standby crew member available if needed</li>
             </ul>
          </div>
        </aside>

      </main>
    </div>
  );
}
