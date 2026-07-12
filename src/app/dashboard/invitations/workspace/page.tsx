"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Clock, X } from "lucide-react";

export default function WorkspaceInvitationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [invitations, setInvitations] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/invitations")
      .then((r) => r.json())
      .then((d) => setInvitations(d.data?.items ?? []));
  }, []);

  useEffect(() => {
    if (token) respond(token, "ACCEPTED");
  }, [token]);

  async function respond(inviteToken: string, response: "ACCEPTED" | "DECLINED" | "DEFERRED") {
    setLoading(inviteToken + response);
    const res = await fetch(`/api/workspace/invitations/${inviteToken}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
    setLoading(null);
    if (res.ok) {
      const list = await fetch("/api/workspace/invitations").then((r) => r.json());
      setInvitations(list.data?.items ?? []);
      if (response === "ACCEPTED") router.refresh();
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Collaboration Invitations</h1>
        <p className="text-slate-500">Accept invites to work on events with others</p>
      </div>

      {invitations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No pending invitations
          </CardContent>
        </Card>
      ) : (
        invitations.map((inv) => {
          const item = inv as {
            id: string;
            token: string;
            role?: string;
            message?: string;
            event?: { id: string; title: string; eventType: string };
            inviter?: { name: string };
          };
          return (
            <Card key={item.id}>
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">You&apos;ve been invited to collaborate on</p>
                  <h3 className="text-xl font-bold">{item.event?.title ?? "An event"}</h3>
                  <div className="flex gap-2 mt-2">
                    {item.event?.eventType && (
                      <Badge variant="outline">{item.event.eventType.replace(/_/g, " ")}</Badge>
                    )}
                    {item.role && <Badge>{item.role.replace(/_/g, " ")}</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    From {item.inviter?.name ?? "a collaborator"}
                  </p>
                  {item.message && <p className="text-sm mt-2 italic">&ldquo;{item.message}&rdquo;</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => respond(item.token, "ACCEPTED")}
                    disabled={!!loading}
                  >
                    <Check className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond(item.token, "DECLINED")}
                    disabled={!!loading}
                  >
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respond(item.token, "DEFERRED")}
                    disabled={!!loading}
                  >
                    <Clock className="h-4 w-4 mr-1" /> Maybe later
                  </Button>
                  {item.event?.id && (
                    <Button size="sm" variant="link" asChild>
                      <Link href={`/dashboard/events/${item.event.id}/workspace`}>
                        <Calendar className="h-4 w-4 mr-1" /> View event
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
