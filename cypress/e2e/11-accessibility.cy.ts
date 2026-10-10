describe('11 - WCAG 2.1 Accessibility Audit', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('audits accessibility on Login page', () => {
    cy.visit('/auth/login');
    cy.checkA11y();
    cy.get('input[type="email"]').should('be.visible');
  });

  it('audits accessibility on Home & Map dashboard', () => {
    cy.visitApp('/inicio');
    cy.checkA11y();
    cy.get('app-map').should('be.visible');
  });

  it('audits accessibility on Profile page', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/perfil');
    cy.checkA11y();
    cy.contains('IDENTIDAD DIGITAL C4ISR').should('be.visible');
  });

  it('audits accessibility on Admin Command Dashboard', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/admin/dashboard');
    cy.checkA11y();
    cy.get('body').should('be.visible');
  });
});
