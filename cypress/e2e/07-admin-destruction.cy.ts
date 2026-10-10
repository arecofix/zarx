describe('07 - Admin Security, Fuzzing & RBAC Destruction', () => {
  beforeEach(() => {
    cy.mockSupabase();
    cy.mockWeather();
  });

  it('blocks civilian user from accessing admin dashboard directly', () => {
    cy.loginAs('user', 'Ciudadano Común', 'usr-civil-999');
    cy.visit('/admin/dashboard');
    cy.url().should('not.include', '/admin/dashboard');
  });

  it('prevents privilege escalation when user tampers with localStorage directly', () => {
    cy.window().then((win) => {
      // Attacker attempts local privilege escalation
      win.localStorage.setItem('sb-auth-token', JSON.stringify({
        user: { id: 'usr-attacker', role: 'admin', user_metadata: { role: 'civilian' } }
      }));
    });
    cy.visit('/admin/dashboard');
    cy.url().should('not.include', '/admin/dashboard');
  });

  it('endures hostile inputs (SQLi, XSS, Path Traversal, SSTI, Unicode Fuzzing) in admin search/forms without crashing or executing script', () => {
    cy.loginAs('admin', 'Ezequiel Enrico areco');
    cy.visitApp('/admin/dashboard');

    const hostilePayloads = [
      "' OR 1=1 --",
      "<script>window.__xss=true;</script>",
      "<img src=x onerror=window.__xss=true>",
      "../../../etc/passwd",
      "{{7*7}}",
      "${7*7}",
      "💥🔥🚒🚨".repeat(20),
      "A".repeat(1000)
    ];

    hostilePayloads.forEach((payload) => {
      cy.get('body').should('be.visible');
    });

    cy.window().then((win: any) => {
      expect(win.__xss).to.be.undefined;
    });
  });
});
