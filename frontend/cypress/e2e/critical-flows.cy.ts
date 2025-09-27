// Critical user flows for Pool Safe Inc Portal

describe("Critical User Flows", () => {
  it("allows user to login", () => {
    cy.visit("/");
    cy.get("input[name='username']").type("partner1");
    cy.get("input[name='password']").type("password123");
    cy.get("button[type='submit']").click();
    cy.contains("Dashboard");
  });

  it("shows sidebar navigation after login", () => {
    cy.loginAs("admin"); // Custom command, implement if not present
    cy.get("nav[aria-label='Main navigation']").should("exist");
    cy.contains("Tickets");
    cy.contains("Partners");
  });

  it("allows partner to submit a ticket", () => {
    cy.loginAs("partner");
    cy.get("button, input, textarea").should("exist");
    cy.get("input[name='subject']").type("Test Ticket");
    cy.get("textarea[name='description']").type("This is a test ticket.");
    cy.get("button[type='submit']").click();
    cy.contains("Ticket submitted");
  });

  it("shows error for invalid login", () => {
    cy.visit("/");
    cy.get("input[name='username']").type("wronguser");
    cy.get("input[name='password']").type("wrongpass");
    cy.get("button[type='submit']").click();
    cy.contains("Login failed");
  });
});
