export const AppConstants = {
  APP_NAME: 'ZARX SYSTEM',

  // System Configuration
  CONFIG: {
    LOCATION: {
      TIMEOUT_HIGH_ACCURACY: 15000,
      TIMEOUT_LOW_ACCURACY: 30000,
      MAX_AGE_HIGH: 30000,
      MAX_AGE_LOW: 300000,
      CACHE_VALIDITY: 120000,
      // Operational Base: Marcos Paz, Buenos Aires
      DEFAULT_LAT: -34.7709,
      DEFAULT_LNG: -58.8335,
      DEFAULT_ZOOM: 14
    },
    STORAGE: {
      BUCKET_EVIDENCE: 'evidence',
      BUCKET_AVATARS: 'avatars'
    },
    EMERGENCY: {
      BROADCAST_DISTANCE_METERS: 500,
      TRACKING_INTERVAL_MS: 5000,
      NEARBY_THRESHOLD: 500
    },
    ROLES: {
      ADMIN: 'admin',
      SUPER_ADMIN: 'super_admin',
      RESPONDER: 'responder',
      CIVILIAN: 'civilian',
      CITIZEN: 'citizen',
      MILITARY: 'military'
    },
    STATUS: {
      PENDING: 'PENDING',
      VALIDATED: 'VALIDATED',
      VERIFIED: 'VERIFIED',
      FALSE_ALARM: 'FALSE_ALARM',
      RESOLVED: 'RESOLVED',
      OPEN: 'OPEN',
      ENGAGED: 'ENGAGED'
    }
  },

  // Map Tile & Layer Configurations
  MAP: {
    DEFAULT_CENTER: [-34.7709, -58.8335] as [number, number],
    DEFAULT_ZOOM: 14,
    TILES: {
      ARCGIS_DARK: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    ATTRIBUTION: {
      ARCGIS: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      OSM: '&copy; OpenStreetMap contributors'
    }
  },
  
  // Emergency Numbers (Argentina)
  EMERGENCY: {
    POLICE: { number: '911', label: 'Policía' },
    FIRE: { number: '100', label: 'Bomberos' },
    MEDICAL: { number: '107', label: 'Ambulancia' }
  },

  // UI Texts
  UI: {
    PROFILE: {
      TITLE: 'MI PERFIL',
      ROLE_LABEL: 'ROL',
      RESTRICTED_ZONE: 'ZONA RESTRINGIDA',
      ADMIN_PANEL: 'PANEL ESTRATÉGICO (Admin)',
      SETTINGS: 'Configuración',
      PRIVACY: 'Privacidad',
      PRIVACY_DESC: 'Gestión de datos y permisos',
      DELETE_DATA: 'Solicitar Baja de mis datos',
      DELETE_WARNING: 'Esta acción iniciará un proceso irreversible de eliminación de su cuenta.',
      LOGOUT: 'CERRAR SESIÓN',
      CONFIRM_DELETE: '¿Está seguro que desea solicitar la baja definitiva de sus datos? Esta acción no se puede deshacer.'
    },
    HOME: {
      SCORE: 'PUNTAJE',
      SOS_LABEL: 'SOS'
    }
  },

  // Assets Paths & Fallbacks
  ASSETS: {
    AUDIO: {
      SIREN: 'assets/sounds/siren.mp3',
      URGENT_SIREN: 'assets/sounds/emergency_urgent.mp3',
      ALERT_BEEP: 'assets/sounds/beep.alert.mp3'
    },
    IMAGES: {
      // Guaranteed inline SVG Data URI for avatar placeholder to prevent broken images across SSR and missing assets
      AVATAR_PLACEHOLDER: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231e293b" stroke="%2310b981" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
      MARKER: 'assets/img/marker-icon.png'
    }
  }
};
