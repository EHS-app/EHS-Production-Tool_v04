import ehsLogo from "@assets/EHS_logo_(1)_1777540291226.png";

export default function Feature1AutoAssignSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Feature 01 / Phase B
        </div>
        <h2 className="text-[4.2vw] leading-[1.0] font-extrabold tracking-tight mt-[2.5vh] max-w-[80vw] [text-wrap:balance]">
          Auto-Assign Schedules → Gigs
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[42vh]">
        <p className="text-[1.9vw] leading-snug font-semibold max-w-[72vw] mb-[5vh] [text-wrap:pretty]">
          When a freelancer is added to crew, the system writes their working days into the gig automatically — derived from the project schedule and their role.
        </p>
        <div className="h-[2px] w-[10vw] bg-accent mb-[4vh]"></div>
        <p className="text-[1.65vw] leading-snug text-muted font-medium mb-[2vh] max-w-[60vw] [text-wrap:pretty]">
          Producer override stays a single click.
        </p>
        <p className="text-[1.65vw] leading-snug text-muted font-medium max-w-[60vw] [text-wrap:pretty]">
          Unlocks every downstream feature.
        </p>
      </div>

      <img src={ehsLogo} alt="EHS" className="absolute bottom-[6vh] left-[6vw] h-[4.5vh] w-auto object-contain" />

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        05 / 09
      </div>
    </div>
  );
}
