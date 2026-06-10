const steps = [
  { step: "01", title: "Create Your Event", desc: "Use our step-by-step wizard to set up your event with all details, themes, and packages." },
  { step: "02", title: "Design Invitations", desc: "Generate beautiful digital invitations with unique links and QR codes for each guest." },
  { step: "03", title: "Send & Sell", desc: "Bulk send via WhatsApp, SMS, or email. Set up tickets and accept payments seamlessly." },
  { step: "04", title: "Manage & Scan", desc: "Track RSVPs, scan QR codes at the gate, and monitor everything from your dashboard." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/30 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="section-heading">
            How <span className="text-gradient">Celeventic</span> Works
          </h2>
          <p className="section-subheading mx-auto">Four simple steps from planning to celebration.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, i) => (
            <div key={item.step} className="relative text-center group">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-brand-300 to-transparent" />
              )}
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white text-lg font-bold mb-5 shadow-[0_8px_24px_rgba(11,138,131,0.35)] group-hover:scale-105 transition-transform">
                {item.step}
              </div>
              <h3 className="font-display font-semibold text-slate-900 text-lg">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
