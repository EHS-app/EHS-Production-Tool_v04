import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function Feature4ItinerarySlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Funksjon 04 / Fase B
        </div>
        <h2 className="text-[4.2vw] leading-[1.0] font-extrabold tracking-tight mt-[2.5vh] max-w-[80vw] [text-wrap:balance]">
          Frilanser-reiseplan
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[40vh]">
        <p className="text-[1.85vw] leading-snug font-semibold max-w-[72vw] mb-[4.5vh] [text-wrap:pretty]">
          Ny fane i portalen — en daglig oversikt som kombinerer oppmøtetider, hotell, måltider og info om spillestedet for den frilanseren.
        </p>
        <div className="h-[2px] w-[10vw] bg-accent mb-[3.5vh]"></div>
        <p className="text-[1.6vw] leading-snug text-muted font-medium mb-[1.8vh] max-w-[62vw] [text-wrap:pretty]">
          Eksport av kalender for hele turen.
        </p>
        <p className="text-[1.6vw] leading-snug text-muted font-medium max-w-[62vw] [text-wrap:pretty]">
          Lukker sløyfen: data vi bygde for planlegging havner tilbake som noe frilanseren faktisk kan bruke.
        </p>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        08 / 09
      </div>
    </div>
  );
}
