import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import App from "./App";
import { vi } from "vitest";

// Mock localStorage for JWT
beforeEach(() => {
  window.localStorage.clear();
});

describe("App UI", () => {
  it("shows error on network failure during ticket submit", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    // Mock fetch to fail for submit
    const originalFetch = global.fetch;
    global.fetch = vi.fn((input: any, _init?: RequestInit) => {
      if (typeof input === "string" && input.includes("/api/tickets")) {
        return Promise.resolve(new Response(null, { status: 500 }));
      }
      // Always return an array for /api/tickets
      if (typeof input === "string" && input.includes("/api/tickets")) {
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      // Default fallback for other endpoints
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Desc" } });
    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    await waitFor(() => {
      const errorDiv = screen.getByTestId("ticket-error");
      expect(errorDiv.textContent).toMatch(/failed to submit ticket/i);
    });
    global.fetch = originalFetch;
  });

  it("updates UI when role changes at runtime", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    const { unmount } = render(<App />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    // Change role to admin
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "admin" })), "signature"].join("."),
    );
    // Re-mount App so it reads the updated JWT from storage
    unmount();
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByLabelText(/subject/i)).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no tickets", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    // Mock fetch to return empty list
    const originalFetch = global.fetch;
    global.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
    });
    global.fetch = originalFetch;
  });
  it("shows loading state in TicketList", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    // Mock fetch to delay response with correct Response type
    const originalFetch = global.fetch;
    global.fetch = () =>
      new Promise((resolve) =>
        setTimeout(() => {
          const response = new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
          resolve(response);
        }, 100),
      );
    render(<App />);
    expect(screen.getByText(/loading tickets/i)).toBeInTheDocument();
    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByText(/loading tickets/i)).not.toBeInTheDocument());
    global.fetch = originalFetch;
  });

  it("shows error state in TicketList", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    // Mock fetch to fail with correct Response type
    const originalFetch = global.fetch;
    global.fetch = () => Promise.resolve(new Response(null, { status: 500 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/failed to load tickets/i)).toBeInTheDocument());
    global.fetch = originalFetch;
  });

  it("disables TicketForm inputs while submitting", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    // Mock fetch to delay response with correct Response type
    const originalFetch = global.fetch;
    global.fetch = (input: any, _init?: RequestInit) => {
      if (typeof input === "string" && input.includes("/api/tickets")) {
        // Always return an array for /api/tickets
        return new Promise((resolve) =>
          setTimeout(() => {
            const response = new Response(JSON.stringify([]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
            resolve(response);
          }, 100),
        );
      }
      // Default fallback for other endpoints
      return new Promise((resolve) =>
        setTimeout(() => {
          const response = new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
          resolve(response);
        }, 100),
      );
    };
    render(<App />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Desc" } });
    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(screen.getByLabelText(/subject/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /submit ticket/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByLabelText(/subject/i)).not.toBeDisabled());
    global.fetch = originalFetch;
  });
  it("shows ticket form for partner role", () => {
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
  });

  it("validates input and shows error", async () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "" } });
    await fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    await waitFor(() => {
      const errorDiv = screen.getByTestId("ticket-error");
      expect(errorDiv.textContent).toMatch(/subject is required/i);
    });
  });
});
