import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth/auth-service';

export const authGuard: CanActivateFn = (arrayRole) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtiene los roles autorizados para acceder a la ruta desde la propiedad `data.roles` definida en app.routes.ts.
  const allowedRoles = arrayRole.data['roles'] as string[];
  const userRole = authService.getRole();

  // si no tiene token no tiene sesion - login
  if (!authService.getAccessToken()) {
    // Si No hay Access Token , se recupera usando, el Refresh Token que está en la cookie HttpOnly
    return authService.refresh().pipe(
      map(() => {
        const userRole = authService.getRole();
        // si no se especifican roles en la ruta pueden pasar
        if (!allowedRoles || allowedRoles.length === 0) {
          return true;
        }
        if (userRole && allowedRoles.includes(userRole)) {
          return true;
        }
        return router.createUrlTree(['/forbidden']);
      }),
      catchError(() => {
        authService.clearAccessToken();
        return of(router.createUrlTree(['/login']));
      }),
    );
  }

  // si no se especifican roles en la ruta pueden pasar
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};
