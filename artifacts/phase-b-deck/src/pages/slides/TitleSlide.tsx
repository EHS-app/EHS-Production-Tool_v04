export default function TitleSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="w-[2vw] h-[2vw] bg-accent"></div>
          <div className="text-[2vw] font-extrabold tracking-tight text-text leading-none">
            EHS
          </div>
        </div>
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Phase B
        </div>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[28vh]">
        <h1
          className="text-[7.4vw] leading-[0.95] font-extrabold tracking-tight text-text max-w-[88vw] [text-wrap:balance]"
        >
          Phase B — Automation Layer
        </h1>
      </div>

      <div className="absolute left-[6vw] right-[6vw] bottom-[8vh]">
        <div className="h-[3px] w-[14vw] bg-accent mb-[3vh]"></div>
        <p className="text-[1.7vw] leading-snug text-muted max-w-[60vw] font-medium mb-[2.5vh] [text-wrap:pretty]">
          Turning the producer's schedule into catering, hotels and freelancer itineraries — automatically.
        </p>
        <p className="text-[1.5vw] tracking-[0.3em] uppercase text-muted font-semibold">
          Internal product team briefing
        </p>
      </div>

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        01 / 09
      </div>
    </div>
  );
}
