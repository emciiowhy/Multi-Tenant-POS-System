// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DataGridCard } from "./DataGridCard";

afterEach(cleanup);

describe("DataGridCard", () => {
  it("activates on click", () => {
    const onClick = vi.fn();
    render(<DataGridCard onClick={onClick}>Cheeseburger</DataGridCard>);
    fireEvent.click(screen.getByRole("button", { name: "Cheeseburger" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes the selected state via aria-pressed", () => {
    render(<DataGridCard selected>Fries</DataGridCard>);
    expect(screen.getByRole("button", { name: "Fries" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("is not pressed by default", () => {
    render(<DataGridCard>Cola</DataGridCard>);
    expect(screen.getByRole("button", { name: "Cola" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("renders on the surface token", () => {
    render(<DataGridCard>Tile</DataGridCard>);
    expect(screen.getByRole("button", { name: "Tile" }).className).toContain("bg-surface");
  });
});
