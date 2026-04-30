import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function ChainSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          04 / Kjeden
        </div>
        <h2 className="text-[4.4vw] leading-[1.05] font-extrabold tracking-tight mt-[2.5vh] [text-wrap:balance]">
          Fire funksjoner, én kjede
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[44vh] grid grid-cols-[1fr_2.5vw_1fr_2.5vw_1fr_2.5vw_1fr] items-start gap-0">
        <div className="border-t-[3px] border-accent pt-[2vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[1.5vh]">
            01
          </div>
          <h3 className="text-[1.65vw] font-extrabold leading-tight [text-wrap:balance]">
            Auto-tildel timeplan → Oppdrag
          </h3>
        </div>
        <div className="text-[2.2vw] text-muted text-center mt-[5.5vh] font-light">
          →
        </div>
        <div className="border-t-[3px] border-accent pt-[2vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[1.5vh]">
            02
          </div>
          <h3 className="text-[1.65vw] font-extrabold leading-tight [text-wrap:balance]">
            Catering-aggregering
          </h3>
        </div>
        <div className="text-[2.2vw] text-muted text-center mt-[5.5vh] font-light">
          →
        </div>
        <div className="border-t-[3px] border-accent pt-[2vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[1.5vh]">
            03
          </div>
          <h3 className="text-[1.65vw] font-extrabold leading-tight [text-wrap:balance]">
            Hotellogistikk (romlister)
          </h3>
        </div>
        <div className="text-[2.2vw] text-muted text-center mt-[5.5vh] font-light">
          →
        </div>
        <div className="border-t-[3px] border-accent pt-[2vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[1.5vh]">
            04
          </div>
          <h3 className="text-[1.65vw] font-extrabold leading-tight [text-wrap:balance]">
            Frilanser-reiseplan
          </h3>
        </div>
      </div>

      <div className="absolute left-[6vw] right-[6vw] bottom-[12vh]">
        <p className="text-[1.7vw] leading-snug text-muted max-w-[65vw] font-medium [text-wrap:pretty]">
          Hver funksjon bruker det den forrige produserte. Produsenten legger inn timeplanen én gang.
        </p>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        04 / 09
      </div>
    </div>
  );
}
