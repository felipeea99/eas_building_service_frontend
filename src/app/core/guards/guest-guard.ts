import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth/auth-service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya hay token en memoria, no  entra a login
  if (authService.getAccessToken()) {
    return router.createUrlTree(['/inicio']);
  }

  // Solo intenta refresh si hay evidencia de que alguna vez hubo sesión
  const hasLogin = localStorage.getItem('hasLogin');
  if (hasLogin !== 'sesionActiva') {
    return of(true); // nunca hubo sesión, no se llama al refresh, deja ver /login
  }

  return authService.refresh().pipe(
    map(() => router.createUrlTree(['/inicio'])),
    catchError(() => {
      localStorage.removeItem('hasLogin'); // por si el refresh falla, se limpia el flag
      return of(true);
    })
  );
};
