export default function Feature4ItinerarySlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-[8vh] left-[6vw] right-[6vw]">
        <div className="text-[1.5vw] tracking-[0.3em] uppercase text-accent font-bold">
          Feature 04 / Phase B
        </div>
        <h2 className="text-[4.2vw] leading-[1.0] font-extrabold tracking-tight mt-[2.5vh] max-w-[80vw] [text-wrap:balance]">
          Freelancer Itinerary
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] top-[40vh]">
        <p className="text-[1.85vw] leading-snug font-semibold max-w-[72vw] mb-[4.5vh] [text-wrap:pretty]">
          New Portal tab — a per-day view combining call times, hotel, meals and venue info for that freelancer.
        </p>
        <div className="h-[2px] w-[10vw] bg-accent mb-[3.5vh]"></div>
        <p className="text-[1.6vw] leading-snug text-muted font-medium mb-[1.8vh] max-w-[62vw] [text-wrap:pretty]">
          Full-trip calendar export.
        </p>
        <p className="text-[1.6vw] leading-snug text-muted font-medium max-w-[62vw] [text-wrap:pretty]">
          Closes the loop: data we built for planning lands back as something the freelancer can actually use.
        </p>
      </div>

      <div className="absolute bottom-[6vh] left-[6vw] flex items-center gap-[0.8vw]">
        <div className="w-[1.4vw] h-[1.4vw] bg-accent"></div>
        <div className="text-[1.5vw] font-extrabold tracking-tight text-text leading-none">
          EHS
        </div>
      </div>

      <div className="absolute bottom-[6vh] right-[6vw] text-[1.5vw] tracking-widest text-muted font-medium">
        08 / 09
      </div>
    </div>
  );
}
