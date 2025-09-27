/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    loginAs(role: string): Chainable<Element>;
  }
}
