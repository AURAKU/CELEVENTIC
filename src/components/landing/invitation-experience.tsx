import Link from "next/link";
import { ArrowRight, Heart, Sparkles, Palette, Globe2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INVITATION_TEMPLATE_PRESETS } from "@/lib/invitation-templates";

const highlights = [
  { icon: Heart, label: "Emotional storytelling", desc: "Luxury layouts built for weddings & celebrations" },
  { icon: Palette, label: "Premium catalogue", desc: "Curated templates with African elegance" },
  { icon: Globe2, label: "Guest mini-sites", desc: "Personal RSVP links with QR admission" },
  { icon: Shield, label: "Trust & privacy", desc: "Admin-controlled legal & consent center" },
];

export function InvitationExperience() {
  const featured = INVITATION_TEMPLATE_PRESETS.slice(0, 6);

  return (
    <section id="invitations" className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-6" variant="secondary">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Luxury Invitation Experience
          </Badge>
          <h2 className="section-heading">
            Digital Invitations That <span className="text-gradient">Feel Premium</span>
          </h2>
          <p className="section-subheading mx-auto mt-4">
            Celeventic transforms invitations into emotional mini-experiences — beautiful templates,
            personalized guest links, RSVP, and lifetime-ready archives. Built for Ghana, ready for the world.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200/70 bg-mesh p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 mb-3">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((template) => (
            <Link
              key={template.slug}
              href="/auth/register"
              className="group rounded-2xl overflow-hidden border border-slate-200/70 hover:border-brand-300 hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all"
            >
              <div
                className={`h-44 bg-gradient-to-br ${template.preview.gradient} flex items-center justify-center relative`}
              >
                <div
                  className="absolute inset-6 rounded-xl border-2 opacity-60"
                  style={{ borderColor: template.preview.accent }}
                />
                <span className="font-display text-lg font-semibold text-slate-800/80 px-4 text-center">
                  {template.name}
                </span>
              </div>
              <div className="p-5 bg-white">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
                  {template.category}
                </p>
                <p className="font-semibold text-slate-900 mt-1">{template.name}</p>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/templates">
              Browse Template Catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/register">Create Your Invitation</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
