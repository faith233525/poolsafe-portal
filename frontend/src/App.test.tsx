import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

// Mock localStorage for JWT
beforeEach(() => {
  window.localStorage.clear();
});

describe("App UI", () => {
  it("shows ticket form for partner role", () => {
    // JWT with {"role":"partner"}
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    render(<App />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
  });

  it("hides ticket form for non-partner role", () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "admin" })), "signature"].join("."),
    );
    render(<App />);
    expect(screen.queryByLabelText(/subject/i)).not.toBeInTheDocument();
    expect(screen.getByText(/only available to partners/i)).toBeInTheDocument();
  });

  it("validates input and shows error", () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(screen.getByText(/subject is required/i)).toBeInTheDocument();
  });
});
