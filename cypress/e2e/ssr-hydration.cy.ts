describe('Módulo de Arquitectura Zoneless y SSR Hydration (Zarx)', () => {
  it('debe cargar la aplicación en modo Zoneless puro sin Zone.js en window', () => {
    cy.visitApp();
    cy.window().then((win: any) => {
      // Zone.js NO debe estar cargado en el bundle ni en el contexto global
      expect(win.Zone).to.be.undefined;
    });
  });

  it('no debe emitir warnings de Zoneless de Angular (NG0914)', () => {
    const consoleWarnings: string[] = [];
    cy.on('window:before:load', (win) => {
      cy.stub(win.console, 'warn').callsFake((msg) => {
        consoleWarnings.push(typeof msg === 'string' ? msg : JSON.stringify(msg));
      });
    });

    cy.visitApp();
    cy.then(() => {
      const zoneWarning = consoleWarnings.find(w => w.includes('NG0914') || w.includes('still loading Zone.js'));
      expect(zoneWarning, 'No debe existir el warning NG0914').to.be.undefined;
    });
  });

  it('no debe disparar errores de hidratación mismatch (NG0500 / NG0501)', () => {
    const consoleErrors: string[] = [];
    cy.on('window:before:load', (win) => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        consoleErrors.push(typeof msg === 'string' ? msg : JSON.stringify(msg));
      });
    });

    cy.visitApp();
    cy.then(() => {
      const hydrationErrors = consoleErrors.filter(e => e.includes('NG0500') || e.includes('hydration'));
      expect(hydrationErrors).to.have.length(0);
    });
  });

  it('debe diferir la ejecución de Leaflet hasta que el navegador esté listo', () => {
    cy.visitApp();
    cy.get('.leaflet-container', { timeout: 10000 }).should('be.visible');
    cy.window().should((win: any) => {
      expect(win.L).to.exist;
      expect(win.L.map).to.be.a('function');
      expect(win.L.geoJSON).to.be.a('function');
    });
  });
});
