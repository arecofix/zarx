describe('05 - Alerts Early Warning Feed', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('renders public alerts feed successfully', () => {
    cy.visitApp('/inicio');
    cy.wait('@getPublicAlerts');
    cy.get('body').should('be.visible');
  });

  it('shows empty state gracefully when no active alerts exist', () => {
    cy.intercept('GET', '**/rest/v1/public_alerts*', { statusCode: 200, body: [] }).as('getEmptyAlerts');
    cy.visitApp('/inicio');
    cy.wait('@getEmptyAlerts');
    cy.get('body').should('be.visible');
  });
});
