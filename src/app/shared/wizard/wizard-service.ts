import { Injectable, signal, computed } from '@angular/core';

export interface WizardStep {
  title: string;
  description?: string;
}

@Injectable()
export class WizardService {
  /** Configuración de pasos */
  private readonly _steps = signal<WizardStep[]>([]);
  private readonly _currentIndex = signal(0);
  private readonly _stepValid = signal(false);
  private readonly _data = signal<Record<string, unknown>>({});
  private readonly _leaving = signal(false);

  /** Señales públicas */
  readonly steps = this._steps.asReadonly();
  readonly currentIndex = this._currentIndex.asReadonly();
  readonly stepValid = this._stepValid.asReadonly();
  readonly data = this._data.asReadonly();
  readonly leaving = this._leaving.asReadonly();

  readonly currentStep = computed(() => this._steps()[this._currentIndex()] ?? null);
  readonly isFirst = computed(() => this._currentIndex() === 0);
  readonly isLast = computed(() => this._currentIndex() === this._steps().length - 1);
  readonly totalSteps = computed(() => this._steps().length);
  readonly isOpen = computed(() => this._steps().length > 0);

  /** Inicializa el wizard con los pasos */
  init(steps: WizardStep[]): void {
    this._steps.set(steps);
    this._currentIndex.set(0);
    this._stepValid.set(false);
    this._data.set({});
    this._leaving.set(false);
  }

  /** El componente hijo marca el paso como válido o inválido */
  setStepValid(valid: boolean): void {
    this._stepValid.set(valid);
  }

  /** El componente hijo escribe datos parciales */
  patchData(partial: Record<string, unknown>): void {
    this._data.update(current => ({ ...current, ...partial }));
  }

  /** Avanza al siguiente paso */
  next(): boolean {
    if (!this._stepValid() || this.isLast()) return false;
    this._stepValid.set(false);
    this._currentIndex.update(i => i + 1);
    return true;
  }

  /** Regresa al paso anterior */
  previous(): boolean {
    if (this.isFirst()) return false;
    this._stepValid.set(false);
    this._currentIndex.update(i => i - 1);
    return true;
  }

  /** Cierra el wizard con animación */
  close(): void {
    if (!this.isOpen()) return;
    this._leaving.set(true);
    setTimeout(() => {
      this._steps.set([]);
      this._currentIndex.set(0);
      this._stepValid.set(false);
      this._data.set({});
      this._leaving.set(false);
    }, 300);
  }

  /** Resetea todo sin animación */
  reset(): void {
    this._steps.set([]);
    this._currentIndex.set(0);
    this._stepValid.set(false);
    this._data.set({});
    this._leaving.set(false);
  }
}
