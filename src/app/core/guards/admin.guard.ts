import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to fully initialize (including profile fetch)
  await auth.waitForAuthInit();

  if (auth.isAdmin()) {
    return true;
  }

  // Redirect unauthorized access to home
  return router.createUrlTree(['/inicio']);
};
