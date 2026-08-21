import {
  buildGuideAssistantKnowledge,
  formatSupportHandoff,
  GUIDE_ASSISTANT_SYSTEM_PROMPT,
  looksOffTopic,
  retrieveGuideTopics,
  type RetrievalHit,
} from "@/lib/celeventic-guide/guide-assistant-knowledge";
import { GUIDE_SUPPORT_CONTACT } from "@/lib/celeventic-guide/support-contact";

export type GuideChatTurn = { role: "user" | "assistant"; content: string };

export type GuideAssistantAnswer = {
  reply: string;
  relatedGuides: Array<{ slug: string; title: string }>;
  escalate: boolean;
  source: "openai" | "retrieval" | "policy";
};

const HUMAN_ESCALATION =
  /\b(speak to (a |an )?(agent|human|person|someone)|customer (care|service|support)|talk to (support|someone)|call (me|support)|real person|live agent)\b/i;

const URGENT_ISSUE =
  /\b(refund|charged|payment failed|can't (log|sign) ?in|cannot (log|sign) ?in|locked out|hacked|bug|broken|not working|urgent|dispute)\b/i;

function formatDetailedRetrievalReply(top: RetrievalHit, related: RetrievalHit[]): string {
  const lines: string[] = [];
  lines.push(`Here’s how to handle that — based on “${top.title}”.`);
  lines.push("");
  lines.push(top.summary);
  if (top.body?.trim()) {
    lines.push("");
    lines.push(top.body.trim());
  }
  if (top.steps.length > 0) {
    lines.push("");
    lines.push("Follow these steps:");
    top.steps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step.title} — ${step.body}`);
    });
  }
  lines.push("");
  lines.push(
    `When it works: you should be able to complete this without leaving Celeventic in the browser (no app install needed for guests).`
  );
  lines.push("");
  lines.push(`Full walkthrough: /guide/${top.slug}`);
  if (related.length > 0) {
    lines.push("");
    lines.push(
      `Also useful: ${related.map((h) => `${h.title} (/guide/${h.slug})`).join("; ")}.`
    );
  }
  return lines.join("\n");
}

function offTopicReply(): GuideAssistantAnswer {
  return {
    reply:
      "I’m Celeventic Customer Service — I can only help with this platform (invitations, RSVP, QR admission, Event Guide, gifts, vendors, Memory Vault, and dashboard navigation).\n\n" +
      "Tell me what you’re trying to do in Celeventic, or WhatsApp / call Customer Care on " +
      `${GUIDE_SUPPORT_CONTACT.displayPhone} for a live agent.`,
    relatedGuides: [{ slug: "how-celeventic-works", title: "How Celeventic Works" }],
    escalate: false,
    source: "policy",
  };
}

function greetingReply(): GuideAssistantAnswer {
  return {
    reply:
      "Hello — I’m Celeventic Customer Service. I help you solve platform issues with clear, step-by-step guidance for invitations, RSVP, QR passes, Event Guide, gifts, vendors, Memory Vault, and the organizer dashboard.\n\n" +
      `Describe what you need help with (for example: “I can’t RSVP” or “How do I scan guest QR codes?”). For a live agent, WhatsApp or call ${GUIDE_SUPPORT_CONTACT.displayPhone}.`,
    relatedGuides: [{ slug: "how-celeventic-works", title: "How Celeventic Works" }],
    escalate: false,
    source: "policy",
  };
}

function retrievalReply(message: string, escalate: boolean): GuideAssistantAnswer {
  const hits = retrieveGuideTopics(message, 4);
  if (hits.length === 0) {
    return {
      reply:
        "I couldn’t find an exact match for that yet. Try describing the goal in plain words — for example invitations, RSVP, scanning QR passes, Event Guide, seating, gifts, or Memory Vault.\n\n" +
        formatSupportHandoff("If you’d rather talk to a person,"),
      relatedGuides: [{ slug: "how-celeventic-works", title: "How Celeventic Works" }],
      escalate: true,
      source: "retrieval",
    };
  }

  const top = hits[0];
  const related = hits.slice(1);
  let reply = formatDetailedRetrievalReply(top, related);
  if (escalate) {
    reply += `\n\n${formatSupportHandoff("If this doesn’t resolve it,")}`;
  } else {
    reply += `\n\nStill stuck? WhatsApp or call Customer Care on ${GUIDE_SUPPORT_CONTACT.displayPhone}.`;
  }

  return {
    reply,
    relatedGuides: hits.map((h) => ({ slug: h.slug, title: h.title })),
    escalate,
    source: "retrieval",
  };
}

async function answerWithOpenAI(
  message: string,
  history: GuideChatTurn[],
  apiKey: string
): Promise<string> {
  const knowledge = buildGuideAssistantKnowledge();
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `${GUIDE_ASSISTANT_SYSTEM_PROMPT}\n\n--- KNOWLEDGE PACK ---\n${knowledge}`,
    },
    ...history.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 2000),
    })),
    { role: "user", content: message.slice(0, 2000) },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 1100,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty OpenAI reply");
  return content;
}

export async function answerGuideQuestion(input: {
  message: string;
  history?: GuideChatTurn[];
}): Promise<GuideAssistantAnswer> {
  const message = input.message.trim().slice(0, 2000);
  const history = input.history ?? [];

  if (!message) {
    return {
      reply: "Please type a question about Celeventic — what are you trying to do?",
      relatedGuides: [],
      escalate: false,
      source: "policy",
    };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))[\s!.?]*$/i.test(message)) {
    return greetingReply();
  }

  if (looksOffTopic(message)) {
    return offTopicReply();
  }

  const wantsHuman = HUMAN_ESCALATION.test(message);
  const urgent = URGENT_ISSUE.test(message);

  if (wantsHuman) {
    return {
      reply: formatSupportHandoff(
        "Absolutely — our Customer Care team can help you directly."
      ),
      relatedGuides: [],
      escalate: true,
      source: "policy",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const reply = await answerWithOpenAI(message, history, apiKey);
      const hits = retrieveGuideTopics(message, 3);
      return {
        reply,
        relatedGuides: hits.map((h) => ({ slug: h.slug, title: h.title })),
        escalate: urgent || /0595968686|customer care|whatsapp/i.test(reply),
        source: "openai",
      };
    } catch {
      // fall through to retrieval
    }
  }

  return retrievalReply(message, urgent);
}
