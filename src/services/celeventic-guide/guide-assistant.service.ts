import {
  buildGuideAssistantKnowledge,
  formatSupportHandoff,
  GUIDE_ASSISTANT_SYSTEM_PROMPT,
  looksOffTopic,
  retrieveGuideTopics,
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

function offTopicReply(): GuideAssistantAnswer {
  return {
    reply:
      "I can only help with Celeventic — invitations, RSVP, QR admission, Event Guide, gifts, vendors, Memory Vault, and navigating the dashboard. " +
      "Ask me anything about how the platform works, or WhatsApp / call Customer Care on " +
      `${GUIDE_SUPPORT_CONTACT.displayPhone} for a human agent.`,
    relatedGuides: [{ slug: "how-celeventic-works", title: "How Celeventic Works" }],
    escalate: false,
    source: "policy",
  };
}

function greetingReply(): GuideAssistantAnswer {
  return {
    reply:
      "Hello — I’m Celeventic Guide AI. I can explain how the platform works and help you navigate invitations, RSVP, QR passes, Event Guide, gifts, vendors, and Memory Vault. " +
      `What would you like help with? For a live agent, WhatsApp or call ${GUIDE_SUPPORT_CONTACT.displayPhone}.`,
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
        "I couldn’t find an exact guide match for that. Try asking about invitations, RSVP, scanning QR passes, Event Guide, seating, gifts, or Memory Vault — " +
        `or ${formatSupportHandoff("If you need personal support,")}`,
      relatedGuides: [{ slug: "how-celeventic-works", title: "How Celeventic Works" }],
      escalate: true,
      source: "retrieval",
    };
  }

  const top = hits[0];
  const stepsHint =
    hits.length > 1
      ? ` Related topics: ${hits
          .slice(1)
          .map((h) => `${h.title} (/guide/${h.slug})`)
          .join("; ")}.`
      : "";

  const escalation = escalate
    ? ` ${formatSupportHandoff("If this doesn’t resolve it,")}`
    : ` Open /guide/${top.slug} for the full walkthrough. Need a person? WhatsApp or call ${GUIDE_SUPPORT_CONTACT.displayPhone}.`;

  return {
    reply: `${top.title}: ${top.summary}${stepsHint}${escalation}`,
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
      temperature: 0.3,
      max_tokens: 700,
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
      reply: "Please type a question about Celeventic.",
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
        "Absolutely — our team can help you directly."
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
