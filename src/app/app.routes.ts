import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full'
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/components/map-view/map-view.component').then(m => m.MapViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard/responder',
    loadComponent: () => import('./features/dashboard/responder-dashboard/responder-dashboard').then(m => m.ResponderDashboard),
    canActivate: [authGuard]
  }
];
