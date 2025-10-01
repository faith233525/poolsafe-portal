import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import PartnerMap from "./PartnerMap";

const partners = [
  { id: "1", companyName: "Alpha", city: "Toronto", state: "ON", latitude: 43.65, longitude: -79.38, status: "active" },
  { id: "2", companyName: "Beta", city: "Vancouver", state: "BC", latitude: 49.28, longitude: -123.12, status: "pending" },
];

describe("PartnerMap", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // @ts-expect-error - we are mocking fetch for tests
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(partners),
      }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders map and controls", async () => {
    render(<PartnerMap role="SUPPORT" />);

  // Shows loading state first
  expect(!!screen.getByText(/loading enhanced map/i)).toBe(true);

    await waitFor(() => {
      // Controls should be present
      expect(!!screen.getByLabelText(/status/i)).toBe(true);
      expect(!!screen.getByLabelText(/region/i)).toBe(true);
      expect(!!screen.getByText(/reset view/i)).toBe(true);
      // Stats line
      expect(!!screen.getByText(/Partners:/i)).toBe(true);
    });
  });
});
