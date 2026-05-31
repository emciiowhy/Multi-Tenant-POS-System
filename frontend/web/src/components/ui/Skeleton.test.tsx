// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

afterEach(cleanup);

describe("Skeleton", () => {
  it("renders a decorative shimmer placeholder", () => {
    render(<Skeleton className="h-4 w-24" />);
    const el = screen.getByTestId("skeleton");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("animate-pulse");
  });

  it("merges sizing classNames", () => {
    render(<Skeleton className="h-4 w-24" />);
    const el = screen.getByTestId("skeleton");
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-24");
  });
});
