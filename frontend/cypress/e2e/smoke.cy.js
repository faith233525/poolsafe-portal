describe("Portal Smoke Test", () => {
  it("loads the homepage", () => {
    cy.visit("/");
    cy.contains("Portal Login");
  });

  // Add more E2E tests here, e.g. login, ticket submission
});
