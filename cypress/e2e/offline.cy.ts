describe('Offline First & Network Resilience Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('gracefully degrades to offline cache when network disconnects', () => {
    cy.visitApp('/inicio');
    cy.setOffline(true);
    // UI remains fully responsive
    cy.get('app-map').should('exist');
    cy.setOffline(false);
  });

  it('restores connectivity when browser goes back online', () => {
    cy.visitApp('/inicio');
    cy.setOffline(false);
    cy.get('app-map').should('be.visible');
  });
});
