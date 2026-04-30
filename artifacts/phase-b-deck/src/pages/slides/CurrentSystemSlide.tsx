import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function CurrentSystemSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          02 / Nåsituasjon
        </div>
        <h2 className="text-[4.4vw] leading-[1.05] font-extrabold tracking-tight mt-[2.5vh] [text-wrap:balance]">
          Hvor vi er i dag
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[42vh] grid grid-cols-3 gap-[3vw]">
        <div className="border-t-[3px] border-accent pt-[2.5vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[2vh]">
            01
          </div>
          <h3 className="text-[2.3vw] font-extrabold leading-tight mb-[2.5vh]">
            Produksjonsverktøy
          </h3>
          <p className="text-[1.5vw] leading-relaxed text-muted [text-wrap:pretty]">
            Produsenter planlegger rigg, lys, LED, scene, lyd, crew og plantegning.
          </p>
        </div>

        <div className="border-t-[3px] border-accent pt-[2.5vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[2vh]">
            02
          </div>
          <h3 className="text-[2.3vw] font-extrabold leading-tight mb-[2.5vh]">
            Frilanser-portal
          </h3>
          <p className="text-[1.5vw] leading-relaxed text-muted [text-wrap:pretty]">
            Frilansere ser briefer, oppdrag, tilgjengelighet, inntjening og profiler.
          </p>
        </div>

        <div className="border-t-[3px] border-accent pt-[2.5vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[2vh]">
            03
          </div>
          <h3 className="text-[2.3vw] font-extrabold leading-tight mb-[2.5vh]">
            Delt database
          </h3>
          <p className="text-[1.5vw] leading-relaxed text-muted [text-wrap:pretty]">
            Begge appene leser og skriver til samme kilde.
          </p>
        </div>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        02 / 09
      </div>
    </div>
  );
}
