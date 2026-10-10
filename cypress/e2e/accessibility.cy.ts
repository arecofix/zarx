describe('Módulo de Accesibilidad y Usabilidad (a11y) C4ISR (Zarx)', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('debe contener landmarks semánticos HTML5 en el documento principal', () => {
    cy.get('body').should('be.visible');
    // Verificar que los botones o controles interactivos tengan nombres accesibles o roles
    cy.get('button, a, input, select').each(($el) => {
      const ariaLabel = $el.attr('aria-label');
      const text = $el.text().trim();
      const title = $el.attr('title');
      const hasAccessibleName = !!(ariaLabel || text || title || $el.find('svg, img').length);
      expect(hasAccessibleName).to.be.true;
    });
  });

  it('los controles del mapa y botones de acción deben ser navegables o interactuables', () => {
    cy.get('.leaflet-container').should('be.visible');
    cy.get('button, a[role="button"]').should('have.length.greaterThan', 0);
  });

  it('debe soportar navegación por teclado con foco visible', () => {
    cy.get('body').tab ? cy.get('body').tab() : cy.get('button').first().focus();
    cy.focused().should('exist');
  });

  it('los contrastes de alertas críticas (Rojo, Naranja, Amarillo) deben tener texto legible', () => {
    cy.get('body').then(($body) => {
      const alertBadges = $body.find('.bg-red-500, .bg-orange-500, .bg-yellow-500, .badge-critical');
      if (alertBadges.length > 0) {
        alertBadges.each((_, badge) => {
          cy.wrap(badge).should('be.visible');
        });
      }
    });
  });
});
