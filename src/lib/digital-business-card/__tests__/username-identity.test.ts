import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { onboardingService } from "@/services/workspace/onboarding.service";
import {
  claimCeleYouUsername,
  checkCeleYouUsernameAvailability,
  resolveCeleYouPublicHandle,
  setCeleYouPrimaryCard,
} from "@/services/digital-business-card/username.service";
import { createDigitalCard } from "@/services/digital-business-card/digital-business-card.service";

const stamp = Date.now();
const handleA = `aura${stamp}`;
const handleB = `owuraku.a${String(stamp).slice(-6)}`;
const handleC = `owuraku_agi${String(stamp).slice(-4)}`;
const ids: string[] = [];
const handles = [handleA, handleB, handleC];

async function cleanup() {
  if (ids.length) {
    await prisma.celeYouUsernameEvent.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    await prisma.celeYouUsernameRecord.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    for (const id of ids) {
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
  }
  await prisma.celeYouUsernameRecord.deleteMany({ where: { normalized: { in: handles } } }).catch(() => undefined);
}

describe("CeleYou username identity runtime", () => {
  after(cleanup);

  it("lets two Owuraku Afaris coexist and rejects a stolen username", async () => {
    await cleanup();
    const first = await onboardingService.register({
      accountType: "EVENT_OWNER",
      name: "Owuraku Afari",
      email: `owuraku.a.${stamp}@local.test`,
      passwordHash: await hashPassword("UsernameTest9!"),
      productIntent: "celecard",
      username: handleA,
    });
    ids.push(first.user.id);
    const second = await onboardingService.register({
      accountType: "EVENT_OWNER",
      name: "Owuraku Afari",
      email: `owuraku.b.${stamp}@local.test`,
      passwordHash: await hashPassword("UsernameTest9!"),
      productIntent: "celecard",
      username: handleB,
    });
    ids.push(second.user.id);
    const userA = await prisma.user.findUniqueOrThrow({ where: { id: first.user.id } });
    const userB = await prisma.user.findUniqueOrThrow({ where: { id: second.user.id } });
    assert.equal(userA.name, userB.name);
    assert.equal(userA.username, handleA);
    assert.equal(userB.username, handleB);

    const taken = await checkCeleYouUsernameAvailability({
      username: handleA,
      seed: { displayName: "Owuraku Afari", company: "Aura Group Innovative" },
    });
    assert.equal(taken.available, false);
    assert.equal(taken.reason, "TAKEN");
    assert.equal("email" in taken, false);
    assert.ok(taken.suggestions.length > 0);
    assert.equal(taken.suggestions.some((item) => /-\d+$/.test(item)), false);

    await assert.rejects(
      () => claimCeleYouUsername({ userId: second.user.id, username: handleA }),
      /taken|reserved|not available/i
    );

    const reserved = await checkCeleYouUsernameAvailability({ username: "celeyou" });
    assert.equal(reserved.available, false);
    assert.equal(reserved.reason, "RESERVED");

    const invalid = await checkCeleYouUsernameAvailability({ username: "owuraku afari" });
    assert.equal(invalid.available, false);
    assert.equal(invalid.reason, "INVALID");

    const personal = await createDigitalCard(first.user.id, {
      displayName: "Owuraku Afari",
      company: "Aura Group Innovative",
      isPublished: true,
    });
    const spark = await createDigitalCard(first.user.id, {
      displayName: "Owuraku Afari",
      company: "Spark Drive Autos",
      isPublished: true,
    });
    const publicToken = personal.publicToken;
    await setCeleYouPrimaryCard(first.user.id, personal.id);
    await claimCeleYouUsername({ userId: first.user.id, username: handleC, primaryCardId: personal.id });
    const resolved = await resolveCeleYouPublicHandle(handleC);
    assert.equal(resolved.kind, "card");
    if (resolved.kind === "card") assert.equal(resolved.slug, personal.slug);
    const old = await resolveCeleYouPublicHandle(handleA);
    assert.equal(old.kind, "alias");
    if (old.kind === "alias") assert.equal(old.redirectTo, handleC);
    const stillCard = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: personal.id } });
    assert.equal(stillCard.publicToken, publicToken);
    assert.equal(stillCard.slug, personal.slug);
    await setCeleYouPrimaryCard(first.user.id, spark.id);
    const afterPrimary = await resolveCeleYouPublicHandle(handleC);
    assert.equal(afterPrimary.kind, "card");
    if (afterPrimary.kind === "card") assert.equal(afterPrimary.slug, spark.slug);
    const qrStill = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: personal.id } });
    assert.equal(qrStill.publicToken, publicToken);
  });

  it("lets only one of two simultaneous claims win", async () => {
    const owner = await onboardingService.register({
      accountType: "EVENT_OWNER",
      name: "Owuraku Afari",
      email: `owuraku.c.${stamp}@local.test`,
      passwordHash: await hashPassword("UsernameTest9!"),
      productIntent: "celecard",
    });
    const rival = await onboardingService.register({
      accountType: "EVENT_OWNER",
      name: "Owuraku Afari",
      email: `owuraku.d.${stamp}@local.test`,
      passwordHash: await hashPassword("UsernameTest9!"),
      productIntent: "celecard",
    });
    ids.push(owner.user.id, rival.user.id);
    const handle = `sparkdrive${String(stamp).slice(-6)}`;
    handles.push(handle);
    const results = await Promise.allSettled([
      claimCeleYouUsername({ userId: owner.user.id, username: handle }),
      claimCeleYouUsername({ userId: rival.user.id, username: handle }),
    ]);
    const wins = results.filter((item) => item.status === "fulfilled");
    const losses = results.filter((item) => item.status === "rejected");
    assert.equal(wins.length, 1);
    assert.equal(losses.length, 1);
  });
});
