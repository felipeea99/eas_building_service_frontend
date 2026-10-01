import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  leaving: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _nextId = 0;

  /** Lista reactiva de toasts activos */
  readonly toasts = signal<Toast[]>([]);

  /**
   * Muestra un toast.
   * @param message  Texto a mostrar
   * @param type     'success' | 'error' | 'warning' | 'info'
   * @param duration Milisegundos que permanece visible (default 4000)
   */
  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = this._nextId++;
    const toast: Toast = { id, message, type, duration, leaving: false };

    this.toasts.update(list => [...list, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  /** Atajos por tipo */
  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /** Inicia animación de salida y luego elimina */
  dismiss(id: number): void {
    this.toasts.update(list =>
      list.map(t => t.id === id ? { ...t, leaving: true } : t)
    );
    // Espera a que termine la animación de salida (300ms)
    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
    }, 300);
  }
}
