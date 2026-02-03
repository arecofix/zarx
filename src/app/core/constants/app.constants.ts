export const AppConstants = {
  APP_NAME: 'ZARX SYSTEM',
  
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

  // Assets Paths
  ASSETS: {
    AUDIO: {
      SIREN: 'assets/sounds/siren.mp3',
      ALERT_BEEP: 'assets/sounds/beep.alert.mp3'
    },
    IMAGES: {
      AVATAR_PLACEHOLDER: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      MARKER: 'assets/img/marker-icon.png'
    }
  }
};
