import { inject, Injectable, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface BreadcrumbSegment {
  label: string;
  path: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private router = inject(Router);
  private readonly _segments = signal<BreadcrumbSegment[]>([]);
  readonly segments = this._segments.asReadonly();

  constructor() {
    // Limpia los segmentos en cada navegación para que la nueva
    // página decida qué mostrar.  Si la página no llama set(),
    // el breadcrumb queda vacío (oculto).
    this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => this._segments.set([]));
  }

  /**
   * Establece los segmentos del breadcrumb.
   * Llamar desde ngOnInit() de cada página/vista.
   *
   * Ejemplo:
   *   this.breadcrumbService.set([
   *     { label: 'Edificios', path: '/buildings' },
   *     { label: 'Banana2', path: '/buildings/123' },
   *   ]);
   */
  set(segments: BreadcrumbSegment[]): void {
    this._segments.set(segments);
  }

  /** Limpia el breadcrumb manualmente. */
  clear(): void {
    this._segments.set([]);
  }
}
