import { HttpInterceptorFn } from "@angular/common/http";
import { catchError, throwError } from "rxjs";
import { Router } from '@angular/router';
import { inject } from "@angular/core";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);

  return next(req).pipe(
    catchError(error => {

      if (error.status === 401) {

        if (!req.url.includes('/api/auth/refresh')) {
          router.navigate(['/login']);
        }

      }

      return throwError(() => error);
    })
  );
};
