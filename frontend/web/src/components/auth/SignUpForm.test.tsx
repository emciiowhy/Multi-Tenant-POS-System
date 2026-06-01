// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const registerAccount = vi.fn();
const signIn = vi.fn();
vi.mock("@/app/actions/register", () => ({ registerAccount: (...a: unknown[]) => registerAccount(...a) }));
vi.mock("next-auth/react", () => ({ signIn: (...a: unknown[]) => signIn(...a) }));

import { SignUpForm } from "./SignUpForm";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function fillValid() {
  fill(/^email$/i, "jane@x.io");
  fill(/^password$/i, "hunter22");
  fill(/confirm/i, "hunter22");
}

afterEach(() => {
  cleanup();
  registerAccount.mockReset();
  signIn.mockReset();
  useAuthFlowStore.getState().reset();
});

describe("SignUpForm", () => {
  it("flags a confirm-password mismatch and does not register", () => {
    render(<SignUpForm />);
    fill(/^email$/i, "jane@x.io");
    fill(/^password$/i, "hunter22");
    fill(/confirm/i, "different");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(registerAccount).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/confirm/i).getAttribute("aria-invalid")).toBe("true");
  });

  it("registers then signs the new account in on valid input", async () => {
    registerAccount.mockResolvedValue({ ok: true });
    signIn.mockResolvedValue({ ok: true });
    render(<SignUpForm />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await Promise.resolve();
    await Promise.resolve();
    expect(registerAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@x.io", password: "hunter22" }),
    );
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "jane@x.io", password: "hunter22", redirect: false }),
    );
  });

  it("offers 'sign in instead' when the email is already registered", async () => {
    registerAccount.mockResolvedValue({ ok: false, error: "email_taken" });
    render(<SignUpForm />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    const switchBtn = await screen.findByRole("button", { name: /sign in instead/i });
    expect(signIn).not.toHaveBeenCalled();
    fireEvent.click(switchBtn);
    expect(useAuthFlowStore.getState().mode).toBe("signin");
    expect(useAuthFlowStore.getState().pendingEmail).toBe("jane@x.io");
  });
});
