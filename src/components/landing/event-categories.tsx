import { EVENT_TYPES } from "@/lib/constants";

const categoryIcons: Record<string, string> = {
  WEDDING: "💍",
  FUNERAL: "🕊️",
  BIRTHDAY: "🎂",
  CONFERENCE: "🎤",
  CHURCH_PROGRAM: "⛪",
  CORPORATE_EVENT: "🏢",
  CONCERT: "🎵",
  FESTIVAL: "🎪",
  SCHOOL_EVENT: "🎓",
  PRODUCT_LAUNCH: "🚀",
  PRIVATE_EVENT: "🔒",
  CUSTOM: "✨",
};

export function EventCategories() {
  return (
    <section id="categories" className="py-28 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Built for Every{" "}
            <span className="text-gradient-gold">Event Type</span>
          </h2>
          <p className="mt-4 text-slate-400 text-lg">
            From weddings to conferences, funerals to festivals — Celeventic adapts to your occasion.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {EVENT_TYPES.map((type) => (
            <div
              key={type.value}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-brand-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(11,138,131,0.15)] transition-all cursor-default group"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">{categoryIcons[type.value]}</span>
              <span className="text-sm font-semibold text-slate-300">{type.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
