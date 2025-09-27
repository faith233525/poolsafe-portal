import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TicketList from "./TicketList";

const mockTickets = [
  { id: "1", subject: "Broken lock", status: "open", createdAt: new Date().toISOString() },
  { id: "2", subject: "Key replacement", status: "closed", createdAt: new Date().toISOString() },
];

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTickets),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TicketList", () => {
  it("renders loading state initially", async () => {
    render(<TicketList />);
    await waitFor(() => {
      expect(screen.getByText(/Loading tickets/i)).toHaveTextContent(/Loading tickets/i);
    });
  });

  it("renders tickets after fetch", async () => {
    render(<TicketList />);
    await waitFor(() => expect(screen.getByText(/Broken lock/i)).toHaveTextContent(/Broken lock/i));
    expect(screen.getByText(/Key replacement/i)).toHaveTextContent(/Key replacement/i);
    expect(screen.getByText(/open/i)).toHaveTextContent(/open/i);
    expect(screen.getByText(/closed/i)).toHaveTextContent(/closed/i);
  });

  it("renders no tickets found", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    );
    render(<TicketList />);
    await waitFor(() =>
      expect(screen.getByText(/No tickets found/i)).toHaveTextContent(/No tickets found/i),
    );
  });

  it("renders error on failed fetch", async () => {
    (global.fetch as any).mockImplementationOnce(() => Promise.resolve({ ok: false }));
    render(<TicketList />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load tickets/i)).toHaveTextContent(
        /Failed to load tickets/i,
      ),
    );
  });

  it("renders network error", async () => {
    (global.fetch as any).mockImplementationOnce(() => Promise.reject(new Error("Network error")));
    render(<TicketList />);
    await waitFor(() =>
      expect(screen.getByText(/Network error/i)).toHaveTextContent(/Network error/i),
    );
  });
});
