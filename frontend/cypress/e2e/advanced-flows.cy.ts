// Advanced user flows for Pool Safe Inc Portal

describe("Advanced User Flows", () => {
  it("allows partner to edit a ticket", () => {
    cy.loginAs("partner");
    cy.contains("My Tickets").click();
    cy.get(".ticket-row").first().click();
    cy.get("button[aria-label='Edit Ticket']").click();
    cy.get("textarea[name='description']").clear().type("Updated description");
    cy.get("button[type='submit']").click();
    cy.contains("Ticket updated");
  });

  it("allows partner to delete a ticket", () => {
    cy.loginAs("partner");
    cy.contains("My Tickets").click();
    cy.get(".ticket-row").first().click();
    cy.get("button[aria-label='Delete Ticket']").click();
    cy.contains("Are you sure?");
    cy.get("button.confirm-delete").click();
    cy.contains("Ticket deleted");
  });

  it("allows admin to view dashboard metrics", () => {
    cy.loginAs("admin");
    cy.contains("Dashboard").click();
    cy.get(".metrics-panel").should("exist");
    cy.contains("Total Tickets");
    cy.contains("Active Partners");
  });

  it("uploads and downloads a file", () => {
    cy.loginAs("partner");
    cy.contains("Upload").click();
    cy.get("input[type='file']").attachFile("testfile.txt");
    cy.contains("File uploaded");
    cy.contains("Download").click();
    cy.readFile("cypress/downloads/testfile.txt").should("exist");
  });

  it("shows notification system", () => {
    cy.loginAs("partner");
    cy.contains("Notifications").click();
    cy.get(".notification-list").should("exist");
    cy.contains("No new notifications").should("exist");
  });

  it("renders error boundary fallback UI", () => {
    cy.visit("/error-test");
    cy.contains("Something went wrong");
    cy.get(".error-dashboard").should("exist");
  });
});
