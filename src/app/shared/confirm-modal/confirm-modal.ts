import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService, ConfirmOptions } from '../modal/modal-service';

@Component({
  selector: 'app-confirm-modal',
  imports: [FormsModule],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  private modalService = inject(ModalService);

  reasonText = signal('');
  isSubmitting = signal(false);

  get options(): ConfirmOptions {
    return (this.modalService.state()?.data as ConfirmOptions) ?? {};
  }

  get title(): string {
    return this.options.title ?? 'Confirmar acción';
  }

  get message(): string {
    return this.options.message ?? '¿Estás seguro de realizar esta acción?';
  }

  get placeholder(): string {
    return this.options.placeholder ?? 'Escribe un motivo (opcional)...';
  }

  get confirmLabel(): string {
    return this.options.confirmLabel ?? 'Confirmar';
  }

  get cancelLabel(): string {
    return this.options.cancelLabel ?? 'Cancelar';
  }

  get isDestructive(): boolean {
    return this.options.destructive ?? false;
  }

  get showTextarea(): boolean {
    return this.options.showTextarea ?? true;
  }

  get textRequired(): boolean {
    return this.options.textRequired ?? false;
  }

  get canConfirm(): boolean {
    if (this.textRequired && !this.reasonText().trim()) return false;
    return true;
  }

  onConfirm(): void {
    if (!this.canConfirm || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const callback = this.options.onConfirm;
    if (callback) {
      callback(this.reasonText().trim());
    }
    this.modalService.close();
    this.isSubmitting.set(false);
  }

  onCancel(): void {
    const callback = this.options.onCancel;
    if (callback) {
      callback();
    }
    this.modalService.close();
  }
}
