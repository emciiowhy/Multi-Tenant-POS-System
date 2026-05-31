// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CloseShiftResult } from "./close-shift-result";

afterEach(cleanup);

describe("CloseShiftResult", () => {
  it("shows expected, counted, variance and an 'over' label", () => {
    render(
      <CloseShiftResult expected="100.0000" counted="105.0000" variance="5.0000" onDone={() => {}} />,
    );
    expect(screen.getByText("100.0000")).toBeTruthy();
    expect(screen.getByText("105.0000")).toBeTruthy();
    expect(screen.getByText("5.0000")).toBeTruthy();
    expect(screen.getByText(/over/i)).toBeTruthy();
  });

  it("labels a shortage", () => {
    render(
      <CloseShiftResult expected="100.0000" counted="97.0000" variance="-3.0000" onDone={() => {}} />,
    );
    expect(screen.getByText(/short/i)).toBeTruthy();
  });

  it("labels a balanced drawer", () => {
    render(
      <CloseShiftResult expected="100.0000" counted="100.0000" variance="0.0000" onDone={() => {}} />,
    );
    expect(screen.getByText(/balanced/i)).toBeTruthy();
  });

  it("calls onDone", () => {
    const onDone = vi.fn();
    render(<CloseShiftResult expected="1.0000" counted="1.0000" variance="0.0000" onDone={onDone} />);
    screen.getByRole("button").click();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
