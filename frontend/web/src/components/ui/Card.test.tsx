// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Card } from "./Card";

afterEach(cleanup);

describe("Card", () => {
  it("renders children", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("applies the surface token classes", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-surface");
    expect(el.className).toContain("border-border");
  });

  it("merges an extra className", () => {
    const { container } = render(<Card className="p-8">x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-8");
  });
});
