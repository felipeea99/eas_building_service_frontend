import { Injectable, signal, computed, Service } from '@angular/core';

// 1. Los Tipos de modal disponibles se registra en el @switch del template.
// 2. 'ModalState' es el estado interno del modal, que contiene el tipo y los datos

export type ModalType = string; // se puede restringir a un union conforme crezca

export interface ModalState {
  type: ModalType;
  data: unknown;
}

/** Opciones para el modal de confirmación */
export interface ConfirmOptions {
  title?: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Muestra el textarea (default: true) */
  showTextarea?: boolean;
  /** Hace el texto obligatorio (default: false) */
  textRequired?: boolean;
  /** Callback al confirmar — recibe el texto escrito */
  onConfirm?: (reason: string) => void;
  /** Callback al cancelar */
  onCancel?: () => void;
}

@Service()
export class ModalService {
  /** Estado interno del modal */
  private readonly _state = signal<ModalState | null>(null); // null = cerrado, {type, data} osea ModalType = abierto
  private readonly _leaving = signal(false); // true = animación de salida en curso

  /** Señales públicas de solo lectura */
  readonly state = this._state.asReadonly();  // el template lee el tipo y datos
  readonly leaving = this._leaving.asReadonly(); // el template sabe si está saliendo (para la animación)
  readonly isOpen = computed(() => this._state() !== null); // "¿Hay un modal abierto?" — se recalcula automáticamente cada vez que _state cambia

  /**
   * Abre el modal con un tipo y datos opcionales.
   * @param type  Identificador del componente a renderizar
   * @param data  Datos que el componente hijo puede consumir
   */
  open(type: ModalType, data?: unknown): void {
    this._leaving.set(false);
    this._state.set({ type, data: data ?? null });
  }

  /**
   * Abre el modal de confirmación con opciones personalizables.
   * @param options  Configuración del modal de confirmación
   *
   * @example
   * this.modalService.confirm({
   *   title: 'Cancelar contrato',
   *   message: '¿Estás seguro? Esta acción no se puede deshacer.',
   *   placeholder: 'Motivo de cancelación...',
   *   confirmLabel: 'Sí, cancelar',
   *   destructive: true,
   *   onConfirm: (reason) => {
   *     this.contractService.cancel(id, reason).subscribe(...)
   *   }
   * });
   */
  confirm(options: ConfirmOptions): void {
    this.open('confirm', options);
  }

  /** Inicia la animación de salida y luego limpia el estado */
  close(): void {
    if (!this._state()) return;
    this._leaving.set(true);

    // Espera a que termine la animación de salida (300ms)
    setTimeout(() => {
      this._state.set(null);
      this._leaving.set(false);
    }, 300);
  }
}
