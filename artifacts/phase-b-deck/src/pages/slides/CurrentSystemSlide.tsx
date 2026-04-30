export default function CurrentSystemSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          02 / Status quo
        </div>
        <h2 className="text-[4.4vw] leading-[1.05] font-extrabold tracking-tight mt-[2.5vh] [text-wrap:balance]">
          Where we are today
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[42vh] grid grid-cols-3 gap-[3vw]">
        <div className="border-t-[3px] border-accent pt-[2.5vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[2vh]">
            01
          </div>
          <h3 className="text-[2.3vw] font-extrabold leading-tight mb-[2.5vh]">
            Production Tool
          </h3>
          <p className="text-[1.5vw] leading-relaxed text-muted [text-wrap:pretty]">
            Producers plan rigging, lighting, LED, stage, sound, crew and floor plan.
          </p>
        </div>

        <div className="border-t-[3px] border-accent pt-[2.5vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[2vh]">
            02
          </div>
          <h3 className="text-[2.3vw] font-extrabold leading-tight mb-[2.5vh]">
            Freelance Portal
          </h3>
          <p className="text-[1.5vw] leading-relaxed text-muted [text-wrap:pretty]">
            Freelancers see briefs, gigs, availability, earnings and profiles.
          </p>
        </div>

        <div className="border-t-[3px] border-accent pt-[2.5vh]">
          <div className="text-[1.5vw] tracking-[0.25em] uppercase text-accent font-bold mb-[2vh]">
            03
          </div>
          <h3 className="text-[2.3vw] font-extrabold leading-tight mb-[2.5vh]">
            Shared database
          </h3>
          <p className="text-[1.5vw] leading-relaxed text-muted [text-wrap:pretty]">
            Both apps read and write the same source of truth.
          </p>
        </div>
      </div>

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        02 / 09
      </div>
    </div>
  );
}
