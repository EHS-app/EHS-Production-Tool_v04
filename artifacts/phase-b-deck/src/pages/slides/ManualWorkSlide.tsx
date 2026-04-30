import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function ManualWorkSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          03 / Problem
        </div>
        <h2 className="text-[4.4vw] leading-[1.05] font-extrabold tracking-tight mt-[2.5vh] max-w-[55vw] [text-wrap:balance]">
          The hidden manual work
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[42vh] grid grid-cols-[5vw_1fr] gap-x-[2.5vw] gap-y-[3.5vh] max-w-[80vw]">
        <div className="text-[2vw] font-extrabold text-accent leading-none pt-[0.4vh]">
          01
        </div>
        <p className="text-[1.7vw] leading-snug font-semibold [text-wrap:pretty]">
          Producers tell each freelancer which days they're on, in WhatsApp.
        </p>

        <div className="text-[2vw] font-extrabold text-accent leading-none pt-[0.4vh]">
          02
        </div>
        <p className="text-[1.7vw] leading-snug font-semibold [text-wrap:pretty]">
          Someone counts allergies before lunch — on a clipboard.
        </p>

        <div className="text-[2vw] font-extrabold text-accent leading-none pt-[0.4vh]">
          03
        </div>
        <p className="text-[1.7vw] leading-snug font-semibold [text-wrap:pretty]">
          Rooming lists are emailed to hotels, then corrected twice.
        </p>

        <div className="text-[2vw] font-extrabold text-accent leading-none pt-[0.4vh]">
          04
        </div>
        <p className="text-[1.7vw] leading-snug font-semibold [text-wrap:pretty]">
          Every freelancer rebuilds their personal week from a brief PDF.
        </p>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        03 / 09
      </div>
    </div>
  );
}
