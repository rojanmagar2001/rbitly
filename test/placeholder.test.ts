import { add } from "@/placeholder";
import { describe, expect, it } from "vitest";

describe("placeholder", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
