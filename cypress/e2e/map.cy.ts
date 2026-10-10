describe('C4ISR Map & Leaflet Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('renders Leaflet map container with explicit dimensions', () => {
    cy.visitApp('/inicio');
    cy.get('app-map').should('be.visible').and('have.css', 'position', 'relative');
    cy.get('.leaflet-container').should('exist').and('be.visible');
  });

  it('loads Dark Canvas tile layer and no Carto watermark is present', () => {
    cy.visitApp('/inicio');
    cy.get('.leaflet-tile-pane').should('exist');
    cy.get('body').should('not.contain', 'API KEY REQUIRED');
    cy.get('body').should('not.contain', 'carto.com/basemaps/apikey');
  });

  it('displays citizen radar pulsating marker at coordinates', () => {
    cy.grantGeolocation(-34.7647, -58.8397);
    cy.visitApp('/inicio');
    cy.get('.radar-marker-container, .user-marker-icon', { timeout: 8000 }).should('exist');
  });

  it('toggles emergency heatmap layer', () => {
    cy.visitApp('/inicio');
    cy.contains('Ver Mapa de Delito').click();
    cy.contains('Ocultar Calor').should('be.visible');
  });
});
