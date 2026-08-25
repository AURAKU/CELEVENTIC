import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksOffTopic,
  retrieveGuideTopics,
  formatSupportHandoff,
} from "@/lib/celeventic-guide/guide-assistant-knowledge";
import { answerGuideQuestion } from "@/services/celeventic-guide/guide-assistant.service";

describe("guide assistant knowledge", () => {
  it("flags clearly off-topic prompts", () => {
    assert.equal(looksOffTopic("What is the weather in Accra?"), true);
    assert.equal(looksOffTopic("write me a python script"), true);
  });

  it("allows platform and greeting prompts", () => {
    assert.equal(looksOffTopic("How do I RSVP on Celeventic?"), false);
    assert.equal(looksOffTopic("Hello"), false);
  });

  it("retrieves QR / admission guides for scan questions", () => {
    const hits = retrieveGuideTopics("How do I scan a guest QR code at the door?");
    assert.ok(hits.length > 0);
    assert.ok(
      hits.some(
        (h) =>
          h.slug.includes("scan") ||
          h.title.toLowerCase().includes("scan") ||
          h.slug.includes("qr")
      )
    );
  });

  it("includes customer care phone in support handoff", () => {
    assert.match(formatSupportHandoff(), /0595968686/);
  });
});

describe("answerGuideQuestion", () => {
  it("refuses off-topic and stays on platform", async () => {
    const res = await answerGuideQuestion({ message: "Tell me a joke about politics" });
    assert.equal(res.source, "policy");
    assert.match(res.reply, /only help with (this platform|Celeventic)|Customer Service/i);
    assert.doesNotMatch(res.reply, /senator|election result/i);
  });

  it("escalates when user asks for a human agent", async () => {
    const res = await answerGuideQuestion({
      message: "I want to speak to a customer service agent",
    });
    assert.equal(res.escalate, true);
    assert.match(res.reply, /0595968686/);
  });

  it("answers RSVP with retrieval when OpenAI is unavailable", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await answerGuideQuestion({ message: "How do I RSVP to an invitation?" });
      assert.ok(res.reply.length > 80);
      assert.match(res.reply, /Follow these steps:|steps:/i);
      assert.ok(res.relatedGuides.length > 0 || /rsvp|invitation/i.test(res.reply));
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });

  it("greets as Customer Service", async () => {
    const res = await answerGuideQuestion({ message: "Hello" });
    assert.match(res.reply, /Customer Service/i);
  });
});
