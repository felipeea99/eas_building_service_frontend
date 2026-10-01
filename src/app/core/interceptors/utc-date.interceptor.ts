import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Interceptor que normaliza las fechas UTC del backend.
 *
 * El backend guarda con DateTime.UtcNow y devuelve strings como
 * "2026-09-20T00:57:00" sin sufijo "Z". Sin él, JavaScript/Angular
 * las interpreta como hora local en vez de UTC.
 *
 * Este interceptor recorre recursivamente el body de cada respuesta
 * y agrega "Z" a cualquier string que tenga formato ISO 8601 sin
 * indicador de zona horaria.
 */

// Regex: detecta strings tipo "2026-09-20T00:57:00" o "2026-09-20T00:57:00.000"
// que NO terminan en Z ni en +/-HH:MM
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

function fixDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string' && ISO_DATE_REGEX.test(obj)) {
    return obj + 'Z';
  }

  if (Array.isArray(obj)) {
    return obj.map(fixDates);
  }

  if (typeof obj === 'object') {
    const fixed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      fixed[key] = fixDates(value);
    }
    return fixed;
  }

  return obj;
}

export const utcDateInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && event.body) {
        return event.clone({ body: fixDates(event.body) });
      }
      return event;
    })
  );
};
