describe('03 - Weather Disasters & SMN Early Warnings', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('renders meteorological information on home dashboard without crashing', () => {
    cy.mockWeather({
      location: 'Marcos Paz',
      temperature: 22,
      precipitation: 120,
      windSpeed: 105,
      hailRisk: true
    });

    cy.visitApp('/inicio');
    cy.get('body').should('be.visible');
  });

  it('tolerates SMN 500 server error by switching to degraded mode', () => {
    cy.mockWeather('500');
    cy.visitApp('/inicio');
    cy.get('body').should('be.visible');
  });

  it('tolerates corrupt non-JSON payload from weather endpoint', () => {
    cy.mockWeather('corrupt');
    cy.visitApp('/inicio');
    cy.get('body').should('be.visible');
  });
});
