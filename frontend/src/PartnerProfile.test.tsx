import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import PartnerProfile from "./PartnerProfile";

const mockPartner = {
  companyName: "Pool Safe Inc",
  managementCompany: "Loungenie",
  streetAddress: "123 Main St",
  city: "Toronto",
  state: "ON",
  zip: "M1A 2B3",
  country: "Canada",
  numberOfLoungeUnits: 10,
  topColour: "Blue",
  latitude: 43.6532,
  longitude: -79.3832,
  lock: "A123",
  masterCode: "9999",
  subMasterCode: "8888",
  lockPart: "LP-01",
  key: "K-01",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPartner),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PartnerProfile", () => {
  it("renders loading state initially", async () => {
    render(<PartnerProfile partnerId="1" role="admin" />);
    await waitFor(() => {
      expect(screen.getByText(/Loading partner info/i)).toBeInTheDocument();
    });
  });

  it("renders partner info for admin", async () => {
    render(<PartnerProfile partnerId="1" role="admin" />);
    await waitFor(() => expect(screen.getByText(/Partner Profile/i)).toBeInTheDocument());
    expect(screen.getByText(/Pool Safe Inc/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Loungenie/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Toronto/i)).toBeInTheDocument();
    expect(screen.getByText(/Blue/i)).toBeInTheDocument();
    expect(screen.getByText(/Lat 43.6532/i)).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return !!element && element.tagName.toLowerCase() === "div" && content.includes("A123");
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return !!element && element.tagName.toLowerCase() === "div" && content.includes("9999");
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return !!element && element.tagName.toLowerCase() === "div" && content.includes("8888");
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return !!element && element.tagName.toLowerCase() === "div" && content.includes("LP-01");
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return !!element && element.tagName.toLowerCase() === "div" && content.includes("K-01");
      }),
    ).toBeInTheDocument();
  });

  it("renders partner info for partner role (no lock details)", async () => {
    render(<PartnerProfile partnerId="1" role="partner" />);
    await waitFor(() => expect(screen.getByText(/Partner Profile/i)).toBeInTheDocument());
    expect(screen.queryByText(/Lock:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Master Code:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sub Master Code:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lock Part:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Key:/i)).not.toBeInTheDocument();
  });

  it("renders error state", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to load partner" }),
      }),
    );
    render(<PartnerProfile partnerId="1" role="admin" />);
    await waitFor(() => expect(screen.getByText(/Failed to load partner/i)).toBeInTheDocument());
  });

  it("renders no partner found", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(null) }),
    );
    render(<PartnerProfile partnerId="1" role="admin" />);
    await waitFor(() => expect(screen.getByText(/No partner found/i)).toBeInTheDocument());
  });
});
