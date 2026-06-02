// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the requested variant's token class", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-danger");
  });

  it("shows an (aria-hidden) spinner and blocks clicks while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Charge
      </Button>
    );
    const spinner = screen.getByTestId("button-spinner");
    expect(spinner).toBeTruthy();
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    const btn = screen.getByRole("button", { name: /charge/i });
    expect(btn.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("locks via blockedReason: focusable, exposes the reason, and blocks onClick", () => {
    const onClick = vi.fn();
    render(
      <Button blockedReason="Subscription past due" onClick={onClick}>
        Charge
      </Button>
    );
    const btn = screen.getByRole("button", { name: /charge/i });
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(btn.getAttribute("title")).toBe("Subscription past due");
    // Soft lock: not natively disabled, so it stays focusable for the tooltip / AT.
    expect(btn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
