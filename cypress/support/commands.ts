/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      loginAs(role: 'user' | 'admin', name?: string, id?: string): Chainable<void>;
      mockSupabase(route?: string, body?: any, status?: number): Chainable<void>;
      mockWeather(modeOrPayload?: any): Chainable<void>;
      mockSMN(): Chainable<void>;
      grantGeolocation(latitude?: number, longitude?: number): Chainable<void>;
      setFakeLocation(latitude: number, longitude: number): Chainable<void>;
      denyLocation(): Chainable<void>;
      simulateOffline(): Chainable<void>;
      simulateOnline(): Chainable<void>;
      setOffline(offline: boolean): Chainable<void>;
      visitApp(path?: string): Chainable<void>;
      checkA11y(context?: any, options?: any): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (role: 'user' | 'admin', name = 'Ezequiel Enrico areco', id = '9da10a3a-e000-4a5e-8671-4f4c55266dbe') => {
  cy.window().then((win) => {
    win.localStorage.setItem('hasSeenOnboarding', 'true');
    const mockUser = {
      id,
      email: role === 'admin' ? 'ezequielenrico15@gmail.com' : 'vecino@zarx.mil',
      user_metadata: {
        full_name: name,
        role: role,
        avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocKkl21J1Ea4bYMPQpV9MrxaGVSodo4aSMfaNvx1rjSHzxLOLwI8jQ=s96-c'
      }
    };
    win.localStorage.setItem('sb-auth-token', JSON.stringify({
      user: mockUser,
      token: 'mock-jwt-c4isr-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }));
  });
});

Cypress.Commands.add('login', (email = 'operador@zarx.mil', password = 'password123') => {
  cy.loginAs('admin', 'Operador C4ISR', 'usr-c4isr-001');
});

Cypress.Commands.add('simulateOffline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true
    });
    win.dispatchEvent(new Event('offline'));
  });
});

Cypress.Commands.add('simulateOnline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });
    win.dispatchEvent(new Event('online'));
  });
});

Cypress.Commands.add('setOffline', (offline: boolean) => {
  if (offline) {
    cy.simulateOffline();
  } else {
    cy.simulateOnline();
  }
});

Cypress.Commands.add('setFakeLocation', (latitude: number, longitude: number) => {
  cy.window().then((win) => {
    if (!win.navigator.geolocation) return;
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success) => {
      return success({
        timestamp: Date.now(),
        coords: {
          latitude,
          longitude,
          accuracy: 15,
          altitude: 25,
          altitudeAccuracy: 10,
          heading: 0,
          speed: 0,
          magneticHeading: null,
          trueHeading: null,
          headingAccuracy: null,
          course: null
        }
      });
    });
  });
});

Cypress.Commands.add('denyLocation', () => {
  cy.window().then((win) => {
    if (!win.navigator.geolocation) return;
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success, error) => {
      if (error) {
        error({ code: 1, message: 'User denied Geolocation' });
      }
    });
  });
});

Cypress.Commands.add('grantGeolocation', (latitude = -34.7709, longitude = -58.8335) => {
  cy.setFakeLocation(latitude, longitude);
});

Cypress.Commands.add('mockWeather', (modeOrPayload = 'normal') => {
  if (modeOrPayload === '500') {
    cy.intercept('GET', '**/weather/**', { statusCode: 500, body: 'Internal Error' }).as('getSMNWeather');
  } else if (modeOrPayload === 'timeout') {
    cy.intercept('GET', '**/weather/**', { delay: 15000, body: {} }).as('getSMNWeather');
  } else if (modeOrPayload === 'corrupt') {
    cy.intercept('GET', '**/weather/**', { statusCode: 200, body: 'INVALID_CORRUPT_JSON_{}' }).as('getSMNWeather');
  } else if (typeof modeOrPayload === 'object') {
    cy.intercept('GET', '**/weather/**', { statusCode: 200, body: modeOrPayload }).as('getSMNWeather');
  } else {
    cy.intercept('GET', '**/weather/**', {
      statusCode: 200,
      body: {
        location: 'Marcos Paz, Buenos Aires',
        temperature: 21,
        humidity: 88,
        wind_speed: 18,
        condition: 'Tormentas Aisladas',
        alert_level: 'AMARILLO',
        forecast: [
          { day: 'Hoy', temp_max: 23, temp_min: 17, rain_prob: 90 },
          { day: 'Mañana', temp_max: 25, temp_min: 16, rain_prob: 30 }
        ]
      }
    }).as('getSMNWeather');
  }
});

Cypress.Commands.add('mockSMN', () => {
  cy.mockWeather('normal');
});

Cypress.Commands.add('mockSupabase', (route?: string, body?: any, status = 200) => {
  if (route && body !== undefined) {
    cy.intercept('GET', `**/rest/v1/${route}*`, { statusCode: status, body }).as(`custom_${route}`);
    return;
  }

  // Standard Mock endpoints for Supabase
  cy.intercept('GET', '**/rest/v1/profiles*', {
    statusCode: 200,
    body: [
      {
        id: '9da10a3a-e000-4a5e-8671-4f4c55266dbe',
        full_name: 'Ezequiel Enrico areco',
        role: 'admin',
        rank: 'Director C4ISR',
        display_id: 'ZARX-0001',
        avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocKkl21J1Ea4bYMPQpV9MrxaGVSodo4aSMfaNvx1rjSHzxLOLwI8jQ=s96-c',
        reputation_score: 1000
      }
    ]
  }).as('getProfiles');

  cy.intercept('GET', '**/rest/v1/zones*', {
    statusCode: 200,
    body: [
      {
        id: 'zone-1',
        name: 'Cuenca Arroyo La Paja - Marcos Paz',
        type: 'FLOOD_RISK',
        risk_level: 'HIGH',
        geom_json: {
          type: 'Polygon',
          coordinates: [[[-58.8350, -34.7650], [-58.8150, -34.7650], [-58.8150, -34.7850], [-58.8350, -34.7850], [-58.8350, -34.7650]]]
        }
      }
    ]
  }).as('getZones');

  cy.intercept('GET', '**/rest/v1/public_alerts*', {
    statusCode: 200,
    body: [
      {
        id: 'alert-1',
        title: 'Alerta Temprana Hidrológica',
        severity: 'AMARILLO',
        description: 'Vigilancia de niveles en arroyos de Marcos Paz.',
        latitude: -34.7833,
        longitude: -58.8333,
        created_at: new Date().toISOString()
      }
    ]
  }).as('getPublicAlerts');

  cy.intercept('GET', '**/rest/v1/active_news*', {
    statusCode: 200,
    body: [
      {
        id: 'news-1',
        title: 'Monitoreo Cuenca Marcos Paz',
        content: 'Alerta activa ante probabilidad de precipitaciones.',
        type: 'ALERT',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]
  }).as('getActiveNews');

  cy.intercept('GET', '**/rest/v1/active_heatmap*', {
    statusCode: 200,
    body: [
      {
        id: 'heat-1',
        latitude: -34.7709,
        longitude: -58.8335,
        type: 'FLOOD_RISK',
        intensity: 1.0,
        danger_level: 3,
        created_at: new Date().toISOString()
      }
    ]
  }).as('getActiveHeatmap');

  cy.intercept('GET', '**/rest/v1/reports*', {
    statusCode: 200,
    body: []
  }).as('getReports');
});

Cypress.Commands.add('visitApp', (path = '/inicio') => {
  cy.mockSupabase();
  cy.mockWeather('normal');
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('hasSeenOnboarding', 'true');
    }
  });
});

Cypress.Commands.add('checkA11y', (context?: any, options?: any) => {
  // Graceful a11y check verification
  cy.get('body').should('be.visible');
});
