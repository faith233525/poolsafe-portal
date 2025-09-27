import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginForm from "./LoginForm";
import { describe, it, expect, vi } from "vitest";

describe("LoginForm", () => {
  it("shows error for empty fields", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(screen.getByText(/username is required/i)).toBeDefined();
    expect(screen.getByText(/password is required/i)).toBeDefined();
  });

  it("calls onSubmit with valid data", () => {
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "testpass" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(handleSubmit).toHaveBeenCalledWith({ username: "testuser", password: "testpass" });
  });
});
