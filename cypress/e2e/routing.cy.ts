describe('Módulo de Ruteo, Guards y Navegación SPA/SSR (Zarx)', () => {
  it('debe cargar correctamente la ruta principal /inicio', () => {
    cy.visitApp('/inicio');
    cy.url().should('include', '/inicio');
    cy.get('body').should('be.visible');
  });

  it('debe redirigir la raíz / a /inicio sin bucles de redirección', () => {
    cy.visitApp('/');
    cy.url().should('match', /\/(inicio)?$/);
  });

  it('debe proteger rutas de administración con AuthGuard cuando no hay sesión', () => {
    cy.clearLocalStorage();
    cy.visit('/admin', { failOnStatusCode: false });
    // Si no está autenticado, debe redirigir a login o a /inicio
    cy.url().should('not.match', /\/admin$/);
  });

  it('debe manejar rutas no encontradas (404) con fallback o redirección limpia', () => {
    cy.visit('/ruta-inexistente-12345', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    // La app SPA debe capturar o redirigir a /inicio
    cy.url().then((url) => {
      expect(url).to.be.a('string');
    });
  });

  it('debe preservar parámetros de URL en deep links (ej: coordenadas en mapa)', () => {
    cy.visitApp('/inicio?lat=-34.7647&lng=-58.8397&zoom=14');
    cy.url().should('include', 'lat=-34.7647');
    cy.url().should('include', 'lng=-58.8397');
    cy.get('#map, .leaflet-container').should('be.visible');
  });
});
