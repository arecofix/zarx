import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
  },

  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard/responder',
    loadComponent: () => import('./features/dashboard/responder-dashboard/responder-dashboard').then(m => m.ResponderDashboard),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/home/components/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/monitoreo',
    loadComponent: () => import('./features/admin/monitoring/monitoring.component').then(m => m.MonitoringComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/dispatch',
    loadComponent: () => import('./features/admin/components/dispatch-console/dispatch-console.component').then(m => m.DispatchConsoleComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/zones',
    loadComponent: () => import('./features/admin/components/zone-editor/zone-editor.component').then(m => m.ZoneEditorComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/news',
    loadComponent: () => import('./features/admin/components/news-admin/news-admin.component').then(m => m.NewsAdminComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'track/:sessionId',
    loadComponent: () => import('./features/tracking/public-tracking.component').then(m => m.PublicTrackingComponent)
  }
];
