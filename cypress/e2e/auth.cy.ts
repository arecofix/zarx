describe('Authentication & Session Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('permits guest citizen access to emergency map without forced login', () => {
    cy.visitApp('/inicio');
    cy.get('app-map').should('exist');
    cy.contains('Agente').should('be.visible');
  });

  it('navigates to auth login and shows credentials form', () => {
    cy.visit('/auth/login');
    cy.get('input[type="email"], input[type="text"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button[type="submit"], button').should('exist');
  });

  it('restricts protected operator console routes when unauthenticated', () => {
    cy.clearLocalStorage();
    cy.visit('/admin/dashboard', { failOnStatusCode: false });
    // Guard redirects to /inicio or /auth/login
    cy.url().should('satisfy', (url: string) => url.includes('/inicio') || url.includes('/auth/login'));
  });

  it('persists operator session across page reloads', () => {
    cy.login('comandante@zarx.mil');
    cy.visitApp('/inicio');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('sb-auth-token')).to.include('mock-jwt-token');
    });
  });
});
