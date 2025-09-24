describe("Portal Smoke Test", () => {
  it("loads the homepage", () => {
    cy.visit("/");
    cy.contains("Pool Safe"); // Adjust to match your homepage branding
  });

  // Add more E2E tests here, e.g. login, ticket submission
});
