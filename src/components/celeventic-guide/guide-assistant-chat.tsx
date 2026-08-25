"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GUIDE_SUPPORT_CONTACT,
  guideSupportCallHref,
  guideSupportWhatsAppUrl,
} from "@/lib/celeventic-guide/support-contact";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  relatedGuides?: Array<{ slug: string; title: string }>;
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I’m Celeventic Customer Service. Tell me what you need help with (invitations, RSVP, QR passes, Event Guide, gifts, vendors, Memory Vault, or the dashboard). I’ll give clear step-by-step guidance. For a live agent, WhatsApp or call 0595968686.",
  relatedGuides: [{ slug: "how-celeventic-works", title: "How Celeventic Works" }],
};

const SUGGESTIONS = [
  "How does Celeventic work?",
  "I got an invitation — what do I do?",
  "How do I scan guest QR codes?",
  "Where do I create an event?",
];

export function GuideAssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, [open, messages, sending]);

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/guide/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not reach Customer Service. Please try again."
        );
      }

      const reply = data.data?.reply as string | undefined;
      const relatedGuides = (data.data?.relatedGuides ?? []) as Array<{
        slug: string;
        title: string;
      }>;

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            reply?.trim() ||
            `I couldn’t form a reply. Please WhatsApp or call ${GUIDE_SUPPORT_CONTACT.displayPhone}.`,
          relatedGuides,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "assistant",
          content: `Sorry — I hit a temporary issue. ${formatLocalEscalation()}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3">
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
            style={{ maxHeight: "min(34rem, calc(100dvh - 6rem))" }}
          >
            <header className="flex items-start justify-between gap-3 bg-gradient-to-br from-[#0F172A] via-[#134e4a] to-[#0B8A83] px-4 py-3.5 text-white">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Celeventic Customer Service
                </p>
                <h2 id={titleId} className="font-display text-lg font-semibold leading-tight">
                  How can we help?
                </h2>
                <p className="mt-0.5 text-xs text-white/75">
                  Step-by-step platform help · escalate to {GUIDE_SUPPORT_CONTACT.displayPhone}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto bg-[#FAF8F4]/80 px-3 py-3"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-[#0B8A83] text-white rounded-br-md"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-md shadow-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.relatedGuides && m.relatedGuides.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.relatedGuides.map((g) => (
                          <Link
                            key={g.slug}
                            href={`/guide/${g.slug}`}
                            className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800 hover:bg-brand-100"
                          >
                            {g.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Customer Service is typing…
                </div>
              )}
            </div>

            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(s)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 border-t border-slate-100 bg-white px-3 py-2">
              <a
                href={guideSupportWhatsAppUrl(
                  "Hello Celeventic Customer Care — I need help from Customer Service chat."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp {GUIDE_SUPPORT_CONTACT.displayPhone}
              </a>
              <a
                href={guideSupportCallHref()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            </div>

            <form onSubmit={onSubmit} className="border-t border-slate-100 bg-white p-3">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder="Describe your issue or question…"
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  disabled={sending}
                  maxLength={2000}
                  aria-label="Your question"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || !input.trim()}
                  className="h-11 w-11 shrink-0 rounded-xl bg-[#0B8A83] hover:bg-[#097a74]"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        <Button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-12 gap-2 rounded-full bg-[#0B8A83] px-5 shadow-lg hover:bg-[#097a74]"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          {open ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
          {open ? "Close" : "Customer Service"}
        </Button>
      </div>
    </>
  );
}

function formatLocalEscalation() {
  return `WhatsApp or call Customer Care on ${GUIDE_SUPPORT_CONTACT.displayPhone} for further assistance.`;
}
