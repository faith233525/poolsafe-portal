import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import Notifications from "./Notifications";

const mockNotifications = [
  {
    id: "1",
    title: "New Ticket",
    message: "A new ticket was created.",
    date: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Ticket Closed",
    message: "Your ticket has been closed.",
    date: new Date().toISOString(),
  },
];

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockNotifications),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Notifications", () => {
  it("renders loading state initially", async () => {
    render(<Notifications role="admin" />);
    await waitFor(() => {
      expect(screen.getByText(/Loading notifications/i)).toBeInTheDocument();
    });
  });

  it("renders notifications after fetch", async () => {
    render(<Notifications role="admin" />);
    await waitFor(() => expect(screen.getByText(/Notifications/i)).toBeInTheDocument());
    expect(screen.getAllByText(/New Ticket/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/A new ticket was created/i)).toBeInTheDocument();
    expect(screen.getByText(/Ticket Closed/i)).toBeInTheDocument();
    expect(screen.getByText(/Your ticket has been closed/i)).toBeInTheDocument();
  });

  it("renders error state", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to load notifications" }),
      }),
    );
    render(<Notifications role="admin" />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load notifications/i)).toBeInTheDocument(),
    );
  });

  it("renders no notifications", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    );
    render(<Notifications role="admin" />);
    await waitFor(() => {
      expect(screen.queryAllByRole("listitem").length).toBe(0);
    });
  });
});
