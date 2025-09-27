/// <reference types="cypress" />

// Mock the loginAs command functionality
function mockLoginAs(role: string) {
  // Mock login based on role
  const users = {
    admin: { username: "admin", password: "admin123" },
    partner: { username: "partner", password: "partner123" },
  };

  const user = users[role as keyof typeof users];
  if (user) {
    cy.visit("/login");
    cy.get('[data-testid="username"]').type(user.username);
    cy.get('[data-testid="password"]').type(user.password);
    cy.get('[data-testid="login-submit"]').click();
  }
}

// Create a global command wrapper
(window as any).loginAs = mockLoginAs;
