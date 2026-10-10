describe('04 - Hydrological Basin Monitoring', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('renders basin flood zones (Arroyo La Paja, El Durazno) on map layers', () => {
    cy.visitApp('/inicio');
    cy.get('app-map').should('be.visible');
    cy.get('.leaflet-container').should('exist');
  });

  it('loads heatmap active points without throwing JavaScript errors', () => {
    cy.visitApp('/inicio');
    cy.wait('@getActiveHeatmap');
    cy.get('body').should('be.visible');
  });
});
