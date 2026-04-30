export default function ChainSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          04 / The chain
        </div>
        <h2 className="text-[4.4vw] leading-[1.05] font-extrabold tracking-tight mt-[2.5vh] [text-wrap:balance]">
          Four features, one chain
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[44vh] grid grid-cols-[1fr_2.5vw_1fr_2.5vw_1fr_2.5vw_1fr] items-start gap-0">
        <div className="border-t-[3px] border-accent pt-[2vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[1.5vh]">
            01
          </div>
          <h3 className="text-[1.65vw] font-extrabold leading-tight [text-wrap:balance]">
            Auto-Assign Schedules → Gigs
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
            Catering Aggregation
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
            Hotel Logistics (Rooming Lists)
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
            Freelancer Itinerary View
          </h3>
        </div>
      </div>

      <div className="absolute left-[6vw] right-[6vw] bottom-[12vh]">
        <p className="text-[1.7vw] leading-snug text-muted max-w-[65vw] font-medium [text-wrap:pretty]">
          Each feature consumes what the previous one produced. The producer enters the schedule once.
        </p>
      </div>

      <div className="absolute bottom-[6vh] left-[6vw] flex items-center gap-[0.8vw]">
        <div className="w-[1.4vw] h-[1.4vw] bg-accent"></div>
        <div className="text-[1.5vw] font-extrabold tracking-tight text-text leading-none">
          EHS
        </div>
      </div>

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        04 / 09
      </div>
    </div>
  );
}
