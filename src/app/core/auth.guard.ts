import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // STRICT MODE:
  const user = authService.currentUser();

  if (user) {
    return true;
  }
  
  return router.createUrlTree(['/auth/login']);
};
