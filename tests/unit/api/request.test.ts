import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJsonBody, parseSearchParams } from "../../../src/server/api/request";

describe("API request parsing", () => {
  it("validates JSON bodies", async () => {
    const request = new Request("https://stealth.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 125 }),
    });

    await expect(
      parseJsonBody(request, z.object({ amount: z.number().int().positive() })),
    ).resolves.toEqual({ amount: 125 });
  });

  it("rejects non-JSON content types", async () => {
    const request = new Request("https://stealth.test/api", {
      method: "POST",
      body: "amount=125",
    });

    await expect(parseJsonBody(request, z.object({}))).rejects.toMatchObject({ status: 415 });
  });

  it("coerces and validates search parameters", () => {
    const request = new Request("https://stealth.test/api?limit=10");

    expect(parseSearchParams(request, z.object({ limit: z.coerce.number() }))).toEqual({
      limit: 10,
    });
  });
});
