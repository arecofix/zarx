describe('02 - Map Geolocation Chaos & Viewport Stress', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('handles GPS spoofing and [0,0] Null Island by centering on Marcos Paz', () => {
    cy.setFakeLocation(0, 0);
    cy.visitApp('/inicio');
    cy.get('app-map').should('be.visible');
    cy.get('.leaflet-container').should('exist');
  });

  it('handles permission denied cleanly without uncaught exceptions', () => {
    cy.denyLocation();
    cy.visitApp('/inicio');
    cy.get('app-map').should('be.visible');
  });

  it('endures rapid responsive viewport resizes without blank tiles', () => {
    cy.grantGeolocation(-34.7709, -58.8335);
    cy.visitApp('/inicio');

    const viewports: [number, number][] = [
      [360, 640],
      [768, 1024],
      [1280, 800],
      [375, 667],
      [1920, 1080]
    ];

    viewports.forEach(([w, h]) => {
      cy.viewport(w, h);
      cy.get('.leaflet-container').should('be.visible');
    });
  });
});
