// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AttentionBanner } from "./attention-banner";

afterEach(cleanup);

describe("AttentionBanner", () => {
  it("renders nothing when there are no failures", () => {
    const { container } = render(<AttentionBanner failures={[]} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists each rejected sale's reason", () => {
    render(
      <AttentionBanner failures={[{ id: "a", reason: "unknown product" }]} onDismiss={() => {}} />
    );
    expect(screen.getByText(/unknown product/i)).toBeTruthy();
  });

  it("dismisses a failure by id", () => {
    const onDismiss = vi.fn();
    render(<AttentionBanner failures={[{ id: "a", reason: "x" }]} onDismiss={onDismiss} />);
    screen.getByRole("button", { name: /dismiss/i }).click();
    expect(onDismiss).toHaveBeenCalledWith("a");
  });
});
