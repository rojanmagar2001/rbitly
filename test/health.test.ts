import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = await createApp({ logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");

    const body = res.json() as {
      status: string;
    };
    expect(body).toEqual({ status: "ok" });

    await app.close();
  });
});
