import React from "react";

export default function CrewLogistics() {
  // Slate/Cobalt hybrid for a professional, quiet macOS native feel
  const accentColor = "#4a6278"; 
  const bgApp = "#1c1c1e";
  const bgSidebar = "#242426";
  const borderSubtle = "rgba(255, 255, 255, 0.1)";
  const textPrimary = "#ececec";
  const textSecondary = "#8e8e93";

  const crew = [
    { name: "Magnus Berg", role: "Head Rigger", status: "Confirmed", days: [1, 1, 1, 1], hotel: "Room 402", roommate: "-", food: "Kjøtt", phone: "+47 912 34 567", rate: "5500", st: "confirmed" },
    { name: "Ingrid Solheim", role: "Lighting Tech", status: "Confirmed", days: [1, 1, 1, 0], hotel: "Room 403", roommate: "Camilla Haugen", food: "Vegetar", phone: "+47 987 65 432", rate: "4800", st: "confirmed" },
    { name: "Kari Hansen", role: "LED Tech", status: "Pending", days: [0, 1, 1, 1], hotel: "TBD", roommate: "-", food: "Fisk", phone: "+47 923 45 678", rate: "4500", st: "pending" },
    { name: "Lars Olsen", role: "Sound Eng", status: "Confirmed", days: [1, 1, 1, 1], hotel: "Room 404", roommate: "Jonas Lie", food: "Kjøtt", phone: "+47 934 56 789", rate: "5000", st: "confirmed" },
    { name: "Sofia Nilsen", role: "Stage Hand", status: "Standby", days: [0, 0, 1, 1], hotel: "No", roommate: "-", food: "Allergi (Nøtter)", phone: "+47 945 67 890", rate: "3500", st: "standby" },
    { name: "Henrik Moen", role: "Rigger", status: "Confirmed", days: [1, 1, 1, 1], hotel: "Room 405", roommate: "Ole Karlsen", food: "Kjøtt", phone: "+47 956 78 901", rate: "4500", st: "confirmed" },
    { name: "Jonas Lie", role: "Sound Tech", status: "Declined", days: [0, 0, 0, 0], hotel: "-", roommate: "-", food: "-", phone: "+47 967 89 012", rate: "0", st: "declined" },
    { name: "Emma Bakke", role: "Lighting Op", status: "Confirmed", days: [1, 1, 1, 1], hotel: "Room 406", roommate: "-", food: "Vegetar", phone: "+47 978 90 123", rate: "5200", st: "confirmed" },
    { name: "Ole Karlsen", role: "Rigger", status: "Pending", days: [1, 1, 1, 0], hotel: "TBD", roommate: "Henrik Moen", food: "Kjøtt", phone: "+47 989 01 234", rate: "4500", st: "pending" },
    { name: "Camilla Haugen", role: "LED Tech", status: "Confirmed", days: [1, 1, 1, 1], hotel: "Room 403", roommate: "Ingrid Solheim", food: "Fisk", phone: "+47 990 12 345", rate: "4500", st: "confirmed" },
  ];

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden selection:bg-[#4a6278]/40"
      style={{
        backgroundColor: bgApp,
        color: textPrimary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <style>{`
        /* Native Mac Scrollbars */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          border: 2px solid ${bgApp};
          background-clip: padding-box;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.25);
        }
        
        .mac-border { border: 1px solid ${borderSubtle}; }
        .mac-border-b { border-bottom: 1px solid ${borderSubtle}; }
        .mac-border-r { border-right: 1px solid ${borderSubtle}; }
        .mac-border-l { border-left: 1px solid ${borderSubtle}; }
        .mac-border-t { border-top: 1px solid ${borderSubtle}; }
        
        .table-row-selected {
          background-color: #2b3b4a;
        }
        
        .native-focus:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(74, 98, 120, 0.5);
        }
      `}</style>

      {/* Left Sidebar - Navigation */}
      <div className="w-[220px] flex-shrink-0 flex flex-col mac-border-r relative" style={{ backgroundColor: bgSidebar }}>
        
        {/* Mac Window Controls Area */}
        <div className="h-[52px] flex items-center pl-4 pr-3 gap-2 mac-border-b drag-area z-20">
          <div className="flex gap-2 group cursor-default">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
          </div>
        </div>

        {/* User / Workspace Identity */}
        <div className="pt-5 pb-2 px-3">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-[22px] h-[22px] rounded-[4px] bg-[#111] flex items-center justify-center border border-white/10 text-[10px] font-bold tracking-widest text-white/80">
              EHS
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-[#ececec]">EHS Production</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          
          {/* Section: Project */}
          <div>
            <div className="px-2 text-[10px] font-bold tracking-[0.06em] text-[#8e8e93] mb-1.5 uppercase">
              Aurora Festival '26
            </div>
            <div className="space-y-[2px]">
              {[
                { name: "Overview", icon: "O", active: false },
                { name: "Inspection", icon: "B", active: false },
                { name: "Rigging", icon: "R", active: false },
                { name: "Lighting", icon: "L", active: false },
                { name: "LED Screens", icon: "S", active: false },
                { name: "Stage", icon: "T", active: false },
                { name: "Sound", icon: "A", active: false },
                { name: "Rigg Plan", icon: "P", active: false },
              ].map((item) => (
                <div
                  key={item.name}
                  className="px-2 py-[5px] text-[13px] rounded flex items-center gap-2.5 cursor-default transition-colors"
                  style={{
                    backgroundColor: item.active ? accentColor : "transparent",
                    color: item.active ? "#fff" : "#b0b0b0",
                  }}
                >
                  <span className="opacity-50 text-[10px] w-3 text-center">{item.icon}</span>
                  <span className="truncate leading-none">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Logistics */}
          <div>
            <div className="px-2 text-[10px] font-bold tracking-[0.06em] text-[#8e8e93] mb-1.5 uppercase">
              Logistics
            </div>
            <div className="space-y-[2px]">
              {[
                { name: "Crew & Logistics", active: true },
                { name: "Catering", active: false },
                { name: "Hotel", active: false },
                { name: "Transport", active: false },
              ].map((item) => (
                <div
                  key={item.name}
                  className="px-2 py-[5px] text-[13px] rounded flex items-center justify-between cursor-default"
                  style={{
                    backgroundColor: item.active ? accentColor : "transparent",
                    color: item.active ? "#fff" : "#b0b0b0",
                  }}
                >
                  <span className="truncate pl-[22px] leading-none">{item.name}</span>
                  {item.active && (
                    <span className="text-[10px] opacity-60 font-medium tracking-tight">⌘2</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Status - Bottom of sidebar */}
        <div className="h-8 text-[10px] mac-border-t flex items-center px-4" style={{ color: "#666" }}>
          Synced just now
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1c1c1e]">
        
        {/* Top Header Bar */}
        <div className="h-[52px] shrink-0 mac-border-b flex items-center px-5 justify-between relative z-10 bg-[#1c1c1e]/90 backdrop-blur-xl">
          
          {/* Breadcrumb / Title Area */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              <span className="text-[13px] font-medium text-[#8e8e93]">Aurora Festival</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              <span className="text-[13px] font-semibold text-[#ececec]">Crew Master Sheet</span>
            </div>
            
            <div className="h-3.5 w-[1px] bg-white/10 mx-2" />
            
            {/* Meta badges */}
            <div className="flex items-center gap-3 text-[12px] text-[#8e8e93]">
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                Oslo Spektrum
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                NRK
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                14–17 May
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button className="h-[26px] px-2.5 rounded-[4px] text-[12px] font-medium border border-white/10 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#d1d1d6] flex items-center gap-1.5 transition-colors native-focus">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
              Print
            </button>
            <button className="h-[26px] px-2.5 rounded-[4px] text-[12px] font-medium border border-white/10 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#d1d1d6] flex items-center gap-1.5 transition-colors native-focus">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              Send Brief
            </button>
            <div className="h-3 w-[1px] bg-white/10 mx-0.5" />
            <button className="h-[26px] px-3 rounded-[4px] text-[12px] font-medium border border-[#526b82] bg-[#4a6278] hover:bg-[#57728a] text-white flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-colors native-focus">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Crew
            </button>
          </div>
        </div>

        {/* View Controls / Command Bar below header */}
        <div className="px-5 py-2.5 mac-border-b flex items-center gap-4 bg-[#1c1c1e]">
          <div className="relative group flex-1 max-w-[300px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" className="absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:stroke-[#4a6278] transition-colors"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              type="text" 
              placeholder="Filter crew..." 
              className="w-full bg-[#242426] border border-white/10 rounded-md pl-8 pr-8 py-1 text-[12px] text-[#ececec] placeholder-[#666] focus:outline-none focus:border-[#4a6278] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <span className="text-[10px] text-[#666] font-medium">⌘</span>
              <span className="text-[10px] text-[#666] font-medium">F</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-[#8e8e93]">
            <button className="px-2.5 py-1 rounded bg-[#2c2c2e] text-[#d1d1d6] cursor-default border border-white/5">All Roles</button>
            <button className="px-2.5 py-1 rounded hover:bg-[#242426] cursor-default border border-transparent">Riggers</button>
            <button className="px-2.5 py-1 rounded hover:bg-[#242426] cursor-default border border-transparent">Lighting</button>
            <button className="px-2.5 py-1 rounded hover:bg-[#242426] cursor-default border border-transparent">Sound</button>
          </div>
        </div>

        {/* Content Split - Table + Inspector */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Table View */}
          <div className="flex-1 overflow-auto bg-[#1c1c1e] relative">
            <table className="w-full text-left text-[13px] border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-[#1c1c1e]/95 backdrop-blur z-10 text-[#8e8e93] text-[11px] font-medium mac-border-b select-none">
                <tr>
                  <th className="px-4 py-1.5 w-8 font-medium"></th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Name</th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Role</th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Status</th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Days <span className="opacity-50">(14-17)</span></th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Hotel</th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Roommate</th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Food</th>
                  <th className="px-3 py-1.5 font-medium border-l border-white/5">Phone</th>
                  <th className="px-4 py-1.5 font-medium border-l border-white/5 text-right">Day Rate</th>
                </tr>
              </thead>
              <tbody className="text-[#d1d1d6] select-none">
                {crew.map((row, i) => {
                  const isSelected = i === 1; // Simulate a selected row for Native feel
                  return (
                    <tr 
                      key={i} 
                      className={`
                        mac-border-b group cursor-default h-[32px]
                        ${isSelected ? 'bg-[#2b3b4a] text-white' : 'hover:bg-[#242426]'}
                      `}
                    >
                      <td className="px-4 py-1.5 text-[10px] opacity-40 text-center">{i + 1}</td>
                      <td className={`px-3 py-1.5 font-medium ${isSelected ? 'text-white' : 'text-[#ececec]'}`}>
                        {row.name}
                      </td>
                      <td className={`px-3 py-1.5 ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>
                        {row.role}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-[6px] h-[6px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] ${
                            row.st === 'confirmed' ? 'bg-[#32d74b]' :
                            row.st === 'pending' ? 'bg-[#ffd60a]' :
                            row.st === 'standby' ? 'bg-[#ff9f0a]' :
                            'bg-[#444]'
                          }`} />
                          <span className={`text-[12px] ${row.st === 'declined' ? 'opacity-50 line-through' : ''}`}>
                            {row.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-[2px]">
                          {row.days.map((d, idx) => (
                            <div
                              key={idx}
                              className={`w-3 h-3 rounded-[2px] border ${
                                d 
                                ? (isSelected ? 'bg-white/30 border-transparent' : 'bg-[#4a6278] border-transparent') 
                                : (isSelected ? 'border-white/20' : 'border-white/10')
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className={`px-3 py-1.5 text-[12px] ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>{row.hotel}</td>
                      <td className={`px-3 py-1.5 text-[12px] ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>{row.roommate}</td>
                      <td className={`px-3 py-1.5 text-[12px] ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>{row.food}</td>
                      <td className={`px-3 py-1.5 font-mono text-[11px] tracking-wide ${isSelected ? 'text-white/70' : 'text-[#666]'}`}>{row.phone}</td>
                      <td className={`px-4 py-1.5 font-mono text-[11px] tracking-wide text-right ${isSelected ? 'text-white' : 'text-[#ececec]'}`}>
                        {row.rate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Inspector Panel */}
          <div className="w-[280px] flex-shrink-0 mac-border-l bg-[#242426] flex flex-col text-[13px]">
            
            <div className="px-4 py-3 mac-border-b flex justify-between items-center bg-[#242426]">
              <span className="font-semibold text-[#ececec]">Logistics Summary</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </div>
            
            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
              
              {/* Group 1 */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-[#666] uppercase mb-3">
                  Headcount Status
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ececec]">Total Crew</span>
                  <span className="font-mono text-lg text-[#ececec]">10</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[#8e8e93] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#32d74b]" /> Confirmed
                  </span>
                  <span className="font-mono text-[#8e8e93]">6</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[#8e8e93] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ffd60a]" /> Pending
                  </span>
                  <span className="font-mono text-[#8e8e93]">2</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[#8e8e93] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" /> Standby
                  </span>
                  <span className="font-mono text-[#8e8e93]">1</span>
                </div>
              </div>

              <div className="h-[1px] bg-white/10" />

              {/* Group 2 */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-[#666] uppercase mb-3">
                  Accommodations
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ececec]">Hotel Rooms Needed</span>
                  <span className="font-mono text-[#ececec]">5</span>
                </div>
                <div className="bg-[#1c1c1e] p-2.5 rounded border border-white/5 mt-2">
                  <div className="text-[11px] text-[#8e8e93] leading-relaxed font-mono">
                    <span className="text-[#ececec]">402</span>, 
                    <span className="text-[#ececec]"> 403</span> (Twin), 
                    <span className="text-[#ececec]"> 404</span> (Twin), 
                    <span className="text-[#ececec]"> 405</span> (Twin), 
                    <span className="text-[#ececec]"> 406</span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-white/10" />

              {/* Group 3 */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-[#666] uppercase mb-3">
                  Dietary Requirements
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#8e8e93]">Kjøtt</span>
                    <span className="font-mono text-[#8e8e93]">4</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#8e8e93]">Vegetar</span>
                    <span className="font-mono text-[#8e8e93]">2</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#8e8e93]">Fisk</span>
                    <span className="font-mono text-[#8e8e93]">2</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] bg-[#ff9f0a]/10 p-1.5 rounded -mx-1.5 border border-[#ff9f0a]/20">
                    <span className="text-[#ff9f0a]">Allergi</span>
                    <span className="font-mono text-[#ff9f0a]">1 (Nøtter)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Sticky Cost */}
            <div className="p-4 mac-border-t bg-[#1c1c1e]">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[11px] text-[#8e8e93] uppercase tracking-wider font-semibold">Day-Rate Cost</span>
                <span className="text-[10px] text-[#666] bg-[#2c2c2e] px-1.5 rounded">NOK</span>
              </div>
              <div className="text-[24px] font-mono tracking-tight text-[#ececec]">
                42 000
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
