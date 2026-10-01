import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth-service';

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

      // Solo manejar 401
      if (
        error.status !== 401 ||

        // Nunca intentar refresh sobre login
        req.url.includes('/api/auth/login') ||

        // Nunca intentar refresh sobre refresh
        req.url.includes('/api/auth/refresh')
      ) {
        return throwError(() => error);
      }

      // SI ESTA PETICIÓN YA FUE REINTENTADA

      if (req.headers.has('X-Auth-Retry')) {

        // El token nuevo tampoco funcionó.
        // No volvemos a intentar refresh.
        authService.clearAccessToken();

        router.navigate(['/login']);

        return throwError(() => error);
      }


      // YA HAY UN REFRESH EN PROCESO

      if (authService.getIsRefreshing()) {

        return authService.waitForRefresh().pipe(

          switchMap((token) => {

            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
                'X-Auth-Retry': 'true'
              }
            });

            return next(retryRequest);
          }),

          catchError((refreshError) => {

            authService.clearAccessToken();

            router.navigate(['/login']);

            return throwError(() => refreshError);
          })
        );
      }


      // NADIE ESTÁ HACIENDO REFRESH

      authService.startRefreshing();

      return authService.refresh().pipe(

        switchMap(() => {

          const newAccessToken =
            authService.getAccessToken()?.token;

          if (!newAccessToken) {

            throw new Error(
              'No se obtuvo Access Token después del refresh'
            );
          }

          authService.finishRefreshing(
            newAccessToken
          );

          const retryRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
              'X-Auth-Retry': 'true'
            }
          });

          return next(retryRequest);
        }),

        catchError((refreshError) => {

          authService.failRefreshing(
            refreshError
          );

          authService.clearAccessToken();

          router.navigate(['/login']);

          return throwError(() => refreshError);
        })
      );
    })
  );
};
