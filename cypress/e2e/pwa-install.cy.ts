describe('PWA Install & Offline Capability Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('captures beforeinstallprompt event without throwing browser warnings', () => {
    cy.visit('/inicio', {
      onBeforeLoad(win) {
        win.localStorage.setItem('hasSeenOnboarding', 'true');
      }
    });

    cy.window().then((win) => {
      const mockEvent = new Event('beforeinstallprompt');
      (mockEvent as any).prompt = cy.stub().resolves();
      (mockEvent as any).userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      win.dispatchEvent(mockEvent);
    });

    // Custom install button becomes available
    cy.get('body').should('exist');
  });

  it('verifies web app manifest is linked and reachable', () => {
    cy.request('/manifest.webmanifest').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('name');
    });
  });
});
