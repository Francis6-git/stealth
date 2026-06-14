import { describe, expect, it } from "vitest";

import { MemoryApiRepository } from "../../../src/server/api/memory-repository";
import { quotePostage, submitPostage } from "../../../src/server/api/postage-service";

const recipient = `G${"A".repeat(55)}`;
const sender = `G${"B".repeat(55)}`;

describe("postage service", () => {
  it("returns zero postage for explicitly allowed senders", async () => {
    const repository = new MemoryApiRepository();
    await repository.setPolicy(recipient, {
      allowUnknown: true,
      minimumPostage: "100",
      requireVerified: true,
    });
    await repository.setSenderRule(recipient, sender, "allow");

    await expect(quotePostage(repository, { recipient, sender })).resolves.toMatchObject({
      amount: "0",
      eligible: true,
      trusted: true,
    });
  });

  it("marks blocked senders as ineligible", async () => {
    const repository = new MemoryApiRepository();
    await repository.setSenderRule(recipient, sender, "block");

    await expect(quotePostage(repository, { recipient, sender })).resolves.toMatchObject({
      eligible: false,
      reason: "sender_blocked",
    });
  });

  it("records pending postage once", async () => {
    const repository = new MemoryApiRepository();
    await repository.setPolicy(recipient, {
      allowUnknown: true,
      minimumPostage: "100",
      requireVerified: false,
    });
    const input = {
      amount: "125",
      messageId: "a".repeat(64),
      paymentHash: "b".repeat(64),
      recipient,
      sender,
    };

    await expect(
      submitPostage(repository, input, new Date("2026-06-14T12:00:00.000Z")),
    ).resolves.toMatchObject({
      createdAt: "2026-06-14T12:00:00.000Z",
      status: "pending",
    });
    await expect(submitPostage(repository, input)).rejects.toMatchObject({ status: 409 });
  });

  it("rejects postage below the mailbox minimum", async () => {
    const repository = new MemoryApiRepository();
    await repository.setPolicy(recipient, {
      allowUnknown: true,
      minimumPostage: "100",
      requireVerified: false,
    });

    await expect(
      submitPostage(repository, {
        amount: "99",
        messageId: "a".repeat(64),
        paymentHash: "b".repeat(64),
        recipient,
        sender,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
