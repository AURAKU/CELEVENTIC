import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getActivePricingPlans } from "@/lib/packages";

export async function Pricing() {
  const plans = await getActivePricingPlans();

  return (
    <section id="pricing" className="py-28 bg-mesh relative">
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="badge-pill bg-gold-100 text-gold-700 border border-gold-200 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Flexible Plans
          </span>
          <h2 className="section-heading">
            Simple, Transparent <span className="text-gradient">Pricing</span>
          </h2>
          <p className="section-subheading mx-auto">Choose the package that fits your event. Scale as you grow.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.popular
                  ? "relative border-brand-400/50 shadow-[0_16px_48px_rgba(11,138,131,0.18)] scale-[1.02]"
                  : "hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
              }
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.desc}</CardDescription>
                <div className="mt-4">
                  <span className="font-display text-4xl font-bold text-slate-900">{plan.price}</span>
                  {plan.price !== "Free" && <span className="text-slate-500 text-sm">/event</span>}
                </div>
                <p className="text-sm text-slate-500">Up to {plan.guests.toLocaleString()} guests</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100">
                        <Check className="h-3 w-3 text-brand-600 shrink-0" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
