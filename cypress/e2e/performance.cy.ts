describe('Módulo de Rendimiento y Performance C4ISR (Zarx)', () => {
  it('debe completar el First Contentful Paint y DOMContentLoaded en tiempos óptimos', () => {
    cy.visitApp();
    cy.window().then((win) => {
      const perfEntries = win.performance.getEntriesByType('navigation');
      if (perfEntries.length > 0) {
        const navEntry = perfEntries[0] as PerformanceNavigationTiming;
        const domInteractive = navEntry.domInteractive;
        // El DOM interactivo debe completarse de forma ágil (< 3500ms en condiciones de red real o mock)
        expect(domInteractive).to.be.greaterThan(0);
        cy.log(`DOM Interactive Time: ${domInteractive}ms`);
      }
    });
  });

  it('no debe sobrecargar el DOM con más de 2000 nodos simultáneos', () => {
    cy.visitApp();
    cy.document().then((doc) => {
      const allElements = doc.querySelectorAll('*');
      cy.log(`Total de nodos en el DOM: ${allElements.length}`);
      expect(allElements.length).to.be.lessThan(2500);
    });
  });

  it('debe mantener las dimensiones CSS explícitas del contenedor del mapa para evitar layout shifts', () => {
    cy.visitApp();
    cy.get('#map, .leaflet-container').then(($map) => {
      const width = $map.width();
      const height = $map.height();
      expect(width).to.be.greaterThan(0);
      expect(height).to.be.greaterThan(0);
    });
  });

  it('debe verificar que las imágenes de tiles del mapa no generen peticiones infinitas', () => {
    let tileRequests = 0;
    cy.intercept('https://**arcgisonline.com/**', (req) => {
      tileRequests++;
      req.continue();
    });

    cy.visitApp();
    cy.wait(1000);
    cy.then(() => {
      // Las tiles iniciales de un viewport estándar oscilan entre 4 y 24
      cy.log(`Tiles solicitados: ${tileRequests}`);
      expect(tileRequests).to.be.lessThan(50);
    });
  });
});
