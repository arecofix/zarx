import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppConstants } from '../constants/app.constants';

export const rbacGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitForAuthInit();

  const user = auth.currentUser();
  if (!user) {
    auth.setReturnUrl(state.url);
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  // Require admin or super_admin
  const profile = auth.profile();
  const serverMetaRole = user.user_metadata?.['role'];
  const userRole = profile?.role || serverMetaRole;

  const allowedRoles = [
    AppConstants.CONFIG.ROLES.ADMIN,
    AppConstants.CONFIG.ROLES.SUPER_ADMIN
  ];

  if (userRole && allowedRoles.includes(userRole as any)) {
    return true;
  }

  // Unauthorized access: redirect to /inicio
  return router.createUrlTree(['/inicio']);
};
