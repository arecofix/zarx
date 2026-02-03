import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Note: On app reload, wait for Auth to initialize might be needed 
  // via a Resolver or an Effect, but for now we assume Auth Guard runs first
  // and loads the profile.
  
  if (auth.isAdmin()) {
    return true;
  }

  // Redirect unauthorized access to home
  return router.createUrlTree(['/inicio']);
};
