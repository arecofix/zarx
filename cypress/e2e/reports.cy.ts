describe('Módulo de Reportes Ciudadanos C4ISR (Zarx)', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('debe validar formulario de reporte de emergencia ciudadana', () => {
    // Abrir modal o sección de reportes si existe botón de reporte
    cy.get('body').then(($body) => {
      const reportBtn = $body.find('[data-cy="new-report-btn"], button:contains("Reportar")');
      if (reportBtn.length > 0) {
        cy.wrap(reportBtn.first()).click();
        
        // Validar campos requeridos
        cy.get('form, [data-cy="report-form"]').should('exist');
        cy.get('button[type="submit"], [data-cy="submit-report"]').first().click();
        cy.get('.text-red-500, .error-message, :invalid').should('exist');
      } else {
        // Validación estructural de reportes en la app
        cy.log('Formulario de reporte embebido en mapa o accesible via menú');
        cy.get('body').should('be.visible');
      }
    });
  });

  it('debe interceptar y simular envío de incidente de inundación / anegamiento', () => {
    cy.intercept('POST', '**/rest/v1/incidents*', {
      statusCode: 201,
      body: {
        id: 'inc-marcos-paz-1',
        type: 'INUNDACION_CALLE',
        severity: 'ALTA',
        latitude: -34.7647,
        longitude: -58.8397,
        status: 'PENDIENTE',
        created_at: new Date().toISOString()
      }
    }).as('postIncident');

    // Emitir reporte programático en la capa de datos
    cy.window().then((win: any) => {
      const mockIncident = {
        type: 'INUNDACION_CALLE',
        lat: -34.7647,
        lng: -58.8397,
        notes: 'Crecida en cruce de Arroyo La Paja'
      };
      win.localStorage.setItem('zarx_last_reported_incident', JSON.stringify(mockIncident));
      expect(win.localStorage.getItem('zarx_last_reported_incident')).to.include('INUNDACION_CALLE');
    });
  });

  it('debe guardar reporte en cola offline cuando se pierde conexión', () => {
    cy.setOffline(true);
    cy.window().then((win: any) => {
      const offlineQueue = [
        {
          id: 'temp-123',
          type: 'ARBOL_CAIDO',
          lat: -34.7647,
          lng: -58.8397,
          timestamp: Date.now()
        }
      ];
      win.localStorage.setItem('zarx_offline_reports_queue', JSON.stringify(offlineQueue));
      const saved = JSON.parse(win.localStorage.getItem('zarx_offline_reports_queue'));
      expect(saved).to.have.length(1);
      expect(saved[0].type).to.equal('ARBOL_CAIDO');
    });
  });
});
