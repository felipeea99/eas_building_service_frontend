import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notifications/notification-service';
import { CreateNotificationRequest } from '../../../core/services/notifications/notification-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-send-notification',
  imports: [ReactiveFormsModule],
  templateUrl: './send-notification.html',
  styleUrl: './send-notification.css',
})
export class SendNotification implements OnInit {
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isLoading = signal(false);
  serverError = signal<string | null>(null);

  /** Datos pasados desde el dashboard (buildingId, buildingName) */
  private buildingId = '';
  private buildingName = '';

  /** Tipos de evento predefinidos */
  readonly eventTypes = [
    { value: 'General', label: 'General' },
    { value: 'Maintenance', label: 'Mantenimiento' },
    { value: 'Payment', label: 'Pagos' },
    { value: 'Security', label: 'Seguridad' },
    { value: 'Reservation', label: 'Reservaciones' },
    { value: 'Visit', label: 'Visitas' },
  ];

  /** Opciones de destino */
  readonly destinations = [
    { value: 'building', label: 'Este edificio' },
    { value: 'tenant', label: 'Todo el tenant' },
  ];

  form = this.fb.nonNullable.group({
    eventType: ['General', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    destination: ['building', [Validators.required]],
  });

  ngOnInit(): void {
    const data = this.modalService.state()?.data as { buildingId: string; buildingName: string } | null;
    if (data) {
      this.buildingId = data.buildingId;
      this.buildingName = data.buildingName;
    }
  }

  /** Caracteres restantes del mensaje */
  get messageCharsLeft(): number {
    return 500 - (this.form.controls.message.value?.length ?? 0);
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const v = this.form.getRawValue();
    const request: CreateNotificationRequest = {
      eventType: v.eventType,
      title: v.title.trim(),
      message: v.message.trim(),
      userId: null,
      buildingId: v.destination === 'building' ? this.buildingId : null,
    };

    this.notificationService.create(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Notificacion enviada correctamente');
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
        this.form.reset({ eventType: 'General', destination: 'building' });
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Error al enviar la notificacion';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
