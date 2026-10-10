describe('08 - Ezequiel Enrico Areco Profile & Identity Verification', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('renders correct display ID (ZARX-0001), Rank (Director C4ISR), and avatar for Ezequiel Enrico Areco', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/perfil');

    // 1. Verify user name
    cy.contains('Ezequiel Enrico areco').should('be.visible');

    // 2. Verify display ID is visible and correctly formatted
    cy.contains('ID: ZARX-').should('be.visible');

    // 3. Verify rank badge is visible and populated
    cy.contains('RANGO ACTUAL').should('be.visible');
    cy.contains('Director C4ISR').should('be.visible');

    // 4. Verify admin command panel button is visible for admin
    cy.contains('PANEL DE COMANDO C4ISR').should('be.visible');
  });

  it('navigates cleanly to Admin Dashboard when clicking command panel button', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/perfil');
    cy.contains('PANEL DE COMANDO C4ISR').click();
    cy.url().should('include', '/admin/dashboard');
  });

  it('renders fallback avatar gracefully when image source is invalid or fails to load', () => {
    cy.intercept('GET', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: [
        {
          id: '9da10a3a-e000-4a5e-8671-4f4c55266dbe',
          full_name: 'Ezequiel Enrico areco',
          role: 'admin',
          rank: 'Director C4ISR',
          display_id: 'ZARX-0001',
          avatar_url: 'https://invalid-non-existent-domain.com/broken_avatar.jpg',
          reputation_score: 1000
        }
      ]
    }).as('getBrokenProfile');

    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/perfil');

    cy.get('img[alt="Avatar de Usuario"]').should('be.visible');
  });
});
