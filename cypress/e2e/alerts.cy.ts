describe('Public Alerts & Emergency Dispatch Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('renders prominent SOS emergency button', () => {
    cy.visitApp('/inicio');
    cy.get('button, div').contains(/sos/i).should('be.visible');
  });

  it('loads public alerts from isolated Supabase schema', () => {
    cy.visitApp('/inicio');
    cy.wait('@getPublicAlerts').its('response.statusCode').should('eq', 200);
  });
});
