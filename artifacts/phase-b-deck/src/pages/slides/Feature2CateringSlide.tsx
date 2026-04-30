export default function Feature2CateringSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Feature 02 / Phase B
        </div>
        <h2 className="text-[4.2vw] leading-[1.0] font-extrabold tracking-tight mt-[2.5vh] max-w-[80vw] [text-wrap:balance]">
          Catering Aggregation
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[42vh]">
        <p className="text-[1.9vw] leading-snug font-semibold max-w-[72vw] mb-[5vh] [text-wrap:pretty]">
          Per day, per venue: total meals, vegetarian / vegan / halal / gluten-free counts, full allergy list with names attached.
        </p>
        <div className="h-[2px] w-[10vw] bg-accent mb-[4vh]"></div>
        <p className="text-[1.65vw] leading-snug text-muted font-medium mb-[2vh] max-w-[60vw] [text-wrap:pretty]">
          Updates live when crew or schedule changes.
        </p>
        <p className="text-[1.65vw] leading-snug text-muted font-medium max-w-[60vw] [text-wrap:pretty]">
          One-click PDF for the venue chef.
        </p>
      </div>

      <div className="absolute bottom-[6vh] left-[6vw] flex items-center gap-[0.8vw]">
        <div className="w-[1.4vw] h-[1.4vw] bg-accent"></div>
        <div className="text-[1.5vw] font-extrabold tracking-tight text-text leading-none">
          EHS
        </div>
      </div>

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        06 / 09
      </div>
    </div>
  );
}
