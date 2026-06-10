"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, MessageSquare, CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { WORKFLOW_STAGE_LABELS, CHANGE_CATEGORY_LABELS } from "@/lib/invitation-production/constants";
import { formatCurrency } from "@/lib/utils";

interface RevisionRow {
  id: string;
  revisionNumber: number;
  revisionType: string;
  changeCategory: string;
  status: string;
  notes: string | null;
  adminResponse: string | null;
  amountGhs: string | number | null;
  customerApproved: boolean;
  comments: { id: string; content: string; isAdmin: boolean; user: { name: string }; createdAt: string }[];
}

interface ProductionData {
  workflowType: string;
  workflowStage: string;
  includedRevisions: number;
  usedRevisions: number;
  remainingRevisions: number;
  extraRevisionPrice: number;
  previewUrl: string | null;
  previewVideoUrl: string | null;
  missingInfoRequest: string | null;
  order: {
    id: string;
    eventTitle: string | null;
    status: string;
    shareUrl: string | null;
    package: { name: string };
    template: { name: string };
    revisions: RevisionRow[];
  };
}

const STAGES = [
  "PACKAGE_SELECTED", "ADDONS_SELECTED", "PAYMENT_PENDING", "PAYMENT_SUCCESSFUL",
  "INFORMATION_PENDING", "PRODUCTION_STARTED", "DESIGN_READY", "CUSTOMER_REVIEWING",
  "REVISION_REQUESTED", "REVISION_IN_PROGRESS", "APPROVED", "DELIVERED", "PUBLISHED",
];

export function OrderProductionClient({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [data, setData] = useState<ProductionData | null>(null);
  const [changeCategory, setChangeCategory] = useState("DATE_CHANGE");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [comment, setComment] = useState("");
  const [activeRevision, setActiveRevision] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/invitation-orders/${orderId}/production`);
    const d = await res.json();
    if (d.success) setData(d.data);
  }

  useEffect(() => { load(); }, [orderId]);

  async function requestRevision() {
    setLoading(true);
    await fetch(`/api/invitation-orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeCategory, notes: revisionNotes }),
    });
    setRevisionNotes("");
    setLoading(false);
    load();
  }

  async function approveDesign(revisionId?: string) {
    setLoading(true);
    await fetch(`/api/invitation-orders/${orderId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionId }),
    });
    setLoading(false);
    load();
  }

  async function payRevision(revisionId: string) {
    setLoading(true);
    const res = await fetch(`/api/invitation-revisions/${revisionId}/pay`, { method: "POST" });
    const d = await res.json();
    setLoading(false);
    if (d.success && d.data.authorizationUrl) {
      window.location.href = d.data.authorizationUrl;
    }
  }

  async function postComment(revisionId: string) {
    if (!comment.trim()) return;
    await fetch(`/api/invitation-revisions/${revisionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setComment("");
    load();
  }

  if (!data) return <p className="text-slate-500">Loading production status...</p>;

  const stageIndex = STAGES.indexOf(data.workflowStage);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dashboard/my-invitations" className="inline-flex items-center gap-2 text-sm text-[#0B8A83] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to My Invitations
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{data.order.eventTitle ?? data.order.template.name}</h1>
        <p className="text-slate-500 mt-1">{data.order.package.name} · {data.workflowType.replace(/_/g, " ")}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Production Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Badge>{WORKFLOW_STAGE_LABELS[data.workflowStage] ?? data.workflowStage}</Badge>
            <span className="text-sm text-slate-500">Step {stageIndex + 1} of {STAGES.length}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0B8A83] transition-all"
              style={{ width: `${Math.max(5, ((stageIndex + 1) / STAGES.length) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {data.missingInfoRequest && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5">
            <p className="font-semibold text-amber-800">Information Requested</p>
            <p className="text-sm text-amber-700 mt-1">{data.missingInfoRequest}</p>
            <Button size="sm" className="mt-3" asChild>
              <Link href={`/invitations/create/${orderId}/details`}>Update Details</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {(data.previewUrl || data.previewVideoUrl) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Design Preview</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.previewUrl && (
              <a href={data.previewUrl} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.previewUrl} alt="Design preview" className="rounded-xl max-h-64 object-cover w-full" />
              </a>
            )}
            {data.workflowStage === "CUSTOMER_REVIEWING" && (
              <Button onClick={() => approveDesign()} disabled={loading}>
                <Check className="h-4 w-4" /> Approve Design
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{data.includedRevisions}</p><p className="text-xs text-slate-500">Included</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{data.usedRevisions}</p><p className="text-xs text-slate-500">Used</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold text-[#0B8A83]">{data.remainingRevisions}</p><p className="text-xs text-slate-500">Remaining</p></CardContent></Card>
      </div>

      {data.order.shareUrl && (
        <Card>
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">Your Invitation Link</p>
              <p className="text-sm text-slate-500 truncate max-w-xs">{data.order.shareUrl}</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href={data.order.shareUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Request Revision</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={changeCategory} onValueChange={setChangeCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CHANGE_CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe the changes you need..."
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-slate-500">
            Minor changes (date, time, venue, spelling) are free. Major design changes may require payment ({formatCurrency(data.extraRevisionPrice)}).
          </p>
          <Button onClick={requestRevision} disabled={loading || revisionNotes.length < 3}>
            <RefreshCw className="h-4 w-4" /> Submit Revision Request
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revision History</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {data.order.revisions.length === 0 ? (
            <p className="text-sm text-slate-500">No revisions yet.</p>
          ) : data.order.revisions.map((r) => (
            <div key={r.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold">Revision #{r.revisionNumber}</p>
                  <p className="text-xs text-slate-500">{CHANGE_CATEGORY_LABELS[r.changeCategory]} · {r.revisionType}</p>
                </div>
                <Badge>{r.status}</Badge>
              </div>
              {r.notes && <p className="text-sm text-slate-600">{r.notes}</p>}
              {r.adminResponse && (
                <p className="text-sm bg-slate-50 p-2 rounded-lg"><strong>Designer:</strong> {r.adminResponse}</p>
              )}
              {r.status === "AWAITING_PAYMENT" && r.amountGhs && (
                <Button size="sm" onClick={() => payRevision(r.id)} disabled={loading}>
                  <CreditCard className="h-4 w-4" /> Pay {formatCurrency(Number(r.amountGhs))}
                </Button>
              )}
              {r.status === "AWAITING_APPROVAL" && !r.customerApproved && (
                <Button size="sm" onClick={() => approveDesign(r.id)} disabled={loading}>
                  <Check className="h-4 w-4" /> Approve Revision
                </Button>
              )}
              {r.comments?.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  {r.comments.map((c) => (
                    <p key={c.id} className="text-xs text-slate-500">
                      <strong>{c.isAdmin ? "Designer" : c.user.name}:</strong> {c.content}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <input
                  className="flex-1 text-sm border rounded-lg px-3 py-1.5"
                  placeholder="Add a comment..."
                  value={activeRevision === r.id ? comment : ""}
                  onFocus={() => setActiveRevision(r.id)}
                  onChange={(e) => { setActiveRevision(r.id); setComment(e.target.value); }}
                />
                <Button size="sm" variant="outline" onClick={() => postComment(r.id)}>
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
