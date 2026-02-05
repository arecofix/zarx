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
      URGENT_SIREN: 'assets/sounds/emergency_urgent.mp3',
      ALERT_BEEP: 'assets/sounds/beep.alert.mp3'
    },
    IMAGES: {
      AVATAR_PLACEHOLDER: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQxYjgyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiPjwvY2lyY2xlPjwvc3ZnPg==',
      MARKER: 'assets/img/marker-icon.png'
    }
  }
};
