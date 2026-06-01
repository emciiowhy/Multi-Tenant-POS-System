// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const signIn = vi.fn();
vi.mock("next-auth/react", () => ({ signIn: (...a: unknown[]) => signIn(...a) }));

import { SignInForm } from "./SignInForm";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

afterEach(() => {
  cleanup();
  signIn.mockReset();
  useAuthFlowStore.getState().reset();
});

describe("SignInForm", () => {
  it("blocks submit and marks the field invalid on a bad email", () => {
    render(<SignInForm />);
    fill(/email/i, "nope");
    fill(/password/i, "hunter22");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/email/i).getAttribute("aria-invalid")).toBe("true");
  });

  it("blocks submit on a too-short password", () => {
    render(<SignInForm />);
    fill(/email/i, "a@b.io");
    fill(/password/i, "short");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password/i).getAttribute("aria-invalid")).toBe("true");
  });

  it("calls signIn with credentials and surfaces an auth failure in an alert", async () => {
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<SignInForm />);
    fill(/email/i, "a@b.io");
    fill(/password/i, "hunter22");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "a@b.io", password: "hunter22", redirect: false }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/invalid email or password/i);
  });

  it("prefills the email handed over from a duplicate-email sign-up", () => {
    useAuthFlowStore.getState().setPendingEmail("jane@x.io");
    render(<SignInForm />);
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("jane@x.io");
  });
});
