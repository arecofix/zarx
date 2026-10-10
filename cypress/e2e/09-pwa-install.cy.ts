describe('09 - PWA Installation & Service Worker Lifecycle', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('runs smoothly when beforeinstallprompt event is not fired (desktop mode)', () => {
    cy.visitApp('/inicio');
    cy.get('body').should('be.visible');
  });

  it('handles simulated beforeinstallprompt event without throwing exceptions', () => {
    cy.visitApp('/inicio');
    cy.window().then((win) => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      win.dispatchEvent(event);
    });
    cy.get('body').should('be.visible');
  });
});
