import { Injectable, signal } from '@angular/core';
import { GetBuildingsResponse } from './building-models';

export interface BuildingContext {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class BuildingContextService {
  private readonly _current = signal<GetBuildingsResponse | null>(null);
  readonly current = this._current.asReadonly();

  /** Guarda el edificio activo (llamar desde building-dashboard al cargar). */
  set(building: GetBuildingsResponse): void {
    this._current.set(building);
  }

  /** Limpia el contexto. */
  clear(): void {
    this._current.set(null);
  }
}
