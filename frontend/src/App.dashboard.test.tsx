import React from "react";
import { render, screen, within } from "@testing-library/react";
import App from "./App";

// Mock localStorage for JWT
beforeEach(() => {
  window.localStorage.setItem(
    "jwt",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4iLCJuYW1lIjoiQWRtaW4gVXNlciJ9.signature",
  );
});
afterEach(() => {
  window.localStorage.clear();
});

describe("Dashboard rendering in App", () => {
  it("renders header and navigation for admin", () => {
    render(<App />);
    expect(screen.getByText(/Support Partner Portal/i)).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: /Main navigation/i });
    // Sidebar renders buttons with labels. Check for admin links.
    expect(within(nav).getByRole("button", { name: /Analytics Dashboard/i })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: /Tickets/i })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: /Partners/i })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: /Knowledge Base/i })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: /Settings/i })).toBeTruthy();
  });

  it("shows ticket submission info for non-partner", () => {
    render(<App />);
    expect(screen.getByText(/Ticket submission is only available to partners/i)).toBeTruthy();
  });

  it("renders accessibility settings button", () => {
    render(<App />);
    expect(screen.getByLabelText(/Open accessibility settings/i)).toBeTruthy();
  });

  it("renders PWA install button", () => {
    render(<App />);
    expect(screen.getByLabelText(/Install Pool Safe Inc Portal as an app/i)).toBeTruthy();
  });
});
