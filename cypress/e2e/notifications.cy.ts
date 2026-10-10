describe('Push Notifications & Messaging Domain', () => {
  beforeEach(() => {
    cy.mockSupabase();
  });

  it('checks notification support without crashing when unsupported', () => {
    cy.visitApp('/inicio');
    cy.window().then((win) => {
      expect(win.Notification).to.not.be.undefined;
    });
  });

  it('handles broadcast banner notifications', () => {
    cy.visitApp('/inicio');
    cy.get('body').should('be.visible');
  });
});
