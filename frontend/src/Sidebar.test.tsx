import React from "react";
import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";
import { expect } from "vitest";
import "@testing-library/jest-dom";

describe("Sidebar", () => {
  it("renders admin links", () => {
    render(<Sidebar role="admin" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText("Partners")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders support links", () => {
    render(<Sidebar role="support" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.queryByText("Partners")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("renders partner links", () => {
    render(<Sidebar role="partner" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Service Records")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.queryByText("Tickets")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("has correct aria-label and role", () => {
    render(<Sidebar role="admin" />);
    const nav = screen.getByLabelText("Main navigation");
    expect(nav).toHaveAttribute("role", "navigation");
  });
});
