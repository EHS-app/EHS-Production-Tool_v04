import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function BuildOrderSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          09 / Plan
        </div>
        <h2 className="text-[4.4vw] leading-[1.05] font-extrabold tracking-tight mt-[2.5vh] [text-wrap:balance]">
          Byggerekkefølge
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[55vw] top-[38vh] grid grid-cols-[4vw_1fr] gap-x-[2vw] gap-y-[2.6vh]">
        <div className="text-[1.7vw] font-extrabold text-accent leading-none pt-[0.3vh]">
          1
        </div>
        <p className="text-[1.55vw] leading-snug font-semibold [text-wrap:pretty]">
          Auto-tildel-motor + Crew-fane-grensesnitt
        </p>

        <div className="text-[1.7vw] font-extrabold text-accent leading-none pt-[0.3vh]">
          2
        </div>
        <p className="text-[1.55vw] leading-snug font-semibold [text-wrap:pretty]">
          Cateringskjerm + PDF-eksport
        </p>

        <div className="text-[1.7vw] font-extrabold text-accent leading-none pt-[0.3vh]">
          3
        </div>
        <p className="text-[1.55vw] leading-snug font-semibold [text-wrap:pretty]">
          Hotellskjerm + paringslogikk + eksport av romliste
        </p>

        <div className="text-[1.7vw] font-extrabold text-accent leading-none pt-[0.3vh]">
          4
        </div>
        <p className="text-[1.55vw] leading-snug font-semibold [text-wrap:pretty]">
          Reiseplan-fane i portalen
        </p>
      </div>

      <div className="absolute right-[6vw] top-[38vh] w-[40vw]">
        <div className="border-l-[3px] border-accent pl-[2vw] py-[1vh]">
          <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold mb-[2vh]">
            Allerede levert
          </div>
          <p className="text-[1.55vw] leading-snug font-medium text-muted [text-wrap:pretty]">
            Databasefelt for alle fire er allerede levert i Fase A — vi bygger grensesnitt og regler, ikke skjema.
          </p>
        </div>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        09 / 09
      </div>
    </div>
  );
}
