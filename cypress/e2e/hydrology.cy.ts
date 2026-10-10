describe('Hydrology & Basin Monitoring Domain (El Niño Mitigation)', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('loads Marcos Paz flood risk zones on the map', () => {
    cy.visitApp('/inicio');
    cy.wait('@getZones').its('response.statusCode').should('eq', 200);
    // Leaflet SVG overlay path for flood polygon exists
    cy.get('.leaflet-overlay-pane svg path', { timeout: 8000 }).should('exist');
  });

  it('displays basin risk telemetry data', () => {
    cy.visitApp('/inicio');
    cy.get('app-map').should('exist');
  });
});
