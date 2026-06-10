"use client";

import { motion } from "framer-motion";
import {
  Calendar, Mail, Ticket, QrCode, MessageSquare, Sparkles,
  Store, MapPin, Megaphone, Heart, Gem, Building2, Archive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Calendar, title: "Event Creation Wizard", desc: "Step-by-step event setup with themes, packages, and media uploads." },
  { icon: Mail, title: "Invitation Studio", desc: "Beautiful digital invitations with unique links and per-guest QR codes." },
  { icon: Ticket, title: "Ticketing Engine", desc: "Free, paid, VIP, VVIP, group tickets with promo codes and payments." },
  { icon: QrCode, title: "QR Admission", desc: "Online and offline QR verification with gate assignment and scan logs." },
  { icon: MessageSquare, title: "Communication Hub", desc: "Bulk WhatsApp, SMS, and email campaigns with delivery tracking." },
  { icon: Sparkles, title: "AI Event Planner", desc: "Budget, timeline, vendor recommendations, and marketing plans." },
  { icon: Store, title: "Vendor Marketplace", desc: "Book caterers, DJs, photographers, and more for your event." },
  { icon: MapPin, title: "Venue Marketplace", desc: "Discover and book venues with capacity, pricing, and availability." },
  { icon: Megaphone, title: "Advertising", desc: "Promote events with sponsored placements and featured listings." },
  { icon: Heart, title: "FuneralOS", desc: "Obituary pages, tribute walls, burial directions, and memorial archives." },
  { icon: Gem, title: "WeddingOS", desc: "Couple profiles, seating plans, gift registries, and vendor suggestions." },
  { icon: Building2, title: "CorporateOS", desc: "Conference registration, attendance tracking, and certificates." },
  { icon: Archive, title: "Memory Vault", desc: "Preserve photos, videos, guestbook messages, and event highlights." },
];

export function Features() {
  return (
    <section id="features" className="py-28 bg-mesh relative">
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="badge-pill bg-brand-100 text-brand-700 border border-brand-200 mb-6">
            Full-Stack Event Platform
          </span>
          <h2 className="section-heading">
            Everything You Need to Run{" "}
            <span className="text-gradient">World-Class Events</span>
          </h2>
          <p className="section-subheading mx-auto">
            From intimate gatherings to stadium concerts — Celeventic powers every event type with intelligent, premium tools.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
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
                  <h3 className="font-display font-semibold text-slate-900 text-lg">{feature.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
