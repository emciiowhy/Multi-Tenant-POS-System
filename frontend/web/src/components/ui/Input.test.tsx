// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Input } from "./Input";

afterEach(cleanup);

describe("Input", () => {
  it("associates its label with the control", () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });

  it("shows an error message and marks the control invalid", () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByText("Required")).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
  });

  it("renders a hint when provided and not in error", () => {
    render(<Input label="Float" hint="Opening cash" />);
    expect(screen.getByText("Opening cash")).toBeTruthy();
  });

  it("forwards value + onChange", () => {
    const onChange = vi.fn();
    render(<Input label="Q" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Q"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("disables the control when disabled", () => {
    render(<Input label="Q" disabled />);
    expect((screen.getByLabelText("Q") as HTMLInputElement).disabled).toBe(true);
  });
});
