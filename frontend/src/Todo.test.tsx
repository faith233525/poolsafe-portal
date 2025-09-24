import "@testing-library/jest-dom";
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Todo from "./Todo";

describe("Todo component", () => {
  it("renders and adds a todo", () => {
    render(<Todo />);
    expect(screen.getByText(/Todo List/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "Test Todo" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.click(screen.getByText("Add Todo"));
    expect(screen.getByText("Test Todo")).toBeInTheDocument();
    expect(screen.getByText(/Test Description/)).toBeInTheDocument();
  });
});
