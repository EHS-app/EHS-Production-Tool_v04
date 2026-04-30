import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function Feature2CateringSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Funksjon 02 / Fase B
        </div>
        <h2 className="text-[4.2vw] leading-[1.0] font-extrabold tracking-tight mt-[2.5vh] max-w-[80vw] [text-wrap:balance]">
          Catering-aggregering
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[42vh]">
        <p className="text-[1.9vw] leading-snug font-semibold max-w-[72vw] mb-[5vh] [text-wrap:pretty]">
          Per dag, per spillested: totalt antall måltider, antall vegetar / vegan / halal / glutenfri, full allergiliste med navn knyttet til.
        </p>
        <div className="h-[2px] w-[10vw] bg-accent mb-[4vh]"></div>
        <p className="text-[1.65vw] leading-snug text-muted font-medium mb-[2vh] max-w-[60vw] [text-wrap:pretty]">
          Oppdateres live når crew eller timeplan endres.
        </p>
        <p className="text-[1.65vw] leading-snug text-muted font-medium max-w-[60vw] [text-wrap:pretty]">
          Ett-klikks PDF til kjøkkensjefen på stedet.
        </p>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        06 / 09
      </div>
    </div>
  );
}
