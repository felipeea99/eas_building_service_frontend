import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Pipe que convierte fechas UTC del backend a hora local del usuario.
 *
 * El backend guarda con DateTime.UtcNow y devuelve strings sin sufijo "Z",
 * por lo que Angular las trata como hora local. Este pipe agrega "Z" si
 * falta para que DatePipe las convierta correctamente.
 *
 * Uso: {{ visit.validFrom | utcDate:'dd/MM/yyyy HH:mm' }}
 */
@Pipe({ name: 'utcDate', standalone: true })
export class UtcDatePipe implements PipeTransform {
  private datePipe = new DatePipe('es-MX');

  transform(value: string | Date | null | undefined, format: string = 'dd/MM/yyyy HH:mm'): string | null {
    if (!value) return null;

    // Si ya es Date, convertir directamente
    if (value instanceof Date) {
      return this.datePipe.transform(value, format);
    }

    // Si la fecha string no tiene indicador de zona horaria, asumimos UTC
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
    const utcValue = hasTimezone ? value : value + 'Z';

    return this.datePipe.transform(utcValue, format);
  }
}
