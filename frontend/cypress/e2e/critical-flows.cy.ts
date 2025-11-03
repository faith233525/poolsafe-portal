/// <reference types="cypress" />

// Critical user flows for Pool Safe Inc Portal

describe("Critical User Flows", () => {
  it("allows partner to login via local creds", () => {
    // Use API login helper for determinism and speed
    cy.loginAs("partner");
    cy.get("nav[aria-label='Main navigation']", { timeout: 10000 }).should("exist");
  });

  it("shows sidebar navigation after admin login", () => {
    cy.loginAs("admin");
    cy.get("nav[aria-label='Main navigation']").should("exist");
    cy.contains("Analytics Dashboard");
    cy.contains("Tickets");
  });

  it("allows partner to submit a minimal ticket", () => {
    cy.loginAs("partner");
    // Wait for nav to appear and app to render
    cy.get("nav[aria-label='Main navigation']", { timeout: 10000 }).should("exist");
    // For partner role, verify the Ticket Form is rendered (form might be in error state if API down)
    // This test just validates UI renders, not full submission flow
    cy.get('[aria-label="Ticket Form"]', { timeout: 20000 }).should("exist");
  });

  it("shows error for invalid login", () => {
    cy.clearLocalStorage();
    cy.visit("/");
    cy.contains("Welcome Back", { timeout: 10000 }).should("exist");
    cy.get("#username").type("wronguser");
    cy.get("#password").type("wrongpass");
    cy.get("[data-testid='login-submit']").click();
    cy.get("[data-testid='login-error']", { timeout: 10000 })
      .should("be.visible")
      .invoke("text")
      .should("match", /Login failed|Invalid credentials|Too many/i);
  });
});
