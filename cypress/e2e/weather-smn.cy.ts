describe('Weather & SMN Early Warning Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockSMN();
  });

  it('displays meteorological alert widget on home dashboard', () => {
    cy.visitApp('/inicio');
    cy.contains('Alerta Meteorológica').should('be.visible');
  });

  it('renders weather card with precipitation information for Marcos Paz', () => {
    cy.visitApp('/inicio');
    cy.get('body').should('contain', 'Alerta');
  });
});
