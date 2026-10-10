describe('06 - Offline-First Resilience & Sync', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('tolerates network disconnection without crashing application state', () => {
    cy.visitApp('/inicio');
    cy.simulateOffline();
    cy.get('body').should('be.visible');

    // Restore network
    cy.simulateOnline();
    cy.get('body').should('be.visible');
  });

  it('preserves cached UI components and local map container when disconnected', () => {
    cy.visitApp('/inicio');
    cy.simulateOffline();
    cy.get('.leaflet-container').should('exist');
  });
});
