import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth-service';

export const guestGuard: CanActivateFn = () => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // Sacar la sesion en memoria
  if (authService.getAccessToken()) {
    console.log("me llamo")
    return router.createUrlTree(['/inicio']);
  }

  // intentamos recuperar sesión con el refresh token si se hace REFRESH a la pagina
  return authService.refresh().pipe(
    map(() => router.createUrlTree(['/inicio'])),
    catchError(() => {
      // No tiene sesión válida → puede entrar al login
      authService.clearAccessToken();
      console.log('🟢 guessguard');
      return of(true);
    })
  );
};
