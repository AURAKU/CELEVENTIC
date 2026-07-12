import Link from "next/link";
import { HelpCircle, MessageSquare, BookOpen, LifeBuoy, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FAQ = [
  {
    q: "How do I create my first event?",
    a: "Go to Events → Create Event, pick your event type, add details, and choose a package.",
  },
  {
    q: "How do I invite guests?",
    a: "Open your event, go to Guests, and add guests manually or import a CSV list.",
  },
  {
    q: "How do I find vendors?",
    a: "Visit Marketplace to browse photographers, caterers, venues, and more.",
  },
  {
    q: "How do I scan QR codes at my event?",
    a: "Open QR Admission from the sidebar or quick actions, select your event, and scan passes.",
  },
  {
    q: "Can I collaborate with my team?",
    a: "Yes. Open your event workspace to invite collaborators, assign tasks, and chat.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Help & Support"
        subtitle="Answers, guides, and ways to reach us — tailored for every Celeventic user."
        icon={HelpCircle}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">New here? Resume your setup guide anytime.</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/getting-started">Resume Onboarding</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-600" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">We typically respond within one business day.</p>
            <Button variant="outline" asChild>
              <a href="mailto:support@celeventic.com">Email Support</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl border border-slate-100 p-4">
              <summary className="font-medium text-slate-900 cursor-pointer list-none flex items-center justify-between">
                {item.q}
                <LifeBuoy className="h-4 w-4 text-slate-400 group-open:text-brand-600" />
              </summary>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500 pb-8">
        Report a problem or request a feature via{" "}
        <a href="mailto:support@celeventic.com" className="text-brand-600 hover:underline">
          support@celeventic.com
        </a>
      </p>
    </div>
  );
}
