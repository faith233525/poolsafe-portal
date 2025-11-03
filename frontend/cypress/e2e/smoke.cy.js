/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-env cypress */
/* global cy */
describe("Portal Smoke Test", () => {
  it("loads the homepage (login or app)", () => {
    cy.visit("/");
    // Wait until EITHER the login form OR the main nav appears
    cy.get("body", { timeout: 20000 }).should(($b) => {
      const hasLogin =
        $b.find("[data-testid='login-form']").length > 0 || $b.find("#username").length > 0;
      const hasNav = $b.find("nav[aria-label='Main navigation']").length > 0;
      if (!hasLogin && !hasNav) {
        throw new Error("Waiting for login form or main navigation to appear");
      }
    });

    // Branch: if on login, verify key fields; else verify nav and role-aware content is present
    cy.get("body").then(($b) => {
      const hasLogin =
        $b.find("[data-testid='login-form']").length > 0 || $b.find("#username").length > 0;
      if (hasLogin) {
        cy.contains("Welcome Back", { timeout: 10000 }).should("exist");
        cy.get("#username", { timeout: 10000 }).should("exist");
        cy.get("#password", { timeout: 10000 }).should("exist");
        cy.get("[data-testid='login-submit']", { timeout: 10000 }).should("exist");
      } else {
        cy.get("nav[aria-label='Main navigation']", { timeout: 20000 }).should("exist");
        cy.get("body", { timeout: 10000 }).then(($body) => {
          const txt = $body.text().toLowerCase();
          expect(
            txt.includes("tickets") || txt.includes("dashboard"),
            "Tickets or Dashboard present",
          ).to.eq(true);
        });
      }
    });
  });
});
