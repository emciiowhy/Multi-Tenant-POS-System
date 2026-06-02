// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

afterEach(cleanup);

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge status="active">Active</Badge>);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("derives the variant token from a status (active → success)", () => {
    render(<Badge status="active">Active</Badge>);
    expect(screen.getByText("Active").className).toContain("text-success");
  });

  it("derives danger for a lapsed status", () => {
    render(<Badge status="canceled">Canceled</Badge>);
    expect(screen.getByText("Canceled").className).toContain("text-danger");
  });

  it("lets an explicit variant override the status", () => {
    render(
      <Badge variant="warning" status="active">
        Trial ending
      </Badge>
    );
    expect(screen.getByText("Trial ending").className).toContain("text-warning");
  });

  it("falls back to neutral styling for an unknown status", () => {
    render(<Badge status="weird-state">Weird</Badge>);
    expect(screen.getByText("Weird").className).toContain("text-fg-muted");
  });
});
