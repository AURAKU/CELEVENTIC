"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";

interface ThreadRow {
  threadId: string;
  leadId: string | null;
  subject: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  otherParty: { id: string; name: string; role: string };
  vendorName?: string;
}

interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export function MessagesClient() {
  const searchParams = useSearchParams();
  const initialThread = searchParams.get("thread");

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(initialThread);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/messages");
    const d = await res.json();
    if (d.success) setThreads(d.data);
    setLoading(false);
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/messages?thread=${encodeURIComponent(threadId)}`);
    const d = await res.json();
    if (d.success) setMessages(d.data);
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (activeThread) loadThread(activeThread);
  }, [activeThread, loadThread]);

  async function sendReply() {
    if (!activeThread || !reply.trim()) return;
    setSending(true);
    const active = threads.find((t) => t.threadId === activeThread);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        active?.leadId
          ? { body: reply.trim(), leadId: active.leadId }
          : {
              body: reply.trim(),
              threadId: activeThread,
              recipientId: active?.otherParty.id,
            }
      ),
    });
    setSending(false);
    if (res.ok) {
      setReply("");
      await loadThread(activeThread);
      await loadThreads();
    }
  }

  if (loading) {
    return <p className="text-slate-500 py-12 text-center">Loading messages…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-brand-600" /> Messages
        </h1>
        <p className="page-subtitle">Vendor enquiries, admin notices, and replies</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 min-h-[28rem]">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y max-h-[32rem] overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.threadId}
                  type="button"
                  onClick={() => setActiveThread(t.threadId)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    activeThread === t.threadId ? "bg-brand-50/50" : ""
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {t.vendorName ?? t.otherParty.name}
                    </p>
                    {t.unread > 0 && <Badge variant="secondary">{t.unread}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.lastMessage}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {activeThread
                ? threads.find((t) => t.threadId === activeThread)?.subject ??
                  threads.find((t) => t.threadId === activeThread)?.otherParty.name
                : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 min-h-[24rem]">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeThread ? (
                messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-xs font-semibold text-slate-700">{m.sender.name}</p>
                    <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-12">
                  Choose a thread from your inbox
                </p>
              )}
            </div>
            {activeThread && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply…"
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
