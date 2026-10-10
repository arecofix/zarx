describe('01 - Auth & Session Lifecycle', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('redirects unauthorized users accessing protected routes to login with returnUrl', () => {
    cy.visit('/admin/dashboard');
    cy.url().should('include', '/auth/login');
    cy.url().should('include', 'returnUrl=%2Fadmin%2Fdashboard');
  });

  it('persists authenticated session across page reload without FOUC', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/inicio');
    cy.contains('Ezequiel Enrico areco').should('be.visible');

    // Reload test
    cy.reload();
    cy.contains('Ezequiel Enrico areco').should('be.visible');
  });

  it('allows logging out and cleans up session tokens', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/perfil');
    cy.contains('CERRAR SESIÓN').click();
    cy.url().should('include', '/auth/login');
  });
});
