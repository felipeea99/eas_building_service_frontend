import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  const accessToken = authService.getAccessToken()?.token;

  // Agregar Access Token
  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {

      // Access Token expirado
      if (error.status === 401 && !req.url.includes('/api/auth/refresh')) {
        return authService.refresh().pipe(
          // Refresh exitoso
          switchMap(() => {
            const newAccessToken =
              authService.getAccessToken()?.token;

            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              }
            });

            return next(retryRequest);
          }),

          // Refresh Token expirado/inválido
          catchError(refreshError => {
            authService.clearAccessToken();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
