import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function Feature3HotelsSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Feature 04 / Phase B
        </div>
        <h2 className="text-[4.2vw] leading-[1.0] font-extrabold tracking-tight mt-[2.5vh] max-w-[80vw] [text-wrap:balance]">
          Hotel Logistics
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[40vh]">
        <p className="text-[1.85vw] leading-snug font-semibold max-w-[72vw] mb-[4.5vh] [text-wrap:pretty]">
          Toggle 'hotel needed'; check-in / check-out are derived from assigned days.
        </p>
        <div className="h-[2px] w-[10vw] bg-accent mb-[3.5vh]"></div>
        <p className="text-[1.6vw] leading-snug text-muted font-medium mb-[1.8vh] max-w-[62vw] [text-wrap:pretty]">
          Suggests twin-share pairings by preference.
        </p>
        <p className="text-[1.6vw] leading-snug text-muted font-medium mb-[1.8vh] max-w-[62vw] [text-wrap:pretty]">
          Producer can lock pairings or override per person.
        </p>
        <p className="text-[1.6vw] leading-snug text-muted font-medium max-w-[62vw] [text-wrap:pretty]">
          Exports a clean rooming list for the hotel.
        </p>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        08 / 11
      </div>
    </div>
  );
}
