import React from "react";

const crewData = [
  { name: "Magnus Berg", role: "Head Rigger", status: "Confirmed", days: [1, 1, 1, 1], hotel: "412", roommate: "Lars Olsen", food: "Kjøtt", phone: "+47 912 34 567", rate: 6500 },
  { name: "Ingrid Solheim", role: "Lighting Tech", status: "Confirmed", days: [0, 1, 1, 1], hotel: "414", roommate: "Sofia Nilsen", food: "Vegetar", phone: "+47 923 45 678", rate: 5200 },
  { name: "Kari Hansen", role: "LED Screen Tech", status: "Pending", days: [1, 1, 1, 0], hotel: "No", roommate: "-", food: "Kjøtt", phone: "+47 934 56 789", rate: 5000 },
  { name: "Lars Olsen", role: "Rigger", status: "Confirmed", days: [1, 1, 1, 1], hotel: "412", roommate: "Magnus Berg", food: "Kjøtt", phone: "+47 945 67 890", rate: 4800 },
  { name: "Sofia Nilsen", role: "Lighting Tech", status: "Confirmed", days: [0, 1, 1, 1], hotel: "414", roommate: "Ingrid Solheim", food: "Allergi (Nøtter)", phone: "+47 956 78 901", rate: 4800 },
  { name: "Henrik Moen", role: "Sound Engineer", status: "Confirmed", days: [0, 0, 1, 1], hotel: "415", roommate: "-", food: "Fisk", phone: "+47 967 89 012", rate: 5500 },
  { name: "Jonas Lie", role: "Tour Manager", status: "Confirmed", days: [1, 1, 1, 1], hotel: "416", roommate: "-", food: "Kjøtt", phone: "+47 978 90 123", rate: 7000 },
  { name: "Emma Bakke", role: "Stage Hand", status: "Standby", days: [1, 1, 0, 0], hotel: "No", roommate: "-", food: "Vegetar", phone: "+47 989 01 234", rate: 3500 },
  { name: "Ole Karlsen", role: "Stage Hand", status: "Pending", days: [1, 1, 0, 0], hotel: "No", roommate: "-", food: "Kjøtt", phone: "+47 990 12 345", rate: 3500 },
  { name: "Camilla Haugen", role: "Sound Assistant", status: "Confirmed", days: [0, 0, 1, 1], hotel: "418", roommate: "-", food: "Vegetar", phone: "+47 901 23 456", rate: 4200 },
];

export default function CrewLogistics() {
  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#0A0A0A] p-4 md:p-8 lg:p-12 relative overflow-hidden font-sans selection:bg-[#FF2E93] selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');

        .font-display {
          font-family: 'Anton', sans-serif;
          text-transform: uppercase;
          line-height: 0.9;
        }
        
        .font-mono-data {
          font-family: 'Space Mono', monospace;
          font-variant-numeric: tabular-nums;
        }

        .border-hairline {
          border-color: #0A0A0A;
          border-width: 1px;
        }

        .text-poster {
          color: #FF2E93; /* Riso Pink */
        }
        .bg-poster {
          background-color: #FF2E93;
        }
        .border-poster {
          border-color: #FF2E93;
        }

        .day-box {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 1px solid #0A0A0A;
          margin-right: 2px;
        }
        .day-box.filled {
          background-color: #FF2E93;
          border-color: #FF2E93;
        }
        .day-box.empty {
          background-color: transparent;
        }
      ` }} />

      <div className="max-w-[1600px] mx-auto relative">
        {/* TOP CHROME */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 border-b border-hairline pb-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-mono-data mb-4 text-poster font-bold">EHS_SYSTEM / PROGRAMME</div>
            <h1 className="font-display text-[5rem] md:text-[8rem] lg:text-[10rem] tracking-tight -ml-1">AURORA</h1>
            <h1 className="font-display text-[5rem] md:text-[8rem] lg:text-[10rem] tracking-tight text-poster -mt-4 md:-mt-8 -ml-1">FESTIVAL '26</h1>
          </div>
          
          <div className="flex flex-col items-start md:items-end text-sm md:text-base font-mono-data leading-loose">
            <div className="flex gap-8 justify-between w-full md:w-auto border-b border-hairline border-opacity-20 md:border-none pb-2 md:pb-0"><span className="opacity-50">VENUE</span><span>Oslo Spektrum</span></div>
            <div className="flex gap-8 justify-between w-full md:w-auto border-b border-hairline border-opacity-20 md:border-none pb-2 md:pb-0"><span className="opacity-50">CLIENT</span><span>NRK</span></div>
            <div className="flex gap-8 justify-between w-full md:w-auto"><span className="opacity-50">DATES</span><span className="text-poster font-bold">14–17 MAY 2026</span></div>
          </div>
        </header>

        {/* NAVIGATION PROGRAMME STYLE */}
        <nav className="border-b border-hairline py-4 mb-16 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <ul className="flex space-x-12 uppercase text-sm tracking-widest font-mono-data">
            {['Inspection', 'Rigging', 'Lighting', 'LED Screens', 'Stage', 'Sound', 'Rigg Plan', 'Crew & Logistics', 'Catering', 'Hotel'].map((item) => (
              <li key={item} className={`cursor-pointer hover:text-poster transition-colors ${item === 'Crew & Logistics' ? 'text-poster font-bold' : 'opacity-60'}`}>
                {item}
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-16 lg:gap-24 items-start">
          {/* MAIN SHEET */}
          <div className="w-full overflow-x-auto">
            <h2 className="font-display text-4xl md:text-6xl mb-8 border-b-4 border-black pb-4 inline-block">ROSTER</h2>
            <table className="w-full text-sm font-mono-data border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-hairline border-opacity-40 text-xs">
                  <th className="py-4 text-left font-normal opacity-50 w-48 uppercase tracking-widest">Name</th>
                  <th className="py-4 text-left font-normal opacity-50 w-40 uppercase tracking-widest">Role</th>
                  <th className="py-4 text-left font-normal opacity-50 w-24 uppercase tracking-widest">Status</th>
                  <th className="py-4 text-left font-normal opacity-50 w-24 uppercase tracking-widest">Days</th>
                  <th className="py-4 text-left font-normal opacity-50 w-16 uppercase tracking-widest">Hotel</th>
                  <th className="py-4 text-left font-normal opacity-50 w-32 uppercase tracking-widest">Roommate</th>
                  <th className="py-4 text-left font-normal opacity-50 w-32 uppercase tracking-widest">Food</th>
                  <th className="py-4 text-left font-normal opacity-50 w-36 uppercase tracking-widest">Phone</th>
                  <th className="py-4 text-right font-normal opacity-50 w-24 uppercase tracking-widest">Rate</th>
                </tr>
              </thead>
              <tbody>
                {crewData.map((crew, idx) => (
                  <tr key={idx} className="border-b border-[#0A0A0A] border-opacity-10 hover:bg-[#FF2E93] hover:bg-opacity-10 transition-colors group">
                    <td className="py-4 pr-4 whitespace-nowrap font-bold text-base">{crew.name}</td>
                    <td className="py-4 pr-4 opacity-70 whitespace-nowrap text-xs">{crew.role}</td>
                    <td className="py-4 pr-4">
                      <span className={`inline-block px-2 py-1 text-[10px] uppercase tracking-widest ${crew.status === 'Confirmed' ? 'bg-poster text-white font-bold' : crew.status === 'Pending' ? 'border border-poster text-poster' : crew.status === 'Declined' ? 'line-through opacity-50' : 'bg-black text-white'}`}>
                        {crew.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex">
                        {crew.days.map((d, i) => (
                          <span key={i} className={`day-box ${d ? 'filled' : 'empty'}`}></span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 pr-4">{crew.hotel}</td>
                    <td className="py-4 pr-4 truncate max-w-[120px]">{crew.roommate}</td>
                    <td className="py-4 pr-4 text-xs">{crew.food}</td>
                    <td className="py-4 pr-4 opacity-70 text-xs">{crew.phone}</td>
                    <td className="py-4 text-right tabular-nums text-base">{crew.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SUMMARY PANEL */}
          <div className="border border-hairline sticky top-8 flex flex-col">
            <div className="bg-black text-white p-6">
              <h3 className="font-display text-4xl tracking-wide">SUMMARY</h3>
            </div>
            
            <div className="p-6 flex flex-col gap-6 font-mono-data text-sm">
              <div className="flex justify-between items-end border-b border-hairline border-opacity-20 pb-4">
                <span className="opacity-50 uppercase tracking-widest text-xs">Total Crew</span>
                <span className="text-2xl font-bold">10</span>
              </div>
              <div className="flex justify-between items-end border-b border-hairline border-opacity-20 pb-4">
                <span className="opacity-50 uppercase tracking-widest text-xs">Confirmed</span>
                <span className="text-2xl text-poster font-bold">8</span>
              </div>
              <div className="flex justify-between items-end border-b border-hairline border-opacity-20 pb-4">
                <span className="opacity-50 uppercase tracking-widest text-xs">Pending</span>
                <span className="text-xl">2</span>
              </div>
              <div className="flex justify-between items-end border-b border-hairline border-opacity-20 pb-4">
                <span className="opacity-50 uppercase tracking-widest text-xs">Hotel Rooms</span>
                <span className="text-xl">6</span>
              </div>
              <div className="flex justify-between items-end border-b border-hairline border-opacity-20 pb-4">
                <span className="opacity-50 uppercase tracking-widest text-xs">Dietary</span>
                <span className="text-sm text-right w-1/2 leading-tight">4 Notes</span>
              </div>
              
              <div className="pt-4 flex flex-col gap-2">
                <span className="opacity-50 uppercase tracking-widest text-xs">Total Est. Cost</span>
                <span className="text-4xl font-bold text-poster">53,700<span className="text-sm ml-1 opacity-50">NOK</span></span>
              </div>
            </div>

            <div className="flex flex-col border-t border-hairline font-mono-data text-sm uppercase tracking-widest font-bold">
              <button className="w-full py-6 bg-poster text-white text-center hover:bg-black transition-colors">Print Handoff</button>
              <button className="w-full py-6 bg-transparent text-[#0A0A0A] text-center border-t border-hairline hover:bg-[#0A0A0A] hover:text-white transition-colors">Send Brief</button>
              <button className="w-full py-6 bg-transparent text-[#0A0A0A] text-center border-t border-hairline hover:bg-[#0A0A0A] hover:text-white transition-colors">Add Crew</button>
            </div>
          </div>
        </div>
        
        <footer className="mt-24 pt-8 border-t border-hairline flex justify-between items-center text-xs uppercase tracking-widest opacity-50 font-mono-data">
          <span>EHS Internal / Confidential</span>
          <span>Gen. {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
