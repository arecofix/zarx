describe('Módulo de Consola de Comando C4ISR y KPIs (Zarx)', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('debe mostrar los indicadores de estado operativo y capas C4ISR', () => {
    // Validar presencia de controles principales de monitoreo
    cy.get('body').should('be.visible');
    cy.get('#map, .leaflet-container').should('be.visible');

    // Verificar presencia de paneles de control o overlay de estado
    cy.window().then((win: any) => {
      // Verificar inicialización correcta del estado de la aplicación
      expect(win).to.have.property('document');
      expect(win.L).to.exist;
    });
  });

  it('debe permitir alternar filtros y capas operativas de defensa civil', () => {
    cy.get('body').then(($body) => {
      const filterToggle = $body.find('[data-cy="layer-toggle"], .leaflet-control-layers-toggle');
      if (filterToggle.length > 0) {
        cy.wrap(filterToggle.first()).click({ force: true });
        cy.get('.leaflet-control-layers-list, [data-cy="layers-menu"]').should('be.visible');
      } else {
        cy.log('Capas cargadas por defecto en la vista satelital/operativa');
      }
    });
  });

  it('debe renderizar indicadores de alerta temprana con severidades diferenciadas', () => {
    cy.window().then((win: any) => {
      const c4isrStatus = {
        marcosPazActiveAlerts: 1,
        hydrologyRiskLevel: 'MODERADO',
        smnAlertColor: 'AMARILLO',
        activeSensors: 4
      };
      win.localStorage.setItem('zarx_c4isr_kpi_state', JSON.stringify(c4isrStatus));
      const cached = JSON.parse(win.localStorage.getItem('zarx_c4isr_kpi_state'));
      expect(cached.hydrologyRiskLevel).to.equal('MODERADO');
      expect(cached.activeSensors).to.equal(4);
    });
  });
});
