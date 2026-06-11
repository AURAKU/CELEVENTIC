"use client";

import { motion } from "framer-motion";
import {
  Calendar, Mail, Ticket, QrCode, MessageSquare, Sparkles,
  Store, MapPin, Megaphone, Heart, Gem, Building2, Archive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";

const FEATURE_KEYS = [
  { icon: Calendar, title: "landing.f01_title", desc: "landing.f01_desc" },
  { icon: Mail, title: "landing.f02_title", desc: "landing.f02_desc" },
  { icon: Ticket, title: "landing.f03_title", desc: "landing.f03_desc" },
  { icon: QrCode, title: "landing.f04_title", desc: "landing.f04_desc" },
  { icon: MessageSquare, title: "landing.f05_title", desc: "landing.f05_desc" },
  { icon: Sparkles, title: "landing.f06_title", desc: "landing.f06_desc" },
  { icon: Store, title: "landing.f07_title", desc: "landing.f07_desc" },
  { icon: MapPin, title: "landing.f08_title", desc: "landing.f08_desc" },
  { icon: Megaphone, title: "landing.f09_title", desc: "landing.f09_desc" },
  { icon: Heart, title: "landing.f10_title", desc: "landing.f10_desc" },
  { icon: Gem, title: "landing.f11_title", desc: "landing.f11_desc" },
  { icon: Building2, title: "landing.f12_title", desc: "landing.f12_desc" },
  { icon: Archive, title: "landing.f13_title", desc: "landing.f13_desc" },
] as const;

export function Features() {
  const { t } = useLocale();

  return (
    <section id="features" className="py-28 bg-mesh relative">
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="badge-pill bg-brand-100 text-brand-700 border border-brand-200 mb-6">
            {t("landing.features_badge")}
          </span>
          <h2 className="section-heading">
            {t("landing.features_title")}{" "}
            <span className="text-gradient">{t("landing.features_title_highlight")}</span>
          </h2>
          <p className="section-subheading mx-auto">
            {t("landing.features_subtitle")}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURE_KEYS.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="card-glow h-full group hover:shadow-[0_16px_48px_rgba(11,138,131,0.14)] hover:border-brand-300/50">
                <CardContent className="p-6">
                  <div className="icon-box mb-5 group-hover:scale-105 transition-transform">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-slate-900 text-lg">{t(feature.title)}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{t(feature.desc)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
