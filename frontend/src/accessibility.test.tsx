import React from "react";
import { render } from "@testing-library/react";
import App from "./App";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("Accessibility checks", () => {
  it("App should have no a11y violations", async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
