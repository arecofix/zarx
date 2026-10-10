describe('10 - Cross-Site Scripting (XSS) Immunity', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  const xssPayloads = [
    '<script>window.__xss_executed=true;</script>',
    '<img src="invalid-image" onerror="window.__xss_executed=true;">',
    '<svg onload="window.__xss_executed=true;">',
    '<iframe src="javascript:window.__xss_executed=true;"></iframe>',
    '"><script>window.__xss_executed=true;</script><a href="'
  ];

  it('neutralizes malicious XSS in alert titles and descriptions', () => {
    xssPayloads.forEach((payload, index) => {
      cy.intercept('GET', '**/rest/v1/public_alerts*', {
        statusCode: 200,
        body: [
          {
            id: `alert-xss-${index}`,
            title: payload,
            severity: 'CRITICO',
            description: payload,
            latitude: -34.7709,
            longitude: -58.8335,
            created_at: new Date().toISOString()
          }
        ]
      }).as(`xssAlert_${index}`);

      cy.visitApp('/inicio');

      // Verify no script injected into DOM
      cy.get('body').should('not.contain.html', '<script>window.__xss_executed');
    });

    cy.window().then((win: any) => {
      expect(win.__xss_executed).to.be.undefined;
    });
  });

  it('neutralizes malicious XSS in user names and profiles', () => {
    const maliciousName = '<script>window.__xss_executed=true;</script>Hacker';
    cy.loginAs('user', maliciousName);
    cy.visitApp('/perfil');

    cy.window().then((win: any) => {
      expect(win.__xss_executed).to.be.undefined;
    });
  });
});
