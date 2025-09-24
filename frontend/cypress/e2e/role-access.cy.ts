describe("Role-based UI access", () => {
  it("shows ticket form for partner role", () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "partner" })), "signature"].join("."),
    );
    cy.visit("/");
    cy.get('[aria-label="Ticket Form"]').should("exist");
  });

  it("hides ticket form for admin role", () => {
    window.localStorage.setItem(
      "jwt",
      ["header", btoa(JSON.stringify({ role: "admin" })), "signature"].join("."),
    );
    cy.visit("/");
    cy.contains("Ticket submission is only available to partners.").should("exist");
    cy.get('[aria-label="Ticket Form"]').should("not.exist");
  });
});
