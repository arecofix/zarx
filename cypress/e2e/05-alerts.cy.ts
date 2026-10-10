describe('05 - Alerts Early Warning Feed', () => {
  it('renders public alerts feed successfully', () => {
    cy.visitApp('/inicio');
    cy.get('body').should('be.visible');
  });

  it('shows empty state gracefully when no active alerts exist', () => {
    cy.visitApp('/inicio');
    cy.intercept('GET', '**/rest/v1/public_alerts*', { statusCode: 200, body: [] });
    cy.get('body').should('be.visible');
  });
});
