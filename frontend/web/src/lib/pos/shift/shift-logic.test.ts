import { describe, expect, it } from "vitest";
import { varianceLabel } from "./shift-logic";

describe("varianceLabel", () => {
  it("is 'over' when counted exceeds expected (positive variance)", () => {
    expect(varianceLabel("5.0000")).toBe("over");
  });

  it("is 'short' when counted is under expected (negative variance)", () => {
    expect(varianceLabel("-3.0000")).toBe("short");
  });

  it("is 'balanced' at zero", () => {
    expect(varianceLabel("0.0000")).toBe("balanced");
    expect(varianceLabel("0")).toBe("balanced");
  });
});
