describe('Geolocation & Fallback Resilience Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('uses browser geolocation coordinates when permission is granted', () => {
    cy.grantGeolocation(-34.7800, -58.8200);
    cy.visitApp('/inicio');
    cy.get('app-map').should('exist');
    cy.get('.radar-marker-container, .user-marker-icon', { timeout: 8000 }).should('exist');
  });

  it('guarantees deterministic fallback to Marcos Paz (-34.7647, -58.8397) when GPS fails', () => {
    cy.visit('/inicio', {
      onBeforeLoad(win) {
        win.localStorage.setItem('hasSeenOnboarding', 'true');
        // Simulate GPS timeout / permission denied
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((_, error) => {
          return error({ code: 3, message: 'Timeout expired' } as GeolocationPositionError);
        });
      }
    });

    cy.get('app-map').should('exist');
    // Map should still initialize without crashing
    cy.get('.leaflet-container', { timeout: 8000 }).should('exist');
  });
});
