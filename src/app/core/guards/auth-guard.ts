import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = () => {

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getAccessToken()) {
    return true;
  }

  // Si No hay Access Token , se recupera usando
  // el Refresh Token que está en la cookie HttpOnly
  return authService.refresh().pipe(
    map(() => true),
    catchError(() => {
      authService.clearAccessToken();
      return of(router.createUrlTree(['/login']));
    })
  );
};
